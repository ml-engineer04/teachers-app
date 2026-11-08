import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../email/email.service';
import {
  AccessRequest,
  AccessRequestStatus,
  SubscriptionPlan,
  CreateAccessRequestDto,
} from '@smartteacherbook/shared';

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  // In-memory fallback demo requests
  private requestsStore: AccessRequest[] = [
    {
      id: 'req_001',
      userId: 'user_1',
      userEmail: 'malika.karimova@maktab.uz',
      gradeId: 11,
      gradeNumber: 11,
      subjectId: 'sub_eng_11',
      subjectName: 'English (Ingliz tili)',
      plan: SubscriptionPlan.MONTHLY,
      phoneNumber: '+998 90 123 45 67',
      status: AccessRequestStatus.PENDING,
      priceUzs: 119000,
      internalNote: 'Yangi so‘rov qoldirdi',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'req_002',
      userId: 'user_2',
      userEmail: 'jasur.bek@maktab.uz',
      gradeId: 10,
      gradeNumber: 10,
      subjectId: 'sub_math_10',
      subjectName: 'Algebra & Geometriya',
      plan: SubscriptionPlan.THREE_MONTHS,
      phoneNumber: '+998 93 987 65 43',
      status: AccessRequestStatus.AWAITING_PAYMENT,
      priceUzs: 272000,
      internalNote: 'Qo‘ng‘iroq qilindi, to‘lov chekini kutyapmiz',
      callLoggedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'req_003',
      userId: 'user_3',
      userEmail: 'aziza.rahimova@maktab.uz',
      gradeId: 9,
      gradeNumber: 9,
      subjectId: 'sub_phys_9',
      subjectName: 'Fizika',
      plan: SubscriptionPlan.YEARLY,
      phoneNumber: '+998 97 555 12 34',
      status: AccessRequestStatus.PAID_APPROVED,
      priceUzs: 792000,
      internalNote: 'To‘lov tasdiqlandi va ruxsat berildi',
      callLoggedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      resolvedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, userEmail: string, dto: CreateAccessRequestDto): Promise<AccessRequest> {
    const pricesByPlan: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.MONTHLY]: 119000,
      [SubscriptionPlan.THREE_MONTHS]: 299000,
      [SubscriptionPlan.YEARLY]: 890000,
    };

    const priceUzs = pricesByPlan[dto.plan] || 119000;

    const newRequest: AccessRequest = {
      id: `req_${Date.now()}`,
      userId,
      userEmail,
      gradeId: dto.gradeId,
      gradeNumber: dto.gradeId,
      subjectId: dto.subjectId || null,
      subjectName: dto.subjectId ? 'English (Ingliz tili)' : 'Barcha fanlar',
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

    this.logger.log(`Access granted for request ${req.id}. Subscription ${subscription.id} created.`);
    return { request: req, subscription };
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

    this.logger.log(`Request ${requestId} rejected by admin ${adminId}: ${reason}`);
    return req;
  }
}
