import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { LlmService } from 'src/llm/llm.service';
import { MemoryService } from 'src/memory/memory.service';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private prisma: PrismaService, 
        private llmService: LlmService,
        private memoryService: MemoryService,
    ) {}

    async sendMessage(userId: string, dto: SendMessageDto) {
        let conversationId = dto.conversationId;
        
        if (!conversationId) {
            const newConversation = await this.prisma.conversation.create({
                data: {
                    title: `Nova conversa`,
                    userId: userId,
                }
            });
            conversationId = newConversation.id;
            this.logger.log(`New conversation created with ID: ${conversationId}`);
        } else {
            const conversation = await this.prisma.conversation.findFirst({
                where: { id: conversationId, userId }
            });
            if (!conversation) {
                this.logger.error('Conversation not found or does not belong to the user');
                throw new Error('Conversation not found or does not belong to the user');
            }
        }

        // Save user message
        const userMessage = await this.prisma.message.create({
            data: {
                conversationId,
                userId,
                role: 'user',
                content: dto.content
            },
        });
        this.logger.log('User message created successfully');

        // Persist user message embedding (fire-and-forget)
        this.memoryService.persistMessage(userMessage.id, dto.content).catch((err) => {
            this.logger.error(`Failed to persist user embedding: ${err.message}`);
        });

        // Build context from all 3 memory layers
        const context = await this.memoryService.buildContext(conversationId, dto.content);

        // Generate LLM response with full memory context
        this.logger.log('Calling LLM API with memory context...');
        const responseText = await this.llmService.generateResponse(
            dto.content, 
            context,
        );

        const assistantMessage = await this.prisma.message.create({
            data: {
                conversationId: conversationId, 
                userId, 
                role: 'assistant',
                content: responseText,
            }
        });

        // Persist assistant message embedding (fire-and-forget)
        this.memoryService.persistMessage(assistantMessage.id, responseText).catch((err) => {
            this.logger.error(`Failed to persist assistant embedding: ${err.message}`);
        });

        const messageCount = await this.prisma.message.count({
            where: { conversationId },
        });

        if (messageCount === 2) {
            const newTitle = dto.content.substring(0, 50) + (dto.content.length < 40 ? '...' : '');

            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { title: newTitle },
            });
        }

        return {
            id: assistantMessage.id, 
            content: responseText,
            conversationId, 
            createdAt: assistantMessage.createdAt
        }
    }

    async getConversationMessages(userId: string, conversationId: string) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, userId }
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });

        return {
            conversation, 
            messages,
        }
    }

    async getUserConversations(userId: string) {
        const conversations = await this.prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }, 
                    take: 1,
                }
            }
        });


        return conversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            lastMessage: conv.messages[0]?.content || null
        }));
    }
}

