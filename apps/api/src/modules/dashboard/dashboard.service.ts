import { Injectable } from '@nestjs/common';
import { RequestsService } from '../requests/requests.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { AccessRequestStatus } from '@smartteacherbook/shared';

@Injectable()
export class DashboardService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  async getStats() {
    const users = await this.usersService.findAll();
    const requests = await this.requestsService.findAll();
    const subscriptions = await this.subscriptionsService.findAll();

    const pendingRequests = requests.filter((r) => r.status === AccessRequestStatus.PENDING).length;
    const awaitingPayment = requests.filter((r) => r.status === AccessRequestStatus.AWAITING_PAYMENT).length;
    const paidApproved = requests.filter((r) => r.status === AccessRequestStatus.PAID_APPROVED).length;

    // Calculate revenue from approved requests
    const totalRevenueUzs = requests
      .filter((r) => r.status === AccessRequestStatus.PAID_APPROVED)
      .reduce((acc, curr) => acc + (curr.priceUzs || 0), 0);

    const now = Date.now();
    const expiringIn3Days = subscriptions.filter((s) => {
      const exp = new Date(s.expiresAt).getTime();
      return exp > now && exp - now <= 3 * 86400 * 1000;
    }).length;

    return {
      kpis: {
        totalTeachers: users.length,
        activeSubscriptions: subscriptions.filter((s) => s.isActive).length,
        pendingAccessRequests: pendingRequests,
        awaitingPaymentRequests: awaitingPayment,
        approvedSubscriptions: paidApproved,
        expiringIn3Days,
        estimatedRevenueUzs: totalRevenueUzs,
        s3StorageUsed: '1.42 GB',
        s3StorageQuota: '100 GB',
        storagePercent: 1.4,
      },
      systemHealth: {
        apiStatus: 'ONLINE',
        dbStatus: 'CONNECTED (PostgreSQL)',
        s3Status: 'OPERATIONAL (AWS S3)',
        sesStatus: 'OPERATIONAL (AWS SES)',
        licenseSigningKey: 'RSA-2048 ACTIVE',
      },
    };
  }
}
