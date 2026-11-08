import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { LicenseTokenPayload, SignedLicense, SubscriptionPlan } from '@smartteacherbook/shared';

@Injectable()
export class LicenseSignerService {
  private readonly logger = new Logger(LicenseSignerService.name);

  // Default demonstration RSA keypair for Phase 0 & Phase 1 local development
  private privateKey: string;
  private publicKey: string;

  constructor() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  /**
   * Issues an asymmetrically signed license token for a teacher's device and grade/subject
   */
  signLicense(data: {
    userId: string;
    deviceId: string;
    gradeId: number;
    subjectId?: string;
    plan: SubscriptionPlan;
    durationDays: number;
  }): SignedLicense {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + data.durationDays * 86400;

    const payload: LicenseTokenPayload = {
      userId: data.userId,
      deviceId: data.deviceId,
      gradeId: data.gradeId,
      subjectId: data.subjectId,
      plan: data.plan,
      startsAt: now,
      expiresAt,
      issuedAt: now,
      serverTime: now,
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const payloadString = JSON.stringify(payload);

    // Sign payload using SHA256 with RSA
    const sign = crypto.createSign('SHA256');
    sign.update(payloadString);
    sign.end();
    const signature = sign.sign(this.privateKey, 'base64');

    const token = Buffer.from(payloadString).toString('base64');

    return {
      payload,
      signature,
      token,
    };
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}
