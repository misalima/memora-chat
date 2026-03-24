import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { LlmModule } from './llm/llm.module';


@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }), ChatModule, LlmModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
