# Singularity Student Lab — Security Architecture & Threat Model

This document provides a comprehensive technical overview of the security measures, trust boundaries, and mitigations implemented across the Singularity Student Lab Member Portfolio Platform.

---

## 1. Authentication & Session Revocation Model

### Deliberate Password Hashing Choice: bcrypt (12 rounds)
- **Selection**: Passwords are cryptographically salted and hashed using `bcrypt` with **12 salt rounds** (~250–300ms computation time on serverless runtimes).
- **Rationale vs. argon2id**: While `argon2id` is a sound memory-hard primitive, in serverless environments and cross-platform setups (such as Vercel AWS Lambda Linux containers vs. local Windows development), `argon2` requires platform-specific C++ binary compilation via `node-gyp`, which frequently causes deployment build failures or binary mismatch errors. `bcryptjs` with 12 rounds provides guaranteed cross-platform reproducibility, zero native compilation failures, and robust resistance to GPU-accelerated brute-force attacks exceeding standard industry minimums (10 rounds).

### Live Database Session Verification & Immediate Revocation (`tokenVersion`)
Unlike standard stateless JWT architectures where tokens remain valid until expiration, this platform enforces **immediate server-side revocation**:
- **Mechanism**: Both `Member` and `Admin` records contain a `tokenVersion Int @default(1)` column in the database.
- **Payload**: The signed JWT session cookie (`singularity_session`) embeds `{ userId, role, tokenVersion }`.
- **Live Re-check on Every Authenticated Request**:
  Every request to authenticated pages, layouts, and API routes validates the session live against PostgreSQL:
  ```ts
  // Live Database Re-check
  if (!member.isActive || member.tokenVersion !== session.tokenVersion) {
    await clearSessionCookie();
    return null; // Immediately rejected and cookie destroyed
  }
  ```
- **Instant Revocation Triggers**:
  1. When an Admin clicks **Deactivate Member**, `tokenVersion` is incremented. The member is immediately expelled from all active sessions and browsers on their very next request.
  2. When an Admin triggers **Reset Password**, `tokenVersion` is incremented.
  3. When an Admin triggers **Revoke All Sessions**, `tokenVersion` is incremented.
- **Cookie Security**:
  - `HttpOnly`: Inaccessible to client JavaScript (immune to XSS token theft).
  - `Secure`: Transmitted only over HTTPS in production.
  - `SameSite=Strict`: Immune to Cross-Site Request Forgery (CSRF).
  - Short TTL: 15 minutes.

### Fail-Closed Secret Policy
- **Zero Fallback Secrets**: The application strictly prohibits default or fallback secret strings in production.
- `JWT_SECRET` must be set in environment variables and contain at least 32 characters.
- If `JWT_SECRET` is missing or shorter than 32 characters, the application immediately throws a fatal configuration error during startup/token generation, preventing forged tokens or weak signatures.

---

## 2. Bot Protection & Human Verification Engine: Cloudflare Turnstile

To eliminate credential stuffing and automated brute-force attacks without user-friction puzzles:
- **Cloudflare Turnstile Primary Verification**:
  - Embedded client-side via `@marsidev/react-turnstile` with lightweight, non-intrusive challenge mechanics.
  - Server-side verification is executed via Cloudflare's official verification API (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
  - Transmits secret key, response token, and client IP.
- **Development & Testing Safety**:
  - Cloudflare's official test sitekeys and secret keys (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`) are supported out of the box in non-production environments to allow frictionless local development and automated testing.
  - In production (`NODE_ENV === 'production'`), `TURNSTILE_SECRET_KEY` is strictly required; any absence fails closed.
- **Cryptographic HMAC Fallback**:
  - If a signed fallback CAPTCHA challenge is used, it utilizes HMAC-SHA256 with timestamp validation and a strict 5-minute expiry window, governed by `CAPTCHA_SECRET` (or `JWT_SECRET`).

---

## 3. Persistent File Storage & Upload Security: Vercel Blob

An explicit architectural distinction is maintained between direct file uploads and external link references:

### Direct File Upload Pipeline (`/api/member/upload`)
- **Persistent Cloud Storage (Vercel Blob)**:
  - Uploads are streamed directly to **Vercel Blob** (`@vercel/blob`) rather than written to local disks or `/tmp` directories, which are ephemeral and read-only on serverless platforms.
  - In production, `BLOB_READ_WRITE_TOKEN` is mandatory; attempts to fall back to ephemeral serverless filesystems are rejected.
- **Avatar Uploads**:
  - MIME type allowlist: `image/jpeg`, `image/png`, `image/webp`.
  - Binary magic byte validation:
    - JPEG: `0xFF 0xD8 0xFF`
    - PNG: `0x89 0x50 0x4E 0x47`
    - WEBP: `RIFF` ... `WEBP`
  - Size cap: **2 MB**.
  - Filename Sanitization: Cryptographic UUID filenames (`avatar-[uuid].ext`), preventing directory traversal (`../`) or script execution attacks.
- **PDF Resume Uploads**:
  - MIME type allowlist: `application/pdf`.
  - **Binary magic byte inspection**: Header must strictly begin with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Disguised executables, HTML polyglots, or SVG scripts are rejected prior to storage.
  - Size cap: **5 MB**.
  - Cryptographic UUID filename: `resume-[uuid].pdf`.

### External Resume Link (`resumeUrl` in Profile Form)
- **Explicit Trust Model**: When a fellow provides an external URL for their CV (e.g. `https://drive.google.com/...` or `https://academic-domain.edu/cv.pdf`), this is treated as an **unvalidated external URL**, holding the exact same trust level as `bookCallUrl`, `github`, or `linkedin`.
- **Validation**: Validated via Zod (`z.string().url().startsWith('https://')`) for syntactical URL validity only. It is **NOT** fetched or scanned with magic-byte inspection because it resides on a third-party host outside our origin.
- Rendered with standard security attributes: `target="_blank" rel="noopener noreferrer"`.

---

## 4. Distributed Rate Limiting: Upstash Redis

In a serverless architecture (e.g., Vercel Lambdas), in-memory rate-limiting maps are ineffective because each incoming request can be dispatched to a different isolated container instance.

- **Distributed Sliding Window**:
  - Powered by **Upstash Redis** (`@upstash/ratelimit` and `@upstash/redis`).
  - Evaluates sliding windows across all concurrent serverless instances globally.
- **Dual-Tier Enforcement on Authentication (`/api/auth/login`)**:
  - **IP-Level Limit**: Max 15 attempts per 15 minutes per IP address.
  - **Account-Level Limit**: Max 5 failed attempts per 15 minutes per username.
  - Consecutive failures trigger account-level database lockouts (`lockedUntil = Date.now() + 15 minutes`).
- **Resilient Fallback**:
  - In local development mode when Redis credentials are not yet configured, the system falls back gracefully to a memory-safe in-memory sliding window, ensuring local work is never blocked.

---

## 5. Server-Side Request Forgery (SSRF) Defense: GitHub Integration

The conditional GitHub panel renders a contribution heatmap and recent merged PRs without requiring user OAuth tokens:
- **Untrusted Username Sanitization**:
  The GitHub username is treated as untrusted user input. Before any outbound HTTP request is constructed, it is validated against GitHub's official character specification:
  ```ts
  const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  ```
  Any attempt to inject IP addresses (`127.0.0.1`), protocols (`file://`, `http://`), query strings, or path traversal segments (`..`) is rejected immediately.
- **Rate-Limit & Performance Protection**:
  Outbound requests are executed server-side with Next.js ISR caching (`next: { revalidate: 14400 }` = 4 hours).
- **Silent Failure Architecture**:
  The external fetch is wrapped with an `AbortController` (3.5s timeout) and a try/catch block. If GitHub's API returns 404, 403 (rate limited), or times out, the error is logged server-side and the section fails silently, rendering clean UI without ever blocking the page render.

---

## 6. Content Security Policy (CSP) & HTTP Security Headers

Security headers are enforced at the network edge via Next.js middleware (`src/middleware.ts`):

- **Dynamic Nonce-Based Content Security Policy**:
  - Middleware generates a cryptographically unique base64 nonce per request (`crypto.randomUUID()`).
  - Production `script-src` enforces `'nonce-${nonce}'` and `'strict-dynamic'`, eliminating `'unsafe-inline'`.
  - Root layout reads the nonce via `headers()` and attaches it to script tags.
- **Explicit Domain Allowlist**:
  - Cloudflare Turnstile: `https://challenges.cloudflare.com` allowed in `script-src`, `connect-src`, and `frame-src`.
  - Vercel Blob Storage: `https://*.public.blob.vercel-storage.com` allowed in `img-src` and `connect-src`.
  - Media & External APIs: GitHub avatars, Supabase endpoints, and Gravatar allowed in `img-src` / `connect-src`.
- **Enforced Security Headers**:
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (HSTS)
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `DENY` (Clickjacking mitigation)
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`

---

## 7. Strict Data Templating & Relational Integrity

- **No Free-Form HTML**: Neither members nor admins have access to rich-text/HTML editors. Every portfolio entry (Experiences, Projects, Highlights, Skills) is a structured database row.
- **Curated Skills Architecture**: Skills are constrained to a curated relational catalog (`Skill` and `MemberSkill` join table), preventing typographical drift and maintaining visual consistency across every member's page.
- **404 On Inactive Members**: If an admin deactivates a member (`isActive: false`), direct navigation to `/members/[slug]` invokes Next.js `notFound()`, ensuring deactivated profiles are never silently exposed.
- **Audit Logging**: Sensitive actions (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `MEMBER_CREATED`, `MEMBER_DEACTIVATED`, `PASSWORD_CHANGED`, `SESSIONS_REVOKED`, `AVATAR_UPLOADED`, `RESUME_UPLOADED`) are recorded in the `AuditLog` table with actor, timestamp, IP address, and metadata.
