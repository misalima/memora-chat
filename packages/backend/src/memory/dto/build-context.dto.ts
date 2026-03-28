import { IsString } from 'class-validator';

/**
 * Input DTO for building context from the memory layers.
 */
export class BuildContextDto {
  @IsString()
  conversationId: string;

  @IsString()
  currentQuery: string;
}
