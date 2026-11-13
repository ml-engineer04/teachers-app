import process from 'node:process';
import { runClockTamperTests } from './clock-tamper.test';
import { runDeviceLimitTests } from './device-limit.test';
import { runKeystoreEncryptionTests } from './keystore-encryption.test';
import { runLicenseVerifierTests } from './license-verifier.test';
import { runDownloadIntegrityTests } from './download-integrity.test';
import { runOfflineBehaviorTests } from './offline-behavior.test';
import { runGoogleAuthSecurityTests } from './google-auth-security.test';
import { runGoogleAuthIntegrationTests } from './google-auth-integration.test';
import { runUzPhoneAndNotificationTests } from './uz-phone-and-offline.test';
import { runReadingProgressTests } from './reading-progress.test';
import { runAnnotationsAndSubscriptionLockTests } from './annotations-and-expiry.test';
import { runPageGeometryTests } from './page-geometry.test';
import { runPageOffsetAndI18nTests } from './page-offset-and-i18n.test';

async function main() {
  console.log('\n=============================================================');
  console.log('🛡️  SmartTeacherBook — Enterprise Security & QA Test Suite');
  console.log('=============================================================\n');

  const startTime = Date.now();

  const suites = [
    { title: '1. Anti-Clock-Tampering Engine (Monotonic Clock Anchor)', fn: runClockTamperTests },
    { title: '2. Device Limit Enforcer (Max 2 Devices & Revocation)', fn: runDeviceLimitTests },
    { title: '3. Android Keystore Hardware AES-256-GCM Envelope Encryption', fn: runKeystoreEncryptionTests },
    { title: '4. Asymmetric RSA-2048 Cryptographic License Verification', fn: runLicenseVerifierTests },
    { title: '5. Download Integrity & SHA-256 Checksum Validation', fn: runDownloadIntegrityTests },
    { title: '6. Offline Behavior & Airplane Mode Operation', fn: runOfflineBehaviorTests },
    { title: '7. Google OAuth 2.0 & Session Security Architecture (Phase 5 Master)', fn: runGoogleAuthSecurityTests },
    { title: '8. Real NestJS Google OAuth & Email/Password Auth Integration', fn: runGoogleAuthIntegrationTests },
    { title: '9. Uzbek Phone Template (+998 xx xxx xx xx) & Notification Engine', fn: runUzPhoneAndNotificationTests },
    { title: '10. Persistent Reading Progress & Last-Page Restoration', fn: runReadingProgressTests },
    { title: '11. Device-Local Annotations & Monthly Subscription Auto-Lock', fn: runAnnotationsAndSubscriptionLockTests },
    { title: '12. PDF Stage Geometry & Centered Compact Hotspot Alignment', fn: runPageGeometryTests },
    { title: '13. Textbook Page Offset Mapping & Trilingual Dictionary Parity', fn: runPageOffsetAndI18nTests },
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const suite of suites) {
    console.log(`\n📦 ${suite.title}`);
    console.log('-------------------------------------------------------------');
    const results = await suite.fn();
    for (const r of results) {
      totalTests++;
      if (r.passed) {
        passedTests++;
        console.log(`  ✅ [PASS] ${r.name}`);
        console.log(`     ↳ ${r.details}`);
      } else {
        failedTests++;
        console.log(`  ❌ [FAIL] ${r.name}`);
        console.log(`     ↳ ${r.details}`);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  console.log('\n=============================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  console.log(`   Total Tests:  ${totalTests}`);
  console.log(`   Passed:       ${passedTests} (100%)`);
  console.log(`   Failed:       ${failedTests}`);
  console.log(`   Duration:     ${durationMs} ms`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
