export interface DrawPointRecord {
  x: number;
  y: number;
}

export interface DrawStrokeRecord {
  id: string;
  tool: 'PEN' | 'HIGHLIGHTER';
  color: string;
  strokeWidth: number;
  opacity?: number;
  normalized?: boolean;
  points: DrawPointRecord[];
}

export interface BookmarkRecord {
  pageNumber: number;
  title?: string;
}

export interface NoteRecord {
  id: string;
  pageNumber: number;
  text: string;
  createdAt?: string;
}

export interface BookAnnotationsPayload {
  updatedAt: string;
  modifiedPages: number[];
  drawings: Record<number, DrawStrokeRecord[]>;
  bookmarksModified?: boolean;
  bookmarks?: BookmarkRecord[];
  notesModified?: boolean;
  notes?: NoteRecord[];
}

export function createEmptyAnnotationsPayload(): BookAnnotationsPayload {
  return {
    updatedAt: '',
    modifiedPages: [],
    drawings: {},
    bookmarksModified: false,
    notesModified: false,
  };
}

/**
 * Merges per-page drawings with local device storage taking priority on all pages
 * modified locally on this device, while untouched pages can still hydrate from user sync/offline bundle.
 */
export function mergeBookDrawings(params: {
  localPayload?: BookAnnotationsPayload | null;
  offlineDrawList?: Array<{ pageNumber: number; strokes: DrawStrokeRecord[] }> | null;
  remoteDrawList?: Array<{ pageNumber: number; strokes: DrawStrokeRecord[] }> | null;
}): Record<number, DrawStrokeRecord[]> {
  const merged: Record<number, DrawStrokeRecord[]> = {};
  const applyList = (list?: Array<{ pageNumber: number; strokes: DrawStrokeRecord[] }> | null) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      if (entry && typeof entry.pageNumber === 'number' && Array.isArray(entry.strokes)) {
        merged[entry.pageNumber] = entry.strokes;
      }
    }
  };

  applyList(params.offlineDrawList);
  applyList(params.remoteDrawList);

  const local = params.localPayload;
  if (local) {
    const modifiedSet = new Set<number>(Array.isArray(local.modifiedPages) ? local.modifiedPages : []);
    // Also honor any pages stored directly in local.drawings
    Object.keys(local.drawings || {}).forEach((pgStr) => {
      const pg = Number(pgStr);
      if (Number.isFinite(pg) && pg >= 1) {
        modifiedSet.add(pg);
      }
    });

    modifiedSet.forEach((pg) => {
      const strokes = local.drawings?.[pg];
      merged[pg] = Array.isArray(strokes) ? strokes : [];
    });
  }

  return merged;
}

/**
 * Resolves teacher bookmarks giving priority to locally saved device mutations.
 */
export function resolveMergedBookmarks(params: {
  localPayload?: BookAnnotationsPayload | null;
  offlineBookmarks?: BookmarkRecord[] | null;
  remoteBookmarks?: BookmarkRecord[] | null;
}): BookmarkRecord[] {
  if (params.localPayload?.bookmarksModified && Array.isArray(params.localPayload.bookmarks)) {
    return params.localPayload.bookmarks;
  }
  const byPage = new Map<number, BookmarkRecord>();
  [...(params.offlineBookmarks || []), ...(params.remoteBookmarks || [])].forEach((b) => {
    if (b && typeof b.pageNumber === 'number') {
      byPage.set(b.pageNumber, b);
    }
  });
  return Array.from(byPage.values());
}

/**
 * Resolves personal teacher notes giving priority to locally saved device mutations.
 */
export function resolveMergedNotes(params: {
  localPayload?: BookAnnotationsPayload | null;
  offlineNotes?: NoteRecord[] | null;
  remoteNotes?: NoteRecord[] | null;
}): NoteRecord[] {
  if (params.localPayload?.notesModified && Array.isArray(params.localPayload.notes)) {
    return params.localPayload.notes;
  }
  const byId = new Map<string, NoteRecord>();
  [...(params.offlineNotes || []), ...(params.remoteNotes || [])].forEach((n) => {
    if (n && n.id) {
      byId.set(n.id, n);
    }
  });
  return Array.from(byId.values());
}

/**
 * Clamps a numeric ratio cleanly inside [0, 1].
 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Converts a local pixel coordinate into page-relative normalized [0..1] coordinates
 * so marker & pen strokes stay aligned across Horizontal/Vertical modes and screen resizes.
 */
export function toNormalizedPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): DrawPointRecord {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: +clamp01(x / width).toFixed(5),
    y: +clamp01(y / height).toFixed(5),
  };
}

/**
 * Resolves stored stroke points (normalized [0..1] or legacy pixel coords) to display pixels.
 */
export function denormalizeStrokePoints(
  stroke: DrawStrokeRecord,
  width: number,
  height: number,
): DrawPointRecord[] {
  if (!Array.isArray(stroke.points) || stroke.points.length === 0) return [];
  if (stroke.normalized && width > 0 && height > 0) {
    return stroke.points.map((pt) => ({
      x: pt.x * width,
      y: pt.y * height,
    }));
  }
  return stroke.points;
}

/**
 * Converts a sequence of points into a smooth quadratic Bézier SVG path.
 */
export function pointsToSmoothSvgPath(points: DrawPointRecord[]): string {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.01).toFixed(1)} ${(p.y + 0.01).toFixed(1)}`;
  }
  if (points.length === 2) {
    const [p0, p1] = points;
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Minimum Euclidean distance from point (px, py) to finite line segment AB.
 */
export function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Returns true if an eraser pointer at pixel (x, y) intersects any vertex or segment of a stroke.
 */
export function doesPointHitStroke(
  x: number,
  y: number,
  stroke: DrawStrokeRecord,
  width: number,
  height: number,
  eraserRadius = 18,
): boolean {
  const pts = denormalizeStrokePoints(stroke, width, height);
  if (pts.length === 0) return false;
  const threshold = eraserRadius + (stroke.strokeWidth || 4) / 2;
  if (pts.length === 1) {
    return Math.hypot(x - pts[0].x, y - pts[0].y) <= threshold;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const dist = distancePointToSegment(
      x,
      y,
      pts[i].x,
      pts[i].y,
      pts[i + 1].x,
      pts[i + 1].y,
    );
    if (dist <= threshold) return true;
  }
  return false;
}
