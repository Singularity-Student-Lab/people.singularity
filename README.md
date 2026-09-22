# Singularity Student Lab — Member Directory & Portfolio Portal

A high-performance, secure, and elegantly designed web platform for the **Singularity Student Lab** at SRM University AP. The portal serves as the official public member directory and individual portfolio showcase, paired with an authenticated member self-service dashboard and administrative management portal.

---

## ✨ Key Features

- **Public Member Directory (`/members`)**:
  - Filter by roles (Researcher, Engineer, Fellow, Designer, Alumni) and search by name, skill, or department.
  - Responsive member cards with live status badges, availability indicators, and direct links to portfolios.
- **Individual Member Portfolios (`/members/[slug]`)**:
  - Minimalist, high-craft portfolio layout showcasing biography, research focus, experience timeline, featured projects, curated skills, and social links.
  - SSRF-safe GitHub activity integration (contribution graph, recent pull requests).
- **Member Dashboard (`/dashboard`)**:
  - Authenticated self-service portal where fellows can edit profile details, upload avatar photos, upload PDF resumes, and manage projects/experiences.
- **Admin Management Portal (`/admin`)**:
  - Full membership lifecycle management: create members, edit profiles, toggle active status, initiate password resets, and revoke all active sessions.
  - Comprehensive security audit log viewer (`/admin/audit`) tracking authentication events, administrative actions, and uploads.
- **Enterprise-Grade Security**:
  - Fail-closed JWT sessions (HS256) with live database revocation (`tokenVersion`).
  - Distributed serverless rate limiting via **Upstash Redis**.
  - Permanent cloud media storage via **Vercel Blob**.
  - Advanced bot protection via **Cloudflare Turnstile**.
  - Nonce-based Content Security Policy (`strict-dynamic`) and hardened HTTP headers.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions & Route Handlers) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) (Supabase) with [Prisma ORM](https://www.prisma.io/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) with tailored ABSans and serif typography |
| **Cloud Storage** | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (`@vercel/blob`) |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) (`@upstash/ratelimit`, `@upstash/redis`) |
| **Bot Defense** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (`@marsidev/react-turnstile`) |
| **Authentication** | Custom stateless JWT session cookies with live database `tokenVersion` verification |
| **Password Hashing** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (12 salt rounds) |
| **Validation** | [Zod](https://zod.dev/) |

---

## 📁 Project Structure

```text
├── prisma/
│   ├── schema.prisma          # PostgreSQL relational database schema
│   ├── seed.ts                # Initial development seed data script
│   └── dev-data.json          # Offline resilient fallback data store
├── public/                    # Static assets & brand media
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login & password change pages
│   │   ├── (member-dashboard)/# Member self-service dashboard
│   │   ├── (public)/          # Landing, About, Member Directory, & Portfolio pages
│   │   ├── admin/             # Admin management & audit log viewer
│   │   ├── api/               # Secure Route Handlers (auth, members, uploads)
│   │   ├── layout.tsx         # Root layout with CSP nonce wiring & typography
│   │   └── globals.css        # Core stylesheet & custom design system tokens
│   ├── components/            # Reusable UI components & modals
│   ├── lib/
│   │   ├── auth/              # JWT issuance, cookie handling & session verification
│   │   ├── db/                # Prisma repository layer with offline resilient fallback
│   │   └── security/          # Turnstile validation, Upstash rate limiting, upload checks
│   └── middleware.ts          # Edge middleware: CSP nonce, security headers, route guards
├── .env.example               # Environment variables specification
├── README.md                  # Project overview & documentation
└── SECURITY.md                # Comprehensive security architecture & threat model
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v18.18+` or `v20+`
- **npm**: `v9+` or `v10+`
- **PostgreSQL**: Local instance or hosted [Supabase](https://supabase.com/) project

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/YUVRAJ-SINGH-3178/people.singularity.git
cd people.singularity
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Populate the required values:

```ini
# PostgreSQL connection strings (Supabase transaction pooler + direct session)
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Cryptographic JWT Secret (must be at least 32 characters; generate with `openssl rand -hex 32`)
JWT_SECRET="your-secure-random-32-byte-hex-string"

# Canonical URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloudflare Turnstile (Cloudflare official dummy test keys enabled by default for local development)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"

# Vercel Blob (Optional in local dev; falls back to public/uploads offline)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Upstash Redis (Optional in local dev; falls back to in-memory sliding window)
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."
```

### 4. Push Database Schema & Seed Data

Generate the Prisma client, synchronize the schema to your database, and seed initial test accounts:

```bash
# Push schema to database
npm run db:push

# Seed initial members, skills, and admin account
npm run db:seed
```

> **Note**: Default seed credentials are created for development testing (check `prisma/seed.ts`). Ensure passwords are reset immediately in staging or production environments.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security Architecture

The portal was engineered following strict security principles:

1. **Zero Secret Fallbacks**: No default hardcoded secrets. If `JWT_SECRET` is missing in production, the application strictly fails closed.
2. **Immediate Session Invalidation**: Deactivating a member or revoking sessions immediately invalidates active sessions in real time via database `tokenVersion` checks on every authenticated request.
3. **Permanent Serverless Storage**: File uploads (avatars & resumes) stream to **Vercel Blob** with binary magic byte inspection, eliminating data loss from ephemeral serverless containers.
4. **Distributed Sliding-Window Rate Limiting**: Powered by **Upstash Redis** to protect against brute-force attacks across distributed serverless Lambdas.
5. **Modern Bot Defense**: Protected by **Cloudflare Turnstile** to stop automated credential stuffing without user-friction CAPTCHA puzzles.
6. **Strict Content Security Policy (CSP)**: Generated nonces for script execution (`strict-dynamic`), eliminating inline script vulnerabilities.

For full technical specifications, read [SECURITY.md](SECURITY.md).

---

## ☁️ Deployment on Vercel

1. **Connect Repository**: Import the GitHub repository into your [Vercel Dashboard](https://vercel.com/dashboard).
2. **Environment Variables**: Add the variables specified in `.env.example` in your Vercel Project Settings:
   - `DATABASE_URL` & `DIRECT_URL`
   - `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://people.singularity.ac.in`)
   - `BLOB_READ_WRITE_TOKEN` (automatically added if you connect **Vercel Blob** via the Storage tab)
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (connect via Vercel Marketplace: **Upstash Redis**)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY` (from your Cloudflare dashboard)
3. **Build & Deploy**:
   - Build Command: `npm run build` (runs `prisma generate` via `postinstall`)
   - Output Directory: Next.js default (`.next`)

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js development server with Turbopack |
| `npm run build` | Compiles TypeScript and builds optimized production bundle |
| `npm run start` | Starts the production HTTP server |
| `npm run lint` | Runs ESLint analysis across the codebase |
| `npm run db:generate` | Regenerates Prisma Client types |
| `npm run db:push` | Synchronizes `schema.prisma` directly to PostgreSQL database |
| `npm run db:seed` | Populates database with sample test data and admin user |

---

## 📄 License & Attribution

Designed and maintained by the **Singularity Student Lab** at SRM University AP.
All rights reserved.
