import {
  computeFittedPageBox,
  computeHotspotBadgeLayout,
  extractInitialBookAspectRatio,
  resolvePageAspectRatio,
} from '../apps/mobile/src/utils/pageGeometry';

export async function runPageGeometryTests(): Promise<
  { name: string; passed: boolean; details: string }[]
> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // 1. Extract real book aspect ratio (621x782 => ~1.2593) instead of hardcoded A4 1.414
  const initialRatio = extractInitialBookAspectRatio(
    [
      { width: null, height: null },
      { width: 621, height: 782 },
    ],
    1.414,
  );
  const expectedRatio = 782 / 621;
  results.push({
    name: 'Extracts exact page aspect ratio from API page metadata',
    passed: Math.abs(initialRatio - expectedRatio) < 0.0001,
    details: `ratio=${initialRatio.toFixed(4)} expected=${expectedRatio.toFixed(4)}`,
  });

  // 2. Measured Image/PDF ratio overrides stale fallback cleanly
  const resolved = resolvePageAspectRatio({ width: 621, height: 782 }, 1400 / 1111, 1.414);
  results.push({
    name: 'Prefers live measured ratio while preserving API fallback',
    passed: Math.abs(resolved - 1400 / 1111) < 0.0001,
    details: `measuredRatio=${resolved.toFixed(4)}`,
  });

  // 3. Horizontal portrait & landscape fitted stage matches contain aspect ratio without letterbox drift
  const portraitFit = computeFittedPageBox(390, 580, expectedRatio);
  const landscapeFit = computeFittedPageBox(760, 240, expectedRatio);
  const portraitRatioOk =
    Math.abs(portraitFit.height / portraitFit.width - expectedRatio) < 0.001 &&
    Math.abs(portraitFit.width - 390) < 0.01 &&
    portraitFit.top > 40;
  const landscapeRatioOk =
    Math.abs(landscapeFit.height / landscapeFit.width - expectedRatio) < 0.001 &&
    Math.abs(landscapeFit.height - 240) < 0.01 &&
    landscapeFit.left > 250;

  results.push({
    name: 'Horizontal fitted page box maintains exact PDF aspect ratio in portrait & landscape',
    passed: portraitRatioOk && landscapeRatioOk,
    details: `portrait=${portraitFit.width.toFixed(1)}x${portraitFit.height.toFixed(1)} landscape=${landscapeFit.width.toFixed(1)}x${landscapeFit.height.toFixed(1)}`,
  });

  // 4. Hotspot badge center stays locked onto rect center and badge size is compact (<= 22px)
  const hsLayout = computeHotspotBadgeLayout(
    { x: 0.342, y: 0.048, w: 0.06, h: 0.05 },
    361,
    Math.round(361 * expectedRatio),
    'MD',
  );
  const expectedCx = (0.342 + 0.03) * 361;
  const expectedCy = (0.048 + 0.025) * Math.round(361 * expectedRatio);
  const actualCx = hsLayout.left + hsLayout.tapSize / 2;
  const actualCy = hsLayout.top + hsLayout.tapSize / 2;
  const centeredOk = Math.abs(actualCx - expectedCx) < 0.01 && Math.abs(actualCy - expectedCy) < 0.01;
  const compactOk = hsLayout.badgeSize <= 18 && hsLayout.tapSize >= 28;

  results.push({
    name: 'Compact hotspot badge stays strictly centered on rect midpoint with comfortable tap target',
    passed: centeredOk && compactOk,
    details: `badge=${hsLayout.badgeSize}px tap=${hsLayout.tapSize}px center=(${actualCx.toFixed(2)}, ${actualCy.toFixed(2)})`,
  });

  return results;
}
