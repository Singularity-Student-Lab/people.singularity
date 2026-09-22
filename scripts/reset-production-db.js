const fs = require('fs');
const path = require('path');

const devDataPath = path.join(__dirname, '..', 'prisma', 'dev-data.json');

// Read existing skills to keep the taxonomy intact
let skills = [];
try {
  const existing = JSON.parse(fs.readFileSync(devDataPath, 'utf-8'));
  skills = existing.skills || [];
} catch (e) {
  skills = [];
}

const cleanStore = {
  admin: {
    id: 'admin-singularity-root',
    username: 'singularity@space.edu.in',
    passwordHash: '$2b$12$84kBRKwUvhjb1S5zHFxH.OrSrS81ALweKfw87yLX.QwfpVWuskbJG',
    name: 'Singularity Lab Administrator',
    email: 'singularity@space.edu.in',
    tokenVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  members: [],
  experiences: [],
  projects: [],
  skills: skills,
  memberSkills: [],
  auditLogs: []
};

fs.writeFileSync(devDataPath, JSON.stringify(cleanStore, null, 2), 'utf-8');
console.log('Successfully cleaned dev-data.json: only production admin remains, all mock members removed.');
