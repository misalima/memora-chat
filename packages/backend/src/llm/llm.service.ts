import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client: any;
  private model: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get('AZURE_ENDPOINT');
    const token = this.configService.get('AZURE_TOKEN');
    this.model = this.configService.get('AZURE_MODEL', 'deepseek/DeepSeek-V3-0324');


    if (token && token !== 'seu_token_do_github') {
      this.client = ModelClient(endpoint, new AzureKeyCredential(token));
      this.logger.log(`Azure AI client initialized with model: ${this.model}`);
    } else {
      this.logger.warn('Azure token not configured, using mock mode');
    }

    
  }

  async generateResponse(userMessage: string, history: string[] = []): Promise<string> {
    this.logger.log(`Generating response for: ${userMessage.substring(0, 50)}...`);

    if (!this.client) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.getMockResponse(userMessage);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `Você é o Memora, um assistente de IA amigável e prestativo.
                    Você conversa de forma natural e ajuda o usuário com suas dúvidas.
                    Seja conciso mas completo nas respostas.`,
        },
        ...this.formatHistory(history),
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const response = await this.client.path('/chat/completions').post({
        body: {
          messages,
          temperature: 0.7,
          top_p: 1.0,
          max_tokens: 500,
          model: this.model,
        },
      });

      if (isUnexpected(response)) {
        this.logger.error('Azure API error:', response.body.error);
        return 'Desculpe, tive um problema ao processar sua mensagem.';
      }

      const content = response.body.choices[0]?.message?.content;
      return content || 'Desculpe, não consegui gerar uma resposta.';
    } catch (error) {
      this.logger.error('Azure API error:', error.message);
      return 'Desculpe, estou com problemas técnicos. Tente novamente mais tarde.';
    } finally {
      this.logger.log('Finished processing Azure API response');
    }
  }
  private formatHistory(history: string[]): Array<{ role: string; content: string }> {

    const formatted: Array<{ role: string; content: string }> = [];
    
    for (const msg of history) {
      if (msg.startsWith('User:')) {
        formatted.push({
          role: 'user',
          content: msg.replace('User:', '').trim(),
        });
      } else if (msg.startsWith('System:')) {
        formatted.push({
          role: 'assistant',
          content: msg.replace('System:', '').trim(),
        });
      }
    }
    
    return formatted;
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
