export interface ApiError {
  error: string;
  code?: string;
  details?: any;
  requestId?: string;
}

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (options.body && typeof options.body === 'string' && !options.headers) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiError = data || { error: 'Произошла ошибка при запросе' };
    throw error;
  }

  return data as T;
}
