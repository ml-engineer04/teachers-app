import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminRole, AdminLoginDto, AdminLoginResponse } from '@smartteacherbook/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { readJsonDiskSync, writeJsonDiskSync } from '../../common/persistence/local-disk.store';

export const ALL_ADMIN_PERMISSIONS = [
  'my_books',
  'add_book',
  'page_editor',
  'audio_video',
  'manage_content',
  'grades',
  'subjects',
  'subscriptions',
  'users',
  'pricing',
  'analytics',
  'system_logs',
];

@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);

  // In-memory admin users store for high-performance and reliable administration
  private adminsStore: Array<{
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
    role: AdminRole;
    permissions?: string[];
    isActive: boolean;
    createdAt: string;
  }> = [
    {
      id: 'admin_super_mlrahmonjon',
      email: 'mlrahmonjon@gmail.com',
      fullName: 'Rahmonjon (Bosh Administrator)',
      passwordHash: 'Qriadmin7$',
      role: AdminRole.SUPER_ADMIN,
      permissions: ['*'],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    try {
      const persisted = readJsonDiskSync<Array<any>>('admins.json');
      if (persisted && Array.isArray(persisted) && persisted.length > 0) {
        // Ensure superadmin is always preserved
        const hasSuper = persisted.some((a) => a.email === 'mlrahmonjon@gmail.com');
        if (!hasSuper) {
          persisted.unshift(this.adminsStore[0]);
        }
        this.adminsStore = persisted;
        this.logger.log(`💾 Loaded ${persisted.length} administrator account(s) from persistent storage.`);
      } else {
        this.persistDisk();
      }
    } catch (err: any) {
      this.logger.warn(`Could not load admins from disk: ${err.message}`);
    }
  }

  private persistDisk() {
    try {
      writeJsonDiskSync('admins.json', this.adminsStore);
    } catch (err: any) {
      this.logger.warn(`Could not persist admins: ${err.message}`);
    }
  }

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    const cleanEmail = dto.email.trim().toLowerCase();

    // 1. Primary check: PostgreSQL Database via Prisma with Bcrypt verification
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

        this.logger.log(`👑 Admin authenticated securely via PostgreSQL DB: ${dbAdmin.email}`);
        const permissions =
          dbAdmin.role === AdminRole.SUPER_ADMIN ? ['*'] : ALL_ADMIN_PERMISSIONS;
        const accessToken = this.jwtService.sign(
          {
            sub: dbAdmin.id,
            email: dbAdmin.email,
            role: dbAdmin.role,
            permissions,
            type: 'admin',
          },
          { expiresIn: '24h' },
        );

        return {
          accessToken,
          admin: {
            id: dbAdmin.id,
            email: dbAdmin.email,
            fullName: 'Administrator',
            role: dbAdmin.role as AdminRole,
            totpEnabled: dbAdmin.totpEnabled,
            permissions,
          },
        };
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Prisma admin query fallback: ${err.message}`);
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
      const permissions =
        localAdmin.permissions ||
        (localAdmin.role === AdminRole.SUPER_ADMIN ? ['*'] : ALL_ADMIN_PERMISSIONS);
      const accessToken = this.jwtService.sign(
        {
          sub: localAdmin.id,
          email: localAdmin.email,
          fullName: localAdmin.fullName,
          role: localAdmin.role,
          permissions,
          type: 'admin',
        },
        { expiresIn: '24h' },
      );

      return {
        accessToken,
        admin: {
          id: localAdmin.id,
          email: localAdmin.email,
          fullName: localAdmin.fullName,
          role: localAdmin.role,
          totpEnabled: false,
          permissions,
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

          const permissions =
            dbAdmin.role === AdminRole.SUPER_ADMIN ? ['*'] : ALL_ADMIN_PERMISSIONS;
          const accessToken = this.jwtService.sign(
            {
              sub: dbAdmin.id,
              email: dbAdmin.email,
              role: dbAdmin.role,
              permissions,
              type: 'admin',
            },
            { expiresIn: '24h' },
          );

          return {
            accessToken,
            admin: {
              id: dbAdmin.id,
              email: dbAdmin.email,
              fullName: 'Administrator',
              role: dbAdmin.role as AdminRole,
              totpEnabled: dbAdmin.totpEnabled,
              permissions,
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

      const permissions = ['*'];
      const accessToken = this.jwtService.sign(
        {
          sub: 'admin_super_01',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          permissions,
          type: 'admin',
        },
        { expiresIn: '24h' },
      );

      return {
        accessToken,
        admin: {
          id: 'admin_super_01',
          email: cleanEmail,
          fullName: 'Super Administrator',
          role: AdminRole.SUPER_ADMIN,
          totpEnabled: false,
          permissions,
        },
      };
    }

    throw new UnauthorizedException('Noto‘g‘ri administrator login yoki paroli');
  }

  async getAllAdmins() {
    return this.adminsStore.map(({ passwordHash, ...rest }) => rest);
  }

  async createAdmin(dto: {
    email: string;
    fullName: string;
    password: string;
    role?: AdminRole;
    permissions?: string[];
  }) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const existing = this.adminsStore.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Bunday emailga ega administrator allaqachon mavjud (${cleanEmail})`);
    }

    const role = dto.role || AdminRole.ADMIN;
    const permissions =
      role === AdminRole.SUPER_ADMIN
        ? ['*']
        : dto.permissions && dto.permissions.length > 0
          ? dto.permissions
          : [
              'my_books',
              'add_book',
              'page_editor',
              'audio_video',
              'manage_content',
            ];

    const newAdmin = {
      id: `admin_${Date.now()}`,
      email: cleanEmail,
      fullName: dto.fullName.trim() || 'Admin',
      passwordHash: dto.password,
      role,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.adminsStore.push(newAdmin);
    this.persistDisk();
    this.logger.log(
      `🎉 New Admin created by Super Admin: [${newAdmin.email}] role: [${newAdmin.role}] permissions: [${permissions.join(',')}]`,
    );
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
      this.persistDisk();
      return { success: true };
    }
    throw new Error('Admin topilmadi');
  }
}
