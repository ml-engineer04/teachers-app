import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PinchZoomViewProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  disabled?: boolean;
  drawMode?: boolean;
  resetKey?: string | number;
  onZoomLockChange?: (locked: boolean) => void;
}

const ZOOM_THRESHOLD = 1.02;

function getTouchDistance(touches: any[]): number {
  if (!touches || touches.length < 2) return 0;
  const dx = (touches[0].pageX ?? 0) - (touches[1].pageX ?? 0);
  const dy = (touches[0].pageY ?? 0) - (touches[1].pageY ?? 0);
  return Math.hypot(dx, dy);
}

function getTouchMidpoint(touches: any[]): { x: number; y: number } {
  if (!touches || touches.length === 0) return { x: 0, y: 0 };
  if (touches.length === 1) {
    return { x: touches[0].pageX ?? 0, y: touches[0].pageY ?? 0 };
  }
  return {
    x: ((touches[0].pageX ?? 0) + (touches[1].pageX ?? 0)) / 2,
    y: ((touches[0].pageY ?? 0) + (touches[1].pageY ?? 0)) / 2,
  };
}

/**
 * Pure React Native 2-finger pinch-to-zoom-in + zoomed pan container.
 * Enforces minScale = 1.0 (only zoom-in allowed, never shrinks below 100%).
 */
export const PinchZoomView: React.FC<PinchZoomViewProps> = ({
  children,
  minScale = 1.0,
  maxScale = 3.2,
  disabled = false,
  drawMode = false,
  resetKey,
  onZoomLockChange,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panXAnim = useRef(new Animated.Value(0)).current;
  const panYAnim = useRef(new Animated.Value(0)).current;

  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);

  const layoutRef = useRef({ width: 360, height: 540 });
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const lockedRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  const gestureStateRef = useRef<{
    mode: 'NONE' | 'PINCH' | 'PAN';
    startDist: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    startTx: number;
    startTy: number;
  }>({
    mode: 'NONE',
    startDist: 0,
    startScale: 1,
    startMidX: 0,
    startMidY: 0,
    startTx: 0,
    startTy: 0,
  });

  const emitLock = useCallback(
    (nextLocked: boolean) => {
      if (lockedRef.current !== nextLocked) {
        lockedRef.current = nextLocked;
        onZoomLockChange?.(nextLocked);
      }
    },
    [onZoomLockChange],
  );

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    if (scale <= 1.005) return { x: 0, y: 0 };
    const { width, height } = layoutRef.current;
    const maxX = Math.max(0, ((scale - 1) * width) / 2);
    const maxY = Math.max(0, ((scale - 1) * height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const applyTransform = useCallback(
    (nextScale: number, nextTx: number, nextTy: number, animate = false) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, nextScale));
      const { x, y } = clampPan(nextTx, nextTy, clampedScale);
      scaleRef.current = clampedScale;
      txRef.current = x;
      tyRef.current = y;

      const zoomedNow = clampedScale > ZOOM_THRESHOLD;
      setIsZoomed(zoomedNow);
      setZoomPercent(Math.round(clampedScale * 100));
      emitLock(zoomedNow);

      if (animate) {
        const useNativeDriver = Platform.OS !== 'web';
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: clampedScale,
            friction: 8,
            tension: 80,
            useNativeDriver,
          }),
          Animated.spring(panXAnim, {
            toValue: x,
            friction: 8,
            tension: 80,
            useNativeDriver,
          }),
          Animated.spring(panYAnim, {
            toValue: y,
            friction: 8,
            tension: 80,
            useNativeDriver,
          }),
        ]).start();
      } else {
        scaleAnim.setValue(clampedScale);
        panXAnim.setValue(x);
        panYAnim.setValue(y);
      }
    },
    [clampPan, emitLock, maxScale, minScale, panXAnim, panYAnim, scaleAnim],
  );

  const resetZoom = useCallback(
    (animate = true) => {
      gestureStateRef.current.mode = 'NONE';
      applyTransform(minScale, 0, 0, animate);
    },
    [applyTransform, minScale],
  );

  useEffect(() => {
    if (resetKey !== undefined) {
      resetZoom(false);
    }
  }, [resetKey, resetZoom]);

  const initPinchFromEvent = useCallback((evt: GestureResponderEvent) => {
    const touches = (evt.nativeEvent.touches as any[]) || [];
    if (touches.length >= 2) {
      const dist = getTouchDistance(touches);
      const mid = getTouchMidpoint(touches);
      gestureStateRef.current = {
        mode: 'PINCH',
        startDist: Math.max(10, dist),
        startScale: scaleRef.current,
        startMidX: mid.x,
        startMidY: mid.y,
        startTx: txRef.current,
        startTy: tyRef.current,
      };
      emitLock(true);
    } else if (touches.length === 1 && scaleRef.current > ZOOM_THRESHOLD) {
      const mid = getTouchMidpoint(touches);
      gestureStateRef.current = {
        mode: 'PAN',
        startDist: 0,
        startScale: scaleRef.current,
        startMidX: mid.x,
        startMidY: mid.y,
        startTx: txRef.current,
        startTy: tyRef.current,
      };
    }
  }, [emitLock]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: (evt) => {
        if (disabledRef.current) return false;
        const touches = evt.nativeEvent.touches || [];
        return touches.length >= 2;
      },
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gesture) => {
        if (disabledRef.current) return false;
        const touches = evt.nativeEvent.touches || [];
        if (touches.length >= 2) return true;
        if (
          !drawModeRef.current &&
          scaleRef.current > ZOOM_THRESHOLD &&
          (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4)
        ) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        initPinchFromEvent(evt);
      },
      onPanResponderMove: (evt) => {
        if (disabledRef.current) return;
        const touches = (evt.nativeEvent.touches as any[]) || [];
        const gs = gestureStateRef.current;

        if (touches.length >= 2) {
          if (gs.mode !== 'PINCH') {
            initPinchFromEvent(evt);
            return;
          }
          const dist = Math.max(10, getTouchDistance(touches));
          const mid = getTouchMidpoint(touches);
          const ratio = dist / gs.startDist;
          const nextScale = Math.max(minScale, Math.min(maxScale, gs.startScale * ratio));
          const scaleDelta = nextScale / Math.max(1, gs.startScale);
          const nextTx = gs.startTx * scaleDelta + (mid.x - gs.startMidX);
          const nextTy = gs.startTy * scaleDelta + (mid.y - gs.startMidY);
          applyTransform(nextScale, nextTx, nextTy, false);
          return;
        }

        if (!drawModeRef.current && touches.length === 1 && scaleRef.current > ZOOM_THRESHOLD) {
          if (gs.mode !== 'PAN') {
            initPinchFromEvent(evt);
            return;
          }
          const mid = getTouchMidpoint(touches);
          const nextTx = gs.startTx + (mid.x - gs.startMidX);
          const nextTy = gs.startTy + (mid.y - gs.startMidY);
          applyTransform(scaleRef.current, nextTx, nextTy, false);
        }
      },
      onPanResponderRelease: () => {
        gestureStateRef.current.mode = 'NONE';
        if (scaleRef.current <= ZOOM_THRESHOLD) {
          applyTransform(minScale, 0, 0, true);
        } else {
          emitLock(true);
        }
      },
      onPanResponderTerminate: () => {
        gestureStateRef.current.mode = 'NONE';
        if (scaleRef.current <= ZOOM_THRESHOLD) {
          applyTransform(minScale, 0, 0, true);
        }
      },
    }),
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 50 && height > 50) {
          layoutRef.current = { width, height };
        }
      }}
      onTouchStart={(e: GestureResponderEvent) => {
        if (!disabledRef.current && (e.nativeEvent.touches?.length ?? 0) >= 2) {
          emitLock(true);
        }
      }}
      onTouchEnd={(e: GestureResponderEvent) => {
        if ((e.nativeEvent.touches?.length ?? 0) === 0 && scaleRef.current <= ZOOM_THRESHOLD) {
          emitLock(false);
        }
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.zoomCanvas,
          {
            transform: [
              { translateX: panXAnim },
              { translateY: panYAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>

      {isZoomed && (
        <TouchableOpacity
          style={styles.resetBadge}
          onPress={() => resetZoom(true)}
          activeOpacity={0.85}
          accessibilityLabel="Masshtabni tiklash"
        >
          <Text style={styles.resetBadgeText}>{zoomPercent}% • Asl holat</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  zoomCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  resetBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 45,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resetBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
