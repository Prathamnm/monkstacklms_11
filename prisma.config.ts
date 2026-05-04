import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    provider: 'postgresql',
    url: {
      fromEnv: 'DATABASE_URL',
    },
  },
})
