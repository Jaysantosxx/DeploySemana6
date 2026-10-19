import type { Book, Loan, Reservation, ShelfItem, User } from './types';

const configuredApiBase = import.meta.env.VITE_BACKEND_URL?.trim();
const API_BASE = (configuredApiBase || '/api').replace(/\/$/, '');

export interface LibrarySnapshot {
  user: User;
  loans: Loan[];
  reservations: Reservation[];
  shelf: ShelfItem[];
  notifications: string[];
}

export interface BookStatus {
  copies: number;
  free: number;
  canBorrow: boolean;
  myLoan: Loan | null;
  myReservation: Reservation | null;
  queuePosition: number | null;
}

interface RequestOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export class LibraryApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requestLibrary<T>(
  path: string,
  { token, method = 'GET', body, signal }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new DOMException('A requisição foi cancelada.', 'AbortError');
    throw new Error('Não foi possível conectar ao servidor da biblioteca.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LibraryApiError(
      response.ok
        ? 'O servidor retornou uma resposta inválida.'
        : `Erro HTTP ${response.status}. Verifique se o backend está disponível.`,
      response.status
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Erro HTTP ${response.status}`;
    throw new LibraryApiError(message, response.status);
  }

  return payload as T;
}

export function registerWithLibrary(name: string, email: string, password: string) {
  return requestLibrary<{ token: string }>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function loginToLibrary(email: string, password: string) {
  return requestLibrary<{ token: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getLibrarySnapshot(token: string) {
  return requestLibrary<LibrarySnapshot>('/me', { token });
}

export function getBookStatus(key: string, token?: string) {
  const id = key.replace('/works/', '');
  return requestLibrary<BookStatus>(`/books/${encodeURIComponent(id)}/status`, { token });
}

export function getAvailability(keys: string[], signal?: AbortSignal) {
  const ids = keys.map((key) => key.replace('/works/', '')).join(',');
  return requestLibrary<Record<string, { copies: number; free: number }>>(
    `/availability?ids=${encodeURIComponent(ids)}`,
    { signal }
  );
}

export function createLoan(key: string, title: string, token: string) {
  return requestLibrary<{ ok: true }>('/loans', {
    method: 'POST',
    token,
    body: { key, title },
  });
}

export function returnLoan(id: string, token: string) {
  return requestLibrary<{ ok: true }>(`/loans/${encodeURIComponent(id)}/return`, {
    method: 'POST',
    token,
  });
}

export function createReservation(key: string, title: string, token: string) {
  return requestLibrary<{ ok: true }>('/reservations', {
    method: 'POST',
    token,
    body: { key, title },
  });
}

export function deleteReservation(id: string, token: string) {
  return requestLibrary<{ ok: true }>(`/reservations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export function saveReadingStatus(book: Book, status: string | null, token: string) {
  return requestLibrary<{ ok: true }>('/shelf', {
    method: 'PUT',
    token,
    body: { book, status },
  });
}
