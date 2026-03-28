import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { MemoryContext } from 'src/memory/interfaces';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client: any;
  private model: string;

  private readonly systemPrompt = `Você é o Memora, um assistente de IA amigável e prestativo.
Você conversa de forma natural e ajuda o usuário com suas dúvidas.
Seja conciso mas completo nas respostas.`;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get('AZURE_ENDPOINT');
    const token = this.configService.get('AZURE_TOKEN');
    this.model = this.configService.get('AZURE_MODEL', 'openai/gpt-4.1-mini');

    if (token && token !== 'seu_token_do_github') {
      this.client = ModelClient(endpoint, new AzureKeyCredential(token));
      this.logger.log(`Azure AI client initialized with model: ${this.model}`);
    } else {
      this.logger.warn('Azure token not configured, using mock mode');
    }
  }

  /**
   * Generates a chat response using the full memory context.
   */
  async generateResponse(userMessage: string, context: MemoryContext): Promise<string> {
    this.logger.log(`Generating response for: ${userMessage.substring(0, 50)}...`);

    if (!this.client) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.getMockResponse(userMessage);
    }

    try {
      const messages = this.buildMessages(userMessage, context);

      const apiPromise = this.client.path('/chat/completions').post({
        body: {
          messages,
          temperature: 0.7,
          top_p: 1.0,
          max_tokens: 500,
          model: this.model,
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT: Azure API não respondeu dentro de 45 segundos'));
        }, 45000);
      });

      this.logger.log('Request sent to Azure AI, awaiting response...');

      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (isUnexpected(response)) {
        this.logger.error('Azure API error:', response.body.error);
        return 'Desculpe, tive um problema ao processar sua mensagem.';
      }

      const content = response.body.choices[0]?.message?.content;
      return content || 'Desculpe, não consegui gerar uma resposta.';
    } catch (error) {
      if (error.message && error.message.includes('TIMEOUT')) {
        this.logger.error('Azure API timeout - resposta muito lenta');
        return 'A IA está demorando para responder. Tente novamente em alguns instantes.';
      }
      this.logger.error('Azure API error:', error.message);
      return 'Desculpe, estou com problemas técnicos. Tente novamente mais tarde.';
    } finally {
      this.logger.log('Finished processing Azure API response');
    }
  }

  /**
   * Generates a rolling summary of a conversation segment.
   * Used by RollingSummaryService when the conversation exceeds the threshold.
   */
  async generateSummary(messages: string[]): Promise<string> {
    this.logger.log(`Generating rolling summary for ${messages.length} messages`);

    if (!this.client) {
      return `[Mock Summary] Resumo de ${messages.length} mensagens da conversa.`;
    }

    try {
      const response = await this.client.path('/chat/completions').post({
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um assistente especializado em sumarização.
Gere um resumo conciso e informativo da conversa abaixo, preservando:
- Os tópicos principais discutidos
- Decisões tomadas ou conclusões alcançadas
- Informações pessoais ou preferências mencionadas pelo usuário
- Contexto importante que possa ser relevante para continuidade

Responda APENAS com o resumo, sem prefixos como "Resumo:" ou explicações.`,
            },
            {
              role: 'user',
              content: `Resuma a seguinte conversa:\n\n${messages.join('\n')}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          model: this.model,
        },
      });

      if (isUnexpected(response)) {
        throw new Error(`Summary API error: ${JSON.stringify(response.body.error)}`);
      }

      return response.body.choices[0]?.message?.content || 'Resumo indisponível.';
    } catch (error) {
      this.logger.error(`Summary generation failed: ${error.message}`);
      return `Resumo automático indisponível (${messages.length} mensagens).`;
    }
  }

  /**
   * Builds the structured message array for the LLM from the memory context.
   * Order: System Prompt → Summary → Relevant (RAG) → Recent → Current Query
   */
  private buildMessages(
    userMessage: string,
    context: MemoryContext,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // 1. System prompt
    messages.push({ role: 'system', content: this.systemPrompt });

    // 2. Rolling summary (if available)
    if (context.summary) {
      messages.push({
        role: 'system',
        content: `Resumo da conversa anterior:\n${context.summary}`,
      });
    }

    // 3. RAG-retrieved relevant messages (as additional context)
    if (context.relevantMessages.length > 0) {
      const relevantContext = context.relevantMessages
        .map((m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      messages.push({
        role: 'system',
        content: `Trechos relevantes de momentos anteriores da conversa:\n${relevantContext}`,
      });
    }

    // 4. Recent messages (short-term window)
    for (const msg of context.recentMessages) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // 5. Current user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  private getMockResponse(userMessage: string): string {
    const responses = [
      `Olá! Você disse: "${userMessage.substring(0, 80)}..." Como posso ajudar?`,
      `Interessante! Me conte mais sobre isso.`,
      `Entendo. Vamos explorar esse assunto juntos.`,
      `Essa é uma ótima pergunta! Vou pensar sobre o que você falou.`,
      `Com base no que você disse, eu sugiro... (modo simulação)`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

