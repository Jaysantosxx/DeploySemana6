export interface Book {
  key: string; // ex: /works/OL45883W
  title: string;
  author: string;
  year?: number;
  coverId?: number;
  subjects: string[];
  popularity: number;
}
export interface BookDetail extends Book { description: string }

export interface User { id: string; name: string; email: string }
export interface Loan {
  id: string; userId: string; bookKey: string; title: string;
  borrowedAt: string; dueAt: string; returnedAt?: string | null;
}
export interface Reservation {
  id: string; userId: string; bookKey: string; title: string; createdAt: string;
}
export type ReadStatus = 'Lendo' | 'Concluído' | 'Lista de desejos';
export interface ShelfItem { userId: string; book: Book; status: ReadStatus; updatedAt: string }