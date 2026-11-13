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
  const dir = resolveApiDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const targetPath = path.join(dir, filename);
  const tempPath = `${targetPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tempPath, targetPath);
}

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
