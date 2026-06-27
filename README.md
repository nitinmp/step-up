# Step Up

Next.js app configured for deployment on [Vercel](https://vercel.com).

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub: `https://github.com/nitinmp/step-up`
2. Import the repository in the [Vercel dashboard](https://vercel.com/new)
3. Vercel auto-detects Next.js — no extra build settings required

Or deploy from the CLI:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
