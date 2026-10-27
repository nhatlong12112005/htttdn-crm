import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AdminsService } from '../admins/admins.service';
import { ClientsService } from '../clients/clients.service';
import { StringUtilService } from '../../common/utils/string-util/string-util.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SignInDto, SignUpDto } from './dto/sign.dto';
import { JWTToken, TokenKeys } from './consts/jwt.const';
import {
  ACCOUNT_ROLES,
  AccountRole,
  assertEmailAvailable,
  findAccountsByEmail,
} from '../../common/utils/account-email/account-email.util';
import { AdminRoleCode, resolveAdminRole } from '../../common/guards/access-control/admin-role';

export type TokenPayload = {
  userID: string;
  userEmail: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  role: 'admin' | 'client' | 'vendor' | 'employee';
  adminRole?: AdminRoleCode;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly clientsService: ClientsService,
    private readonly stringUtilService: StringUtilService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async createToken(payload: TokenPayload) {
    const accessToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'access' },
      {
        expiresIn: JWTToken.ACCESS_TOKEN_EXPIRE_IN,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' },
      {
        expiresIn: JWTToken.REFRESH_TOKEN_EXPIRE_IN,
      },
    );

    return {
      [TokenKeys.ACCESS_TOKEN_KEY]: accessToken,
      [TokenKeys.REFRESH_TOKEN_KEY]: refreshToken,
    };
  }

  async verifyToken(
    token: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<
        TokenPayload & { tokenType: string }
      >(token);
      if (
        payload.tokenType !== tokenType ||
        !payload.userID ||
        (payload.role === 'admin' && !payload.adminRole)
      ) {
        throw new UnauthorizedException();
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async signUp(signUpDto: SignUpDto) {
    return this.registerClient(signUpDto);
  }

  private async registerClient(signUpDto: SignUpDto) {
    const {
      email,
      password,
      storeName: _sn,
      taxId: _tax,
      subscriptionPlan: _sp,
      businessType: _bt,
      dateOfBirth,
      gender,
      ...otherInformation
    } = signUpDto;
    await assertEmailAvailable(this.prisma.extended, email);
    const passwordHashed = await this.stringUtilService.hash(password);
    const parsedDob =
      typeof dateOfBirth === 'string' && dateOfBirth.trim()
        ? new Date(`${dateOfBirth.slice(0, 10)}T00:00:00.000Z`)
        : null;

    const userCreated = await this.clientsService.createClient({
      ...otherInformation,
      ...(parsedDob ? { dateOfBirth: parsedDob } : {}),
      ...(gender ? { gender } : {}),
      email,
      password: passwordHashed,
    } as any);

    const { password: _password, ...userResponse } = userCreated;
    return userResponse;
  }

  async signIn(signInDto: SignInDto, appRole?: string) {
    const { email, password } = signInDto;

    const normalizedRole = appRole === 'crm' ? 'admin' : appRole;
    const preferred = ACCOUNT_ROLES.includes(normalizedRole as AccountRole)
      ? (normalizedRole as AccountRole)
      : undefined;
    const candidates = (await findAccountsByEmail(this.prisma.extended, email))
      .filter(({ user }) => user.status === 'active' && !user.deletedAt)
      .sort((a, b) => Number(b.role === preferred) - Number(a.role === preferred));

    let user: any = null;
    let role: AccountRole = 'client';
    for (const candidate of candidates) {
      if (await this.stringUtilService.compare(password, candidate.user.password)) {
        user = candidate.user;
        role = candidate.role;
        break;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    this.assertPortalAccess(role, user, appRole);

    const tokens = await this.createToken({
      userID: user.id,
      userEmail: user.email,
      fullName: user.fullName,
      phone: user.phone || null,
      address: user.address || null,
      role: role,
      ...(role === 'admin' ? { adminRole: resolveAdminRole(user) ?? undefined } : {}),
    });

    return {
      data: tokens,
    };
  }

  private assertPortalAccess(role: AccountRole, user: any, appRole?: string) {
    if (role === 'admin' && !resolveAdminRole(user)) {
      throw new UnauthorizedException('Tài khoản chưa được phân quyền hợp lệ');
    }
    if (!appRole) return;
    if (appRole === 'client' && role === 'client') return;
    if (role === 'admin') {
      const adminRole = resolveAdminRole(user);
      if (appRole === 'admin' && adminRole === 'SUPER_ADMIN') return;
      if (appRole === 'crm' && adminRole === 'CRM_MANAGER') return;
    }
    throw new UnauthorizedException('Tài khoản không có quyền đăng nhập cổng này');
  }

  async refreshToken(refreshToken?: string, appRole?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy refresh token');
    }
    const payload = await this.verifyToken(refreshToken, 'refresh');

    let user: any = null;
    if (payload.role === 'client') {
      user = await this.clientsService.getClient({ id: payload.userID }).catch(() => null);
    } else if (payload.role === 'admin') {
      user = await this.adminsService.getAdmin({ id: payload.userID }).catch(() => null);
    }

    if (!user || user.status !== 'active' || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không còn hoạt động');
    }

    this.assertPortalAccess(payload.role as AccountRole, user, appRole);
    const currentAdminRole = payload.role === 'admin' ? resolveAdminRole(user) : null;
    if (payload.role === 'admin' && payload.adminRole !== currentAdminRole) {
      throw new UnauthorizedException('Quyền tài khoản đã thay đổi, vui lòng đăng nhập lại');
    }

    const tokens = await this.createToken({
      userID: user.id,
      userEmail: user.email,
      fullName: user.fullName,
      phone: user.phone || null,
      address: null,
      role: payload.role,
      ...(currentAdminRole ? { adminRole: currentAdminRole } : {}),
    });

    return {
      data: tokens,
    };
  }

  async getMe(userInfo: { userID: string; role: string }) {
    if (userInfo.role === 'admin') {
      const admin = await this.adminsService.getAdmin({ id: userInfo.userID }).catch(() => null);
      if (admin) {
        return { data: { ...userInfo, ...admin, roleCode: resolveAdminRole(admin) } };
      }
    }
    if (userInfo.role === 'client') {
      const client = await this.clientsService.getClient({ id: userInfo.userID }).catch(() => null);
      if (client) {
        return { data: { ...userInfo, ...client } };
      }
    }
    return { data: userInfo };
  }
}
