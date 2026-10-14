import { IsNumberString, IsUUID } from 'class-validator';

export class UpsertCartLineDto {
	@IsUUID()
	offeringId!: string;

	@IsNumberString()
	quantity!: string;
}
