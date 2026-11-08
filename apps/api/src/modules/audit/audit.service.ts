import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogItem {
  id: string;
  adminId?: string | null;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: any;
  ipAddress?: string | null;
  createdAt: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // In-memory demo store
  private logsStore: AuditLogItem[] = [
    {
      id: 'log_01',
      adminId: 'admin_1',
      adminEmail: 'superadmin@smartteacherbook.com',
      action: 'GRANT_ACCESS',
      entityType: 'AccessRequest',
      entityId: 'req_003',
      payload: { gradeId: 9, plan: 'YEARLY', durationDays: 365 },
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'log_02',
      adminId: 'admin_1',
      adminEmail: 'superadmin@smartteacherbook.com',
      action: 'INGEST_BOOK_CONTENT',
      entityType: 'Book',
      entityId: 'book_grade11_english_sb',
      payload: { totalPages: 160, matchedHotspots: 3 },
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'log_03',
      adminId: 'admin_1',
      adminEmail: 'superadmin@smartteacherbook.com',
      action: 'UPDATE_GRADE_PRICING',
      entityType: 'Grade',
      entityId: '11',
      payload: { priceMonthlyUzs: 119000, priceQuarterlyUzs: 299000 },
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    adminId?: string;
    adminEmail?: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: any;
    ipAddress?: string;
  }): Promise<AuditLogItem> {
    const item: AuditLogItem = {
      id: `log_${Date.now()}`,
      adminId: data.adminId || null,
      adminEmail: data.adminEmail || 'superadmin@smartteacherbook.com',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      payload: data.payload,
      ipAddress: data.ipAddress || '127.0.0.1',
      createdAt: new Date().toISOString(),
    };

    if (this.prisma.isConnected) {
      try {
        await this.prisma.auditLog.create({
          data: {
            id: item.id,
            adminId: item.adminId,
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId,
            payload: item.payload,
            ipAddress: item.ipAddress,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma error, fallback: ${err.message}`);
      }
    }

    this.logsStore.unshift(item);
    this.logger.log(`Audit [${data.action}] on ${data.entityType} ${data.entityId || ''} by ${data.adminEmail || 'admin'}`);
    return item;
  }

  async findAll(limit = 50): Promise<AuditLogItem[]> {
    return this.logsStore.slice(0, limit);
  }
}
