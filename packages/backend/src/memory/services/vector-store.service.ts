import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorSearchResult } from '../interfaces';

/**
 * Handles persistence and retrieval of vector embeddings in PostgreSQL via pgvector.
 * Uses Prisma's $queryRawUnsafe / $executeRawUnsafe for vector operations
 * since Prisma doesn't natively support the vector type.
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Persists an embedding vector for a given message.
   * Uses raw SQL because Prisma can't handle Unsupported("vector") fields via the ORM.
   */
  async saveEmbedding(messageId: string, embedding: number[]): Promise<void> {
    const vectorString = `[${embedding.join(',')}]`;

    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "MessageEmbedding" (id, "messageId", embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2::vector, NOW())
         ON CONFLICT ("messageId") DO UPDATE SET embedding = $2::vector`,
        messageId,
        vectorString,
      );
      this.logger.debug(`Saved embedding for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to save embedding for message ${messageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Performs cosine similarity search against all embeddings in a conversation.
   * Returns the top-K most similar messages.
   */
  async searchSimilar(
    queryEmbedding: number[],
    conversationId: string,
    topK: number,
  ): Promise<VectorSearchResult[]> {
    const vectorString = `[${queryEmbedding.join(',')}]`;

    try {
      const results = await this.prisma.$queryRawUnsafe<VectorSearchResult[]>(
        `SELECT
           me.id,
           me."messageId",
           m.content,
           m.role,
           m."createdAt",
           1 - (me.embedding <=> $1::vector) AS similarity
         FROM "MessageEmbedding" me
         JOIN "Message" m ON m.id = me."messageId"
         WHERE m."conversationId" = $2
         ORDER BY me.embedding <=> $1::vector
         LIMIT $3`,
        vectorString,
        conversationId,
        topK,
      );

      this.logger.debug(
        `Vector search returned ${results.length} results for conversation ${conversationId}`,
      );
      return results;
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return [];
    }
  }
}
