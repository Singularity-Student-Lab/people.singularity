import fs from 'fs';
import path from 'path';
import net from 'net';
import { prisma } from './prisma';
import {
  INITIAL_ADMIN,
  INITIAL_MEMBERS,
  INITIAL_EXPERIENCES,
  INITIAL_PROJECTS,
  INITIAL_SKILLS,
  INITIAL_MEMBER_SKILLS,
  SeedMember,
  SeedExperience,
  SeedProject,
  SeedSkill,
  SeedAdmin,
  SeedAuditLog,
} from './seed-data';

// Local storage fallback file path
const DATA_FILE = path.join(process.cwd(), 'prisma', 'dev-data.json');

interface DatabaseStore {
  admin: SeedAdmin;
  members: SeedMember[];
  experiences: SeedExperience[];
  projects: SeedProject[];
  skills: SeedSkill[];
  memberSkills: { memberId: string; skillId: string; sortOrder: number }[];
  auditLogs: SeedAuditLog[];
}

function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('https:///uploads/')) return url.replace('https://', '');
  if (url.startsWith('http:///uploads/')) return url.replace('http://', '');
  return url;
}

function sanitizeMember<T extends { profileImageUrl?: string | null; resumeUrl?: string | null }>(member: T): T {
  return {
    ...member,
    profileImageUrl: cleanUrl(member.profileImageUrl),
    resumeUrl: cleanUrl(member.resumeUrl),
  };
}

function loadLocalStore(): DatabaseStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const store: DatabaseStore = JSON.parse(raw);
      if (Array.isArray(store.members)) {
        store.members = store.members.map((m) => sanitizeMember(m));
      }
      return store;
    }
  } catch (err) {
    console.warn('[Repository] Failed to read local fallback store, resetting to initial seed.', err);
  }

  const initial: DatabaseStore = {
    admin: INITIAL_ADMIN,
    members: INITIAL_MEMBERS.map((m) => sanitizeMember(m)),
    experiences: INITIAL_EXPERIENCES,
    projects: INITIAL_PROJECTS,
    skills: INITIAL_SKILLS,
    memberSkills: INITIAL_MEMBER_SKILLS,
    auditLogs: [],
  };
  saveLocalStore(initial);
  return initial;
}

function saveLocalStore(store: DatabaseStore) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Repository] Failed to write local fallback store', err);
  }
}

// Check whether database port is open before asking Prisma
function isDatabaseReachable(timeoutMs?: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return resolve(false);

      let host = 'localhost';
      let port = 5432;
      try {
        const parsed = new URL(dbUrl);
        host = parsed.hostname || 'localhost';
        port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      } catch {
        const match = dbUrl.match(/@([^:/]+)(?::(\d+))?/);
        if (match) {
          host = match[1];
          if (match[2]) port = parseInt(match[2], 10);
        }
      }

      const isRemote = host !== 'localhost' && host !== '127.0.0.1';
      const actualTimeout = timeoutMs ?? (isRemote ? 3500 : 600);

      const socket = new net.Socket();
      socket.setTimeout(actualTimeout);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

// Check whether Prisma can connect to PostgreSQL
let isPrismaAvailable: boolean | null = null;
let lastPrismaCheck = 0;
const PRISMA_RETRY_INTERVAL_MS = 10000; // Re-evaluate connection every 10s if initially unavailable

async function checkPrisma(): Promise<boolean> {
  if (isPrismaAvailable === true) return true;

  const now = Date.now();
  if (isPrismaAvailable === false && now - lastPrismaCheck < PRISMA_RETRY_INTERVAL_MS) {
    return false;
  }

  lastPrismaCheck = now;

  if (!process.env.DATABASE_URL) {
    isPrismaAvailable = false;
    return false;
  }

  // Verify host port is reachable first
  const reachable = await isDatabaseReachable();
  if (!reachable) {
    isPrismaAvailable = false;
    return false;
  }

  try {
    // Quick test query with resilient 4s timeout for cloud databases
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma connection timeout')), 4000)),
    ]);
    isPrismaAvailable = true;
    return true;
  } catch (err) {
    console.warn('[Repository] PostgreSQL connection attempt failed, using local resilient store.', err instanceof Error ? err.message : String(err));
    isPrismaAvailable = false;
    return false;
  }
}

export const db = {
  // Members
  async findActiveMembers() {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.findMany({
        where: { isActive: true },
        include: {
          skills: {
            include: { skill: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { fullName: 'asc' },
      });
    }

    const store = loadLocalStore();
    return store.members
      .filter((m) => m.isActive)
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((m) => {
        const memberSkills = store.memberSkills
          .filter((ms) => ms.memberId === m.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((ms) => ({
            memberId: ms.memberId,
            skillId: ms.skillId,
            sortOrder: ms.sortOrder,
            skill: store.skills.find((s) => s.id === ms.skillId)!,
          }));
        return { ...m, skills: memberSkills };
      });
  },

  async findMemberBySlug(slug: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.findUnique({
        where: { slug },
        include: {
          experiences: { orderBy: { sortOrder: 'asc' } },
          projects: { orderBy: { sortOrder: 'asc' } },
          skills: {
            include: { skill: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }

    const store = loadLocalStore();
    const member = store.members.find((m) => m.slug === slug);
    if (!member) return null;

    const experiences = store.experiences
      .filter((e) => e.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const projects = store.projects
      .filter((p) => p.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const skills = store.memberSkills
      .filter((ms) => ms.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ms) => ({
        memberId: ms.memberId,
        skillId: ms.skillId,
        sortOrder: ms.sortOrder,
        skill: store.skills.find((s) => s.id === ms.skillId)!,
      }));

    return { ...member, experiences, projects, skills };
  },

  async findMemberById(id: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.findUnique({
        where: { id },
        include: {
          experiences: { orderBy: { sortOrder: 'asc' } },
          projects: { orderBy: { sortOrder: 'asc' } },
          skills: {
            include: { skill: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }

    const store = loadLocalStore();
    const member = store.members.find((m) => m.id === id);
    if (!member) return null;

    const experiences = store.experiences
      .filter((e) => e.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const projects = store.projects
      .filter((p) => p.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const skills = store.memberSkills
      .filter((ms) => ms.memberId === member.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ms) => ({
        memberId: ms.memberId,
        skillId: ms.skillId,
        sortOrder: ms.sortOrder,
        skill: store.skills.find((s) => s.id === ms.skillId)!,
      }));

    return { ...member, experiences, projects, skills };
  },

  async findMemberByUsername(username: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.findUnique({ where: { username } });
    }
    const store = loadLocalStore();
    return store.members.find((m) => m.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async getAllMembersForAdmin() {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }
    const store = loadLocalStore();
    return [...store.members].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async createMember(data: {
    username: string;
    fullName: string;
    title: string;
    email: string | null;
    passwordHash: string;
    slug: string;
  }) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.create({
        data: {
          username: data.username,
          fullName: data.fullName,
          title: data.title,
          email: data.email,
          passwordHash: data.passwordHash,
          slug: data.slug,
          bio: '',
          bioHighlights: [],
          mustChangePassword: true,
          isActive: true,
        },
      });
    }

    const store = loadLocalStore();
    const newMember: SeedMember = {
      id: `member-${Date.now()}`,
      slug: data.slug,
      username: data.username,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      title: data.title,
      bio: '',
      bioHighlights: [],
      bookCallUrl: null,
      email: data.email,
      github: null,
      twitter: null,
      linkedin: null,
      discord: null,
      resumeUrl: null,
      profileImageUrl: null,
      githubUsername: null,
      closingQuote: null,
      quoteAuthor: null,
      isActive: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.members.unshift(newMember);
    saveLocalStore(store);
    return newMember;
  },

  async updateMemberProfile(
    id: string,
    data: Partial<Omit<SeedMember, 'id' | 'passwordHash' | 'tokenVersion' | 'createdAt'>>
  ) {
    const sanitizedData = { ...data };
    if ('profileImageUrl' in sanitizedData) {
      sanitizedData.profileImageUrl = cleanUrl(sanitizedData.profileImageUrl);
    }
    if ('resumeUrl' in sanitizedData) {
      sanitizedData.resumeUrl = cleanUrl(sanitizedData.resumeUrl);
    }

    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.update({
        where: { id },
        data: {
          ...sanitizedData,
          updatedAt: new Date(),
        },
      });
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    store.members[idx] = {
      ...store.members[idx],
      ...sanitizedData,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStore(store);
    return store.members[idx];
  },

  async updateMemberPassword(id: string, passwordHash: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: false,
          tokenVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    store.members[idx].passwordHash = passwordHash;
    store.members[idx].mustChangePassword = false;
    store.members[idx].tokenVersion += 1;
    store.members[idx].failedLoginAttempts = 0;
    store.members[idx].lockedUntil = null;
    saveLocalStore(store);
    return store.members[idx];
  },

  async toggleMemberActive(id: string, isActive: boolean) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.update({
        where: { id },
        data: {
          isActive,
          tokenVersion: { increment: 1 }, // Instantly revokes session if deactivated
        },
      });
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    store.members[idx].isActive = isActive;
    store.members[idx].tokenVersion += 1;
    saveLocalStore(store);
    return store.members[idx];
  },

  async resetMemberPassword(id: string, newPasswordHash: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: true,
          tokenVersion: { increment: 1 }, // Revokes all active sessions immediately
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    store.members[idx].passwordHash = newPasswordHash;
    store.members[idx].mustChangePassword = true;
    store.members[idx].tokenVersion += 1;
    store.members[idx].failedLoginAttempts = 0;
    store.members[idx].lockedUntil = null;
    saveLocalStore(store);
    return store.members[idx];
  },

  async incrementMemberTokenVersion(id: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.member.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === id);
    if (idx !== -1) {
      store.members[idx].tokenVersion += 1;
      saveLocalStore(store);
    }
  },

  async recordFailedLogin(memberId: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) return;
      const attempts = member.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.member.update({
        where: { id: memberId },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      return;
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      store.members[idx].failedLoginAttempts += 1;
      if (store.members[idx].failedLoginAttempts >= 5) {
        store.members[idx].lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      saveLocalStore(store);
    }
  },

  async resetFailedLogins(memberId: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      await prisma.member.update({
        where: { id: memberId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      return;
    }

    const store = loadLocalStore();
    const idx = store.members.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      store.members[idx].failedLoginAttempts = 0;
      store.members[idx].lockedUntil = null;
      saveLocalStore(store);
    }
  },

  // Admin
  async findAdminByUsername(username: string) {
    const clean = username.trim().toLowerCase();
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.admin.findFirst({
        where: {
          OR: [
            { username: { equals: clean, mode: 'insensitive' } },
            { email: { equals: clean, mode: 'insensitive' } },
          ],
        },
      });
    }
    const store = loadLocalStore();
    const matches =
      store.admin.username.toLowerCase() === clean ||
      (store.admin.email && store.admin.email.toLowerCase() === clean);
    return matches ? store.admin : null;
  },

  async findAdminById(id: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.admin.findUnique({ where: { id } });
    }
    const store = loadLocalStore();
    return store.admin.id === id ? store.admin : null;
  },

  // Experiences
  async addExperience(memberId: string, exp: Omit<SeedExperience, 'id' | 'memberId'>) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.experience.create({
        data: { ...exp, memberId },
      });
    }

    const store = loadLocalStore();
    const newExp: SeedExperience = {
      id: `exp-${Date.now()}`,
      memberId,
      ...exp,
    };
    store.experiences.push(newExp);
    saveLocalStore(store);
    return newExp;
  },

  async updateExperience(id: string, memberId: string, data: Partial<Omit<SeedExperience, 'id' | 'memberId'>>) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.experience.update({
        where: { id },
        data,
      });
    }

    const store = loadLocalStore();
    const idx = store.experiences.findIndex((e) => e.id === id && e.memberId === memberId);
    if (idx === -1) throw new Error('Experience not found');
    store.experiences[idx] = { ...store.experiences[idx], ...data };
    saveLocalStore(store);
    return store.experiences[idx];
  },

  async deleteExperience(id: string, memberId: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.experience.delete({ where: { id } });
    }

    const store = loadLocalStore();
    store.experiences = store.experiences.filter((e) => !(e.id === id && e.memberId === memberId));
    saveLocalStore(store);
  },

  // Projects
  async addProject(memberId: string, proj: Omit<SeedProject, 'id' | 'memberId'>) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.project.create({
        data: { ...proj, memberId },
      });
    }

    const store = loadLocalStore();
    const newProj: SeedProject = {
      id: `proj-${Date.now()}`,
      memberId,
      ...proj,
    };
    store.projects.push(newProj);
    saveLocalStore(store);
    return newProj;
  },

  async updateProject(id: string, memberId: string, data: Partial<Omit<SeedProject, 'id' | 'memberId'>>) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.project.update({
        where: { id },
        data,
      });
    }

    const store = loadLocalStore();
    const idx = store.projects.findIndex((p) => p.id === id && p.memberId === memberId);
    if (idx === -1) throw new Error('Project not found');
    store.projects[idx] = { ...store.projects[idx], ...data };
    saveLocalStore(store);
    return store.projects[idx];
  },

  async deleteProject(id: string, memberId: string) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.project.delete({ where: { id } });
    }

    const store = loadLocalStore();
    store.projects = store.projects.filter((p) => !(p.id === id && p.memberId === memberId));
    saveLocalStore(store);
  },

  // Skills
  async getAllSkills() {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.skill.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    }
    const store = loadLocalStore();
    return store.skills;
  },

  async updateMemberSkills(memberId: string, skillIds: string[]) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      // Transaction to replace member skills
      await prisma.$transaction([
        prisma.memberSkill.deleteMany({ where: { memberId } }),
        prisma.memberSkill.createMany({
          data: skillIds.map((skillId, index) => ({
            memberId,
            skillId,
            sortOrder: index,
          })),
        }),
      ]);
      return;
    }

    const store = loadLocalStore();
    store.memberSkills = store.memberSkills.filter((ms) => ms.memberId !== memberId);
    skillIds.forEach((skillId, index) => {
      store.memberSkills.push({ memberId, skillId, sortOrder: index });
    });
    saveLocalStore(store);
  },

  // Audit Logs
  async recordAudit(data: {
    actorType: 'ADMIN' | 'MEMBER' | 'SYSTEM';
    actorId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const usePrisma = await checkPrisma();
    const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;
    if (usePrisma) {
      return prisma.auditLog.create({
        data: {
          actorType: data.actorType,
          actorId: data.actorId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId || null,
          ipAddress: data.ipAddress || null,
          metadata: metadataStr,
        },
      });
    }

    const store = loadLocalStore();
    const newLog: SeedAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actorType: data.actorType,
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId || null,
      ipAddress: data.ipAddress || null,
      metadata: metadataStr,
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.unshift(newLog);
    saveLocalStore(store);
    return newLog;
  },

  async getAuditLogs(limit = 100) {
    const usePrisma = await checkPrisma();
    if (usePrisma) {
      return prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }
    const store = loadLocalStore();
    return store.auditLogs.slice(0, limit);
  },
};
