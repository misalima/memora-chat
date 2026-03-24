import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { LlmModule } from 'src/llm/llm.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [LlmModule],
  providers: [ChatService, PrismaService],
  controllers: [ChatController],
  exports: [ChatService, LlmModule],
})
export class ChatModule {}
