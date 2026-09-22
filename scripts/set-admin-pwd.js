const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const password = 'singularitylab2026@admin';
const hash = bcrypt.hashSync(password, 12);
console.log('Computed hash for singularitylab2026@admin:', hash);

// Update prisma/dev-data.json
const devDataPath = path.join(__dirname, '..', 'prisma', 'dev-data.json');
if (fs.existsSync(devDataPath)) {
  const data = JSON.parse(fs.readFileSync(devDataPath, 'utf-8'));
  data.admin = {
    id: 'admin-singularity-root',
    username: 'singularity@space.edu.in',
    passwordHash: hash,
    name: 'Singularity Lab Administrator',
    email: 'singularity@space.edu.in',
    tokenVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  fs.writeFileSync(devDataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('prisma/dev-data.json updated successfully!');
}

// Update src/lib/db/seed-data.ts
const seedDataPath = path.join(__dirname, '..', 'src', 'lib', 'db', 'seed-data.ts');
let seedData = fs.readFileSync(seedDataPath, 'utf-8');
const replacement = `export const INITIAL_ADMIN: SeedAdmin = {
  id: 'admin-singularity-root',
  username: 'singularity@space.edu.in',
  passwordHash: '${hash}', // singularitylab2026@admin
  name: 'Singularity Lab Administrator',
  email: 'singularity@space.edu.in',
  tokenVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};`;
seedData = seedData.replace(/export const INITIAL_ADMIN: SeedAdmin = \{[\s\S]*?\};/, replacement);
fs.writeFileSync(seedDataPath, seedData, 'utf-8');
console.log('src/lib/db/seed-data.ts updated successfully!');
