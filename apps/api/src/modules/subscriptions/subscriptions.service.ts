import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseSignerService } from './license-signer.service';
import { Subscription, SubscriptionPlan, SignedLicense } from '@smartteacherbook/shared';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  // In-memory cache/fallback store
  private subscriptionsStore: Subscription[] = [
    {
      id: 'sub_demo_1',
      userId: 'user_1',
      gradeId: 11,
      subjectId: 'sub_eng_11',
      plan: SubscriptionPlan.MONTHLY,
      startsAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 25 * 86400 * 1000).toISOString(),
      grantedById: 'admin_1',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub_demo_2',
      userId: 'user_2',
      gradeId: 10,
      subjectId: 'sub_math_10',
      plan: SubscriptionPlan.THREE_MONTHS,
      startsAt: new Date(Date.now() - 40 * 86400 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 50 * 86400 * 1000).toISOString(),
      grantedById: 'admin_1',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

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
