import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Device } from '@smartteacherbook/shared';

export interface UserWithDetails extends User {
  activeDevicesCount: number;
  devices: Device[];
  activeSubscriptionsCount: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  // Fallback demo users store
  private usersStore: Array<UserWithDetails> = [
    {
      id: 'user_1',
      email: 'malika.karimova@maktab.uz',
      fullName: 'Malika Karimova',
      avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
      isActive: true,
      isBlocked: false,
      lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
      activeDevicesCount: 1,
      activeSubscriptionsCount: 1,
      devices: [
        {
          id: 'dev_1',
          userId: 'user_1',
          deviceId: 'sec_dev_samsung_s23',
          deviceModel: 'Samsung Galaxy S23 (SM-S911B)',
          osVersion: 'Android 14 (API 34)',
          appVersion: '1.0.0 (6)',
          lastActiveAt: new Date().toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        },
      ],
    },
    {
      id: 'user_2',
      email: 'jasur.bek@maktab.uz',
      fullName: 'Jasurbek Omonov',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      isActive: true,
      isBlocked: false,
      lastLoginAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
      updatedAt: new Date().toISOString(),
      activeDevicesCount: 2,
      activeSubscriptionsCount: 1,
      devices: [
        {
          id: 'dev_2a',
          userId: 'user_2',
          deviceId: 'sec_dev_xiaomi_13',
          deviceModel: 'Xiaomi Redmi Note 13 Pro',
          osVersion: 'Android 13 (API 33)',
          appVersion: '1.0.0 (6)',
          lastActiveAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        },
        {
          id: 'dev_2b',
          userId: 'user_2',
          deviceId: 'sec_dev_tab_a9',
          deviceModel: 'Samsung Galaxy Tab A9+ (Tablet)',
          osVersion: 'Android 14 (API 34)',
          appVersion: '1.0.0 (6)',
          lastActiveAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        },
      ],
    },
    {
      id: 'user_3',
      email: 'aziza.rahimova@maktab.uz',
      fullName: 'Aziza Rahimova',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      isActive: true,
      isBlocked: false,
      lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      updatedAt: new Date().toISOString(),
      activeDevicesCount: 1,
      activeSubscriptionsCount: 1,
      devices: [
        {
          id: 'dev_3',
          userId: 'user_3',
          deviceId: 'sec_dev_honor_90',
          deviceModel: 'Honor 90 5G',
          osVersion: 'Android 14 (API 34)',
          appVersion: '1.0.0 (6)',
          lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
      ],
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string): Promise<UserWithDetails[]> {
    let list = [...this.usersStore];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.fullName && u.fullName.toLowerCase().includes(q)),
      );
    }
    return list;
  }

  async findById(id: string): Promise<UserWithDetails | undefined> {
    return this.usersStore.find((u) => u.id === id);
  }

  async disconnectDevice(userId: string, deviceId: string): Promise<{ success: boolean }> {
    const user = this.usersStore.find((u) => u.id === userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const devIndex = user.devices.findIndex((d) => d.id === deviceId || d.deviceId === deviceId);
    if (devIndex === -1) {
      throw new NotFoundException(`Device ${deviceId} not found on user account`);
    }

    user.devices.splice(devIndex, 1);
    user.activeDevicesCount = user.devices.length;

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId, deviceId },
          data: { isActive: false },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.logger.log(`Device ${deviceId} disconnected from user ${userId}. Active count: ${user.activeDevicesCount}`);
    return { success: true };
  }

  async toggleUserBlock(userId: string, isBlocked: boolean): Promise<UserWithDetails> {
    const user = this.usersStore.find((u) => u.id === userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    user.isBlocked = isBlocked;
    user.updatedAt = new Date().toISOString();

    if (this.prisma.isConnected) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { isBlocked },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.logger.log(`User ${userId} isBlocked set to: ${isBlocked}`);
    return user;
  }
}
