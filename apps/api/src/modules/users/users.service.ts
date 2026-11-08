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

  // Clean in-memory users store (starts empty, populated when real users register)
  private usersStore: Array<UserWithDetails> = [];

  clearAll() {
    this.usersStore = [];
    this.logger.log('🧹 Users store cleared completely.');
  }

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
