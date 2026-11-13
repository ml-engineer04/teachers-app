export const UZ_PHONE_PREFIX = '+998 ';
export const UZ_PHONE_LOCAL_LENGTH = 9;
export const UZ_PHONE_MAX_LENGTH = 17; // "+998 xx xxx xx xx"

const UZ_GROUP_SIZES = [2, 3, 2, 2] as const;

/**
 * Extract at most 9 local Uzbek phone digits from user input or pasted text,
 * keeping the +998 country prefix protected against accidental deletion.
 */
export function extractLocalUzDigits(input: string): string {
  const raw = String(input ?? '');
  const digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+998')) {
    return raw.slice(4).replace(/\D/g, '').slice(0, UZ_PHONE_LOCAL_LENGTH);
  }

  // Handle typing before "+998" when cursor accidentally starts at index 0 (e.g. "9+998 ")
  const shiftedPrefixIdx = raw.indexOf('+998');
  if (shiftedPrefixIdx > 0) {
    const before = raw.slice(0, shiftedPrefixIdx).replace(/\D/g, '');
    const after = raw.slice(shiftedPrefixIdx + 4).replace(/\D/g, '');
    return `${after}${before}`.slice(0, UZ_PHONE_LOCAL_LENGTH);
  }

  // Backspace inside the "+998 " prefix (e.g. "+99", "+9", "+") resets cleanly.
  if (raw.startsWith('+') && digits.length <= 3 && '998'.startsWith(digits)) {
    return '';
  }

  // Pasted with country code 998 without '+' (10..12+ digits, or literal "998")
  if (digits.startsWith('998') && (digits.length > UZ_PHONE_LOCAL_LENGTH || raw.trim() === '998')) {
    return digits.slice(3, 3 + UZ_PHONE_LOCAL_LENGTH);
  }

  return digits.slice(0, UZ_PHONE_LOCAL_LENGTH);
}

/**
 * Format an Uzbek phone number into the strict "+998 xx xxx xx xx" template,
 * automatically inserting spaces between digit groups and capping length at 17 chars.
 */
export function formatUzPhone(input: string): string {
  const local = extractLocalUzDigits(input);
  if (!local) {
    return UZ_PHONE_PREFIX;
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const size of UZ_GROUP_SIZES) {
    if (cursor >= local.length) break;
    parts.push(local.slice(cursor, cursor + size));
    cursor += size;
  }

  return `${UZ_PHONE_PREFIX}${parts.join(' ')}`;
}

/**
 * Check whether the value contains a complete 9-digit local Uzbek number (+998 xx xxx xx xx).
 */
export function isValidUzPhone(input: string): boolean {
  const formatted = formatUzPhone(input);
  return /^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(formatted);
}
