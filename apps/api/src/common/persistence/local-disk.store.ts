import * as fs from 'fs';
import * as path from 'path';

export function resolveApiDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '.data'),
    path.resolve(process.cwd(), 'apps/api/.data'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  const cwd = process.cwd();
  return cwd.endsWith(path.join('apps', 'api'))
    ? path.resolve(cwd, '.data')
    : path.resolve(cwd, 'apps/api/.data');
}

export function isApiTestEnvironment(): boolean {
  if (process.env.NODE_ENV === 'test' || process.env.STB_DISABLE_DISK_PERSIST === '1') {
    return true;
  }
  return process.argv.some(
    (arg) =>
      arg.includes('run-all-tests') ||
      arg.includes('test-google-auth') ||
      arg.includes('test-phase4') ||
      arg.endsWith('.test.ts'),
  );
}

export function readJsonDiskSync<T>(filename: string): T | null {
  try {
    const filePath = path.join(resolveApiDataDir(), filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonDiskSync(filename: string, payload: unknown): void {
  const t0 =
    process.env.REQUEST_TIMING === '1' || process.env.REQUEST_TIMING === 'true'
      ? Date.now()
      : 0;
  const dir = resolveApiDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const targetPath = path.join(dir, filename);
  const tempPath = `${targetPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tempPath, targetPath);
  if (t0 > 0) {
    console.log(`⏱️ [DISK_WRITE_SYNC] ${filename} | ${Date.now() - t0}ms`);
  }
}

interface PendingWriteEntry {
  timer: NodeJS.Timeout | null;
  payload: unknown;
  isWriting: boolean;
  hasQueuedUpdate: boolean;
  queuedPayload: unknown;
}

const pendingWrites = new Map<string, PendingWriteEntry>();

export function writeJsonDiskDebounced(
  filename: string,
  payload: unknown,
  debounceMs = 600,
): void {
  if (isApiTestEnvironment() || debounceMs <= 0) {
    writeJsonDiskSync(filename, payload);
    return;
  }

  const existing = pendingWrites.get(filename);
  if (existing) {
    existing.payload = payload;
    if (existing.isWriting) {
      existing.hasQueuedUpdate = true;
      existing.queuedPayload = payload;
      return;
    }
    if (existing.timer) {
      clearTimeout(existing.timer);
    }
    existing.timer = setTimeout(() => {
      void executeAsyncWrite(filename);
    }, debounceMs);
  } else {
    const entry: PendingWriteEntry = {
      timer: null,
      payload,
      isWriting: false,
      hasQueuedUpdate: false,
      queuedPayload: null,
    };
    entry.timer = setTimeout(() => {
      void executeAsyncWrite(filename);
    }, debounceMs);
    pendingWrites.set(filename, entry);
  }
}

async function executeAsyncWrite(filename: string): Promise<void> {
  const entry = pendingWrites.get(filename);
  if (!entry || entry.isWriting) return;

  entry.isWriting = true;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }

  const payloadToWrite = entry.payload;
  const t0 =
    process.env.REQUEST_TIMING === '1' || process.env.REQUEST_TIMING === 'true'
      ? Date.now()
      : 0;

  try {
    const dir = resolveApiDataDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const targetPath = path.join(dir, filename);
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(payloadToWrite, null, 2);
    await fs.promises.writeFile(tempPath, serialized, 'utf-8');
    await fs.promises.rename(tempPath, targetPath);
    if (t0 > 0) {
      console.log(`⏱️ [DISK_WRITE_ASYNC] ${filename} | ${Date.now() - t0}ms`);
    }
  } catch (err: any) {
    console.error(`🚨 [DISK_WRITE_ASYNC_ERR] ${filename}: ${err?.message}`);
  } finally {
    entry.isWriting = false;
    if (entry.hasQueuedUpdate) {
      entry.hasQueuedUpdate = false;
      entry.payload = entry.queuedPayload;
      entry.queuedPayload = null;
      void executeAsyncWrite(filename);
    } else {
      pendingWrites.delete(filename);
    }
  }
}

export function flushPendingDiskWrites(filename: string): void {
  const entry = pendingWrites.get(filename);
  if (!entry) return;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
  const payloadToFlush = entry.hasQueuedUpdate ? entry.queuedPayload : entry.payload;
  pendingWrites.delete(filename);
  writeJsonDiskSync(filename, payloadToFlush);
}

export function flushAllPendingDiskWrites(): void {
  for (const filename of Array.from(pendingWrites.keys())) {
    flushPendingDiskWrites(filename);
  }
}

process.on('SIGTERM', () => {
  flushAllPendingDiskWrites();
});
process.on('SIGINT', () => {
  flushAllPendingDiskWrites();
});
process.on('beforeExit', () => {
  flushAllPendingDiskWrites();
});

export function writeBinaryDiskSync(subdir: string, filename: string, buffer: Buffer): void {
  const dir = path.join(resolveApiDataDir(), subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
}

export function readBinaryDiskSync(subdir: string, filename: string): Buffer | null {
  try {
    const targetPath = path.join(resolveApiDataDir(), subdir, filename);
    if (!fs.existsSync(targetPath)) return null;
    return fs.readFileSync(targetPath);
  } catch {
    return null;
  }
}

export function deleteBinaryDiskSync(subdir: string, filename: string): void {
  try {
    const targetPath = path.join(resolveApiDataDir(), subdir, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch {}
}
