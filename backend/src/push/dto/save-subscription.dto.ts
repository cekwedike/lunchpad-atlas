import { IsString, IsUrl, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SaveSubscriptionDto {
  @IsUrl()
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
