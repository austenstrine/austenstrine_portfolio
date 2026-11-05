import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class JoinDemoDto {
	@ApiProperty({ example: 'you@example.com' })
	@IsEmail()
	email!: string;
}
