import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export const SIMULATED_ATTACKS = ['hide', 'centroid', 'tamper', 'rollback'] as const;
export type SimulatedAttack = (typeof SIMULATED_ATTACKS)[number];

export class VerifiableSearchDto {
  @ApiProperty({ example: 'refund policy', description: 'Free-text query, embedded server-side.' })
  @IsString()
  @MinLength(1)
  query: string;

  @ApiProperty({ minimum: 1, maximum: 20, example: 4, description: 'How many nearest results to return.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  k: number;

  @ApiProperty({ minimum: 1, maximum: 8, example: 2, description: 'How many IVF clusters to probe.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  nprobe: number;

  /** Test environments only: make the server misbehave so the client's detection can be shown. */
  @ApiPropertyOptional({
    enum: SIMULATED_ATTACKS,
    description: 'Test environments only (rejected in production).',
  })
  @IsOptional()
  @IsIn(SIMULATED_ATTACKS)
  attack?: SimulatedAttack;
}
