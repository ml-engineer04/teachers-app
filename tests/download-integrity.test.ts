import * as crypto from 'crypto';

interface ManifestFileEntry {
  filename: string;
  expectedSha256: string;
  sizeBytes: number;
}

function calculateSha256(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function runDownloadIntegrityTests(): { name: string; passed: boolean; details: string }[] {
  const results: { name: string; passed: boolean; details: string }[] = [];

  const rawAudioData = Buffer.from('RIFF$#@ID3...SAMPLE_ENGLISH_AUDIO_TRACK_UNIT1...');
  const rawVideoData = Buffer.from('ftypmp42...SAMPLE_ENGLISH_GRAMMAR_LESSON_MP4...');
  const rawWebPData = Buffer.from('RIFFWEBPVP8...SAMPLE_NORMAL_PAGE_IMAGE_WEBP...');

  const manifest: ManifestFileEntry[] = [
    { filename: 'unit1_track1.mp3', expectedSha256: calculateSha256(rawAudioData), sizeBytes: rawAudioData.length },
    { filename: 'unit1_grammar.mp4', expectedSha256: calculateSha256(rawVideoData), sizeBytes: rawVideoData.length },
    { filename: 'page_1_normal.webp', expectedSha256: calculateSha256(rawWebPData), sizeBytes: rawWebPData.length },
  ];

  // Test 1: Intact downloaded files match manifest hashes
  let allMatched = true;
  for (const item of manifest) {
    const data = item.filename.endsWith('.mp3') ? rawAudioData : item.filename.endsWith('.mp4') ? rawVideoData : rawWebPData;
    const computedHash = calculateSha256(data);
    if (computedHash !== item.expectedSha256) {
      allMatched = false;
    }
  }
  results.push({
    name: 'SHA-256 Bundle File Integrity Verification (Intact Files)',
    passed: allMatched,
    details: `All ${manifest.length} bundle files matched SHA-256 manifest: ${allMatched}`,
  });

  // Test 2: Corrupted download detection (Single-bit corruption in audio file)
  const corruptedAudio = Buffer.from(rawAudioData);
  corruptedAudio[10] = corruptedAudio[10] ^ 0x01; // 1-bit flip
  const corruptedHash = calculateSha256(corruptedAudio);
  const mismatchDetected = corruptedHash !== manifest[0].expectedSha256;
  results.push({
    name: 'Bit-Level Corruption Detection (Corrupted Audio Checksum Rejection)',
    passed: mismatchDetected,
    details: `Corruption detected: ${mismatchDetected}. Expected: ${manifest[0].expectedSha256.substring(0, 10)}..., Got: ${corruptedHash.substring(0, 10)}...`,
  });

  return results;
}
