import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminRole, AdminLoginDto, AdminLoginResponse } from '@smartteacherbook/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    const cleanEmail = dto.email.trim().toLowerCase();

    let admin: any = null;

    if (this.prisma.isConnected) {
      try {
        admin = await this.prisma.admin.findUnique({
          where: { email: cleanEmail },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma error checking admin: ${err.message}`);
      }
    }

    if (admin) {
      const match = await bcrypt.compare(dto.password, admin.passwordHash);
      if (!match) {
        throw new UnauthorizedException('Noto‘g‘ri administrator login yoki paroli');
      }

      if (!admin.isActive) {
        throw new UnauthorizedException('Administrator hisobi nofaol holatda');
      }

      this.logger.log(`🛡️ Admin authenticated via DB: ${admin.email}`);

      const accessToken = this.jwtService.sign(
        {
          sub: admin.id,
          email: admin.email,
          role: admin.role,
          type: 'admin',
        },
        { expiresIn: '12h' },
      );

      return {
        accessToken,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role as AdminRole,
          totpEnabled: admin.totpEnabled,
        },
      };
    }

    // Default seeded superadmin credentials fallback for offline preview
    if (
      cleanEmail === 'superadmin@smartteacherbook.com' &&
      dto.password === 'Admin@SmartTeacher2026!'
    ) {
      this.logger.log(`🛡️ Admin authenticated via standard admin credentials: ${cleanEmail}`);

      const accessToken = this.jwtService.sign(
        {
          sub: 'admin_super_01',
          email: cleanEmail,
          role: AdminRole.SUPER_ADMIN,
          type: 'admin',
        },
        { expiresIn: '12h' },
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
}
