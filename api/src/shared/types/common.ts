// Common types shared across all domains
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionInfo {
  sessionId: string;
  requestCount?: number;
}

export interface GameActivity {
  runs: number;
  sessionId: string;
}

export interface ActivityResult {
  runNumber: number;
  timestamp: string;
}

export interface ActivitySummary {
  totalRuns: number;
  sessionId: string;
  message: string;
}

// Base interfaces for game activities
export interface GameActivityRequest extends GameActivity {
  runs: number;
  sessionId: string;
}

export interface GameActivityResponse<TResult extends ActivityResult, TSummary = any> {
  success: boolean;
  sessionId: string;
  totalRuns: number;
  results: TResult[];
  summary?: TSummary;
  message: string;
}