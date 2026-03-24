import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService){}

    @Post('send')
    sendMessage(@Request() req, @Body() dto: SendMessageDto) {
        return this.chatService.sendMessage(req.user.id, dto);
    }

    @Get('conversations')
    getConversations(@Request() req) {
        return this.chatService.getUserConversations(req.user.userId);
    }

    @Get('conversations/:id/messages')
    getMessages(@Request() req, @Param('id') conversationId: string) {
        return this.chatService.getConversationMessages(req.user.userId, conversationId);
    }
}
