import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from '@smartteacherbook/shared';

@ApiTags('Admin Authentication & User Management')
@Controller('api/v1/admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login with email, password, and TOTP 2FA' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Get('admins')
  @ApiOperation({ summary: 'List all platform administrators (Super Admin only)' })
  async getAllAdmins() {
    return this.adminAuthService.getAllAdmins();
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create new administrator account' })
  async createAdmin(
    @Body()
    body: {
      email: string;
      fullName: string;
      password: string;
      role?: any;
    },
  ) {
    return this.adminAuthService.createAdmin(body);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Delete administrator account' })
  async deleteAdmin(@Param('id') id: string) {
    return this.adminAuthService.deleteAdmin(id);
  }
}
