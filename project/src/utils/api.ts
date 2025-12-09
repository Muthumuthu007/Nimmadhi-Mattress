import { axiosInstance } from './axiosInstance';
import { AxiosError } from 'axios';

// Re-export axiosInstance as apiClient for backward compatibility
export const apiClient = axiosInstance;

const MAX_RETRIES = 1;
const INITIAL_RETRY_DELAY = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function makeApiRequest<T = any>(
  payload: Record<string, any>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Use axiosInstance which already has the base URL and interceptors
      const response = await axiosInstance.post<T>('', payload);
      return response.data;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on authentication errors
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw error;
      }

      if (attempt < retries) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Request failed after multiple retries');
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    if (error.response?.status === 401) {
      return 'Invalid username or password.';
    }

    return error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export async function loginUser(username: string, password: string): Promise<any> {
  try {
    // We can use makeApiRequest here, which uses axiosInstance.
    // However, axiosInstance adds the token if present. 
    // For login, we usually don't have a token yet, or if we do, it might be old.
    // But since we're just sending a POST request, it should be fine.
    // The backend should ignore the token for login if it's invalid.

    const response = await makeApiRequest({
      operation: 'LoginUser',
      username: username.trim(),
      password: password.trim()
    });

    return response;
  } catch (error) {
    throw error;
  }
}

export async function fetchReportData(reportType: string, user: { username: string }, date?: string, month?: string) {
  let payload;

  switch (reportType) {
    case 'daily':
      payload = {
        operation: "GetDailyReport",
        report_date: date,
        username: user.username
      };
      break;
    case 'weekly':
      payload = {
        operation: "GetWeeklyReport",
        start_date: date,
        end_date: date,
        username: user.username
      };
      break;
    case 'monthly':
      payload = {
        operation: "GetMonthlyReport",
        month: month,
        username: user.username
      };
      break;
    default:
      throw new Error('Invalid report type');
  }

  return makeApiRequest(payload);
}