import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBrokenPackDto {
  @IsUUID()
  packOfferingId!: string;

  @IsString()
  remainingQty!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
