import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminRole } from '@smartteacherbook/shared';

@ApiTags('Users & Device Management (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller('api/v1/admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered teacher users with device counts & active subscriptions' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query('search') search?: string) {
    return this.usersService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details with active hardware devices' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Completely delete teacher user from database (Admin)' })
  async deleteUser(@Param('id') userId: string) {
    return this.usersService.deleteUser(userId);
  }

  @Post(':id/subscriptions/:subscriptionId/cancel')
  @ApiOperation({ summary: 'Cancel teacher active subscription (Admin)' })
  async cancelSubscription(
    @Param('id') userId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.usersService.cancelUserSubscription(userId, subscriptionId);
  }

  @Delete(':id/subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Cancel teacher active subscription (Admin - Alias)' })
  async cancelSubscriptionDelete(
    @Param('id') userId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.usersService.cancelUserSubscription(userId, subscriptionId);
  }

  @Delete(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Remotely disconnect/deactivate an active device (Admin)' })
  async disconnectDevice(
    @Param('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.usersService.disconnectDevice(userId, deviceId);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Block or unblock teacher user account (Admin)' })
  async toggleBlock(
    @Param('id') userId: string,
    @Body() body: { isBlocked: boolean },
  ) {
    return this.usersService.toggleUserBlock(userId, body.isBlocked);
  }
}
