# Step Up

Mobile-first web app for a 29-day group steps challenge. See [docs/Steps_Challenge_App_Handover.md](./docs/Steps_Challenge_App_Handover.md) for the full product spec.

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Drizzle ORM](https://orm.drizzle.team) + [Neon Postgres](https://neon.tech)
- [Tailwind CSS 4](https://tailwindcss.com)
- Deployed on [Vercel](https://vercel.com)

## Local development

```bash
pnpm install
cp .env.example .env.local   # add DATABASE_URL and other secrets
pnpm db:setup                # push schema + seed challenge days
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database scripts

| Command | Description |
| --- | --- |
| `pnpm db:push` | Push Drizzle schema to Neon |
| `pnpm db:seed` | Seed challenge config + 29 challenge days |
| `pnpm db:setup` | `db:push` then `db:seed` |

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `AUTH_SECRET` | Before auth | Session signing secret |
| `BLOB_READ_WRITE_TOKEN` | Before uploads | Vercel Blob for activity photos |

## Deploy on Vercel

The project is linked to **rvfitness/step-up** with GitHub auto-deploy from `main`.

Set `DATABASE_URL` (and other secrets) in the Vercel project settings or via:

```bash
npx vercel env add DATABASE_URL
```

Production URL: **https://step-up-pearl.vercel.app**

## Build order (from spec)

1. ✅ Scaffold + Drizzle schema + seed
2. Auth (register/login/session)
3. `computeStandings()` scoring engine
4. Log activity + activities dashboard
5. Leaderboard
6. Admin moderation
7. Visual polish
