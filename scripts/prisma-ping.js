import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const list = await prisma.$queryRawUnsafe('PRAGMA database_list;');
  console.log('PRAGMA database_list:', list);
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables);
} catch (e) {
  console.error('Error:', e);
} finally {
  await prisma.$disconnect();
}
