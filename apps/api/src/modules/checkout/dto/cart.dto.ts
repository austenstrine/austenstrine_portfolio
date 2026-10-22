import { Type } from 'class-transformer';
import {
	IsNumberString,
	IsOptional,
	IsUUID,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { QtyCompoundDto } from '../../catalog/dto/qty-compound.dto';

export class UpsertCartLineDto {
	@IsUUID()
	offeringId!: string;

	@ValidateIf((dto: UpsertCartLineDto) => !dto.qtyCompound)
	@IsNumberString()
	quantity?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => QtyCompoundDto)
	qtyCompound?: QtyCompoundDto;
}
