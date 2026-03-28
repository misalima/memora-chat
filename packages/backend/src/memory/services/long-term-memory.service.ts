import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { RelevantMessage } from '../interfaces';

/**
 * Long-Term Memory (RAG): retrieves semantically similar past messages
 * by embedding the current query and searching pgvector.
 */
@Injectable()
export class LongTermMemoryService {
  private readonly logger = new Logger(LongTermMemoryService.name);
  private readonly topK: number;
  private readonly similarityThreshold = 0.5;

  constructor(
    private embeddingService: EmbeddingService,
    private vectorStoreService: VectorStoreService,
    private configService: ConfigService,
  ) {
    this.topK = this.configService.get<number>('MEMORY_LONG_TERM_TOP_K', 5);
  }

  async retrieveRelevantContext(
    query: string,
    conversationId: string,
  ): Promise<RelevantMessage[]> {
    try {
      // 1. Generate embedding for the current query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // 2. Search for similar messages in pgvector
      const results = await this.vectorStoreService.searchSimilar(
        queryEmbedding,
        conversationId,
        this.topK,
      );

      this.logger.debug(`Vector search results: ${JSON.stringify(results)}`);

      // 3. Filter by similarity threshold
      const relevant = results
        .filter((r) => Number(r.similarity) >= this.similarityThreshold)
        .map((r) => ({
          content: r.content,
          role: r.role,
          similarity: Number(r.similarity),
          createdAt: r.createdAt,
        }));

      this.logger.debug(
        `RAG retrieved ${relevant.length}/${results.length} messages above threshold ${this.similarityThreshold}`,
      );

      this.logger.debug(`Relevant messages: ${JSON.stringify(relevant)}`);

      return relevant;
    } catch (error) {
      this.logger.error(`Long-term memory retrieval failed: ${error.message}`);
      return [];
    }
  }
}
