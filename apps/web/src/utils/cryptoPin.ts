/**
 * Native Web Crypto SHA-256 Pin Hash for Classroom SmartBoard Lock
 */
export async function hashPinCode(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`smartteacher_pin_salt_${pin.trim()}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPinCode(pin: string, storedHash: string): Promise<boolean> {
  const computed = await hashPinCode(pin);
  return computed === storedHash;
}
