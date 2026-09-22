export interface SeedSkill {
  id: string;
  name: string;
  category: 'CORE_LANGUAGES' | 'FRAMEWORKS_LIBRARIES' | 'SYSTEMS_INFRA' | 'AI_ML' | 'TOOLS_DEV';
}

export interface SeedExperience {
  id: string;
  memberId: string;
  title: string;
  org: string;
  location: string;
  startDate: string;
  endDate: string | null;
  description: string;
  sortOrder: number;
}

export interface SeedProject {
  id: string;
  memberId: string;
  name: string;
  thumbnailUrl: string | null;
  status: 'LIVE' | 'IN_PROGRESS' | 'ARCHIVED';
  description: string;
  projectUrl: string | null;
  techTags: string[];
  sortOrder: number;
}

export interface SeedMember {
  id: string;
  slug: string;
  username: string;
  passwordHash: string;
  fullName: string;
  title: string;
  bio: string;
  bioHighlights: string[];
  bookCallUrl: string | null;
  email: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  discord: string | null;
  resumeUrl: string | null;
  profileImageUrl: string | null;
  githubUsername: string | null;
  closingQuote: string | null;
  quoteAuthor: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeedAdmin {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  email: string | null;
  tokenVersion: number;
  createdAt: string;
}

export interface SeedAuditLog {
  id: string;
  actorType: 'ADMIN' | 'MEMBER' | 'SYSTEM';
  actorId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  ipAddress: string | null;
  metadata: string | null;
  createdAt: string;
}

export const INITIAL_SKILLS: SeedSkill[] = [
  // CORE_LANGUAGES
  { id: 'skill-python', name: 'Python', category: 'CORE_LANGUAGES' },
  { id: 'skill-typescript', name: 'TypeScript', category: 'CORE_LANGUAGES' },
  { id: 'skill-rust', name: 'Rust', category: 'CORE_LANGUAGES' },
  { id: 'skill-cpp', name: 'C++', category: 'CORE_LANGUAGES' },
  { id: 'skill-go', name: 'Go', category: 'CORE_LANGUAGES' },
  { id: 'skill-julia', name: 'Julia', category: 'CORE_LANGUAGES' },
  { id: 'skill-cuda', name: 'CUDA', category: 'CORE_LANGUAGES' },
  { id: 'skill-sql', name: 'SQL', category: 'CORE_LANGUAGES' },

  // FRAMEWORKS_LIBRARIES
  { id: 'skill-nextjs', name: 'Next.js', category: 'FRAMEWORKS_LIBRARIES' },
  { id: 'skill-react', name: 'React', category: 'FRAMEWORKS_LIBRARIES' },
  { id: 'skill-pytorch', name: 'PyTorch', category: 'FRAMEWORKS_LIBRARIES' },
  { id: 'skill-jax', name: 'JAX', category: 'FRAMEWORKS_LIBRARIES' },
  { id: 'skill-fastapi', name: 'FastAPI', category: 'FRAMEWORKS_LIBRARIES' },
  { id: 'skill-tailwindcss', name: 'Tailwind CSS', category: 'FRAMEWORKS_LIBRARIES' },

  // SYSTEMS_INFRA
  { id: 'skill-dist-systems', name: 'Distributed Systems', category: 'SYSTEMS_INFRA' },
  { id: 'skill-linux-kernel', name: 'Linux Kernel', category: 'SYSTEMS_INFRA' },
  { id: 'skill-docker', name: 'Docker', category: 'SYSTEMS_INFRA' },
  { id: 'skill-kubernetes', name: 'Kubernetes', category: 'SYSTEMS_INFRA' },
  { id: 'skill-wasm', name: 'WebAssembly', category: 'SYSTEMS_INFRA' },
  { id: 'skill-postgresql', name: 'PostgreSQL', category: 'SYSTEMS_INFRA' },
  { id: 'skill-redis', name: 'Redis', category: 'SYSTEMS_INFRA' },

  // AI_ML
  { id: 'skill-llms', name: 'LLMs', category: 'AI_ML' },
  { id: 'skill-transformers', name: 'Transformers', category: 'AI_ML' },
  { id: 'skill-rl', name: 'Reinforcement Learning', category: 'AI_ML' },
  { id: 'skill-formal-math', name: 'Formal Theorem Proving', category: 'AI_ML' },
  { id: 'skill-quantum', name: 'Quantum Information', category: 'AI_ML' },
  { id: 'skill-cv', name: 'Computer Vision', category: 'AI_ML' },

  // TOOLS_DEV
  { id: 'skill-git', name: 'Git', category: 'TOOLS_DEV' },
  { id: 'skill-linux-bash', name: 'Linux / Shell', category: 'TOOLS_DEV' },
  { id: 'skill-cicd', name: 'CI/CD Automation', category: 'TOOLS_DEV' },
  { id: 'skill-prisma', name: 'Prisma ORM', category: 'TOOLS_DEV' },
  { id: 'skill-ebpf', name: 'eBPF Telemetry', category: 'TOOLS_DEV' },
];

export const INITIAL_ADMIN: SeedAdmin = {
  id: 'admin-singularity-root',
  username: 'singularity@space.edu.in',
  passwordHash: '$2b$12$84kBRKwUvhjb1S5zHFxH.OrSrS81ALweKfw87yLX.QwfpVWuskbJG', // singularitylab2026@admin
  name: 'Singularity Lab Administrator',
  email: 'singularity@space.edu.in',
  tokenVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const INITIAL_MEMBERS: SeedMember[] = [];

export const INITIAL_EXPERIENCES: SeedExperience[] = [];

export const INITIAL_PROJECTS: SeedProject[] = [];

export const INITIAL_MEMBER_SKILLS: { memberId: string; skillId: string; sortOrder: number }[] = [];
