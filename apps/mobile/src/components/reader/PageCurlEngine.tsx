import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { PageTurnStyle } from '@smartteacherbook/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PageCurlEngineProps {
  currentPage: number;
  totalPages: number;
  turnStyle: PageTurnStyle;
  onNextPage: () => void;
  onPrevPage: () => void;
  renderPageContent: (pageNumber: number) => React.ReactNode;
  disableEdgeTap?: boolean;
}

export const PageCurlEngine: React.FC<PageCurlEngineProps> = ({
  currentPage,
  totalPages,
  turnStyle,
  onNextPage,
  onPrevPage,
  renderPageContent,
  disableEdgeTap = false,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const prevPageRef = useRef(currentPage);
  const sheetWidthRef = useRef<number>(SCREEN_WIDTH);

  const liveStateRef = useRef({
    currentPage,
    totalPages,
    disableEdgeTap,
    onNextPage,
    onPrevPage,
  });
  liveStateRef.current = {
    currentPage,
    totalPages,
    disableEdgeTap,
    onNextPage,
    onPrevPage,
  };

  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      const goingForward = currentPage > prevPageRef.current;
      prevPageRef.current = currentPage;

      animValue.setValue(goingForward ? 1 : -1);
      Animated.spring(animValue, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [currentPage, animValue]);

  const springReset = () => {
    Animated.spring(animValue, {
      toValue: 0,
      friction: 9,
      tension: 75,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gesture) => {
        if (liveStateRef.current.disableEdgeTap || evt.nativeEvent.touches.length >= 2) return false;
        const absDx = Math.abs(gesture.dx);
        const absDy = Math.abs(gesture.dy);
        return absDx > 12 && absDx > absDy * 1.25;
      },
      onMoveShouldSetPanResponderCapture: (evt, gesture) => {
        if (liveStateRef.current.disableEdgeTap || evt.nativeEvent.touches.length >= 2) return false;
        const absDx = Math.abs(gesture.dx);
        const absDy = Math.abs(gesture.dy);
        return absDx > 14 && absDx > absDy * 1.3;
      },
      onPanResponderMove: (_, gesture) => {
        const w = Math.max(240, sheetWidthRef.current);
        let ratio = gesture.dx / w;
        const { currentPage: pg, totalPages: tot } = liveStateRef.current;
        if ((pg <= 1 && ratio > 0) || (pg >= tot && ratio < 0)) {
          ratio *= 0.25;
        }
        const clamped = Math.max(-0.9, Math.min(0.9, ratio));
        animValue.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        const {
          currentPage: pg,
          totalPages: tot,
          onNextPage: nextFn,
          onPrevPage: prevFn,
        } = liveStateRef.current;

        const swipedLeft = gesture.dx <= -42 || gesture.vx <= -0.32;
        const swipedRight = gesture.dx >= 42 || gesture.vx >= 0.32;

        if (swipedLeft && pg < tot) {
          nextFn();
        } else if (swipedRight && pg > 1) {
          prevFn();
        } else {
          springReset();
        }
      },
      onPanResponderTerminate: () => {
        springReset();
      },
    }),
  ).current;

  const animatedStyle =
    turnStyle === PageTurnStyle.CURL
      ? {
          opacity: animValue.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.85, 1, 0.85],
          }),
          transform: [
            { perspective: 1200 },
            {
              translateX: animValue.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-SCREEN_WIDTH * 0.22, 0, SCREEN_WIDTH * 0.22],
              }),
            },
            {
              rotateY: animValue.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: ['10deg', '0deg', '-10deg'],
              }),
            },
            {
              scale: animValue.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0.97, 1, 0.97],
              }),
            },
          ],
        }
      : {
          opacity: animValue.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.75, 1, 0.75],
          }),
          transform: [
            {
              translateX: animValue.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-SCREEN_WIDTH * 0.3, 0, SCREEN_WIDTH * 0.3],
              }),
            },
          ],
        };

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'web'
          ? ({
              touchAction: disableEdgeTap ? 'none' : 'pan-y',
              userSelect: 'none',
            } as any)
          : null,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 100) sheetWidthRef.current = w;
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.pageSheet, animatedStyle]}>
        {renderPageContent(currentPage)}

        {/* Subtle Edge Tap Zones for fast page navigation */}
        {!disableEdgeTap && currentPage > 1 && (
          <TouchableOpacity
            style={styles.edgeTapLeft}
            onPress={onPrevPage}
            activeOpacity={0.2}
            accessibilityLabel="Oldingi sahifa"
          />
        )}
        {!disableEdgeTap && currentPage < totalPages && (
          <TouchableOpacity
            style={styles.edgeTapRight}
            onPress={onNextPage}
            activeOpacity={0.2}
            accessibilityLabel="Keyingi sahifa"
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF3FF',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSheet: {
    width: '100%',
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  edgeTapLeft: {
    position: 'absolute',
    left: 0,
    top: '18%',
    bottom: '18%',
    width: 30,
    zIndex: 8,
  },
  edgeTapRight: {
    position: 'absolute',
    right: 0,
    top: '18%',
    bottom: '18%',
    width: 30,
    zIndex: 8,
  },
});
