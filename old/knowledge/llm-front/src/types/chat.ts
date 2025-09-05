export interface ResponseItem {
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}
