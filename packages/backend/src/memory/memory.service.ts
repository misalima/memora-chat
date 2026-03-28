import { Injectable, Logger } from '@nestjs/common';
import { MemoryContext } from './interfaces';
import { ShortTermMemoryService } from './services/short-term-memory.service';
import { LongTermMemoryService } from './services/long-term-memory.service';
import { RollingSummaryService } from './services/rolling-summary.service';
import { EmbeddingService } from './services/embedding.service';
import { VectorStoreService } from './services/vector-store.service';

/**
 * Orchestrator that assembles conversation context from all 3 memory layers:
 *   1. Short-term (recent messages)
 *   2. Long-term / RAG (semantically similar past messages)
 *   3. Rolling Summary (compressed history)
 *
 * Also handles persisting new messages as embeddings for future retrieval.
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private shortTermMemory: ShortTermMemoryService,
    private longTermMemory: LongTermMemoryService,
    private rollingSummary: RollingSummaryService,
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStoreService,
  ) {}

  /**
   * Builds the full memory context for a conversation turn.
   * Runs the 3 retrievals in parallel for performance.
   */
  async buildContext(conversationId: string, currentQuery: string): Promise<MemoryContext> {
    this.logger.log(`Building context for conversation ${conversationId}`);

    // Fire rolling summary check (non-blocking — don't delay the response)
    this.rollingSummary.checkAndSummarize(conversationId).catch((err) => {
      this.logger.error(`Background summary check failed: ${err.message}`);
    });
    
    // Run all 3 retrieval layers in parallel
    const [recentMessages, relevantMessages, summary] = await Promise.all([
      this.shortTermMemory.getRecentMessages(conversationId),
      this.longTermMemory.retrieveRelevantContext(currentQuery, conversationId),
      this.rollingSummary.getLatestSummary(conversationId),
    ]);

    this.logger.log(
      `Context built — recent: ${recentMessages.length}, relevant: ${relevantMessages.length}, summary: ${summary ? 'yes' : 'no'}`,
    );

    return {
      summary,
      relevantMessages,
      recentMessages,
    };
  }

  /**
   * Generates and persists an embedding for a message.
   * Called asynchronously after each user/assistant message is saved.
   */
  async persistMessage(messageId: string, content: string): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(content);
      await this.vectorStore.saveEmbedding(messageId, embedding);
      this.logger.debug(`Persisted embedding for message ${messageId}`);
    } catch (error) {
      // Embedding persistence is non-critical — log and continue
      this.logger.error(`Failed to persist embedding for ${messageId}: ${error.message}`);
    }
  }
}
