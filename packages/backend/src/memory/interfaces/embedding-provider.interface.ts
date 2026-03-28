/**
 * Interface for embedding generation providers.
 * Follows ISP (Interface Segregation Principle) — consumers only
 * depend on the embedding capability they need.
 */
export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
