import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { User } from '../user/user.model';
import {
  AuthUserResponse,
  ErrorResponse,
  FIELD_ERRORS_SCHEMA,
  MessageResponse,
  OkResponse,
} from '../docs/api-models';

/** User fields that are safe to send to the browser (never the password hash). */
function publicUser(user: User) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

/**
 * Session endpoints. Tokens travel in httpOnly cookies (`access_token`,
 * `refresh_token`); the JSON body only carries the public user profile.
 * Validation errors come back as `{ field: message }` with HTTP 400.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create an account and sign in',
    description:
      'Creates the user and sets the `access_token` (≈150 s) and `refresh_token` (7 d) httpOnly cookies.',
  })
  @ApiCreatedResponse({ type: AuthUserResponse })
  @ApiBadRequestResponse({
    description: 'Validation failed, passwords differ, or the email is taken.',
    schema: FIELD_ERRORS_SCHEMA,
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        confirmPassword: 'Password and confirm password are not the same.',
      });
    }
    const { user } = await this.authService.register(dto, res);
    return { user: publicUser(user) };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sign in',
    description: 'Sets the `access_token` and `refresh_token` httpOnly cookies.',
  })
  @ApiOkResponse({ type: AuthUserResponse })
  @ApiBadRequestResponse({
    description: 'Validation failed, or `{ "invalidCredentials": "Invalid credentials" }`.',
    schema: FIELD_ERRORS_SCHEMA,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user } = await this.authService.login(dto, res);
    return { user: publicUser(user) };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out', description: 'Clears both session cookies.' })
  @ApiOkResponse({ type: MessageResponse })
  async logout(@Res({ passthrough: true }) res: Response) {
    return { message: await this.authService.logout(res) };
  }

  /** Issues a fresh access-token cookie from the refresh-token cookie. */
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refresh the access token',
    description:
      'Reads the `refresh_token` cookie and sets a new `access_token` cookie. ' +
      'Call it when a cookie-authenticated endpoint answers 401, then retry.',
  })
  @ApiOkResponse({ type: OkResponse })
  @ApiUnauthorizedResponse({
    description: 'Refresh token missing, invalid or expired.',
    type: ErrorResponse,
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.refreshToken(req, res);
    return { ok: true };
  }
}
