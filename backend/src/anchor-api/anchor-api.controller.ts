import {
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CookieAuthGuard, CurrentUserId } from 'src/auth/cookie-auth.guard';
import { ApiKey } from './anchor.models';
import { AnchorApiService } from './anchor-api.service';
import {
  AnchorItemDto,
  AnchorRootDto,
  ApiKeyCreatedDto,
  ApiKeyDto,
  CloseEpochResponse,
  ErrorResponse,
} from '../docs/api-models';

class SubmitAnchorDto {
  @ApiProperty({
    description: 'SHA-256 of the document, 64 hex characters. The document itself never leaves your side.',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    pattern: '^[a-fA-F0-9]{64}$',
  })
  @Matches(/^[a-fA-F0-9]{64}$/, { message: 'sha256 має бути 64 hex-символи' })
  sha256: string;

  @ApiPropertyOptional({ maxLength: 255, example: 'contract-v3.pdf', description: 'Free-form note for your own bookkeeping.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}

class CreateKeyDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'CI pipeline' })
  @IsString()
  @Length(1, 100)
  name: string;
}

@Injectable()
class ApiKeyGuard implements CanActivate {
  constructor(private readonly service: AnchorApiService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const match = /^Bearer\s+(ap_[a-z]+_[a-f0-9]+)$/.exec(req.headers.authorization ?? '');
    const key = match && (await this.service.authenticateKey(match[1]));
    if (!key) throw new UnauthorizedException('Недійсний або відкликаний API-ключ');
    req['apiKey'] = key;
    return true;
  }
}

/** Public Anchor API, authenticated with an `Authorization: Bearer ap_test_…` key. */
@ApiTags('Anchor API (API key)')
@ApiBearerAuth('api-key')
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked API key.', type: ErrorResponse })
@Controller('v1/anchor')
@UseGuards(ApiKeyGuard)
export class AnchorApiController {
  constructor(private readonly service: AnchorApiService) {}

  @Post()
  @ApiOperation({
    summary: 'Anchor a document hash',
    description:
      'Queues the SHA-256 for the next epoch. The record is `pending` until the epoch closes (every ANCHOR_EPOCH_MS), ' +
      'then `anchored` with a Merkle receipt. Counts against the monthly limit of the plan.',
  })
  @ApiCreatedResponse({ type: AnchorItemDto })
  @ApiBadRequestResponse({ description: 'sha256 is not 64 hex characters.', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Monthly anchor limit of the plan is exhausted.', type: ErrorResponse })
  submit(@Req() req: Request, @Body() dto: SubmitAnchorDto) {
    const key: ApiKey = req['apiKey'];
    return this.service.submit(key.userId, dto.sha256, dto.label ?? null, key.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an anchor record / receipt',
    description: 'Poll until `status` is `anchored`; then `receipt` can be verified offline against GET /v1/roots/{epoch}.',
  })
  @ApiParam({ name: 'id', description: 'Public id returned by POST /v1/anchor.' })
  @ApiOkResponse({ type: AnchorItemDto })
  @ApiNotFoundResponse({ description: 'No such record for this key owner.', type: ErrorResponse })
  receipt(@Req() req: Request, @Param('id') id: string) {
    return this.service.receipt(id, (req['apiKey'] as ApiKey).userId);
  }
}

/** Public, no key: anyone holding a receipt can read the epoch root it must match. */
@ApiTags('Public roots')
@Controller('v1/roots')
export class PublicRootsController {
  constructor(private readonly service: AnchorApiService) {}

  @Get(':epoch')
  @ApiOperation({
    summary: 'Anchored root of an epoch',
    description: 'No authentication. Compare `root` with `receipt.batchRoot` to check a receipt independently.',
  })
  @ApiParam({ name: 'epoch', type: Number, example: 3 })
  @ApiOkResponse({ type: AnchorRootDto })
  @ApiNotFoundResponse({ description: 'Unknown epoch.', type: ErrorResponse })
  root(@Param('epoch', ParseIntPipe) epoch: number) {
    return this.service.epochRoot(epoch);
  }
}

/** Same features for the signed-in user in the cabinet (cookie auth). */
@ApiTags('Account (cookie session)')
@ApiCookieAuth('session')
@ApiUnauthorizedResponse({ description: 'No valid session cookie — call POST /auth/refresh or sign in.', type: ErrorResponse })
@Controller('account')
@UseGuards(CookieAuthGuard)
export class AccountController {
  constructor(private readonly service: AnchorApiService) {}

  @Get('anchors')
  @ApiOperation({ summary: 'List my anchored documents', description: 'Latest 50, newest first.' })
  @ApiOkResponse({ type: [AnchorItemDto] })
  anchors(@CurrentUserId() userId: number) {
    return this.service.list(userId);
  }

  @Post('anchors')
  @ApiOperation({ summary: 'Anchor a document hash (cabinet)', description: 'Same as POST /v1/anchor but with the session cookie.' })
  @ApiCreatedResponse({ type: AnchorItemDto })
  @ApiBadRequestResponse({ description: 'sha256 is not 64 hex characters.', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Monthly anchor limit of the plan is exhausted.', type: ErrorResponse })
  submit(@CurrentUserId() userId: number, @Body() dto: SubmitAnchorDto) {
    return this.service.submit(userId, dto.sha256, dto.label ?? null, null);
  }

  /** Test environments only: close the epoch now instead of waiting for the timer. */
  @Post('anchors/close-epoch')
  @ApiOperation({
    summary: 'Close the current epoch now (test environments only)',
    description: 'Batches all pending hashes into one Merkle tree and anchors its root immediately.',
  })
  @ApiCreatedResponse({ type: CloseEpochResponse })
  @ApiForbiddenResponse({ description: 'Disabled when NODE_ENV=production.', type: ErrorResponse })
  closeEpoch() {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException();
    return this.service.closeEpoch();
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List my API keys', description: 'Secrets are never returned here, only the prefix.' })
  @ApiOkResponse({ type: [ApiKeyDto] })
  keys(@CurrentUserId() userId: number) {
    return this.service.listKeys(userId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create an API key', description: 'The full key (`secret`) is shown once, in this response only.' })
  @ApiCreatedResponse({ type: ApiKeyCreatedDto })
  @ApiBadRequestResponse({ description: 'name is empty or longer than 100 characters.', type: ErrorResponse })
  createKey(@CurrentUserId() userId: number, @Body() dto: CreateKeyDto) {
    return this.service.createKey(userId, dto.name);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Revoke an API key', description: 'Takes effect immediately; the key can no longer authenticate.' })
  @ApiParam({ name: 'id', type: Number, example: 5 })
  @ApiOkResponse({ type: ApiKeyDto })
  @ApiNotFoundResponse({ description: 'No such key for this user.', type: ErrorResponse })
  revokeKey(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.revokeKey(userId, id);
  }
}
