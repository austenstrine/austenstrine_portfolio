import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUomDto {
  @ApiProperty({ example: 'FT' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must be uppercase letters, numbers, and underscores only.',
  })
  code!: string;

  @ApiProperty({ example: 'Foot' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: 'length' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  dimensionKey!: string;

  @ApiProperty({
    example: '0.3048',
    description: 'Multiply quantity in this UOM by this factor to reach the dimension reference unit.',
  })
  @IsNumberString()
  factorToReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
