/**
 * Utility functions for consistent error handling across the application
 */

export interface ErrorContext {
  operation: string;
  module: string;
  details?: Record<string, any>;
}

/**
 * Formats error messages consistently
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Unknown error occurred';
}

/**
 * Logs errors consistently with emoji prefix and context
 */
export function logError(context: ErrorContext, error: unknown): void {
  const errorMessage = formatError(error);
  const contextDetails = context.details ? ` - ${JSON.stringify(context.details)}` : '';
  console.error(`❌ [${context.module}] ${context.operation} failed: ${errorMessage}${contextDetails}`);
}

/**
 * Logs errors and throws with consistent format
 */
export function throwError(context: ErrorContext, error: unknown): never {
  logError(context, error);
  const errorMessage = formatError(error);
  throw new Error(`${context.operation} failed: ${errorMessage}`);
}

/**
 * Logs successful operations consistently
 */
export function logSuccess(module: string, operation: string, details?: Record<string, any>): void {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`✅ [${module}] ${operation}${detailsStr}`);
}

/**
 * Logs info messages consistently  
 */
export function logInfo(module: string, message: string, details?: Record<string, any>): void {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`ℹ️  [${module}] ${message}${detailsStr}`);
}