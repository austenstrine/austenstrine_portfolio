import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const trimStrategies = [
  'WHOLE_UNITS_FIRST',
  'SMALLEST_REMAINDER_FIRST',
  'LARGEST_REMAINDER_FIRST',
] as const;

export class TrimInventoryDto {
  @IsUUID()
  pieceOfferingId!: string;

  @IsString()
  quantityInPieceUom!: string;

  @IsOptional()
  @IsIn(trimStrategies)
  strategy?: (typeof trimStrategies)[number];

  @IsOptional()
  @IsString()
  leewayAbs?: string;

  @IsOptional()
  @IsString()
  leewayRatio?: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
