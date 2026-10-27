import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

export type AccountRole = 'client' | 'admin';

type AccountDb = Pick<PrismaService['extended'], 'client' | 'admin'>;

export const ACCOUNT_ROLES: AccountRole[] = ['client', 'admin'];

const emailWhere = (email: string) => ({
  email: { equals: email.trim(), mode: 'insensitive' as const },
});

/**
 * Tìm mọi tài khoản (Admin & Client) dùng email này, không phân biệt hoa/thường.
 */
export async function findAccountsByEmail(db: AccountDb, email: string) {
  const where = emailWhere(email);
  const [client, admin] = await Promise.all([
    db.client.findFirst({ where }),
    db.admin.findFirst({ where }),
  ]);
  const rows: Record<AccountRole, any> = { client, admin };
  return ACCOUNT_ROLES.filter((role) => rows[role]).map((role) => ({
    role,
    user: rows[role],
  }));
}

/**
 * Chặn tạo/đổi email nếu email đã được dùng bởi bất kỳ tài khoản nào khác
 * (khách hàng hoặc quản trị viên).
 */
export async function assertEmailAvailable(
  db: AccountDb,
  email: string | null | undefined,
  exclude?: { role: AccountRole; id: string },
) {
  if (!email) return;
  const owners = await findAccountsByEmail(db, email);
  const conflict = owners.some(
    ({ role, user }) => !(exclude && exclude.role === role && exclude.id === user.id),
  );
  if (conflict) {
    throw new BadRequestException('Email đã được sử dụng');
  }
}
