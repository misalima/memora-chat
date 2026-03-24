import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
