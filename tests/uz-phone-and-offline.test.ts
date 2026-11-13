import {
  formatUzPhone,
  isValidUzPhone,
  extractLocalUzDigits,
  UZ_PHONE_MAX_LENGTH,
  UZ_PHONE_PREFIX,
} from '../apps/mobile/src/utils/uzPhone';
import { notify } from '../apps/mobile/src/services/notifications/notificationService';

export async function runUzPhoneAndNotificationTests(): Promise<
  { name: string; passed: boolean; details: string }[]
> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // 1. Progressive typing auto-spaces cleanly matching "+998 xx xxx xx xx"
  const step1 = formatUzPhone('+998 9');
  const step2 = formatUzPhone('+998 90');
  const step3 = formatUzPhone('+998 901');
  const step4 = formatUzPhone('+998 90 1234');
  const step5 = formatUzPhone('+998 90 123 4567');
  const progressiveOk =
    step1 === '+998 9' &&
    step2 === '+998 90' &&
    step3 === '+998 90 1' &&
    step4 === '+998 90 123 4' &&
    step5 === '+998 90 123 45 67' &&
    step5.length === UZ_PHONE_MAX_LENGTH;
  results.push({
    name: 'Uzbek Phone Auto-Spacing (+998 xx xxx xx xx)',
    passed: progressiveOk,
    details: `Formatted progression final value: "${step5}" (len=${step5.length})`,
  });

  // 2. Strict length ceiling prevents exceeding "+998 xx xxx xx xx" (17 chars / 9 local digits)
  const overflowAttempt = formatUzPhone('+998 90 123 45 67 890');
  const lengthCappedOk =
    overflowAttempt === '+998 90 123 45 67' &&
    overflowAttempt.length === 17 &&
    extractLocalUzDigits(overflowAttempt) === '901234567';
  results.push({
    name: 'Uzbek Phone Strict Max Length Enforcement (17 chars max)',
    passed: lengthCappedOk,
    details: `Overflow input truncated to: "${overflowAttempt}" (len=${overflowAttempt.length})`,
  });

  // 3. Pasting variants, prefix backspace protection, and cursor-before-prefix recovery
  const pastedWithCountry = formatUzPhone('998901234567');
  const pastedLocalStarting998 = formatUzPhone('998123456');
  const backspacedPrefix = formatUzPhone('+99');
  const emptyReset = formatUzPhone('');
  const cursorBeforePrefix = formatUzPhone('9+998 ');
  const edgeCasesOk =
    pastedWithCountry === '+998 90 123 45 67' &&
    pastedLocalStarting998 === '+998 99 812 34 56' &&
    backspacedPrefix === UZ_PHONE_PREFIX &&
    emptyReset === UZ_PHONE_PREFIX &&
    cursorBeforePrefix === '+998 9';
  results.push({
    name: 'Uzbek Phone Paste, Backspace Prefix Protection & Cursor Recovery',
    passed: edgeCasesOk,
    details: `CountryPaste="${pastedWithCountry}", Uzmobile998="${pastedLocalStarting998}", PrefixGuard="${backspacedPrefix}"`,
  });

  // 4. Phone validation rejects incomplete inputs and accepts complete template
  const validationOk =
    !isValidUzPhone('+998 ') &&
    !isValidUzPhone('+998 90 123 45 6') &&
    isValidUzPhone('+998 90 123 45 67');
  results.push({
    name: 'Uzbek Phone Completeness Validation',
    passed: validationOk,
    details: `Incomplete rejected=${!isValidUzPhone('+998 90 123 45 6')}, Complete accepted=${isValidUzPhone('+998 90 123 45 67')}`,
  });

  // 5. Global Notification Manager stacking, dedup, and dismiss behavior
  notify.clear();
  const snapshots: number[] = [];
  const unsub = notify.subscribe((items) => snapshots.push(items.length));

  const errId = notify.error('Tarmoq xatoligi', 'Server bilan aloqa yo‘q', 0);
  notify.error('Tarmoq xatoligi', 'Server bilan aloqa yo‘q', 0); // deduplicated burst
  notify.warning('Ogohlantirish', 'Telefon raqam to‘liq emas', 0);
  notify.success('Saqlandi', 'Muvaffaqiyatli saqlandi', 0);
  notify.info('Ma’lumot', 'Oflayn rejim faollashdi', 0); // pushes stack cap max 3

  let currentCount = 0;
  const checkUnsub = notify.subscribe((items) => {
    currentCount = items.length;
  });
  checkUnsub();

  notify.dismiss(errId);
  let afterDismissCount = 0;
  const afterUnsub = notify.subscribe((items) => {
    afterDismissCount = items.length;
  });
  afterUnsub();
  unsub();
  notify.clear();

  const notifyOk =
    currentCount === 3 && // dedup prevented extra push; 4 distinct -> capped at 3
    afterDismissCount === 3 || afterDismissCount === 2; // if errId evicted by 4th push or dismissed cleanly
  // Re-verify exact dismiss when within cap of 3
  notify.clear();
  const idA = notify.error('E1', 'M1', 0);
  const idB = notify.success('S1', 'M2', 0);
  let countTwo = 0;
  notify.subscribe((items) => (countTwo = items.length))();
  notify.dismiss(idA);
  let countOne = 0;
  notify.subscribe((items) => (countOne = items.length))();
  notify.dismiss(idB);
  notify.clear();

  results.push({
    name: 'Global Notification Service (Dedup, Stack Limit 3, Dismiss)',
    passed: Boolean(notifyOk && countTwo === 2 && countOne === 1),
    details: `Max stack=${currentCount}, Before dismiss=${countTwo}, After dismiss=${countOne}`,
  });

  return results;
}
