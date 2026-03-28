import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LlmModule } from 'src/llm/llm.module';
import { MemoryService } from './memory.service';
import { EmbeddingService } from './services/embedding.service';
import { VectorStoreService } from './services/vector-store.service';
import { ShortTermMemoryService } from './services/short-term-memory.service';
import { LongTermMemoryService } from './services/long-term-memory.service';
import { RollingSummaryService } from './services/rolling-summary.service';

@Module({
  imports: [PrismaModule, LlmModule],
  providers: [
    MemoryService,
    EmbeddingService,
    VectorStoreService,
    ShortTermMemoryService,
    LongTermMemoryService,
    RollingSummaryService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
