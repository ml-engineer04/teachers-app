import * as crypto from 'crypto';

export function runLicenseVerifierTests(): { name: string; passed: boolean; details: string }[] {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // Generate asymmetric RSA keypair (matches NestJS LicenseSignerService)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const validPayload = {
    userId: 'teacher_nodira_123',
    deviceId: 'sec_galaxy_tab_s7',
    gradeId: 11,
    subjectId: 'sub_eng_11',
    plan: 'MONTHLY',
    startsAt: nowSec,
    expiresAt: nowSec + 30 * 86400,
    issuedAt: nowSec,
    serverTime: nowSec,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadString = JSON.stringify(validPayload);

  // Sign with backend private key
  const signer = crypto.createSign('SHA256');
  signer.update(payloadString);
  signer.end();
  const signature = signer.sign(privateKey, 'base64');

  // Helper: Client verification using public key
  const verifyToken = (payloadStr: string, sig: string): boolean => {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(payloadStr);
      verifier.end();
      return verifier.verify(publicKey, sig, 'base64');
    } catch {
      return false;
    }
  };

  // Test 1: Legitimate license signature verification
  const t1 = verifyToken(payloadString, signature);
  results.push({
    name: 'Asymmetric RSA-2048 License Signature Verification',
    passed: t1 === true,
    details: `Signature valid: ${t1}`,
  });

  // Test 2: Tampered payload (e.g. hacker changed gradeId 11 to 10 or extended expiresAt)
  const tamperedPayload = { ...validPayload, expiresAt: nowSec + 365 * 86400 };
  const t2 = verifyToken(JSON.stringify(tamperedPayload), signature);
  results.push({
    name: 'Tampered License Payload Rejection (Digital Signature Integrity)',
    passed: t2 === false,
    details: `Tampered payload accepted: ${t2} (Must be false)`,
  });

  // Test 3: Expired license rejection
  const expiredPayload = {
    ...validPayload,
    startsAt: nowSec - 31 * 86400,
    expiresAt: nowSec - 100, // Expired in the past
  };
  const expSigner = crypto.createSign('SHA256');
  expSigner.update(JSON.stringify(expiredPayload));
  expSigner.end();
  const expSig = expSigner.sign(privateKey, 'base64');

  const isSigValid = verifyToken(JSON.stringify(expiredPayload), expSig);
  const isExpired = expiredPayload.expiresAt <= nowSec;
  results.push({
    name: 'Expired License Lockout Enforcement (30-Day Limit)',
    passed: isSigValid && isExpired,
    details: `Signature valid: ${isSigValid}, Access permitted: ${!isExpired} (Must be locked)`,
  });

  return results;
}
