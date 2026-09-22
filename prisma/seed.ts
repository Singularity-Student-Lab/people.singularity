import { PrismaClient, SkillCategory, ProjectStatus } from '@prisma/client';
import {
  INITIAL_ADMIN,
  INITIAL_MEMBERS,
  INITIAL_EXPERIENCES,
  INITIAL_PROJECTS,
  INITIAL_SKILLS,
  INITIAL_MEMBER_SKILLS,
} from '../src/lib/db/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PostgreSQL database for Singularity Student Lab...');

  // 1. Seed Skills
  console.log('Seeding curated skills...');
  for (const skill of INITIAL_SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { category: skill.category as SkillCategory },
      create: {
        id: skill.id,
        name: skill.name,
        category: skill.category as SkillCategory,
      },
    });
  }

  // 2. Seed Admin
  console.log('Seeding Admin account...');
  await prisma.admin.upsert({
    where: { username: INITIAL_ADMIN.username },
    update: {
      passwordHash: INITIAL_ADMIN.passwordHash,
      name: INITIAL_ADMIN.name,
      email: INITIAL_ADMIN.email,
      tokenVersion: INITIAL_ADMIN.tokenVersion,
    },
    create: {
      id: INITIAL_ADMIN.id,
      username: INITIAL_ADMIN.username,
      passwordHash: INITIAL_ADMIN.passwordHash,
      name: INITIAL_ADMIN.name,
      email: INITIAL_ADMIN.email,
      tokenVersion: INITIAL_ADMIN.tokenVersion,
    },
  });

  // 3. Seed Members
  console.log('Seeding members...');
  for (const m of INITIAL_MEMBERS) {
    await prisma.member.upsert({
      where: { username: m.username },
      update: {
        fullName: m.fullName,
        title: m.title,
        bio: m.bio,
        bioHighlights: m.bioHighlights,
        bookCallUrl: m.bookCallUrl,
        email: m.email,
        github: m.github,
        twitter: m.twitter,
        linkedin: m.linkedin,
        discord: m.discord,
        resumeUrl: m.resumeUrl,
        profileImageUrl: m.profileImageUrl,
        githubUsername: m.githubUsername,
        closingQuote: m.closingQuote,
        quoteAuthor: m.quoteAuthor,
        isActive: m.isActive,
        mustChangePassword: m.mustChangePassword,
        tokenVersion: m.tokenVersion,
      },
      create: {
        id: m.id,
        slug: m.slug,
        username: m.username,
        passwordHash: m.passwordHash,
        fullName: m.fullName,
        title: m.title,
        bio: m.bio,
        bioHighlights: m.bioHighlights,
        bookCallUrl: m.bookCallUrl,
        email: m.email,
        github: m.github,
        twitter: m.twitter,
        linkedin: m.linkedin,
        discord: m.discord,
        resumeUrl: m.resumeUrl,
        profileImageUrl: m.profileImageUrl,
        githubUsername: m.githubUsername,
        closingQuote: m.closingQuote,
        quoteAuthor: m.quoteAuthor,
        isActive: m.isActive,
        mustChangePassword: m.mustChangePassword,
        tokenVersion: m.tokenVersion,
      },
    });
  }

  // 4. Seed Experiences
  console.log('Seeding experiences...');
  await prisma.experience.deleteMany({});
  for (const exp of INITIAL_EXPERIENCES) {
    await prisma.experience.create({
      data: {
        id: exp.id,
        memberId: exp.memberId,
        title: exp.title,
        org: exp.org,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        sortOrder: exp.sortOrder,
      },
    });
  }

  // 5. Seed Projects
  console.log('Seeding projects...');
  await prisma.project.deleteMany({});
  for (const proj of INITIAL_PROJECTS) {
    await prisma.project.create({
      data: {
        id: proj.id,
        memberId: proj.memberId,
        name: proj.name,
        thumbnailUrl: proj.thumbnailUrl,
        status: proj.status as ProjectStatus,
        description: proj.description,
        projectUrl: proj.projectUrl,
        techTags: proj.techTags,
        sortOrder: proj.sortOrder,
      },
    });
  }

  // 6. Seed MemberSkills
  console.log('Seeding member skills...');
  await prisma.memberSkill.deleteMany({});
  for (const ms of INITIAL_MEMBER_SKILLS) {
    await prisma.memberSkill.create({
      data: {
        memberId: ms.memberId,
        skillId: ms.skillId,
        sortOrder: ms.sortOrder,
      },
    });
  }

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
