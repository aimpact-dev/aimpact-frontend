import { useState, useCallback, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { useAuth } from './useAuth';
import { HttpError } from '../errors';

interface FetchOptions extends RequestInit {
  showError?: boolean;
}

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useFetch<T = any>() {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: false,
  });
  const { disconnect, isAuthorized } = useAuth();

  const handleError = useCallback((error: any, showError: boolean) => {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    setState({ data: null, error: error as Error, loading: false });

    if (showError && (error.status ? error.status !== 400 : true)) {
      toast.error(errorMessage);
    }

    throw error;
  }, []);

  const fetchDataAuthorized = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<T> => {
      const { showError = true, ...fetchOptions } = options;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const headers = new Headers(fetchOptions.headers);

        const authToken = Cookies.get('authToken');

        if (!authToken) {
          Cookies.remove('authToken');
          throw new HttpError('No authentication token found', { status: 401 });
        }

        headers.set('Authorization', `Bearer ${authToken}`);
        if (!headers.get('Accep')) {
          headers.set('Accept', 'application/json');
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        if (response.status === 401) {
          await disconnect();

          const msg = 'Session expired. Please reconnect your wallet.';
          toast.error(msg);
          throw new HttpError(msg, { status: response.status });
        }

        if (!response.ok) {
          const msg = `HTTP error! status: ${response.status}`;
          if (response.status !== 404) {
            toast.error(msg);
          }
          throw new HttpError(msg, { status: response.status });
        }

        let rawData = await response.text();
        if (!rawData) {
          return rawData as T;
        }
        // const data = (await response.json()) as T;
        const data = JSON.parse(rawData) as T;
        setState({ data, error: null, loading: false });

        return data;
      } catch (error) {
        return handleError(error, showError);
      }
    },
    [disconnect, handleError],
  );

  const fetchDataUnauthorized = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<T> => {
      const { showError = true, ...fetchOptions } = options;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const headers = new Headers(fetchOptions.headers);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        if (!response.ok) {
          throw new HttpError(`HTTP error! status: ${response.status}`, { status: response.status });
        }

        const data = (await response.json()) as T;
        setState({ data, error: null, loading: false });

        return data;
      } catch (error) {
        return handleError(error, showError);
      }
    },
    [handleError],
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    fetchDataAuthorized,
    fetchDataUnauthorized,
    reset,
    isAuthorized,
  };
}
