// Composition Root
// - import services from here

import prismaStore from '@/lib/server/db/prisma-store';
import { type Store } from '@/lib/server/db/store';
import { createLogger } from '@/lib/server/logger.service';

export const storeService: Store = prismaStore;
export const loggerService = createLogger();
