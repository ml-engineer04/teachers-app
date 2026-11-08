import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminRole, AdminLoginDto, AdminLoginResponse } from '@smartteacherbook/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  // In-memory admin users store for high-performance and reliable administration
  private adminsStore: Array<{
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
    role: AdminRole;
    isActive: boolean;
    createdAt: string;
  }> = [
    {
      id: 'admin_super_mlrahmonjon',
      email: 'mlrahmonjon@gmail.com',
      fullName: 'Rahmonjon (Bosh Administrator)',
      passwordHash: 'Qriadmin7$',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Check Super Admin hardcoded credentials requested by owner
    if (cleanEmail === 'mlrahmonjon@gmail.com' && dto.password === 'Qriadmin7$') {
      this.logger.log(`👑 Super Admin Rahmonjon authenticated successfully!`);

      const accessToken = this.jwtService.sign(
        {
          sub: 'admin_super_mlrahmonjon',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          type: 'admin',
        },
        { expiresIn: '24h' },
      );

      return {
        accessToken,
        admin: {
          id: 'admin_super_mlrahmonjon',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          totpEnabled: false,
        },
      };
    }

    // 2. Check in-memory admins store
    const localAdmin = this.adminsStore.find((a) => a.email.toLowerCase() === cleanEmail);
    if (localAdmin) {
      const match =
        dto.password === localAdmin.passwordHash ||
        (await bcrypt.compare(dto.password, localAdmin.passwordHash).catch(() => false));

      if (!match) {
        throw new UnauthorizedException('Noto‘g‘ri administrator login yoki paroli');
      }
      if (!localAdmin.isActive) {
        throw new UnauthorizedException('Administrator hisobi nofaol holatda');
      }

      this.logger.log(`🛡️ Admin authenticated from store: ${localAdmin.email}`);
      const accessToken = this.jwtService.sign(
        {
          sub: localAdmin.id,
          email: localAdmin.email,
          role: localAdmin.role,
          type: 'admin',
        },
        { expiresIn: '24h' },
      );

      return {
        accessToken,
        admin: {
          id: localAdmin.id,
          email: localAdmin.email,
          role: localAdmin.role,
          totpEnabled: false,
        },
      };
    }

    // 3. Check DB if Prisma is available
    if (this.prisma.isConnected) {
      try {
        const dbAdmin = await this.prisma.admin.findUnique({
          where: { email: cleanEmail },
        });
        if (dbAdmin) {
          const match = await bcrypt.compare(dto.password, dbAdmin.passwordHash);
          if (!match) {
            throw new UnauthorizedException('Noto‘g‘ri administrator login yoki paroli');
          }
          if (!dbAdmin.isActive) {
            throw new UnauthorizedException('Administrator hisobi nofaol holatda');
          }

          const accessToken = this.jwtService.sign(
            {
              sub: dbAdmin.id,
              email: dbAdmin.email,
              role: dbAdmin.role,
              type: 'admin',
            },
            { expiresIn: '24h' },
          );

          return {
            accessToken,
            admin: {
              id: dbAdmin.id,
              email: dbAdmin.email,
              role: dbAdmin.role as AdminRole,
              totpEnabled: dbAdmin.totpEnabled,
            },
          };
        }
      } catch (err: any) {
        this.logger.warn(`Prisma error checking admin: ${err.message}`);
      }
    }

    // 4. Default seeded fallback credentials
    if (
      (cleanEmail === 'superadmin@smartteacherbook.com' && dto.password === 'Admin@SmartTeacher2026!') ||
      (cleanEmail === 'admin@smartteacherbook.uz' &&
        (dto.password === 'Admin123!@#' || dto.password === 'Admin@SmartTeacher2026!'))
    ) {
      this.logger.log(`🛡️ Admin authenticated via standard admin credentials: ${cleanEmail}`);

      const accessToken = this.jwtService.sign(
        {
          sub: 'admin_super_01',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          type: 'admin',
        },
        { expiresIn: '24h' },
      );

      return {
        accessToken,
        admin: {
          id: 'admin_super_01',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          totpEnabled: false,
        },
      };
    }

    throw new UnauthorizedException('Noto‘g‘ri administrator login yoki paroli');
  }

  async getAllAdmins() {
    return this.adminsStore.map(({ passwordHash, ...rest }) => rest);
  }

  async createAdmin(dto: { email: string; fullName: string; password: string; role?: AdminRole }) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const existing = this.adminsStore.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Bunday emailga ega administrator allaqachon mavjud (${cleanEmail})`);
    }

    const newAdmin = {
      id: `admin_${Date.now()}`,
      email: cleanEmail,
      fullName: dto.fullName.trim() || 'Admin',
      passwordHash: dto.password,
      role: dto.role || AdminRole.ADMIN,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.adminsStore.push(newAdmin);
    this.logger.log(`🎉 New Admin created by Super Admin: [${newAdmin.email}] role: [${newAdmin.role}]`);
    const { passwordHash, ...safe } = newAdmin;
    return safe;
  }

  async deleteAdmin(id: string) {
    if (id === 'admin_super_mlrahmonjon') {
      throw new Error('Asosiy Super Admin hisobini o‘chirib bo‘lmaydi!');
    }
    const idx = this.adminsStore.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.adminsStore.splice(idx, 1);
      return { success: true };
    }
    throw new Error('Admin topilmadi');
  }
}
