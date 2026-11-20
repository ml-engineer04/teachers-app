import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { User, Device } from '@smartteacherbook/shared';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

export interface UserWithDetails extends User {
  phoneNumber?: string | null;
  activeDevicesCount: number;
  devices: Device[];
  activeSubscriptionsCount: number;
  subscriptions?: any[];
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private diskEnabled = false;

  // Clean in-memory users store (starts empty, populated when real users register)
  private usersStore: Array<UserWithDetails> = [];
  private deviceRevokeListeners: Array<(userId: string, deviceId: string) => void> = [];
  private userDeleteListeners: Array<(userId: string) => void> = [];

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;
    const saved = readJsonDiskSync<UserWithDetails[]>('users-state.json');
    if (Array.isArray(saved)) {
      this.usersStore = saved;
      this.syncFromRequestsAndSubscriptions();
      return;
    }
    const snap = readJsonDiskSync<{ users?: UserWithDetails[] }>('live-snapshot.json');
    if (Array.isArray(snap?.users) && snap.users.length > 0) {
      this.usersStore = snap.users;
      this.syncFromRequestsAndSubscriptions();
      this.persistDisk();
    }
  }

  private syncFromRequestsAndSubscriptions() {
    try {
      const reqs = readJsonDiskSync<any[]>('requests-state.json') || [];
      for (const req of reqs) {
        if (!req.userEmail && !req.userId) continue;
        const cleanEmail = (req.userEmail || '').trim().toLowerCase();
        let user = this.usersStore.find(
          (u) =>
            (cleanEmail && (u.email || '').trim().toLowerCase() === cleanEmail) ||
            (req.userId && u.id === req.userId),
        );
        if (!user && cleanEmail) {
          const newUserId = req.userId || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          user = {
            id: newUserId,
            email: cleanEmail,
            googleId: null,
            firstName: req.userName || null,
            lastName: null,
            fullName: req.userName || cleanEmail.split('@')[0],
            avatarUrl: null,
            emailVerified: true,
            authProvider: 'EMAIL',
            role: 'TEACHER' as any,
            isActive: true,
            isBlocked: false,
            createdAt: req.createdAt || new Date().toISOString(),
            updatedAt: req.updatedAt || new Date().toISOString(),
            lastLoginAt: null,
            devices: [],
            activeDevicesCount: 0,
            activeSubscriptionsCount: req.status === 'PAID_APPROVED' ? 1 : 0,
            phoneNumber: req.phoneNumber || null,
          };
          this.usersStore.push(user);
        } else if (user) {
          if (req.phoneNumber && !user.phoneNumber) {
            user.phoneNumber = req.phoneNumber;
          }
          if (req.status === 'PAID_APPROVED' && !user.activeSubscriptionsCount) {
            user.activeSubscriptionsCount = 1;
          }
        }
      }
    } catch {}
  }

  persistDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('users-state.json', this.usersStore);
  }

  clearAll() {
    this.usersStore = [];
    this.persistDisk();
    this.logger.log('🧹 Users store cleared completely.');
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  onDeviceRevoked(listener: (userId: string, deviceId: string) => void) {
    this.deviceRevokeListeners.push(listener);
  }

  onUserDeleted(listener: (userId: string) => void) {
    this.userDeleteListeners.push(listener);
  }

  upsertUserFromAuth(
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      fullName?: string | null;
      avatarUrl?: string | null;
      googleId?: string | null;
      emailVerified?: boolean;
      authProvider?: string | null;
      role?: any;
      isActive?: boolean;
      isBlocked?: boolean;
      createdAt?: any;
      updatedAt?: any;
      lastLoginAt?: any;
    },
    devices: any[] = [],
    activeSubscriptionsCount = 0,
  ) {
    const existing = this.usersStore.find((u) => u.id === user.id || u.email === user.email);
    const normalizedDevices: Device[] = devices
      .filter((d) => d.isActive !== false)
      .map((d) => ({
        id: d.id || d.deviceId,
        userId: user.id,
        deviceId: d.deviceId,
        deviceModel: d.deviceModel || 'Device',
        osVersion: d.osVersion || 'Android',
        appVersion: d.appVersion || '1.0.0',
        platform: d.platform || 'ANDROID',
        isActive: true,
        lastActiveAt: d.lastActiveAt instanceof Date ? d.lastActiveAt.toISOString() : d.lastActiveAt || new Date().toISOString(),
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt || new Date().toISOString(),
      }));

    if (existing) {
      existing.firstName = user.firstName ?? existing.firstName ?? null;
      existing.lastName = user.lastName ?? existing.lastName ?? null;
      existing.fullName = user.fullName ?? existing.fullName;
      existing.avatarUrl = user.avatarUrl ?? existing.avatarUrl;
      existing.googleId = user.googleId !== undefined ? user.googleId : existing.googleId;
      existing.emailVerified = user.emailVerified !== undefined ? user.emailVerified : existing.emailVerified;
      existing.authProvider = user.authProvider ?? existing.authProvider;
      existing.lastLoginAt =
        user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt || new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      existing.devices = normalizedDevices;
      existing.activeDevicesCount = normalizedDevices.length;
      if (activeSubscriptionsCount > 0) {
        existing.activeSubscriptionsCount = activeSubscriptionsCount;
      }
      this.persistDisk();
      return existing;
    }

    const created: UserWithDetails = {
      id: user.id,
      email: user.email,
      googleId: user.googleId || null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      fullName: user.fullName || user.email.split('@')[0],
      avatarUrl: user.avatarUrl || null,
      emailVerified: user.emailVerified ?? Boolean(user.googleId),
      authProvider: user.authProvider || (user.googleId ? 'GOOGLE' : 'EMAIL'),
      role: user.role || ('TEACHER' as any),
      isActive: user.isActive !== false,
      isBlocked: !!user.isBlocked,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt || new Date().toISOString(),
      devices: normalizedDevices,
      activeDevicesCount: normalizedDevices.length,
      activeSubscriptionsCount,
    };
    this.usersStore.unshift(created);
    this.persistDisk();
    return created;
  }

  async findAll(search?: string): Promise<UserWithDetails[]> {
    this.syncFromRequestsAndSubscriptions();

    if (this.prisma.isConnected && this.usersStore.length === 0) {
      try {
        const dbUsers = await this.prisma.user.findMany({
          include: {
            devices: { where: { isActive: true } },
            subscriptions: { where: { isActive: true, expiresAt: { gt: new Date() } } },
          },
          orderBy: { createdAt: 'desc' },
        });
        for (const u of dbUsers) {
          const existing = this.usersStore.find((x) => x.id === u.id);
          if (!existing) {
            this.usersStore.push({
              id: u.id,
              email: u.email,
              googleId: u.googleId,
              fullName: u.fullName,
              avatarUrl: u.avatarUrl,
              emailVerified: u.emailVerified,
              authProvider: u.authProvider,
              role: u.role as any,
              isActive: u.isActive,
              isBlocked: u.isBlocked,
              createdAt: u.createdAt.toISOString(),
              updatedAt: u.updatedAt.toISOString(),
              lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
              devices: u.devices.map((d) => ({
                id: d.id,
                userId: d.userId,
                deviceId: d.deviceId,
                deviceModel: d.deviceModel,
                osVersion: d.osVersion,
                appVersion: d.appVersion,
                platform: d.platform,
                isActive: d.isActive,
                lastActiveAt: d.lastActiveAt.toISOString(),
                createdAt: d.createdAt.toISOString(),
              })),
              activeDevicesCount: u.devices.length,
              activeSubscriptionsCount: u.subscriptions.length,
              subscriptions: u.subscriptions,
            });
          }
        }
      } catch {}
    }

    // Attach live subscriptions and phone numbers
    for (const u of this.usersStore) {
      try {
        const subsById = this.subscriptionsService ? await this.subscriptionsService.findByUserId(u.id) : [];
        const subsByEmail = this.subscriptionsService ? await this.subscriptionsService.findByUserEmail(u.email) : [];
        const allSubsMap = new Map<string, any>();
        for (const s of [...subsById, ...subsByEmail]) {
          allSubsMap.set(s.id, s);
        }
        const userSubs = Array.from(allSubsMap.values());
        u.subscriptions = userSubs;
        u.activeSubscriptionsCount = userSubs.filter(
          (s) => s.isActive && new Date(s.expiresAt).getTime() > Date.now(),
        ).length;
      } catch {
        u.subscriptions = [];
      }
    }

    let list = [...this.usersStore];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)),
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

    const [removed] = user.devices.splice(devIndex, 1);
    user.activeDevicesCount = user.devices.length;
    const actualDeviceId = removed?.deviceId || deviceId;

    this.deviceRevokeListeners.forEach((cb) => {
      try {
        cb(userId, actualDeviceId);
      } catch {}
    });

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.updateMany({
          where: { userId, deviceId: actualDeviceId },
          data: { isActive: false },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.persistDisk();
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

    this.persistDisk();
    this.logger.log(`User ${userId} isBlocked set to: ${isBlocked}`);
    return user;
  }

  async cancelUserSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = this.subscriptionsService
      ? await this.subscriptionsService.cancelSubscription(subscriptionId)
      : { success: true, message: 'Obuna bekor qilindi' };
    const user = this.usersStore.find((u) => u.id === userId);
    if (user && Array.isArray(user.subscriptions)) {
      const sub = user.subscriptions.find((s) => s.id === subscriptionId);
      if (sub) {
        sub.isActive = false;
      }
      user.activeSubscriptionsCount = user.subscriptions.filter(
        (s) => s.isActive && new Date(s.expiresAt).getTime() > Date.now(),
      ).length;
    }
    this.persistDisk();
    return res;
  }

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const userIndex = this.usersStore.findIndex((u) => u.id === userId);
    const user = userIndex !== -1 ? this.usersStore[userIndex] : null;

    if (this.prisma.isConnected) {
      try {
        await this.prisma.device.deleteMany({ where: { userId } });
        await this.prisma.subscription.deleteMany({ where: { userId } });
        await this.prisma.accessRequest.deleteMany({ where: { userId } });
        await this.prisma.user.delete({ where: { id: userId } });
      } catch (err: any) {
        this.logger.warn(`Prisma deleteUser fallback: ${err.message}`);
      }
    }

    if (userIndex !== -1) {
      this.usersStore.splice(userIndex, 1);
    }

    // 1. Delete subscriptions from subscriptions store
    if (this.subscriptionsService) {
      await this.subscriptionsService.deleteByUserId(userId);
      if (user?.email) {
        const subs = await this.subscriptionsService.findByUserEmail(user.email);
        for (const s of subs) {
          await this.subscriptionsService.cancelSubscription(s.id).catch(() => {});
        }
      }
    }

    // 2. Remove or clean up requests in requests-state.json
    try {
      const reqs = readJsonDiskSync<any[]>('requests-state.json') || [];
      const filteredReqs = reqs.filter(
        (r) =>
          r.userId !== userId &&
          (!user?.email || (r.userEmail || '').trim().toLowerCase() !== user.email.toLowerCase()),
      );
      writeJsonDiskSync('requests-state.json', filteredReqs);
    } catch {}

    // 3. Remove reading progress
    try {
      const progress = readJsonDiskSync<any>('reading-progress.json');
      if (progress && progress[userId]) {
        delete progress[userId];
        writeJsonDiskSync('reading-progress.json', progress);
      }
    } catch {}

    // 4. Notify listeners (e.g. AuthService memUsers & auth-state.json)
    this.userDeleteListeners.forEach((cb) => {
      try {
        cb(userId);
      } catch {}
    });

    this.persistDisk();
    this.logger.log(`User ${userId} (${user?.email || 'unknown'}) deleted completely from database.`);
    return { success: true, message: 'Foydalanuvchi ma’lumotlar bazasidan butunlay o‘chirildi' };
  }
}
