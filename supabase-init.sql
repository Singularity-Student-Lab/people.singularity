-- Singularity Student Lab - Supabase Initial Schema & Data Export
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('LIVE', 'IN_PROGRESS', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SkillCategory" AS ENUM ('CORE_LANGUAGES', 'FRAMEWORKS_LIBRARIES', 'SYSTEMS_INFRA', 'AI_ML', 'TOOLS_DEV');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActorType" AS ENUM ('ADMIN', 'MEMBER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "bioHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bookCallUrl" TEXT,
    "email" TEXT,
    "github" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "discord" TEXT,
    "resumeUrl" TEXT,
    "profileImageUrl" TEXT,
    "githubUsername" TEXT,
    "closingQuote" TEXT,
    "quoteAuthor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Experience" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'LIVE',
    "description" TEXT NOT NULL,
    "projectUrl" TEXT,
    "techTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MemberSkill" (
    "memberId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MemberSkill_pkey" PRIMARY KEY ("memberId","skillId")
);

CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- 3. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Member_slug_key" ON "Member"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Member_username_key" ON "Member"("username");
CREATE INDEX IF NOT EXISTS "Member_slug_idx" ON "Member"("slug");
CREATE INDEX IF NOT EXISTS "Member_username_idx" ON "Member"("username");
CREATE INDEX IF NOT EXISTS "Experience_memberId_idx" ON "Experience"("memberId");
CREATE INDEX IF NOT EXISTS "Project_memberId_idx" ON "Project"("memberId");
CREATE UNIQUE INDEX IF NOT EXISTS "Skill_name_key" ON "Skill"("name");
CREATE INDEX IF NOT EXISTS "Skill_category_idx" ON "Skill"("category");
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");
CREATE INDEX IF NOT EXISTS "Admin_username_idx" ON "Admin"("username");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- 4. Foreign Keys
DO $$ BEGIN
  ALTER TABLE "Experience" ADD CONSTRAINT "Experience_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Seed Admin
INSERT INTO "Admin" ("id", "username", "passwordHash", "name", "email", "tokenVersion", "createdAt")
VALUES ('admin-singularity-root', 'singularity@space.edu.in', '$2b$12$84kBRKwUvhjb1S5zHFxH.OrSrS81ALweKfw87yLX.QwfpVWuskbJG', 'Singularity Lab Administrator', 'singularity@space.edu.in', 1, '2026-01-01T00:00:00.000Z')
ON CONFLICT ("id") DO NOTHING;

-- 6. Seed Skills
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-python', 'Python', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-typescript', 'TypeScript', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-rust', 'Rust', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-cpp', 'C++', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-go', 'Go', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-julia', 'Julia', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-cuda', 'CUDA', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-sql', 'SQL', 'CORE_LANGUAGES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-nextjs', 'Next.js', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-react', 'React', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-pytorch', 'PyTorch', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-jax', 'JAX', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-fastapi', 'FastAPI', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-tailwindcss', 'Tailwind CSS', 'FRAMEWORKS_LIBRARIES'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-dist-systems', 'Distributed Systems', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-linux-kernel', 'Linux Kernel', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-docker', 'Docker', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-kubernetes', 'Kubernetes', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-wasm', 'WebAssembly', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-postgresql', 'PostgreSQL', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-redis', 'Redis', 'SYSTEMS_INFRA'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-llms', 'LLMs', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-transformers', 'Transformers', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-rl', 'Reinforcement Learning', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-formal-math', 'Formal Theorem Proving', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-quantum', 'Quantum Information', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-cv', 'Computer Vision', 'AI_ML'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-git', 'Git', 'TOOLS_DEV'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-linux-bash', 'Linux / Shell', 'TOOLS_DEV'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-cicd', 'CI/CD Automation', 'TOOLS_DEV'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-prisma', 'Prisma ORM', 'TOOLS_DEV'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Skill" ("id", "name", "category") VALUES ('skill-ebpf', 'eBPF Telemetry', 'TOOLS_DEV'::"SkillCategory") ON CONFLICT ("id") DO NOTHING;

-- 7. Seed Members
INSERT INTO "Member" (
  "id", "slug", "username", "passwordHash", "fullName", "title", "bio", "bioHighlights",
  "bookCallUrl", "email", "github", "twitter", "linkedin", "discord", "resumeUrl", "profileImageUrl",
  "githubUsername", "closingQuote", "quoteAuthor", "isActive", "mustChangePassword", "failedLoginAttempts",
  "tokenVersion", "createdAt", "updatedAt"
) VALUES (
  'member-1790019341672', 'yuvraj-singh3178', 'YUVRAJ.SINGH3178', '$2b$12$w8DoExR744FqmPR0K2OLO.Lp0i1AGIZu/mynrNRfzWnTiy6/jleT.',
  'YUVRAJ SINGH', 'BHASKARACHRYA EXECUTIVE', 'B.Tech CS student at SRM University AP with experience in full-stack development, open-source contribution, and cybersecurity. 
Hackathon finalist at national-level competitions. Ranked Top 15 Campus Ambassador nationwide at IIT Guwahati E-Cell. Active 
member of IEEE Student Branch and Singularity Student Lab.', '{}',
  NULL, NULL, 'https://github.com/YUVRAJ-SINGH-3178', 'https://x.com/Yuvraj_Singh317',
  'https://www.linkedin.com/in/yuvraj-singh-3178saturn/', NULL, '/uploads/resume-d9fafa21-05c0-4ba4-b44f-434b32bd270f.pdf', '/uploads/avatar-f1d8d8f4-0ed6-4a66-b95e-1aaa0c2e6848.png',
  'YUVRAJ-SINGH-3178', NULL, 'YUVRAJ SINGH',
  TRUE, FALSE, 0,
  2, '2026-09-21T19:35:41.672Z', '2026-09-21T19:51:43.807Z'
) ON CONFLICT ("id") DO NOTHING;

-- 8. Seed Experiences
INSERT INTO "Experience" ("id", "memberId", "title", "org", "location", "startDate", "endDate", "description", "sortOrder")
VALUES ('exp-1790019720917', 'member-1790019341672', 'Executive', 'Singularity Student Lab', 'SRM University AP', '2026', NULL, '', 0)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Experience" ("id", "memberId", "title", "org", "location", "startDate", "endDate", "description", "sortOrder")
VALUES ('exp-1790019769778', 'member-1790019341672', 'Technical Co-Lead', 'Microsoft Student Community', 'SRM University AP', '2026', NULL, '', 1)
ON CONFLICT ("id") DO NOTHING;

-- 9. Seed Projects
INSERT INTO "Project" ("id", "memberId", "name", "thumbnailUrl", "status", "description", "projectUrl", "techTags", "sortOrder")
VALUES ('proj-1790019817842', 'member-1790019341672', 'PoF', NULL, 'ARCHIVED'::"ProjectStatus", 'An end-to-end verification pipeline that discovers candidate social profiles via genuine reverse-image search, mathematically re-verifies identity using biometric embedding distance, pins verified evidence to IPFS, and anchors an immutable, tamper-evident record onto a public blockchain testnet.', 'https://github.com/YUVRAJ-SINGH-3178/PoF', '{"Python","Solidity","Dockerfile"}', 0)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Project" ("id", "memberId", "name", "thumbnailUrl", "status", "description", "projectUrl", "techTags", "sortOrder")
VALUES ('proj-1790019895240', 'member-1790019341672', 'ULPF', NULL, 'ARCHIVED'::"ProjectStatus", 'ULPF (Universal Log Pre-processing Framework) provides a high-assurance telemetry preprocessing and normalization pipeline positioned directly between perimeter devices and enterprise SIEM / Data Lake sinks. Built from first principles for strategic defence and critical national infrastructure', 'https://github.com/YUVRAJ-SINGH-3178/ULPF', '{"Python","JavaScript","HTML","CSS","Dockerfile","Batchfile","Shell"}', 1)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Project" ("id", "memberId", "name", "thumbnailUrl", "status", "description", "projectUrl", "techTags", "sortOrder")
VALUES ('proj-1790019976578', 'member-1790019341672', 'Etio', NULL, 'LIVE'::"ProjectStatus", 'Etio is a GitHub composite Action that will investigate a failed CI job in the repository where it runs. It is designed to locate relevant failure context, compare the failure against recent commits, request a redacted diagnosis from Groq, and publish the result back to GitHub.', 'https://github.com/YUVRAJ-SINGH-3178/Etio', '{"Python"}', 2)
ON CONFLICT ("id") DO NOTHING;

-- 10. Seed MemberSkills
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-python', 0)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-typescript', 1)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-rust', 2)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-cpp', 3)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-nextjs', 4)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-react', 5)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-pytorch', 6)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-fastapi', 7)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-tailwindcss', 8)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-sql', 9)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-dist-systems', 10)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-docker', 11)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-kubernetes', 12)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-redis', 13)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-postgresql', 14)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-cv', 15)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-llms', 16)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-git', 17)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-linux-bash', 18)
ON CONFLICT ("memberId", "skillId") DO NOTHING;
INSERT INTO "MemberSkill" ("memberId", "skillId", "sortOrder")
VALUES ('member-1790019341672', 'skill-cicd', 19)
ON CONFLICT ("memberId", "skillId") DO NOTHING;

