import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, '../../database/seed_full_crm_dataset.sql');
  if (fs.existsSync(sqlPath)) {
    console.log(`Đang nạp dữ liệu mẫu từ: ${sqlPath}`);
    const rawSql = fs.readFileSync(sqlPath, 'utf-8');
    const cleaned = rawSql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const statements = cleaned
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toUpperCase() !== 'BEGIN' && s.toUpperCase() !== 'COMMIT');

    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log('✅ Đã nạp thành công bộ dataset mẫu CRM!');
  } else {
    console.warn(`Không tìm thấy file SQL tại: ${sqlPath}`);
  }
}

main()
  .catch((e) => {
    console.error('Lỗi khi nạp dữ liệu seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });