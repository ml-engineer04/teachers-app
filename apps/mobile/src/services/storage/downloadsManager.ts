import { KeystoreEncryptionService } from '../crypto/keystore';

export interface DownloadedItem {
  id: string;
  gradeId: number;
  subjectCode: string;
  title: string;
  sizeBytes: number;
  downloadedAt: string;
  isEncrypted: boolean;
}

export class DownloadsManager {
  private static STORAGE_KEY = 'stb_offline_bundles_v1';

  // In-memory registry of downloaded bundles
  private static downloadedItems: Map<string, DownloadedItem> = new Map([
    [
      'bundle_11_ENG',
      {
        id: 'bundle_11_ENG',
        gradeId: 11,
        subjectCode: 'ENG',
        title: "11-sinf Ingliz Tili (To'liq To'plam)",
        sizeBytes: 142 * 1024 * 1024, // 142 MB
        downloadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        isEncrypted: true,
      },
    ],
  ]);

  static isBundleDownloaded(gradeId: number, subjectCode: string): boolean {
    const key = `bundle_${gradeId}_${subjectCode}`;
    return this.downloadedItems.has(key);
  }

  static async downloadBundle(
    gradeId: number,
    subjectCode: string,
    onProgress: (percent: number) => void,
  ): Promise<DownloadedItem> {
    const key = `bundle_${gradeId}_${subjectCode}`;

    // Generate hardware-wrapped bundle key
    const rawBundleKey = await KeystoreEncryptionService.generateBundleKey();
    await KeystoreEncryptionService.wrapBundleKey(rawBundleKey);

    // Simulate chunked download & AES-256-GCM encryption in RAM
    for (let p = 10; p <= 100; p += 15) {
      onProgress(p);
      await new Promise((res) => setTimeout(res, 200));
    }
    onProgress(100);

    const item: DownloadedItem = {
      id: key,
      gradeId,
      subjectCode,
      title: `${gradeId}-sinf ${subjectCode} (Oflayn To‘plam)`,
      sizeBytes: 138 * 1024 * 1024,
      downloadedAt: new Date().toISOString(),
      isEncrypted: true,
    };

    this.downloadedItems.set(key, item);
    return item;
  }

  static deleteBundle(gradeId: number, subjectCode: string): boolean {
    const key = `bundle_${gradeId}_${subjectCode}`;
    return this.downloadedItems.delete(key);
  }

  static clearAllDownloads(): void {
    this.downloadedItems.clear();
  }

  static getTotalStorageUsedMb(): number {
    let totalBytes = 0;
    for (const item of this.downloadedItems.values()) {
      totalBytes += item.sizeBytes;
    }
    return Math.round(totalBytes / (1024 * 1024));
  }

  static getAllDownloadedBundles(): DownloadedItem[] {
    return Array.from(this.downloadedItems.values());
  }
}
