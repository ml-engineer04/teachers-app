import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  denormalizeStrokePoints,
  doesPointHitStroke,
  DrawPointRecord,
  DrawStrokeRecord,
  pointsToSmoothSvgPath,
  toNormalizedPoint,
} from '../../utils/annotationHelpers';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export type DrawTool = 'PEN' | 'HIGHLIGHTER' | 'ERASER' | null;
export type DrawStrokeSize = 'SM' | 'MD' | 'LG';
export type DrawStroke = DrawStrokeRecord;

export const HIGHLIGHTER_COLORS = [
  { id: 'yellow', hex: '#FDE047', label: 'Sariq marker' },
  { id: 'green', hex: '#4ADE80', label: 'Yashil marker' },
  { id: 'blue', hex: '#38BDF8', label: 'Moviy marker' },
  { id: 'pink', hex: '#F472B6', label: 'Pushti marker' },
  { id: 'orange', hex: '#FB923C', label: 'Apelsin marker' },
];

export const PEN_COLORS = [
  { id: 'red', hex: '#EF4444', label: 'Qizil qalam' },
  { id: 'blue', hex: '#2563EB', label: 'Ko‘k qalam' },
  { id: 'ink', hex: '#0F172A', label: 'Qora qalam' },
  { id: 'emerald', hex: '#16A34A', label: 'Yashil qalam' },
  { id: 'purple', hex: '#9333EA', label: 'Binafsha qalam' },
];

const EMPTY_STROKES: DrawStroke[] = [];

export function getDefaultDrawColor(tool: DrawTool): string {
  if (tool === 'PEN') return PEN_COLORS[0].hex;
  return HIGHLIGHTER_COLORS[0].hex;
}

export function getStrokeWidthForTool(
  tool: 'PEN' | 'HIGHLIGHTER',
  size: DrawStrokeSize,
): number {
  if (tool === 'HIGHLIGHTER') {
    return size === 'SM' ? 14 : size === 'LG' ? 28 : 20;
  }
  return size === 'SM' ? 2.5 : size === 'LG' ? 6.5 : 4;
}

interface DrawingHighlighterLayerProps {
  activeTool: DrawTool;
  activeColor?: string;
  strokeSize?: DrawStrokeSize;
  width: number;
  height: number;
  initialStrokes?: DrawStroke[];
  onStrokesChange?: (strokes: DrawStroke[]) => void;
}

export const DrawingHighlighterLayer: React.FC<DrawingHighlighterLayerProps> = ({
  activeTool,
  activeColor,
  strokeSize = 'MD',
  width,
  height,
  initialStrokes,
  onStrokesChange,
}) => {
  const safeInitialStrokes = initialStrokes ?? EMPTY_STROKES;
  const [strokes, setStrokes] = useState<DrawStroke[]>(safeInitialStrokes);
  const [draftStroke, setDraftStroke] = useState<{
    stroke: DrawStroke;
    pixelPoints: DrawPointRecord[];
  } | null>(null);
  const [eraserPoint, setEraserPoint] = useState<DrawPointRecord | null>(null);

  const surfaceRef = useRef<any>(null);
  const strokesRef = useRef<DrawStroke[]>(strokes);
  const draftRef = useRef<{ stroke: DrawStroke; pixelPoints: DrawPointRecord[] } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const gestureStartAtRef = useRef<number>(0);

  const activeToolRef = useRef<DrawTool>(activeTool);
  activeToolRef.current = activeTool;
  const activeColorRef = useRef<string>(activeColor || getDefaultDrawColor(activeTool));
  activeColorRef.current = activeColor || getDefaultDrawColor(activeTool);
  const strokeSizeRef = useRef<DrawStrokeSize>(strokeSize);
  strokeSizeRef.current = strokeSize;
  const dimsRef = useRef<{ width: number; height: number }>({ width, height });
  dimsRef.current = { width: Math.max(1, width), height: Math.max(1, height) };
  const onStrokesChangeRef = useRef(onStrokesChange);
  onStrokesChangeRef.current = onStrokesChange;

  useEffect(() => {
    setStrokes(safeInitialStrokes);
    strokesRef.current = safeInitialStrokes;
    draftRef.current = null;
    setDraftStroke(null);
  }, [safeInitialStrokes]);

  const commitStrokes = (next: DrawStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
    onStrokesChangeRef.current?.(next);
  };

  const eraseAtPoint = (px: number, py: number, w: number, h: number) => {
    setEraserPoint({ x: px, y: py });
    const current = strokesRef.current;
    const filtered = current.filter((s) => !doesPointHitStroke(px, py, s, w, h, 18));
    if (filtered.length !== current.length) {
      commitStrokes(filtered);
    }
  };

  const startGestureAt = (px: number, py: number, w: number, h: number) => {
    const tool = activeToolRef.current;
    if (!tool) return;

    if (tool === 'ERASER') {
      eraseAtPoint(px, py, w, h);
      return;
    }

    const drawKind: 'PEN' | 'HIGHLIGHTER' = tool === 'HIGHLIGHTER' ? 'HIGHLIGHTER' : 'PEN';
    const color =
      activeColorRef.current ||
      (drawKind === 'HIGHLIGHTER' ? HIGHLIGHTER_COLORS[0].hex : PEN_COLORS[0].hex);
    const strokeWidth = getStrokeWidthForTool(drawKind, strokeSizeRef.current);
    const opacity = drawKind === 'HIGHLIGHTER' ? 0.42 : 0.96;

    const normPt = toNormalizedPoint(px, py, w, h);
    const created: DrawStroke = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tool: drawKind,
      color,
      strokeWidth,
      opacity,
      normalized: true,
      points: [normPt],
    };

    const nextDraft = { stroke: created, pixelPoints: [{ x: px, y: py }] };
    draftRef.current = nextDraft;
    setDraftStroke(nextDraft);
  };

  const moveGestureAt = (px: number, py: number, w: number, h: number) => {
    const tool = activeToolRef.current;
    if (!tool) return;

    if (tool === 'ERASER') {
      eraseAtPoint(px, py, w, h);
      return;
    }

    const currentDraft = draftRef.current;
    if (!currentDraft) return;
    const lastPx = currentDraft.pixelPoints[currentDraft.pixelPoints.length - 1];
    if (lastPx && Math.hypot(px - lastPx.x, py - lastPx.y) < 1.25) {
      return;
    }

    const normPt = toNormalizedPoint(px, py, w, h);
    const updated = {
      stroke: {
        ...currentDraft.stroke,
        points: [...currentDraft.stroke.points, normPt],
      },
      pixelPoints: [...currentDraft.pixelPoints, { x: px, y: py }],
    };
    draftRef.current = updated;
    setDraftStroke(updated);
  };

  const endGesture = () => {
    setEraserPoint(null);
    const currentDraft = draftRef.current;
    if (!currentDraft) return;
    draftRef.current = null;
    setDraftStroke(null);
    if (currentDraft.stroke.points.length >= 1) {
      commitStrokes([...strokesRef.current, currentDraft.stroke]);
    }
  };

  const cancelDraftGesture = () => {
    setEraserPoint(null);
    draftRef.current = null;
    setDraftStroke(null);
  };

  // Web DOM Pointer Events binding (works identically across mouse, touch, trackpad & Apple Pencil)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = surfaceRef.current as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;

    const getLocalXY = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const w = rect.width > 1 ? rect.width : dimsRef.current.width;
      const h = rect.height > 1 ? rect.height : dimsRef.current.height;
      return {
        x: Math.max(0, Math.min(w, clientX - rect.left)),
        y: Math.max(0, Math.min(h, clientY - rect.top)),
        w,
        h,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!activeToolRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      activePointerIdRef.current = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}

      const pt = getLocalXY(e.clientX, e.clientY);
      startGestureAt(pt.x, pt.y, pt.w, pt.h);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeToolRef.current) return;
      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      e.stopPropagation();

      const pt = getLocalXY(e.clientX, e.clientY);
      moveGestureAt(pt.x, pt.y, pt.w, pt.h);
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      activePointerIdRef.current = null;
      try {
        if (el.hasPointerCapture?.(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}
      endGesture();
    };

    const onTouchBlock = (e: TouchEvent) => {
      if (activeToolRef.current) {
        e.preventDefault();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUpOrCancel);
    el.addEventListener('pointercancel', onPointerUpOrCancel);
    el.addEventListener('touchstart', onTouchBlock, { passive: false });
    el.addEventListener('touchmove', onTouchBlock, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUpOrCancel);
      el.removeEventListener('pointercancel', onPointerUpOrCancel);
      el.removeEventListener('touchstart', onTouchBlock);
      el.removeEventListener('touchmove', onTouchBlock);
    };
  }, []);

  // Native iOS / Android PanResponder
  const nativePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) =>
          Platform.OS !== 'web' &&
          activeToolRef.current !== null &&
          (evt.nativeEvent.touches?.length ?? 1) === 1,
        onMoveShouldSetPanResponder: (evt) =>
          Platform.OS !== 'web' &&
          activeToolRef.current !== null &&
          (evt.nativeEvent.touches?.length ?? 1) === 1,
        onPanResponderTerminationRequest: (evt) => (evt.nativeEvent.touches?.length ?? 0) >= 2,
        onPanResponderGrant: (evt) => {
          if ((evt.nativeEvent.touches?.length ?? 1) >= 2) {
            cancelDraftGesture();
            return;
          }
          gestureStartAtRef.current = Date.now();
          const { locationX, locationY } = evt.nativeEvent;
          const { width: w, height: h } = dimsRef.current;
          startGestureAt(
            Math.max(0, Math.min(w, locationX || 0)),
            Math.max(0, Math.min(h, locationY || 0)),
            w,
            h,
          );
        },
        onPanResponderMove: (evt) => {
          if ((evt.nativeEvent.touches?.length ?? 1) >= 2) {
            cancelDraftGesture();
            return;
          }
          const { locationX, locationY } = evt.nativeEvent;
          const { width: w, height: h } = dimsRef.current;
          moveGestureAt(
            Math.max(0, Math.min(w, locationX || 0)),
            Math.max(0, Math.min(h, locationY || 0)),
            w,
            h,
          );
        },
        onPanResponderRelease: () => {
          endGesture();
        },
        onPanResponderTerminate: (evt) => {
          // If interrupted quickly or by a 2-finger pinch gesture, discard stray dot/stroke
          if (
            (evt.nativeEvent.touches?.length ?? 0) >= 2 ||
            Date.now() - gestureStartAtRef.current < 160
          ) {
            cancelDraftGesture();
          } else {
            endGesture();
          }
        },
      }),
    [],
  );

  const safeW = Math.max(1, width || 1);
  const safeH = Math.max(1, height || 1);

  const highlighterStrokes = strokes.filter((s) => s.tool === 'HIGHLIGHTER');
  const penStrokes = strokes.filter((s) => s.tool === 'PEN');

  const renderCommittedStroke = (stroke: DrawStroke) => {
    const pts = denormalizeStrokePoints(stroke, safeW, safeH);
    const pathD = pointsToSmoothSvgPath(pts);
    if (!pathD) return null;
    const isHighlighter = stroke.tool === 'HIGHLIGHTER';
    return (
      <Path
        key={stroke.id}
        d={pathD}
        stroke={stroke.color}
        strokeWidth={stroke.strokeWidth}
        strokeOpacity={stroke.opacity ?? (isHighlighter ? 0.42 : 0.96)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        {...(Platform.OS === 'web' && isHighlighter
          ? ({ style: { mixBlendMode: 'multiply' } } as any)
          : {})}
      />
    );
  };

  const renderDraftPath = (expectedTool: 'PEN' | 'HIGHLIGHTER') => {
    if (!draftStroke || draftStroke.stroke.tool !== expectedTool) return null;
    const pathD = pointsToSmoothSvgPath(draftStroke.pixelPoints);
    if (!pathD) return null;
    const isHighlighter = expectedTool === 'HIGHLIGHTER';
    return (
      <Path
        d={pathD}
        stroke={draftStroke.stroke.color}
        strokeWidth={draftStroke.stroke.strokeWidth}
        strokeOpacity={draftStroke.stroke.opacity ?? (isHighlighter ? 0.42 : 0.96)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        {...(Platform.OS === 'web' && isHighlighter
          ? ({ style: { mixBlendMode: 'multiply' } } as any)
          : {})}
      />
    );
  };

  return (
    <View
      ref={surfaceRef}
      pointerEvents={activeTool ? 'auto' : 'none'}
      style={[
        styles.surfaceOverlay,
        {
          pointerEvents: activeTool ? 'auto' : 'none',
        },
        Platform.OS === 'web'
          ? ({
              touchAction: activeTool ? 'none' : 'auto',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor:
                activeTool === 'ERASER'
                  ? 'cell'
                  : activeTool
                  ? 'crosshair'
                  : 'default',
            } as any)
          : null,
      ]}
      {...(Platform.OS !== 'web' ? nativePanResponder.panHandlers : {})}
    >
      <Svg
        width={safeW}
        height={safeH}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
        ]}
      >
        {/* Highlighter layer renders underneath pen ink so underlying words stay crisp */}
        {highlighterStrokes.map(renderCommittedStroke)}
        {renderDraftPath('HIGHLIGHTER')}

        {/* Pen strokes render sharply on top */}
        {penStrokes.map(renderCommittedStroke)}
        {renderDraftPath('PEN')}

        {/* Visual eraser cursor ring */}
        {activeTool === 'ERASER' && eraserPoint && (
          <Circle
            cx={eraserPoint.x}
            cy={eraserPoint.y}
            r={16}
            fill="rgba(239, 68, 68, 0.14)"
            stroke="#EF4444"
            strokeWidth={1.5}
          />
        )}
      </Svg>
    </View>
  );
};

interface MarkerStudioToolbarProps {
  activeTool: DrawTool;
  activeColor: string;
  strokeSize: DrawStrokeSize;
  scrollLocked: boolean;
  canUndo: boolean;
  strokeCount: number;
  currentPage: number;
  displayPageLabel?: string;
  onChangeTool: (tool: Exclude<DrawTool, null>) => void;
  onChangeColor: (hex: string) => void;
  onChangeSize: (size: DrawStrokeSize) => void;
  onUndo: () => void;
  onClearPage: () => void;
  onSaveAndClose: () => void;
}

export const MarkerStudioToolbar: React.FC<MarkerStudioToolbarProps> = ({
  activeTool,
  activeColor,
  strokeSize,
  scrollLocked,
  canUndo,
  strokeCount,
  currentPage,
  displayPageLabel,
  onChangeTool,
  onChangeColor,
  onChangeSize,
  onUndo,
  onClearPage,
  onSaveAndClose,
}) => {
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();
  if (!activeTool) return null;

  const palette = activeTool === 'PEN' ? PEN_COLORS : HIGHLIGHTER_COLORS;

  return (
    <View style={styles.toolbarWrap} pointerEvents="box-none">
      <View
        style={[
          styles.toolbarCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        {/* Row 1: Tool Mode Switcher & Vertical Lock Indicator */}
        <View style={styles.toolbarTopRow}>
          <View style={styles.modeGroup}>
            <TouchableOpacity
              accessibilityLabel={strings.reader.markerToolHighlighter}
              style={[
                styles.toolPill,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                activeTool === 'HIGHLIGHTER' && styles.toolPillActiveHighlighter,
              ]}
              onPress={() => onChangeTool('HIGHLIGHTER')}
            >
              <Text style={styles.toolEmoji}>🖍</Text>
              <Text
                style={[
                  styles.toolPillText,
                  { color: activeTool === 'HIGHLIGHTER' ? '#854D0E' : colors.textSecondary },
                  activeTool === 'HIGHLIGHTER' && styles.toolPillTextActiveDark,
                ]}
              >
                {strings.reader.markerToolHighlighter}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={strings.reader.markerToolPen}
              style={[
                styles.toolPill,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                activeTool === 'PEN' && styles.toolPillActiveBlue,
              ]}
              onPress={() => onChangeTool('PEN')}
            >
              <Text style={styles.toolEmoji}>✏️</Text>
              <Text
                style={[
                  styles.toolPillText,
                  { color: activeTool === 'PEN' ? '#1D4ED8' : colors.textSecondary },
                  activeTool === 'PEN' && styles.toolPillTextActiveBlue,
                ]}
              >
                {strings.reader.markerToolPen}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={strings.reader.markerToolEraser}
              style={[
                styles.toolPill,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                activeTool === 'ERASER' && styles.toolPillActiveRed,
              ]}
              onPress={() => onChangeTool('ERASER')}
            >
              <Text style={styles.toolEmoji}>🧽</Text>
              <Text
                style={[
                  styles.toolPillText,
                  { color: activeTool === 'ERASER' ? '#B91C1C' : colors.textSecondary },
                  activeTool === 'ERASER' && styles.toolPillTextActiveRed,
                ]}
              >
                {strings.reader.markerToolEraser}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusGroup}>
            {scrollLocked && (
              <View style={styles.lockBadge}>
                <Text style={styles.lockBadgeText}>🔒</Text>
              </View>
            )}
            <Text
              style={[
                styles.pageChip,
                {
                  color: colors.textSecondary,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              {displayPageLabel || `${currentPage}-${strings.common.pageShort}`}
              {strokeCount > 0 ? ` • ${strokeCount}` : ''}
            </Text>
          </View>
        </View>

        {/* Row 2: Color Swatches, Stroke Thickness, Undo/Clear/Save */}
        <View style={styles.toolbarBottomRow}>
          {activeTool !== 'ERASER' ? (
            <View style={styles.swatchesGroup}>
              {palette.map((c) => {
                const selected = activeColor === c.hex;
                return (
                  <TouchableOpacity
                    key={c.id}
                    accessibilityLabel={c.label}
                    onPress={() => onChangeColor(c.hex)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.hex },
                      selected && [
                        styles.colorDotSelected,
                        { borderColor: isDark ? '#F8FAFC' : '#0F172A' },
                      ],
                    ]}
                  />
                );
              })}

              <View style={[styles.sizeDivider, { backgroundColor: colors.border }]} />

              {(['SM', 'MD', 'LG'] as DrawStrokeSize[]).map((sz) => {
                const active = strokeSize === sz;
                const dotPx = sz === 'SM' ? 5 : sz === 'LG' ? 11 : 8;
                return (
                  <TouchableOpacity
                    key={sz}
                    accessibilityLabel={sz}
                    onPress={() => onChangeSize(sz)}
                    style={[
                      styles.sizeBtn,
                      { backgroundColor: colors.surfaceAlt },
                      active && styles.sizeBtnActive,
                    ]}
                  >
                    <View
                      style={{
                        width: dotPx,
                        height: dotPx,
                        borderRadius: 99,
                        backgroundColor: active ? '#1D4ED8' : colors.textSecondary,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.eraserHint, { color: colors.textMuted }]}>
              {strings.reader.markerToolEraser}
            </Text>
          )}

          <View style={styles.actionGroup}>
            <TouchableOpacity
              accessibilityLabel={strings.reader.markerUndo}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                !canUndo && styles.actionBtnDisabled,
              ]}
              onPress={onUndo}
              disabled={!canUndo}
            >
              <Text style={styles.actionBtnText}>↩️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={strings.reader.markerClearPage}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                !canUndo && styles.actionBtnDisabled,
              ]}
              onPress={onClearPage}
              disabled={!canUndo}
            >
              <Text style={styles.actionBtnText}>🗑</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={strings.reader.markerDone}
              style={[styles.doneBtn, { backgroundColor: colors.primaryDark }]}
              onPress={onSaveAndClose}
            >
              <Text style={styles.doneBtnText}>{strings.reader.markerDone} ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surfaceOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
  },
  toolbarWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'center',
    zIndex: 92,
  },
  toolbarCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  toolbarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toolPillActiveHighlighter: {
    backgroundColor: '#FEF08A',
    borderColor: '#EAB308',
  },
  toolPillActiveBlue: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  toolPillActiveRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  toolEmoji: {
    fontSize: 13,
  },
  toolPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  toolPillTextActiveDark: {
    color: '#854D0E',
    fontWeight: '800',
  },
  toolPillTextActiveBlue: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  toolPillTextActiveRed: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  pageChip: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  toolbarBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  swatchesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  colorDotSelected: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.15 }],
  },
  sizeDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  sizeBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  eraserHint: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  actionBtn: {
    width: 30,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 11,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
