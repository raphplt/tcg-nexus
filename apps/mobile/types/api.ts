export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}
