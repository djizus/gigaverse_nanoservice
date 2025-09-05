export interface ValidationError {
  message: string[];
  error: string;
  statusCode: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export function isValidationError(error: any): error is ValidationError {
  return (
    error &&
    Array.isArray(error.message) &&
    typeof error.statusCode === 'number'
  );
}

export function parseApiError(response: Response, data: any): string {
  // Handle validation errors (array of messages)
  if (isValidationError(data)) {
    return data.message.join(', ');
  }

  // Handle single message error
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }

  // Handle generic error
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  // Default error message based on status code
  switch (response.status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Unauthorized. Please log in.';
    case 403:
      return 'Access forbidden.';
    case 404:
      return 'Resource not found.';
    case 500:
      return 'Internal server error. Please try again later.';
    default:
      return `Error: ${response.status} ${response.statusText}`;
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, use status text
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const errorMessage = parseApiError(response, errorData);
    throw new Error(errorMessage);
  }

  return response.json();
}
