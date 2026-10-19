import { createContext, useContext } from 'react';
import type { Book, Loan, ReadStatus, Reservation, ShelfItem, User } from './types';
import type { BookStatus } from './libraryApi';

export type AuthError = string | null;
export interface AppContextValue {
  user: User | null;
  authReady: boolean;
  error: string;
  dismissError(): void;
  register(name: string, email: string, pw: string): Promise<AuthError>;
  login(email: string, pw: string): Promise<AuthError>;
  logout(): void;
  freeCopies(key: string): number;
  bookStatus(key: string): BookStatus | undefined;
  loadBookStatus(key: string): Promise<void>;
  loadAvailability(keys: string[], signal?: AbortSignal): Promise<void>;
  myLoan(key: string): Loan | undefined;
  myReservation(key: string): Reservation | undefined;
  canBorrow(key: string): boolean;
  borrow(b: Pick<Book, 'key' | 'title'>): Promise<AuthError>;
  giveBack(loanId: string): Promise<AuthError>;
  reserve(b: Pick<Book, 'key' | 'title'>): Promise<AuthError>;
  cancelReservation(id: string): Promise<AuthError>;
  myLoans: Loan[];
  myReservations: Reservation[];
  myShelf: ShelfItem[];
  statusOf(key: string): ReadStatus | undefined;
  setStatus(b: Book, s: ReadStatus | null): Promise<AuthError>;
  notifications: string[];
}

export const AppCtx = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppCtx);
