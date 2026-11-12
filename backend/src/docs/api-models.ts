/**
 * Response/error shapes used only to describe the API in Swagger (/docs).
 * Controllers return plain objects; these classes mirror what goes over the wire.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ───────────────────────── errors & generic ─────────────────────────

export class ErrorResponse {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized' })
  message: string;

  @ApiPropertyOptional({ example: 'Unauthorized' })
  error?: string;
}

/** 400 body for validation errors: the map itself, e.g. { "email": "Email already in use" }. */
export const FIELD_ERRORS_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'string' },
  description:
    'Map "field name → message". The key `invalidCredentials` is used for a wrong email/password.',
  example: { email: 'Email already in use' },
} as const;

export class MessageResponse {
  @ApiProperty({ example: 'Successfully logged out' })
  message: string;
}

export class OkResponse {
  @ApiProperty({ example: true })
  ok: boolean;
}

export class UrlResponse {
  @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_test_…' })
  url: string;
}

// ───────────────────────── auth ─────────────────────────

export class PublicUserDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Іван Петренко' })
  fullname: string;

  @ApiProperty({ example: 'ivan@example.com' })
  email: string;

  @ApiProperty({ nullable: true, type: String, example: null })
  avatarUrl: string | null;
}

export class AuthUserResponse {
  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;
}

// ───────────────────────── anchoring ─────────────────────────

export class DocumentReceiptDto {
  @ApiProperty({ example: 'document-receipt' })
  type: string;

  @ApiProperty({ example: 1, description: 'Receipt format version.' })
  v: number;

  @ApiProperty({ description: 'SHA-256 of the document (64 hex chars).' })
  sha256: string;

  @ApiProperty({ description: 'Merkle leaf = keccak256(utf8(sha256 hex)).' })
  leaf: string;

  @ApiProperty({ example: 'keccak256(utf8(sha256 hex))' })
  leafRule: string;

  @ApiProperty({ example: 3, description: 'Epoch (batch) the document was anchored in.' })
  epoch: number;

  @ApiProperty({ description: 'Merkle root of the batch; equals GET /v1/roots/{epoch}.root.' })
  batchRoot: string;

  @ApiProperty({ example: 0 })
  leafIndex: number;

  @ApiProperty({ type: [String], description: 'Sibling hashes from leaf to root.' })
  siblings: string[];

  @ApiProperty({ description: 'Transaction that anchored the batch root.' })
  txHash: string;

  @ApiProperty({ example: 'polygon-amoy', description: 'Registry that holds the batch root: "mock" (demo) or a chain such as "polygon-amoy".' })
  network: string;

  @ApiPropertyOptional({ description: 'MerkleAnchor contract address (on-chain receipts). Must equal GET /v1/chain.contract.' })
  contract?: string;
}

export class AnchorItemDto {
  @ApiProperty({ description: 'Public id of the anchor record.', example: 'a1b2c3d4' })
  id: string;

  @ApiProperty({ description: 'SHA-256 of the document (64 hex chars).' })
  sha256: string;

  @ApiProperty({ nullable: true, type: String, example: 'contract-v3.pdf' })
  label: string | null;

  @ApiProperty({ enum: ['pending', 'anchored'], description: '`pending` until the epoch closes.' })
  status: 'pending' | 'anchored';

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Present once anchored.' })
  anchoredAt?: string;

  @ApiPropertyOptional({ type: DocumentReceiptDto, description: 'Present once anchored.' })
  receipt?: DocumentReceiptDto;
}

export class AnchorRootDto {
  @ApiProperty({ example: 3, description: 'Epoch number (documents) or index version (verifiable search).' })
  version: number;

  @ApiProperty({ description: 'Anchored Merkle root (hex).' })
  root: string;

  @ApiProperty({
    example: 1762950000000,
    description:
      'Time of anchoring as a Unix timestamp. The demo registry returns milliseconds (Date.now()); ' +
      'an on-chain registry (block.timestamp) would return seconds, so clients should accept both.',
  })
  timestamp: number;

  @ApiProperty({ description: 'Anchoring transaction hash.' })
  txHash: string;
}

export class ChainInfoDto {
  @ApiProperty({ description: 'True when roots are written to a public blockchain.' })
  enabled: boolean;

  @ApiProperty({ example: 'polygon-amoy', description: '"mock" when the demo registry is used.' })
  network: string;

  @ApiProperty({ nullable: true, type: Number, example: 80002 })
  chainId: number | null;

  @ApiProperty({ nullable: true, type: String, description: 'The official MerkleAnchor contract.' })
  contract: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'https://amoy.polygonscan.com', description: 'Block explorer base URL.' })
  explorer: string | null;
}

export class CloseEpochResponse {
  @ApiProperty({ example: 2, description: 'How many pending documents were batched.' })
  anchored: number;

  @ApiPropertyOptional({ example: 4, description: 'Epoch number; absent when nothing was pending.' })
  epoch?: number;
}

export class ApiKeyDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'CI pipeline' })
  name: string;

  @ApiProperty({ example: 'ap_test_1a2b', description: 'Non-secret key prefix, to tell keys apart.' })
  prefix: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastUsedAt: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  revokedAt: string | null;
}

export class ApiKeyCreatedDto extends ApiKeyDto {
  @ApiProperty({
    example: 'ap_test_1a2b3c…',
    description: 'The full key. Returned ONLY in this response — store it now.',
  })
  secret: string;
}

// ───────────────────────── billing ─────────────────────────

export class PlanDto {
  @ApiProperty({ enum: ['free', 'pro', 'business', 'search'] })
  id: string;

  @ApiProperty({ example: 'Pro' })
  name: string;

  @ApiProperty({ example: 49 })
  priceUsd: number;

  @ApiProperty({ nullable: true, type: Number, example: 50000, description: 'Anchored documents per month; null = unlimited.' })
  anchorsPerMonth: number | null;

  @ApiProperty({ type: [String] })
  features: string[];
}

export class UsageDto {
  @ApiProperty({ example: 12 })
  anchorsThisMonth: number;

  @ApiProperty({ nullable: true, type: Number, example: 100 })
  anchorsLimit: number | null;

  @ApiProperty({ format: 'date-time', description: 'Start of the current billing/usage period.' })
  periodStart: string;
}

export class BillingOverviewDto {
  @ApiProperty({ enum: ['free', 'pro', 'business', 'search'] })
  plan: string;

  @ApiProperty({ example: 'Free' })
  planName: string;

  @ApiProperty({ enum: ['active', 'trialing', 'past_due', 'incomplete', 'canceled', 'unpaid'] })
  status: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  currentPeriodEnd: string | null;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ description: 'Whether a payment-provider customer exists for the user.' })
  hasPaymentAccount: boolean;

  @ApiProperty({ description: 'False when the server has no payment provider configured.' })
  billingEnabled: boolean;

  @ApiProperty({ type: UsageDto })
  usage: UsageDto;
}

export class CheckoutResponse {
  @ApiPropertyOptional({ description: 'Hosted checkout URL to redirect the user to (new subscription).' })
  url?: string;

  @ApiPropertyOptional({
    type: BillingOverviewDto,
    description: 'Returned instead of `url` when an existing paid subscription was switched in place.',
  })
  overview?: BillingOverviewDto;
}

export class InvoiceDto {
  @ApiProperty({ example: 'in_1Abc…' })
  id: string;

  @ApiProperty({ nullable: true, type: String, example: 'A1B2-0001' })
  number: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ example: 49, description: 'Amount in major currency units.' })
  amount: number;

  @ApiProperty({ example: 'usd' })
  currency: string;

  @ApiProperty({ example: 'paid' })
  status: string;

  @ApiProperty({ nullable: true, type: String })
  hostedUrl: string | null;

  @ApiProperty({ nullable: true, type: String })
  pdfUrl: string | null;
}

export class WebhookReceived {
  @ApiProperty({ example: true })
  received: boolean;
}

// ───────────────────────── verifiable search ─────────────────────────

export class SearchResultDto {
  @ApiProperty({ example: 'doc-17' })
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ example: 0.42, description: 'L2 distance to the query vector.' })
  distance: number;

  @ApiProperty({ example: 2, description: 'IVF cluster the document lives in.' })
  clusterId: number;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchResultDto], description: 'Top-k results, nearest first.' })
  results: SearchResultDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Proof that lets the client verify correctness, completeness (relative to nprobe) and freshness on its own: ' +
      '{ protocol: "ivf-ring-v2", indexVersion, globalRoot, k, nprobe, queryVector, centroids, ranges, resultIds }. ' +
      'Verify it with the `verification-sdk` package.',
  })
  proofBundle: Record<string, unknown>;

  @ApiProperty({ type: AnchorRootDto, description: 'Anchor of the index version that answered.' })
  anchor: AnchorRootDto;

  @ApiPropertyOptional({
    enum: ['hide', 'centroid', 'tamper', 'rollback'],
    description: 'Echoed when the demo server was asked to misbehave.',
  })
  simulatedAttack?: string;
}
