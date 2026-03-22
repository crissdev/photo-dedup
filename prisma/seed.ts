import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';

import { prisma } from '@/lib/server/db/prisma-client';

const { loadedEnvFiles } = nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development');
console.info(
  `[${path.basename(fileURLToPath(import.meta.url))}] Environments:`,
  loadedEnvFiles.map((f) => f.path).join(', '),
);

async function main() {
  // No seed data required
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
