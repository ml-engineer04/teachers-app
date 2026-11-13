export interface FittedPageBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface PageDimensionLike {
  width?: number | null;
  height?: number | null;
}

export type HotspotBadgeSize = 'SM' | 'MD' | 'LG' | string | undefined;

export interface HotspotBadgeLayout {
  centerX: number;
  centerY: number;
  badgeSize: number;
  iconSize: number;
  tapSize: number;
  left: number;
  top: number;
}

/**
 * Resolves the natural height/width aspect ratio for a single textbook page.
 * Prefers live measured dimensions from Image/PDF viewport, then persisted API page dimensions.
 */
export function resolvePageAspectRatio(
  pageMeta?: PageDimensionLike | null,
  measuredRatio?: number | null,
  fallbackRatio = 1.414,
): number {
  if (typeof measuredRatio === 'number' && Number.isFinite(measuredRatio) && measuredRatio > 0.25 && measuredRatio < 4) {
    return measuredRatio;
  }
  const w = Number(pageMeta?.width || 0);
  const h = Number(pageMeta?.height || 0);
  if (w > 0 && h > 0) {
    const ratio = h / w;
    if (Number.isFinite(ratio) && ratio > 0.25 && ratio < 4) {
      return ratio;
    }
  }
  return Number.isFinite(fallbackRatio) && fallbackRatio > 0.25 && fallbackRatio < 4 ? fallbackRatio : 1.414;
}

/**
 * Extracts the baseline book aspect ratio from loaded API page metadata so native Android/iOS
 * never fall back to A4 1.414 when a book uses a different trim size (e.g. 621x782 = 1.259).
 */
export function extractInitialBookAspectRatio(
  pages: PageDimensionLike[] | null | undefined,
  fallbackRatio = 1.414,
): number {
  if (Array.isArray(pages)) {
    for (const pg of pages) {
      const w = Number(pg?.width || 0);
      const h = Number(pg?.height || 0);
      if (w > 0 && h > 0) {
        const ratio = h / w;
        if (Number.isFinite(ratio) && ratio > 0.25 && ratio < 4) {
          return ratio;
        }
      }
    }
  }
  return fallbackRatio;
}

/**
 * Computes the exact centered "contain" stage box inside containerWidth x containerHeight
 * for a page with height/width = aspectRatio, eliminating letterbox drift across orientations.
 */
export function computeFittedPageBox(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
): FittedPageBox {
  const safeCw = Math.max(1, containerWidth || 1);
  const safeCh = Math.max(1, containerHeight || 1);
  const safeRatio = Number.isFinite(aspectRatio) && aspectRatio > 0.25 && aspectRatio < 4 ? aspectRatio : 1.414;

  let width = safeCw;
  let height = width * safeRatio;

  if (height > safeCh) {
    height = safeCh;
    width = height / safeRatio;
  }

  return {
    width,
    height,
    left: (safeCw - width) / 2,
    top: (safeCh - height) / 2,
  };
}

/**
 * Centers compact circular hotspot icons strictly on the normalized rect's center
 * (matching Admin Flexbox centering) with an enlarged transparent finger tap zone.
 */
export function computeHotspotBadgeLayout(
  rect: { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number,
  size?: HotspotBadgeSize,
): HotspotBadgeLayout {
  const safeW = Math.max(1, pageWidth || 1);
  const safeH = Math.max(1, pageHeight || 1);

  const centerX = (Number(rect?.x || 0) + Number(rect?.w || 0) / 2) * safeW;
  const centerY = (Number(rect?.y || 0) + Number(rect?.h || 0) / 2) * safeH;

  // Slightly scale down in narrow landscape pages while keeping portrait compact & clean
  const pageScale = Math.min(1, Math.max(0.75, Math.min(safeW / 340, safeH / 430)));
  const baseBadge = size === 'LG' ? 22 : size === 'SM' ? 14 : 17;
  const badgeSize = Math.max(12, Math.round(baseBadge * pageScale));
  const iconSize = Math.max(7, Math.round(badgeSize * 0.56));
  const tapSize = Math.max(28, badgeSize + 10);

  return {
    centerX,
    centerY,
    badgeSize,
    iconSize,
    tapSize,
    left: centerX - tapSize / 2,
    top: centerY - tapSize / 2,
  };
}
