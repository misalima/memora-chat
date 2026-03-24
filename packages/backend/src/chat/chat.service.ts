import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { LlmService } from 'src/llm/llm.service';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(LlmService.name);

    constructor(
        private prisma: PrismaService, 
        private llmService: LlmService
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
            console.log(`New conversation created with ID: ${conversationId}`);
        } else {
            const conversation = await this.prisma.conversation.findFirst({
                where: { id: conversationId, userId }
            });
            if (!conversation) {
                this.logger.error('Conversation not found or does not belong to the user');
                throw new Error('Conversation not found or does not belong to the user');
            }
        }

        const userMessage = await this.prisma.message.create({
            data: {
                conversationId,
                userId,
                role: 'user',
                content: dto.content
            },
        });
        this.logger.log('User message created successfully');


        const recentMessages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' }, 
            take: 10,
        });

        const historyMessages = recentMessages
        .reverse()
        .map(msg => `${msg.role === 'user' ? 'User' : 'System'}: ${msg.content}`);


        this.logger.log('Calling LLM api...')
        const responseText = await this.llmService.generateResponse(
            dto.content, 
            historyMessages
        );

        const assistantMessage = await this.prisma.message.create({
            data: {
                conversationId: conversationId, 
                userId, 
                role: 'assistant',
                content: responseText,
            }
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
