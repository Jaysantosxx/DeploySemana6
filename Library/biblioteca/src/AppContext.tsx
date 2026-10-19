import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Loan, Reservation, ShelfItem, User } from './types';
import { AppCtx, type AppContextValue, type AuthError } from './AppContextStore';
import { clean } from './libraryHelpers';
import {
  createLoan,
  createReservation,
  deleteReservation,
  getAvailability,
  getBookStatus,
  getLibrarySnapshot,
  LibraryApiError,
  loginToLibrary,
  registerWithLibrary,
  returnLoan,
  saveReadingStatus,
  type BookStatus,
  type LibrarySnapshot,
} from './libraryApi';

const TOKEN_KEY = 'lib.token';

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    throw new Error('Não foi possível salvar a sessão neste navegador.');
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readToken);
  const [authReady, setAuthReady] = useState(() => !readToken());
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [bookStatuses, setBookStatuses] = useState<Record<string, BookStatus>>({});
  const [error, setError] = useState('');

  function applySnapshot(snapshot: LibrarySnapshot) {
    setUser(snapshot.user);
    setLoans(snapshot.loans);
    setReservations(snapshot.reservations);
    setShelf(snapshot.shelf);
    setNotifications(snapshot.notifications);
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    getLibrarySnapshot(token)
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof LibraryApiError && cause.status === 401) {
          storeToken(null);
          setToken(null);
          setAuthReady(true);
          setUser(null);
          setLoans([]);
          setReservations([]);
          setShelf([]);
        } else {
          setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar a sessão.');
        }
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function authenticate(
    request: () => Promise<{ token: string }>
  ): Promise<AuthError> {
    setError('');
    try {
      const result = await request();
      const snapshot = await getLibrarySnapshot(result.token);
      storeToken(result.token);
      setToken(result.token);
      applySnapshot(snapshot);
      setAuthReady(true);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : 'Não foi possível autenticar.';
    }
  }

  async function refreshSnapshot(currentToken: string) {
    applySnapshot(await getLibrarySnapshot(currentToken));
  }

  const updateBookStatus = useCallback(async (key: string, currentToken?: string) => {
    const status = await getBookStatus(key, currentToken);
    setBookStatuses((previous) => ({ ...previous, [key]: status }));
  }, []);

  const loadBookStatus = useCallback(async (key: string) => {
    try {
      await updateBookStatus(key, token ?? undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a disponibilidade.');
    }
  }, [token, updateBookStatus]);

  const loadAvailability = useCallback(async (keys: string[], signal?: AbortSignal) => {
    try {
      const availability = await getAvailability(keys, signal);
      setBookStatuses((previous) => {
        const next = { ...previous };
        for (const [id, count] of Object.entries(availability)) {
          const key = `/works/${id}`;
          next[key] = {
            copies: count.copies,
            free: count.free,
            canBorrow: previous[key]?.canBorrow ?? false,
            myLoan: previous[key]?.myLoan ?? null,
            myReservation: previous[key]?.myReservation ?? null,
            queuePosition: previous[key]?.queuePosition ?? null,
          };
        }
        return next;
      });
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível verificar a disponibilidade.');
      }
    }
  }, []);

  async function performAction(
    action: (currentToken: string) => Promise<unknown>,
    bookKey?: string
  ): Promise<AuthError> {
    if (!token) return 'Faça login para continuar.';
    setError('');
    try {
      await action(token);
      await refreshSnapshot(token);
      if (bookKey) await updateBookStatus(bookKey, token);
      return null;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.';
      if (cause instanceof LibraryApiError && cause.status === 401) {
        storeToken(null);
        setToken(null);
        setAuthReady(true);
        setUser(null);
        setLoans([]);
        setReservations([]);
        setShelf([]);
        setNotifications([]);
        setBookStatuses({});
      }
      setError(message);
      return message;
    }
  }

  const myLoan = (key: string) =>
    loans.find((loan) => loan.bookKey === key && !loan.returnedAt);
  const myReservation = (key: string) =>
    reservations.find((reservation) => reservation.bookKey === key);

  const value: AppContextValue = {
    user,
    authReady,
    error,
    dismissError: () => setError(''),
    register: (name, email, pw) =>
      authenticate(() => registerWithLibrary(clean(name), clean(email).toLowerCase(), pw)),
    login: (email, pw) =>
      authenticate(() => loginToLibrary(clean(email).toLowerCase(), pw)),
    logout() {
      storeToken(null);
      setToken(null);
      setUser(null);
      setLoans([]);
      setReservations([]);
      setShelf([]);
      setNotifications([]);
      setBookStatuses({});
      setError('');
    },
    freeCopies: (key) => bookStatuses[key]?.free ?? 0,
    bookStatus: (key) => bookStatuses[key],
    loadBookStatus,
    loadAvailability,
    myLoan,
    myReservation,
    canBorrow: (key) => Boolean(bookStatuses[key]?.canBorrow),
    borrow: (book) => performAction((currentToken) => createLoan(book.key, book.title, currentToken), book.key),
    giveBack: (loanId) => {
      const loan = loans.find((item) => item.id === loanId);
      return performAction(
        (currentToken) => returnLoan(loanId, currentToken),
        loan?.bookKey
      );
    },
    reserve: (book) =>
      performAction((currentToken) => createReservation(book.key, book.title, currentToken), book.key),
    cancelReservation: (id) => {
      const reservation = reservations.find((item) => item.id === id);
      return performAction(
        (currentToken) => deleteReservation(id, currentToken),
        reservation?.bookKey
      );
    },
    myLoans: loans,
    myReservations: reservations,
    myShelf: shelf,
    statusOf: (key) => shelf.find((item) => item.book.key === key)?.status,
    setStatus: (book, status) =>
      performAction((currentToken) => saveReadingStatus(book, status, currentToken)),
    notifications,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
