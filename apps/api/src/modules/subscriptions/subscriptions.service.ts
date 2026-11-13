import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseSignerService } from './license-signer.service';
import { AccessRequestStatus, Subscription, SubscriptionPlan, SignedLicense } from '@smartteacherbook/shared';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);
  private diskEnabled = false;

  // Clean in-memory subscriptions store (starts empty)
  private subscriptionsStore: Subscription[] = [];

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;
    const saved = readJsonDiskSync<Subscription[]>('subscriptions-state.json');
    if (Array.isArray(saved)) {
      this.subscriptionsStore = saved;
      return;
    }

    const snap = readJsonDiskSync<{ requests?: any[] }>('live-snapshot.json');
    if (Array.isArray(snap?.requests)) {
      const seenKeys = new Set<string>();
      const reconstructed: Subscription[] = [];
      for (const req of snap.requests) {
        if (req?.status !== AccessRequestStatus.PAID_APPROVED) continue;
        const key = `${(req.userEmail || req.userId || '').toLowerCase()}:${req.gradeId}:${req.subjectId || 'ALL'}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const startsAt = new Date(req.resolvedAt || req.createdAt || Date.now());
        const days =
          req.plan === SubscriptionPlan.YEARLY
            ? 365
            : req.plan === SubscriptionPlan.THREE_MONTHS
            ? 90
            : 30;
        const expiresAt = new Date(startsAt.getTime() + days * 86400 * 1000);
        reconstructed.push({
          id: `sub_restored_${req.id}`,
          userId: req.userId,
          gradeId: Number(req.gradeId),
          subjectId: req.subjectId || null,
          plan: req.plan || SubscriptionPlan.MONTHLY,
          startsAt: startsAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          grantedById: req.adminId || 'admin_super_mlrahmonjon',
          isActive: expiresAt.getTime() > Date.now(),
          createdAt: startsAt.toISOString(),
        });
      }
      if (reconstructed.length > 0) {
        this.subscriptionsStore = reconstructed;
        this.persistDisk();
      }
    }
  }

  private persistDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('subscriptions-state.json', this.subscriptionsStore);
  }

  clearAll() {
    this.subscriptionsStore = [];
    this.persistDisk();
    this.logger.log('🧹 Subscriptions store cleared completely.');
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseSigner: LicenseSignerService,
  ) {}

  async createSubscription(data: {
    userId: string;
    gradeId: number;
    subjectId?: string | null;
    plan: SubscriptionPlan;
    durationDays: number;
    grantedById: string;
  }): Promise<Subscription> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.durationDays * 86400 * 1000);

    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId: data.userId,
      gradeId: data.gradeId,
      subjectId: data.subjectId || null,
      plan: data.plan,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      grantedById: data.grantedById,
      isActive: true,
      createdAt: now.toISOString(),
    };

    if (this.prisma.isConnected) {
      try {
        const created = await this.prisma.subscription.create({
          data: {
            id: subscription.id,
            userId: subscription.userId,
            gradeId: subscription.gradeId,
            subjectId: subscription.subjectId,
            plan: subscription.plan,
            startsAt: new Date(subscription.startsAt),
            expiresAt: new Date(subscription.expiresAt),
            grantedById: subscription.grantedById,
            isActive: subscription.isActive,
          },
        });
        subscription.id = created.id;
      } catch (err: any) {
        this.logger.warn(`Prisma error, falling back to in-memory: ${err.message}`);
      }
    }

    this.subscriptionsStore.push(subscription);
    this.persistDisk();
    this.logger.log(`Subscription granted to user ${data.userId} for Grade ${data.gradeId} until ${expiresAt.toISOString()}`);
    return subscription;
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    if (this.prisma.isConnected) {
      try {
        const subs = await this.prisma.subscription.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        return subs.map((s) => ({
          ...s,
          plan: s.plan as SubscriptionPlan,
          startsAt: s.startsAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        }));
      } catch (err) {
        // Fallback
      }
    }
    return this.subscriptionsStore.filter((s) => s.userId === userId);
  }

  async findById(id: string): Promise<Subscription | undefined> {
    if (this.prisma.isConnected) {
      try {
        const s = await this.prisma.subscription.findUnique({ where: { id } });
        if (s) {
          return {
            ...s,
            plan: s.plan as SubscriptionPlan,
            startsAt: s.startsAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
          };
        }
      } catch (err) {
        // Fallback
      }
    }
    return this.subscriptionsStore.find((s) => s.id === id);
  }

  async findAll(): Promise<Subscription[]> {
    if (this.prisma.isConnected) {
      try {
        const subs = await this.prisma.subscription.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return subs.map((s) => ({
          ...s,
          plan: s.plan as SubscriptionPlan,
          startsAt: s.startsAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        }));
      } catch (err) {
        // Fallback
      }
    }
    return this.subscriptionsStore;
  }

  async issueLicenseToken(subscriptionId: string, deviceId: string): Promise<SignedLicense> {
    const sub = await this.findById(subscriptionId);
    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const durationDays = Math.max(
      1,
      Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (86400 * 1000)),
    );

    return this.licenseSigner.signLicense({
      userId: sub.userId,
      deviceId,
      gradeId: sub.gradeId,
      subjectId: sub.subjectId || undefined,
      plan: sub.plan,
      durationDays,
    });
  }

  getPublicKey(): string {
    return this.licenseSigner.getPublicKey();
  }
}
