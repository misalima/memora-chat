import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { RecentMessage } from '../interfaces';

/**
 * Short-Term Memory: retrieves the most recent N messages from a conversation.
 * The window size is configurable via MEMORY_SHORT_TERM_LIMIT env var.
 */
@Injectable()
export class ShortTermMemoryService {
  private readonly logger = new Logger(ShortTermMemoryService.name);
  private readonly limit: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.limit = this.configService.get<number>('MEMORY_SHORT_TERM_LIMIT', 10);
    this.logger.log(`Short-term memory window: ${this.limit} messages`);
  }

  async getRecentMessages(conversationId: string): Promise<RecentMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: Number(this.limit),
      select: {
        role: true,
        content: true,
      },
    });

    // Reverse to chronological order (was fetched newest-first for the LIMIT)
    return messages.reverse();
  }
}
