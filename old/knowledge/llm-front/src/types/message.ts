export interface MessageInput {
  type?: string;
  data?: Record<string, unknown>;
}

export interface SendMessageDto {
  contextId?: string;
  content: string;
  message?: string; // Deprecated - for backward compatibility
  sessionId?: string;
  userId?: string;
  input?: MessageInput;
}

export interface StreamPayload extends SendMessageDto {
  // Additional fields specific to streaming if needed
}
