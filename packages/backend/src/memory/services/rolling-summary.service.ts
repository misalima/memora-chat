import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { LlmService } from 'src/llm/llm.service';

/**
 * Rolling Summary: monitors conversation length and automatically generates
 * a compressed summary when the message count exceeds a threshold.
 * This preserves the "essence" of long conversations while saving tokens.
 */
@Injectable()
export class RollingSummaryService {
  private readonly logger = new Logger(RollingSummaryService.name);
  private readonly threshold: number;

  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
    private configService: ConfigService,
  ) {
    this.threshold = this.configService.get<number>('MEMORY_SUMMARY_THRESHOLD', 20);
    this.logger.log(`Rolling summary threshold: ${this.threshold} messages`);
  }

  /**
   * Returns the latest conversation summary, or null if none exists.
   */
  async getLatestSummary(conversationId: string): Promise<string | null> {
    const summary = await this.prisma.conversationSummary.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: { summary: true },
    });

    return summary?.summary ?? null;
  }

  /**
   * Checks if the conversation has grown past the threshold since the last summary.
   * If so, generates a new rolling summary and persists it.
   */
  async checkAndSummarize(conversationId: string): Promise<void> {
    try {
      // Find total messages and the count already covered by the latest summary
      const latestSummary = await this.prisma.conversationSummary.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { messagesIncluded: true, createdAt: true },
      });

      const totalMessages = await this.prisma.message.count({
        where: { conversationId },
      });

      const alreadySummarized = latestSummary?.messagesIncluded ?? 0;
      const unsummarizedCount = totalMessages - alreadySummarized;

      if (unsummarizedCount < this.threshold) {
        this.logger.debug(
          `Conversation ${conversationId}: ${unsummarizedCount}/${this.threshold} unsummarized — skipping`,
        );
        return;
      }

      this.logger.log(
        `Conversation ${conversationId}: ${unsummarizedCount} unsummarized messages — generating summary`,
      );

      // Fetch the unsummarized messages
      const messages = await this.prisma.message.findMany({
        where: {
          conversationId,
          ...(latestSummary?.createdAt
            ? { createdAt: { gt: latestSummary.createdAt } }
            : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      });

      const formattedMessages = messages.map(
        (m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`,
      );

      // Generate summary via LLM
      const summaryText = await this.llmService.generateSummary(formattedMessages);

      // Persist the summary
      await this.prisma.conversationSummary.create({
        data: {
          conversationId,
          summary: summaryText,
          messagesIncluded: totalMessages,
        },
      });

      this.logger.log(
        `Rolling summary created for conversation ${conversationId} (${totalMessages} msgs covered)`,
      );
    } catch (error) {
      // Summary generation is non-critical — log and continue
      this.logger.error(`Rolling summary failed for ${conversationId}: ${error.message}`);
    }
  }
}
