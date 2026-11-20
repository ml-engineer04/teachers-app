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
        let dbSubjectId: string | null = null;
        if (subscription.subjectId) {
          const sub = await this.prisma.subject.findFirst({
            where: {
              OR: [
                { id: subscription.subjectId },
                { code: { equals: subscription.subjectId.replace(/^sub_/, ''), mode: 'insensitive' } },
              ],
            },
          });
          dbSubjectId = sub?.id || null;
        }

        let validAdminId = subscription.grantedById;
        const adminExists = await this.prisma.admin.findUnique({ where: { id: validAdminId } }).catch(() => null);
        if (!adminExists) {
          const firstAdmin = await this.prisma.admin.findFirst().catch(() => null);
          if (firstAdmin) validAdminId = firstAdmin.id;
        }

        const created = await this.prisma.subscription.create({
          data: {
            id: subscription.id,
            userId: subscription.userId,
            gradeId: subscription.gradeId,
            subjectId: dbSubjectId,
            plan: subscription.plan,
            startsAt: new Date(subscription.startsAt),
            expiresAt: new Date(subscription.expiresAt),
            grantedById: validAdminId,
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
          include: { subject: true },
        });
        if (subs && subs.length > 0) {
          return subs.map((s) => ({
            ...s,
            subjectId: s.subject?.code ? `sub_${s.subject.code.toLowerCase()}` : (s.subjectId || null),
            plan: s.plan as SubscriptionPlan,
            startsAt: s.startsAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
          }));
        }
      } catch (err) {
        // Fallback
      }
    }

    // Direct check in in-memory / persisted store
    const direct = this.subscriptionsStore.filter((s) => s.userId === userId);
    if (direct.length > 0) return direct;

    try {
      let userEmail: string | undefined;
      if (this.prisma.isConnected) {
        const dbUser = await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
        userEmail = dbUser?.email;
      }
      if (!userEmail) {
        const users = readJsonDiskSync<any[]>('users-state.json');
        const currentUser = users?.find((u) => u.id === userId);
        userEmail = currentUser?.email;
      }

      if (userEmail) {
        const cleanEmail = userEmail.trim().toLowerCase();
        // 1. Check in users-state.json directly
        const users = readJsonDiskSync<any[]>('users-state.json');
        const matchedUser = users?.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail);
        if (matchedUser?.subscriptions && matchedUser.subscriptions.length > 0) {
          return matchedUser.subscriptions.map((s: any) => ({ ...s, userId }));
        }

        // 2. Check approved requests
        const reqs = readJsonDiskSync<any[]>('requests-state.json');
        const approvedReqs = reqs?.filter(
          (r) =>
            r.userEmail?.toLowerCase() === cleanEmail &&
            r.status === AccessRequestStatus.PAID_APPROVED,
        );
        if (approvedReqs && approvedReqs.length > 0) {
          const matchedIds = new Set(approvedReqs.map((r) => r.userId));
          const matchedSubs = this.subscriptionsStore.filter((s) => matchedIds.has(s.userId));
          if (matchedSubs.length > 0) {
            return matchedSubs.map((s) => ({ ...s, userId }));
          }
        }
      }
    } catch {
      // ignore
    }

    return [];
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

  async cancelSubscription(id: string): Promise<{ success: boolean; message: string }> {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.subscription.update({
          where: { id },
          data: { isActive: false },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma cancelSubscription fallback: ${err.message}`);
      }
    }

    const sub = this.subscriptionsStore.find((s) => s.id === id);
    if (!sub) {
      // Check if ID matches in approved requests
      try {
        const reqs = readJsonDiskSync<any[]>('requests-state.json') || [];
        const matchedReq = reqs.find((r) => r.id === id || r.userId === id);
        if (matchedReq) {
          matchedReq.status = 'CANCELLED';
          writeJsonDiskSync('requests-state.json', reqs);
        }
      } catch {}
      throw new NotFoundException(`Subscription ${id} topilmadi`);
    }

    sub.isActive = false;
    sub.expiresAt = new Date().toISOString(); // expire immediately
    this.persistDisk();

    // Also update matching request if exists
    try {
      const reqs = readJsonDiskSync<any[]>('requests-state.json') || [];
      let reqUpdated = false;
      for (const r of reqs) {
        if (r.userId === sub.userId && Number(r.gradeId) === Number(sub.gradeId)) {
          r.status = 'CANCELLED';
          r.internalNote = (r.internalNote || '') + ' [Admin tomonidan obuna bekor qilindi]';
          reqUpdated = true;
        }
      }
      if (reqUpdated) {
        writeJsonDiskSync('requests-state.json', reqs);
      }
    } catch {}

    this.logger.log(`Subscription ${id} cancelled by admin.`);
    return { success: true, message: 'Obuna muvaffaqiyatli bekor qilindi' };
  }

  async deleteByUserId(userId: string): Promise<number> {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.subscription.deleteMany({
          where: { userId },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma deleteByUserId fallback: ${err.message}`);
      }
    }

    const initialLen = this.subscriptionsStore.length;
    this.subscriptionsStore = this.subscriptionsStore.filter((s) => s.userId !== userId);
    const removedCount = initialLen - this.subscriptionsStore.length;
    if (removedCount > 0) {
      this.persistDisk();
    }
    return removedCount;
  }

  async findByUserIdOrEmail(userId: string, email?: string): Promise<Subscription[]> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const subsById = await this.findByUserId(userId);
    if (!cleanEmail) return subsById;

    const subsByEmail = await this.findByUserEmail(cleanEmail);
    const combinedMap = new Map<string, Subscription>();
    for (const s of [...subsById, ...subsByEmail]) {
      const key = s.id || `${s.gradeId}:${s.subjectId || 'ALL'}`;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, { ...s, userId });
      }
    }
    return Array.from(combinedMap.values());
  }

  async findByUserEmail(email: string): Promise<Subscription[]> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return [];
    try {
      const results: Subscription[] = [];
      const seenIds = new Set<string>();

      // 1. Prisma
      if (this.prisma.isConnected) {
        try {
          const dbUsers = await this.prisma.user.findMany({
            where: { email: cleanEmail },
            include: {
              subscriptions: {
                include: { subject: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          });
          for (const u of dbUsers) {
            for (const s of u.subscriptions) {
              if (!seenIds.has(s.id)) {
                seenIds.add(s.id);
                results.push({
                  ...s,
                  subjectId: s.subject?.code ? `sub_${s.subject.code.toLowerCase()}` : (s.subjectId || null),
                  plan: s.plan as SubscriptionPlan,
                  startsAt: s.startsAt.toISOString(),
                  expiresAt: s.expiresAt.toISOString(),
                  createdAt: s.createdAt.toISOString(),
                });
              }
            }
          }
        } catch {}
      }

      // 2. Direct match in subscriptionsStore by requests-state
      const reqs = readJsonDiskSync<any[]>('requests-state.json') || [];
      const userReqs = reqs.filter(
        (r) => (r.userEmail || '').trim().toLowerCase() === cleanEmail && r.status === AccessRequestStatus.PAID_APPROVED,
      );
      if (userReqs.length > 0) {
        const userIds = new Set(userReqs.map((r) => r.userId));
        for (const s of this.subscriptionsStore.filter((sub) => userIds.has(sub.userId))) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            results.push(s);
          }
        }
      }

      // 3. Match in users-state.json
      const users = readJsonDiskSync<any[]>('users-state.json') || [];
      const matchedUser = users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (matchedUser) {
        for (const s of this.subscriptionsStore.filter((sub) => sub.userId === matchedUser.id)) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            results.push(s);
          }
        }
        if (Array.isArray(matchedUser.subscriptions)) {
          for (const s of matchedUser.subscriptions) {
            if (!seenIds.has(s.id)) {
              seenIds.add(s.id);
              results.push(s);
            }
          }
        }
      }

      return results;
    } catch {}
    return [];
  }

  getPublicKey(): string {
    return this.licenseSigner.getPublicKey();
  }
}
