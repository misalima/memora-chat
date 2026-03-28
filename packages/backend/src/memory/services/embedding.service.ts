import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { IEmbeddingProvider } from '../interfaces';

/**
 * Generates text embeddings using Azure AI / GitHub Models endpoint.
 * Implements IEmbeddingProvider for easy future swapping (e.g., to a local model).
 */
@Injectable()
export class EmbeddingService implements IEmbeddingProvider {
  private readonly logger = new Logger(EmbeddingService.name);
  private client: any;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly maxRetries = 3;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_ENDPOINT', '');
    const token = this.configService.get<string>('AZURE_TOKEN', '');
    this.model = this.configService.get<string>('EMBEDDING_MODEL', 'openai/text-embedding-3-large');
    this.dimensions = this.configService.get<number>('EMBEDDING_DIMENSIONS', 1536);

    if (token && token !== 'seu_token_do_github') {
      this.client = ModelClient(endpoint, new AzureKeyCredential(token));
      this.logger.log(`Embedding client initialized — model: ${this.model}, dimensions: ${this.dimensions}`);
    } else {
      this.logger.warn('Azure token not configured, embedding service will use mock vectors');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.generateEmbeddings([text]);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.logger.log(`[EmbeddingService] Generating embedding for ${texts.length} messages`);
    if (!this.client) {
      this.logger.warn('Using mock embeddings (no Azure token configured)');
      return texts.map(() => this.generateMockEmbedding());
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      this.logger.log(`[EmbeddingService] Attempt ${attempt}/${this.maxRetries}`);
      try {
        const apiPromise = this.client.path('/embeddings').post({
          body: {
            input: texts,
            model: this.model,
            dimensions: Number(this.dimensions),
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Embedding API timeout (15s)')), 15_000),
        );

        const response = await Promise.race([apiPromise, timeoutPromise]);

        if (isUnexpected(response)) {
          throw new Error(`Embedding API error: ${JSON.stringify(response.body.error)}`);
        }

        const embeddings = response.body.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => item.embedding);

        this.logger.debug(`Generated ${embeddings.length} embeddings successfully`);
        return embeddings;
      } catch (error) {
        this.logger.warn(`Embedding attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);

        if (attempt === this.maxRetries) {
          this.logger.error('All embedding retries exhausted, falling back to mock');
          return texts.map(() => this.generateMockEmbedding());
        }

        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    return texts.map(() => this.generateMockEmbedding());
  }

  /**
   * Generates a deterministic-ish mock embedding for development/testing
   * when no Azure token is configured.
   */
  private generateMockEmbedding(): number[] {
    return Array.from({ length: this.dimensions }, () => (Math.random() - 0.5) * 0.1);
  }
}
