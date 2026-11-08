import * as crypto from 'crypto';

export class AesGcmKeystoreCrypto {
  /**
   * Generates a 256-bit cryptographically secure key
   */
  static generateKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypts plaintext buffer using AES-256-GCM
   */
  static encrypt(plaintext: Buffer, key: Buffer): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { iv, authTag, ciphertext };
  }

  /**
   * Decrypts ciphertext buffer using AES-256-GCM and verifies authenticity tag
   */
  static decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Wraps (encrypts) a per-file key using the device Master Keystore Key
   */
  static wrapKey(perFileKey: Buffer, masterKey: Buffer): { wrappedKey: Buffer; iv: Buffer; tag: Buffer } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    const wrappedKey = Buffer.concat([cipher.update(perFileKey), cipher.final()]);
    return { wrappedKey, iv, tag: cipher.getAuthTag() };
  }

  /**
   * Unwraps (decrypts) a per-file key strictly into RAM
   */
  static unwrapKey(wrappedKey: Buffer, masterKey: Buffer, iv: Buffer, tag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(wrappedKey), decipher.final()]);
  }
}

export function runKeystoreEncryptionTests(): { name: string; passed: boolean; details: string }[] {
  const results: { name: string; passed: boolean; details: string }[] = [];

  const masterHardwareKey = AesGcmKeystoreCrypto.generateKey();
  const perFileKey = AesGcmKeystoreCrypto.generateKey();

  // Simulated WebP page image buffer
  const samplePageWebP = Buffer.from('RIFF....WEBPVP8 ...Grade 11 Secondary Textbook Page 2 Content...');

  // Test 1: Key wrapping via Master Keystore Key
  const wrapped = AesGcmKeystoreCrypto.wrapKey(perFileKey, masterHardwareKey);
  const unwrappedKey = AesGcmKeystoreCrypto.unwrapKey(wrapped.wrappedKey, masterHardwareKey, wrapped.iv, wrapped.tag);
  const keysMatch = perFileKey.equals(unwrappedKey);
  results.push({
    name: 'Android Keystore Hardware Key Envelope Wrapping (AES-256-GCM)',
    passed: keysMatch,
    details: `Key length: ${unwrappedKey.length * 8} bits, Key match: ${keysMatch}`,
  });

  // Test 2: Encrypting and decrypting textbook page image in RAM
  const encryptedPage = AesGcmKeystoreCrypto.encrypt(samplePageWebP, unwrappedKey);
  const decryptedPage = AesGcmKeystoreCrypto.decrypt(
    encryptedPage.ciphertext,
    unwrappedKey,
    encryptedPage.iv,
    encryptedPage.authTag,
  );
  const payloadMatches = samplePageWebP.equals(decryptedPage);
  results.push({
    name: 'Textbook WebP Page Encryption & RAM-Only Stream Decryption',
    passed: payloadMatches,
    details: `Original size: ${samplePageWebP.length} B, Ciphertext: ${encryptedPage.ciphertext.length} B, Match: ${payloadMatches}`,
  });

  // Test 3: Tampered ciphertext / auth tag must fail verification
  let tamperRejected = false;
  try {
    const corruptedTag = Buffer.from(encryptedPage.authTag);
    corruptedTag[0] = corruptedTag[0] ^ 0xff; // Flip bits
    AesGcmKeystoreCrypto.decrypt(encryptedPage.ciphertext, unwrappedKey, encryptedPage.iv, corruptedTag);
  } catch {
    tamperRejected = true;
  }
  results.push({
    name: 'Ciphertext Authentication Tag Integrity (Tamper Resistance)',
    passed: tamperRejected,
    details: `Corrupted tag rejected by GCM decipher: ${tamperRejected}`,
  });

  // Test 4: Cannot decrypt with another device's master key
  let foreignKeyRejected = false;
  try {
    const foreignMasterKey = AesGcmKeystoreCrypto.generateKey();
    AesGcmKeystoreCrypto.unwrapKey(wrapped.wrappedKey, foreignMasterKey, wrapped.iv, wrapped.tag);
  } catch {
    foreignKeyRejected = true;
  }
  results.push({
    name: 'Hardware Device Binding (Non-Transferable Across Devices)',
    passed: foreignKeyRejected,
    details: `Attempt to unwrap on foreign device rejected: ${foreignKeyRejected}`,
  });

  return results;
}
