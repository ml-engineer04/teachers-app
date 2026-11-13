import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../email/email.service';
import { GradesService } from '../grades/grades.service';
import { SubjectsService } from '../subjects/subjects.service';
import { UsersService } from '../users/users.service';
import {
  AccessRequest,
  AccessRequestStatus,
  SubscriptionPlan,
  CreateAccessRequestDto,
} from '@smartteacherbook/shared';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

@Injectable()
export class RequestsService implements OnModuleInit {
  private readonly logger = new Logger(RequestsService.name);
  private diskEnabled = false;

  // Clean in-memory requests store (starts empty, populated by incoming requests)
  private requestsStore: AccessRequest[] = [];

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;

    const saved = readJsonDiskSync<AccessRequest[]>('requests-state.json');
    if (Array.isArray(saved)) {
      this.requestsStore = saved;
      return;
    }

    const snap = readJsonDiskSync<{ requests?: AccessRequest[] }>('live-snapshot.json');
    if (Array.isArray(snap?.requests) && snap.requests.length > 0) {
      const seenActiveKeys = new Set<string>();
      const cleaned: AccessRequest[] = [];
      for (const req of snap.requests) {
        const isTerminal =
          req.status === AccessRequestStatus.REJECTED ||
          req.status === AccessRequestStatus.EXPIRED;
        const dedupKey = `${(req.userEmail || req.userId || '').toLowerCase()}:${req.gradeId}:${req.subjectId || 'ALL'}`;
        if (!isTerminal) {
          if (seenActiveKeys.has(dedupKey)) {
            continue;
          }
          seenActiveKeys.add(dedupKey);
        }
        cleaned.push(req);
      }
      this.requestsStore = cleaned;
      this.persistDisk();
    }
  }

  private persistDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('requests-state.json', this.requestsStore);
  }

  clearAll() {
    this.requestsStore = [];
    this.persistDisk();
    this.logger.log('🧹 Requests store cleared completely.');
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly emailService: EmailService,
    private readonly gradesService: GradesService,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveDynamicPrice(
    plan: SubscriptionPlan,
    gradeId?: number,
    subjectId?: string | null,
  ): Promise<number> {
    try {
      const plans = await this.gradesService.getGeneralPricing(gradeId, subjectId || undefined);
      const matched = plans.find((p) => p.id === plan);
      if (matched && typeof matched.priceUzs === 'number') {
        return matched.priceUzs;
      }
    } catch {}

    const fallback: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.MONTHLY]: 119000,
      [SubscriptionPlan.THREE_MONTHS]: 299000,
      [SubscriptionPlan.YEARLY]: 890000,
    };
    return fallback[plan] || 119000;
  }

  private async resolveSubjectName(subjectId?: string | null): Promise<string> {
    if (!subjectId) return 'Barcha fanlar';
    try {
      const subjects = await this.subjectsService.findAll();
      const found = subjects.find(
        (s) =>
          s.id === subjectId ||
          s.code.toLowerCase() === subjectId.toLowerCase() ||
          s.name.toLowerCase() === subjectId.toLowerCase(),
      );
      if (found) return found.name;
    } catch {}
    return subjectId;
  }

  private async resolveCanonicalSubject(subjectId?: string | null): Promise<string | null> {
    if (!subjectId) return null;
    try {
      const resolved = await this.gradesService.resolveCanonicalSubjectId(subjectId);
      return resolved || subjectId;
    } catch {
      return subjectId;
    }
  }

  async create(userId: string, userEmail: string, dto: CreateAccessRequestDto): Promise<AccessRequest> {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const targetGrade = Number(dto.gradeId);
    const canonicalSubjectId = await this.resolveCanonicalSubject(dto.subjectId);

    // Enforce single active/pending request per user per grade & subject
    const userSubs = await this.subscriptionsService.findByUserId(userId).catch(() => []);
    const now = Date.now();
    const hasActiveSub = userSubs.some((s) => {
      if (!s.isActive || new Date(s.expiresAt).getTime() <= now) return false;
      if (Number(s.gradeId) !== targetGrade) return false;
      if (!s.subjectId || !canonicalSubjectId) return true;
      return s.subjectId === canonicalSubjectId;
    });

    if (hasActiveSub) {
      throw new ConflictException(
        'Sizda ushbu sinf va fan uchun faol obuna allaqachon mavjud. Bir fan uchun qayta so‘rov yuborib bo‘lmaydi.',
      );
    }

    const existingDuplicate = this.requestsStore.find((r) => {
      const sameUser =
        r.userId === userId || (cleanEmail && (r.userEmail || '').trim().toLowerCase() === cleanEmail);
      if (!sameUser) return false;
      if (Number(r.gradeId) !== targetGrade) return false;

      const reqSubj = r.subjectId || null;
      const sameSubject =
        !canonicalSubjectId ||
        !reqSubj ||
        reqSubj === canonicalSubjectId ||
        reqSubj.toLowerCase() === (dto.subjectId || '').trim().toLowerCase();
      if (!sameSubject) return false;

      return (
        r.status === AccessRequestStatus.PENDING ||
        r.status === AccessRequestStatus.AWAITING_PAYMENT
      );
    });

    if (existingDuplicate) {
      throw new ConflictException(
        'Ushbu sinf va fan bo‘yicha so‘rovingiz allaqachon yuborilgan va ko‘rib chiqilmoqda.',
      );
    }

    const priceUzs = await this.resolveDynamicPrice(dto.plan, targetGrade, canonicalSubjectId);
    const resolvedSubjectName = await this.resolveSubjectName(canonicalSubjectId);

    const newRequest: AccessRequest = {
      id: `req_${Date.now()}`,
      userId,
      userEmail,
      gradeId: targetGrade,
      gradeNumber: targetGrade,
      subjectId: canonicalSubjectId,
      subjectName: resolvedSubjectName,
      plan: dto.plan,
      phoneNumber: dto.phoneNumber,
      status: AccessRequestStatus.PENDING,
      priceUzs,
      internalNote: 'Yangi so‘rov qabul qilindi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.prisma.isConnected) {
      try {
        await this.prisma.accessRequest.create({
          data: {
            id: newRequest.id,
            userId: newRequest.userId,
            gradeId: newRequest.gradeId,
            subjectId: newRequest.subjectId,
            plan: newRequest.plan,
            phoneNumber: newRequest.phoneNumber,
            status: newRequest.status,
            priceUzs: newRequest.priceUzs,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma error, falling back to memory: ${err.message}`);
      }
    }

    this.requestsStore.unshift(newRequest);
    this.persistDisk();

    // Send SES email notification to administrators (§8 Master Prompt)
    await this.emailService.sendNewAccessRequestAlert({
      requestId: newRequest.id,
      userEmail: newRequest.userEmail,
      phoneNumber: newRequest.phoneNumber,
      gradeNumber: newRequest.gradeNumber,
      subjectName: newRequest.subjectName || '',
      plan: newRequest.plan,
      priceUzs: newRequest.priceUzs,
    });

    return newRequest;
  }

  async getMyRequests(userId: string): Promise<AccessRequest[]> {
    if (this.prisma.isConnected) {
      try {
        const list = await this.prisma.accessRequest.findMany({
          where: { userId },
          include: { grade: true, subject: true, user: true },
          orderBy: { createdAt: 'desc' },
        });
        return list.map((r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: r.user.email,
          gradeId: r.gradeId,
          gradeNumber: r.grade.gradeNumber,
          subjectId: r.subjectId,
          subjectName: r.subject?.name,
          plan: r.plan as SubscriptionPlan,
          phoneNumber: r.phoneNumber,
          status: r.status as AccessRequestStatus,
          priceUzs: r.priceUzs,
          internalNote: r.internalNote,
          callLoggedAt: r.callLoggedAt?.toISOString(),
          resolvedAt: r.resolvedAt?.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        // Fallback
      }
    }
    return this.requestsStore.filter((r) => r.userId === userId);
  }

  async findAll(query?: {
    status?: AccessRequestStatus;
    gradeId?: number;
    search?: string;
  }): Promise<AccessRequest[]> {
    let list = [...this.requestsStore];

    if (query?.status) {
      list = list.filter((r) => r.status === query.status);
    }
    if (query?.gradeId) {
      list = list.filter((r) => r.gradeId === Number(query.gradeId));
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.userEmail.toLowerCase().includes(q) ||
          r.phoneNumber.toLowerCase().includes(q) ||
          (r.subjectName && r.subjectName.toLowerCase().includes(q)),
      );
    }

    return list;
  }

  async markContacted(id: string, adminId: string, note?: string): Promise<AccessRequest> {
    const req = this.requestsStore.find((r) => r.id === id);
    if (!req) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    req.status = AccessRequestStatus.AWAITING_PAYMENT;
    req.adminId = adminId;
    req.callLoggedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    if (note) req.internalNote = note;

    if (this.prisma.isConnected) {
      try {
        await this.prisma.accessRequest.update({
          where: { id },
          data: {
            status: AccessRequestStatus.AWAITING_PAYMENT,
            adminId,
            callLoggedAt: new Date(),
            internalNote: note,
          },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.persistDisk();
    this.logger.log(`Admin ${adminId} contacted user for request ${id}`);
    return req;
  }

  async grantAccess(params: {
    requestId: string;
    adminId: string;
    durationDays?: number;
    note?: string;
  }): Promise<{ request: AccessRequest; subscription: any }> {
    const req = this.requestsStore.find((r) => r.id === params.requestId);
    if (!req) {
      throw new NotFoundException(`Request ${params.requestId} not found`);
    }
    if (req.status === AccessRequestStatus.PAID_APPROVED) {
      throw new ConflictException('Ushbu so‘rov allaqachon qabul qilingan.');
    }

    const existingSubs = await this.subscriptionsService.findByUserId(req.userId).catch(() => []);
    const alreadyActiveSub = existingSubs.find((s) => {
      if (!s.isActive || new Date(s.expiresAt).getTime() <= Date.now()) return false;
      if (Number(s.gradeId) !== Number(req.gradeId)) return false;
      if (!s.subjectId || !req.subjectId) return true;
      return s.subjectId === req.subjectId;
    });
    if (alreadyActiveSub) {
      throw new ConflictException(
        'Foydalanuvchida ushbu sinf va fan uchun faol obuna allaqachon mavjud.',
      );
    }

    // Default duration based on plan: 30 days for MONTHLY, 90 for THREE_MONTHS, 365 for YEARLY
    let days = params.durationDays;
    if (!days) {
      if (req.plan === SubscriptionPlan.MONTHLY) days = 30;
      else if (req.plan === SubscriptionPlan.THREE_MONTHS) days = 90;
      else days = 365;
    }

    // 1. Create active subscription
    const subscription = await this.subscriptionsService.createSubscription({
      userId: req.userId,
      gradeId: req.gradeId,
      subjectId: req.subjectId,
      plan: req.plan,
      durationDays: days,
      grantedById: params.adminId,
    });

    // 2. Mark request as PAID_APPROVED
    req.status = AccessRequestStatus.PAID_APPROVED;
    req.adminId = params.adminId;
    req.resolvedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    if (params.note) req.internalNote = params.note;

    if (this.prisma.isConnected) {
      try {
        await this.prisma.accessRequest.update({
          where: { id: params.requestId },
          data: {
            status: AccessRequestStatus.PAID_APPROVED,
            adminId: params.adminId,
            resolvedAt: new Date(),
            internalNote: params.note,
          },
        });
      } catch (err) {
        // Fallback
      }
    }

    // Update user activeSubscriptionsCount in UsersService
    try {
      const userObj = await this.usersService.findById(req.userId);
      if (userObj) {
        const userSubs = await this.subscriptionsService.findByUserId(req.userId);
        userObj.activeSubscriptionsCount = userSubs.filter(
          (s) => s.isActive && new Date(s.expiresAt) > new Date(),
        ).length;
        this.usersService.persistDisk();
      }
    } catch {}

    this.persistDisk();
    this.logger.log(`Access granted for request ${req.id}. Subscription ${subscription.id} created.`);
    return { request: req, subscription };
  }

  async grantManualSubscription(params: {
    teacherNameOrEmail: string;
    phoneNumber?: string;
    gradeId: number;
    subjectId?: string;
    durationDays?: number;
    plan?: SubscriptionPlan;
    adminId: string;
  }) {
    const query = params.teacherNameOrEmail.trim().toLowerCase();
    const allUsers = await this.usersService.findAll();
    const matchedUser = allUsers.find(
      (u) =>
        u.email.toLowerCase() === query ||
        (u.fullName && u.fullName.toLowerCase() === query) ||
        u.email.toLowerCase().includes(query),
    );

    const userId = matchedUser?.id || `usr_${query.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userEmail = matchedUser?.email || (query.includes('@') ? query : `${query.replace(/\s+/g, '.')}@gmail.com`);
    const days = Number(params.durationDays) || 30;
    const plan =
      params.plan ||
      (days >= 300 ? SubscriptionPlan.YEARLY : days >= 80 ? SubscriptionPlan.THREE_MONTHS : SubscriptionPlan.MONTHLY);
    const priceUzs = await this.resolveDynamicPrice(
      plan,
      Number(params.gradeId) || 7,
      params.subjectId,
    );
    const subjectName = await this.resolveSubjectName(params.subjectId);

    const newReq: AccessRequest = {
      id: `req_manual_${Date.now()}`,
      userId,
      userEmail,
      gradeId: Number(params.gradeId) || 7,
      gradeNumber: Number(params.gradeId) || 7,
      subjectId: params.subjectId || null,
      subjectName,
      plan,
      phoneNumber: params.phoneNumber || '+998 -- --- -- --',
      status: AccessRequestStatus.PAID_APPROVED,
      priceUzs,
      adminId: params.adminId,
      internalNote: `Admin qo‘lda faollashtirdi (${params.teacherNameOrEmail})`,
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.requestsStore.unshift(newReq);

    const subscription = await this.subscriptionsService.createSubscription({
      userId,
      gradeId: Number(params.gradeId) || 7,
      subjectId: params.subjectId || null,
      plan,
      durationDays: days,
      grantedById: params.adminId,
    });

    if (matchedUser) {
      const userSubs = await this.subscriptionsService.findByUserId(userId);
      matchedUser.activeSubscriptionsCount = userSubs.filter(
        (s) => s.isActive && new Date(s.expiresAt) > new Date(),
      ).length;
      this.usersService.persistDisk();
    }

    this.persistDisk();
    return { request: newReq, subscription };
  }

  async rejectAccess(requestId: string, adminId: string, reason: string): Promise<AccessRequest> {
    const req = this.requestsStore.find((r) => r.id === requestId);
    if (!req) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    req.status = AccessRequestStatus.REJECTED;
    req.adminId = adminId;
    req.resolvedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    req.internalNote = `Rad etildi: ${reason}`;

    if (this.prisma.isConnected) {
      try {
        await this.prisma.accessRequest.update({
          where: { id: requestId },
          data: {
            status: AccessRequestStatus.REJECTED,
            adminId,
            resolvedAt: new Date(),
            internalNote: `Rad etildi: ${reason}`,
          },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.persistDisk();
    this.logger.log(`Request ${requestId} rejected by admin ${adminId}: ${reason}`);
    return req;
  }
}
