/**
 * Raw result from a pgvector similarity search query.
 */
export interface VectorSearchResult {
  id: string;
  messageId: string;
  content: string;
  role: string;
  similarity: number;
  createdAt: Date;
}
