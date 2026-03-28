/**
 * Represents the fully assembled context that will be sent to the LLM.
 * The MemoryService builds this from the 3 memory layers.
 */
export interface MemoryContext {
  /** The latest rolling summary of the conversation, if available */
  summary: string | null;

  /** Semantically relevant past messages retrieved via RAG */
  relevantMessages: RelevantMessage[];

  /** Most recent messages (short-term window) */
  recentMessages: RecentMessage[];
}

export interface RelevantMessage {
  content: string;
  role: string;
  similarity: number;
  createdAt: Date;
}

export interface RecentMessage {
  role: string;
  content: string;
}
