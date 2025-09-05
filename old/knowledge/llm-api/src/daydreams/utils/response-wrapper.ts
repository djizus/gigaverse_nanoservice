export class ResponseWrapper {
  static async tryExecute<T>(
    action: () => Promise<T>,
  ): Promise<({ success: true } & T) | { success: false; error: string }> {
    try {
      const result = await action();
      return {
        success: true as const,
        ...result,
      };
    } catch (error: any) {
      return {
        success: false as const,
        error: error?.message || 'An unexpected error occurred',
      };
    }
  }
}
