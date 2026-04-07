import { IsOptional, IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  channelId: string;

  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
