import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
