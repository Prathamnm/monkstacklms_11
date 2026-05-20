// @ts-ignore - This module is experimental and its types are not yet visible to TypeScript
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  // We use ts-node because that's what your package.json is configured to use
  migrations: {
    seed: 'ts-node --project tsconfig.json prisma/seed.ts',
  },
  datasource: {
    provider: 'postgresql',
    url: {
      fromEnv: 'DATABASE_URL',
    },
  },
})
