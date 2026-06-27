# Step Up

Mobile-first web app for a 29-day group steps challenge. See [docs/Steps_Challenge_App_Handover.md](./docs/Steps_Challenge_App_Handover.md) for the full product spec.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Drizzle ORM](https://orm.drizzle.team) + [Neon Postgres](https://neon.tech)
- [Tailwind CSS 4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com)

## Configuration

All secrets and connection strings live in one file:

**`src/config.ts`** — database URL, auth secret, admin login, timezone.

Edit that file when you need to change credentials. No `.env` files required.

## Local development

```bash
pnpm install
pnpm db:setup        # push schema + seed challenge days
pnpm db:seed-admin   # create/update admin user from config
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database scripts

| Command | Description |
| --- | --- |
| `pnpm db:push` | Push Drizzle schema to Neon |
| `pnpm db:seed` | Seed challenge config + 29 challenge days |
| `pnpm db:seed-admin` | Seed admin user from `src/config.ts` |
| `pnpm db:setup` | `db:push` then `db:seed` |
| `pnpm test:scoring` | Run scoring unit tests |

## Deploy

Push to `main` — GitHub auto-deploys to Vercel at **https://step-up-pearl.vercel.app**.

The app reads config from `src/config.ts` at build/runtime, so no Vercel env setup is needed.

## Build order (from spec)

1. ✅ Scaffold + Drizzle schema + seed
2. ✅ Auth (register/login/session)
3. ✅ `computeStandings()` scoring engine
4. Log activity + activities dashboard
5. Leaderboard
6. Admin moderation
7. Visual polish
