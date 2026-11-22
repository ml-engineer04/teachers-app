#!/usr/bin/env node
/**
 * Backfill script: Pre-render all pages for existing textbooks in .data/pdfs/ into optimized JPEGs.
 * 
 * Rules:
 * - Does NOT delete any existing .png files.
 * - If .jpg already exists, skips it (safe to re-run).
 * - If .png exists, converts to .jpg (~100-150KB, quality 80-82).
 * - If neither exists, renders from PDF directly via pdftoppm (Linux) or sips (macOS).
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Determine directories
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, '.data');
const pdfsDir = path.join(dataDir, 'pdfs');
const renderedDir = path.join(dataDir, 'rendered-pages');

// Try loading pdf-lib from apps/api/node_modules or root
let PDFDocument;
try {
  PDFDocument = require(path.join(rootDir, 'apps/api/node_modules/pdf-lib')).PDFDocument;
} catch {
  try {
    PDFDocument = require('pdf-lib').PDFDocument;
  } catch {
    console.error('❌ Error: pdf-lib not found. Run from repo root.');
    process.exit(1);
  }
}

// Check tools
let hasPdftoppm = false;
let hasSips = false;
try {
  cp.execSync('which pdftoppm', { stdio: 'pipe' });
  hasPdftoppm = true;
} catch {}
try {
  cp.execSync('which sips', { stdio: 'pipe' });
  hasSips = true;
} catch {}

console.log('====================================================');
console.log('📚 Ilmchi Textbook Pre-rendering & Backfill Script');
console.log('====================================================');
console.log(`PDFs directory:      ${pdfsDir}`);
console.log(`Rendered directory:  ${renderedDir}`);
console.log(`Available renderers: pdftoppm: ${hasPdftoppm}, sips: ${hasSips}`);
console.log('----------------------------------------------------');

if (!fs.existsSync(renderedDir)) {
  fs.mkdirSync(renderedDir, { recursive: true });
}

if (!fs.existsSync(pdfsDir)) {
  console.error(`❌ PDFs directory not found at ${pdfsDir}`);
  process.exit(1);
}

const pdfFiles = fs.readdirSync(pdfsDir).filter((f) => f.endsWith('.pdf'));
console.log(`Found ${pdfFiles.length} textbook PDF(s): ${pdfFiles.join(', ')}`);

async function convertPngToJpg(pngPath, jpgPath) {
  if (hasSips) {
    cp.execFileSync('/usr/bin/sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '82',
      pngPath,
      '--out', jpgPath,
    ], { stdio: 'pipe' });
    return true;
  }
  return false;
}

async function renderPageFromPdf(pdfPath, pageNum, outJpgPath, pdfDocRef) {
  const outPrefix = outJpgPath.replace(/\.jpg$/, '');
  if (hasPdftoppm) {
    try {
      cp.execFileSync('pdftoppm', [
        '-jpeg',
        '-r', '130',
        '-jpegopt', 'quality=82',
        '-f', String(pageNum),
        '-l', String(pageNum),
        '-singlefile',
        pdfPath,
        outPrefix,
      ], { stdio: 'pipe' });
      if (fs.existsSync(outJpgPath)) return true;
    } catch {}
  }

  if (hasSips && pdfDocRef) {
    const singleDoc = await PDFDocument.create();
    const [copied] = await singleDoc.copyPages(pdfDocRef, [pageNum - 1]);
    singleDoc.addPage(copied);
    const singleBytes = await singleDoc.save();

    const tmpSinglePdf = path.join(
      require('os').tmpdir(),
      `backfill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.pdf`
    );
    fs.writeFileSync(tmpSinglePdf, singleBytes);

    try {
      cp.execFileSync('/usr/bin/sips', [
        '-s', 'format', 'jpeg',
        '-s', 'formatOptions', '82',
        '-Z', '1400',
        tmpSinglePdf,
        '--out', outJpgPath,
      ], { stdio: 'pipe' });
      return fs.existsSync(outJpgPath);
    } finally {
      try {
        if (fs.existsSync(tmpSinglePdf)) fs.unlinkSync(tmpSinglePdf);
      } catch {}
    }
  }

  return false;
}

async function processBook(file) {
  const bookId = file.replace(/\.pdf$/, '');
  const pdfPath = path.join(pdfsDir, file);
  console.log(`\n📖 Processing: ${bookId}...`);

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  console.log(`   Total pages: ${totalPages}`);

  let skippedCount = 0;
  let convertedCount = 0;
  let renderedCount = 0;
  let failedCount = 0;

  const startTime = Date.now();

  for (let p = 1; p <= totalPages; p++) {
    const targetJpg = path.join(renderedDir, `${bookId}_p${p}.jpg`);
    const existingPng = path.join(renderedDir, `${bookId}_p${p}.png`);

    // Check if target JPG already exists
    if (fs.existsSync(targetJpg) && fs.statSync(targetJpg).size > 0) {
      skippedCount++;
      continue;
    }

    // If PNG exists, convert to optimized JPG
    if (fs.existsSync(existingPng) && fs.statSync(existingPng).size > 0) {
      try {
        const ok = await convertPngToJpg(existingPng, targetJpg);
        if (ok && fs.existsSync(targetJpg)) {
          convertedCount++;
          process.stdout.write(`\r   [${p}/${totalPages}] Converted PNG -> JPG (${(convertedCount + renderedCount + skippedCount)}/${totalPages})`);
          continue;
        }
      } catch (err) {
        // Fall through to render from PDF
      }
    }

    // Render from PDF
    try {
      const ok = await renderPageFromPdf(pdfPath, p, targetJpg, pdfDoc);
      if (ok && fs.existsSync(targetJpg)) {
        renderedCount++;
        process.stdout.write(`\r   [${p}/${totalPages}] Rendered from PDF (${(convertedCount + renderedCount + skippedCount)}/${totalPages})`);
      } else {
        failedCount++;
        console.warn(`\n   ⚠️ Failed to render page ${p}`);
      }
    } catch (err) {
      failedCount++;
      console.warn(`\n   ⚠️ Error rendering page ${p}: ${err.message}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n   ✅ Finished ${bookId} in ${durationSec}s:`);
  console.log(`      - Already cached: ${skippedCount}`);
  console.log(`      - Converted from PNG: ${convertedCount}`);
  console.log(`      - Rendered from PDF: ${renderedCount}`);
  if (failedCount > 0) {
    console.log(`      - Failed: ${failedCount}`);
  }
}

async function main() {
  const globalStart = Date.now();
  for (const f of pdfFiles) {
    await processBook(f);
  }
  const totalSec = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log('\n====================================================');
  console.log(`🎉 Backfill completed in ${totalSec}s!`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
