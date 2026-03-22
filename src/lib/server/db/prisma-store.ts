import { DatabaseError } from '@/lib/server/db/database-error';
import { type PrismaClient } from '@/lib/server/db/prisma/.generated/client';
import { prisma as prismaClient } from '@/lib/server/db/prisma-client';
import { type Store } from '@/lib/server/db/store';

let currentTx: null | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'> = null;

async function runInTransaction<T = unknown>(callback: () => Promise<T>): Promise<T> {
  if (currentTx) throw new DatabaseError('Nested transactions are not supported');

  try {
    return await prismaClient.$transaction(async (tx) => {
      currentTx = tx;
      try {
        return await callback();
      } finally {
        currentTx = null;
      }
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name.startsWith('PrismaClient')) throw new DatabaseError('A database error occurred', { cause: err });
      throw err;
    }
    throw new DatabaseError('A database error occurred', { cause: new Error(String(err)) });
  }
}

const prismaStore: Store = {
  runInTransaction,
};

export default prismaStore;
