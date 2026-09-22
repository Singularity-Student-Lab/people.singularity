# Singularity Student Lab — Security Architecture & Threat Model

This document provides a comprehensive technical overview of the security measures, trust boundaries, and mitigations implemented across the Singularity Student Lab Member Portfolio Platform.

---

## 1. Authentication & Session Revocation Model

### Deliberate Password Hashing Choice: bcrypt (12 rounds)
- **Selection**: Passwords are cryptographically salted and hashed using `bcrypt` with **12 salt rounds** (~250–300ms computation time on Vercel serverless runtimes).
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

---

## 2. Cryptographic Human Verification (CAPTCHA) Engine

To eliminate credential stuffing and automated brute-force attempts without relying on privacy-invasive third-party trackers:
- **Server Challenge Generation (`/api/auth/captcha`)**:
  - Generates 5-character non-ambiguous alphanumeric challenges (excluding `0/O`, `1/I/l`).
  - Synthesizes an authentic SVG security image with noise lines, scatter dots, character rotations (-18° to +18°), and positional offsets.
  - Generates a stateless, tamper-proof HMAC-SHA256 signature containing `timestamp:text:signature`.
- **Server Verification Enforcement (`/api/auth/login`)**:
  - In addition to rate-limiting (15 requests/15 min per IP, 5 failed attempts per user), `/api/auth/login` mandates valid `captchaToken` and `captchaAnswer`.
  - The server verifies the HMAC signature and rejects tokens older than 5 minutes (TTL expiry).
  - Any automated request or script attempting to log in without solving the challenge is rejected with `400 Bad Request`.


---

## 2. Threat Boundaries: File Uploads vs. External `resumeUrl`

An explicit architectural distinction is maintained between direct file uploads and external link references:

### Direct File Upload Pipeline (`/api/member/upload`)
- **Avatar Uploads**:
  - MIME type allowlist: `image/jpeg`, `image/png`, `image/webp`.
  - Binary magic byte validation:
    - JPEG: `0xFF 0xD8 0xFF`
    - PNG: `0x89 0x50 0x4E 0x47`
    - WEBP: `RIFF` ... `WEBP`
  - Size cap: **2 MB**.
  - Storage: Stored outside web-executable scripts using cryptographic UUID filenames (`avatar-[uuid].ext`), preventing directory traversal (`../`) or arbitrary file execution.
- **PDF Resume Uploads**:
  - MIME type allowlist: `application/pdf`.
  - **Binary magic byte inspection**: Header must strictly begin with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Disguised executables, HTML polyglots, or SVG scripts are rejected before disk writing.
  - Size cap: **5 MB**.
  - Cryptographic UUID filename: `resume-[uuid].pdf`.

### External Resume Link (`resumeUrl` in Profile Form)
- **Explicit Trust Model**: When a fellow provides an external URL for their CV (e.g. `https://drive.google.com/...` or `https://academic-domain.edu/cv.pdf`), this is treated as an **unvalidated external URL**, holding the exact same trust level as `bookCallUrl`, `github`, or `linkedin`.
- **Validation**: Validated via Zod (`z.string().url().startsWith('https://')`) for syntactical URL validity only. It is **NOT** fetched or scanned with magic-byte inspection because it resides on a third-party host outside our origin.
- Rendered with standard security attributes: `target="_blank" rel="noopener noreferrer"`.

---

## 3. Server-Side Request Forgery (SSRF) Defense: GitHub Integration

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

## 4. Content Security Policy (CSP) & HTTP Security Headers

Security headers are enforced at the network edge via Next.js middleware (`src/middleware.ts`):

- **Nonce-Based Content Security Policy**:
  - Middleware generates a per-request cryptographic UUID nonce (`crypto.randomUUID()`).
  - Scripts and styles are governed by `'nonce-${nonce}'` and `'strict-dynamic'`.
  - **Zero Inline Styles**: All layout, typography, status dots, and grid structures are implemented using static Tailwind CSS utility classes; no user-facing component requires inline `style=""` attributes.
- **Enforced Security Headers**:
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (HSTS)
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `DENY` (Clickjacking mitigation)
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`

---

## 5. Brute Force Mitigation & Rate Limiting

- **Sliding-Window Rate Limiter**:
  - Tracked per client IP and per username.
  - Limits login attempts to 5 failures per 15 minutes per account.
  - Automatically locks the account (`lockedUntil = now + 15 minutes`) after 5 consecutive failures.
- **Human Verification Check**:
  - Form requires human interaction check prior to submission, mitigating automated credential stuffing scripts.

---

## 6. Strict Data Templating & Relational Integrity

- **No Free-Form HTML**: Neither members nor admins have access to rich-text/HTML editors. Every portfolio entry (Experiences, Projects, Highlights, Skills) is a structured database row.
- **Curated Skills Architecture**: Skills are constrained to a curated relational catalog (`Skill` and `MemberSkill` join table), preventing typographical drift and maintaining visual consistency across every member's page.
- **404 On Inactive Members**: If an admin deactivates a member (`isActive: false`), direct navigation to `/members/[slug]` invokes Next.js `notFound()`, ensuring deactivated profiles are never silently exposed.
- **Audit Logging**: Sensitive actions (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `MEMBER_CREATED`, `MEMBER_DEACTIVATED`, `PASSWORD_CHANGED`, `SESSIONS_REVOKED`) are recorded in the `AuditLog` table with actor, timestamp, and IP address.
