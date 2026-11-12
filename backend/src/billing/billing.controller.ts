import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { IsIn, IsString, Matches } from 'class-validator';
import { CookieAuthGuard, CurrentUserId } from 'src/auth/cookie-auth.guard';
import { BillingService } from './billing.service';
import { PAID_PLANS, PLANS, PlanId } from './plans';
import {
  BillingOverviewDto,
  CheckoutResponse,
  ErrorResponse,
  InvoiceDto,
  PlanDto,
  UrlResponse,
  WebhookReceived,
} from '../docs/api-models';

const NEEDS_SESSION = {
  description: 'No valid session cookie — call POST /auth/refresh or sign in.',
  type: ErrorResponse,
};

class CheckoutDto {
  @ApiProperty({ enum: PAID_PLANS, example: 'pro' })
  @IsIn(PAID_PLANS)
  plan: PlanId;
}

class ConfirmCheckoutDto {
  @ApiProperty({
    example: 'cs_test_a1B2c3',
    description: 'Checkout session id from the success redirect (`session_id`).',
  })
  @IsString()
  @Matches(/^cs_[A-Za-z0-9_]+$/)
  sessionId: string;
}

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List plans', description: 'Public. Prices in USD per month.' })
  @ApiOkResponse({ type: [PlanDto] })
  plans() {
    return Object.values(PLANS).map(({ priceEnv, ...plan }) => plan);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({ summary: 'My subscription and usage' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    enum: ['1'],
    description: '`1` re-reads the state from the payment provider first.',
  })
  @ApiOkResponse({ type: BillingOverviewDto })
  @Get('subscription')
  subscription(@CurrentUserId() userId: number, @Query('refresh') refresh?: string) {
    return this.billing.overview(userId, refresh === '1');
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({
    summary: 'Start a checkout / switch plan',
    description:
      'New subscription → `{ url }` to redirect the user to. ' +
      'Existing paid subscription → switched in place, returns `{ overview }`.',
  })
  @ApiCreatedResponse({ type: CheckoutResponse })
  @ApiBadRequestResponse({
    description: 'Unknown or free plan, or billing is not configured.',
    type: ErrorResponse,
  })
  @Post('checkout')
  checkout(@CurrentUserId() userId: number, @Body() dto: CheckoutDto) {
    return this.billing.checkout(userId, dto.plan);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({
    summary: 'Confirm a finished checkout',
    description:
      'Called after the redirect back from the provider; syncs the new plan without waiting for the webhook.',
  })
  @ApiCreatedResponse({ type: BillingOverviewDto })
  @ApiBadRequestResponse({
    description: 'Invalid session id or the session is not paid.',
    type: ErrorResponse,
  })
  @Post('checkout/confirm')
  confirm(@CurrentUserId() userId: number, @Body() dto: ConfirmCheckoutDto) {
    return this.billing.confirmCheckout(userId, dto.sessionId);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({
    summary: 'Cancel at period end',
    description: 'The plan stays active until `currentPeriodEnd`.',
  })
  @ApiCreatedResponse({ type: BillingOverviewDto })
  @Post('cancel')
  cancel(@CurrentUserId() userId: number) {
    return this.billing.setCancel(userId, true);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({ summary: 'Undo a scheduled cancellation' })
  @ApiCreatedResponse({ type: BillingOverviewDto })
  @Post('resume')
  resume(@CurrentUserId() userId: number) {
    return this.billing.setCancel(userId, false);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({
    summary: 'Open the billing portal',
    description: 'Returns a one-time URL of the provider-hosted portal (payment method, invoices).',
  })
  @ApiCreatedResponse({ type: UrlResponse })
  @ApiBadRequestResponse({ description: 'The user has no payment account yet.', type: ErrorResponse })
  @Post('portal')
  portal(@CurrentUserId() userId: number) {
    return this.billing.portal(userId);
  }

  @UseGuards(CookieAuthGuard)
  @ApiCookieAuth('session')
  @ApiUnauthorizedResponse(NEEDS_SESSION)
  @ApiOperation({ summary: 'My invoices' })
  @ApiOkResponse({ type: [InvoiceDto] })
  @Get('invoices')
  invoices(@CurrentUserId() userId: number) {
    return this.billing.invoices(userId);
  }

  /** Called by Stripe (locally via `npm run stripe:listen`). Authenticated by signature, not cookie. */
  @ApiOperation({
    summary: 'Payment-provider webhook',
    description:
      'Called by Stripe, not by clients. Authenticated by the `stripe-signature` header over the raw body.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Stripe signature of the raw request body.',
  })
  @ApiBody({
    schema: { type: 'object', additionalProperties: true, description: 'A Stripe event object.' },
  })
  @ApiOkResponse({ type: WebhookReceived })
  @ApiBadRequestResponse({
    description: 'Missing body/signature, or the signature does not match.',
    type: ErrorResponse,
  })
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!req.rawBody || !signature) throw new BadRequestException('Missing body or signature');
    await this.billing.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
