# Singularity Student Lab — Member Directory & Portfolio Portal

Web platform for the Singularity Student Lab at SRM University AP. Provides a public member directory and individual portfolio showcase, with an authenticated member self-service dashboard and administrative management portal.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Authentication**: Stateless JWT session cookies with database-level revocation (`tokenVersion`)
- **Storage**: Vercel Blob (`@vercel/blob`)
- **Rate Limiting**: Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`)
- **Bot Defense**: Cloudflare Turnstile (`@marsidev/react-turnstile`)
- **Styling**: Tailwind CSS

## Getting Started

### 1. Install Dependencies

```bash
git clone https://github.com/Singularity-Student-Lab/people.singularity.git
cd people.singularity
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and set required variables:

```bash
cp .env.example .env.local
```

Key variables needed:
- `DATABASE_URL` and `DIRECT_URL`: Supabase PostgreSQL connection strings.
- `JWT_SECRET`: Random string with at least 32 characters (`openssl rand -hex 32`).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile keys (dummy test keys are in `.env.example` for local development).
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob access token (optional locally; defaults to `public/uploads`).
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis credentials (optional locally; defaults to in-memory store).

### 3. Sync Database and Seed Data

```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required in Production |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection pooler (port 6543) | Yes |
| `DIRECT_URL` | PostgreSQL direct connection (port 5432) | Yes |
| `JWT_SECRET` | Session signing secret (min 32 chars) | Yes |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (e.g. `https://people.singularity.space.edu.in`) | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Yes |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key | Yes |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret Key | Yes |

## Deployment on Vercel

1. Import repository into Vercel.
2. Under **Storage**, create and connect **Vercel Blob** (`BLOB_READ_WRITE_TOKEN` is auto-injected).
3. Under **Storage**, connect **Upstash Redis** from Marketplace (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are auto-injected).
4. Add remaining environment variables in Vercel Project Settings (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, Turnstile keys).
5. Deploy. Build command is `npm run build` (`prisma generate` executes automatically via `postinstall`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed initial test data and admin user |
