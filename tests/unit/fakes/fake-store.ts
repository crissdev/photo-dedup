import { type Store } from '@/lib/server/db/store';

export class FakeStore implements Store {
  runInTransaction = async <T = unknown>(callback: () => Promise<T>): Promise<T> => callback();
}
