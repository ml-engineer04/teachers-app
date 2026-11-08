import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { PageTurnStyle } from '@smartteacherbook/shared';

interface PageCurlEngineProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  turnStyle?: PageTurnStyle;
  isTabletSpread?: boolean;
  renderPageContent: (pageNumber: number, isZoomed: boolean) => React.ReactNode;
}

export const PageCurlEngine: React.FC<PageCurlEngineProps> = ({
  totalPages,
  currentPage,
  onPageChange,
  turnStyle = PageTurnStyle.CURL,
  isTabletSpread = false,
  renderPageContent,
}) => {
  const [zoomScale] = useState<number>(1);
  const [isPeeling, setIsPeeling] = useState<boolean>(false);
  const [peelPercent, setPeelPercent] = useState<number>(0);

  const isZoomed = zoomScale > 1.05;

  const handleNext = () => {
    if (currentPage < totalPages) {
      if (turnStyle === PageTurnStyle.CURL && !isZoomed) {
        setIsPeeling(true);
        setPeelPercent(85);
        setTimeout(() => {
          setIsPeeling(false);
          setPeelPercent(0);
          onPageChange(currentPage + (isTabletSpread ? 2 : 1));
        }, 260);
      } else {
        onPageChange(currentPage + (isTabletSpread ? 2 : 1));
      }
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(Math.max(1, currentPage - (isTabletSpread ? 2 : 1)));
    }
  };

  return (
    <View style={styles.container}>
      {/* Zoom indicator banner */}
      {isZoomed && (
        <View style={styles.zoomBanner}>
          <Text style={styles.zoomBannerText}>
            🔍 Zoom Active ({Math.round(zoomScale * 100)}%)
          </Text>
        </View>
      )}

      {/* Main Full-Bleed Page Canvas */}
      <View style={styles.pageViewport}>
        {/* Underneath Next Page (revealed as top page curls) */}
        {isPeeling && currentPage < totalPages && (
          <View style={[styles.pageLayer, styles.underPage]}>
            {renderPageContent(currentPage + 1, false)}
          </View>
        )}

        {/* Current Active Page */}
        <View
          style={[
            styles.pageLayer,
            isPeeling && {
              transform: [
                { perspective: 1000 },
                { rotateY: `-${peelPercent * 0.9}deg` },
              ],
              opacity: 1 - peelPercent * 0.005,
            },
          ]}
        >
          {renderPageContent(currentPage, isZoomed)}

          {/* Dynamic 2.5D Curl Shadow & Specular Highlight Mesh */}
          {isPeeling && (
            <View
              style={[
                styles.curlShadowOverlay,
                { width: `${peelPercent}%` },
              ]}
            />
          )}
        </View>

        {/* Transparent Edge Tap Turn Navigation Zones */}
        {currentPage > 1 && (
          <TouchableOpacity
            style={styles.edgeTapLeft}
            onPress={handlePrev}
            activeOpacity={0.05}
          />
        )}
        {currentPage < totalPages && (
          <TouchableOpacity
            style={styles.edgeTapRight}
            onPress={handleNext}
            activeOpacity={0.05}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    padding: 0,
    margin: 0,
  },
  zoomBanner: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    zIndex: 40,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  zoomBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  pageViewport: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  pageLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  underPage: {
    zIndex: 1,
  },
  curlShadowOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 10,
  },
  edgeTapLeft: {
    position: 'absolute',
    top: 60,
    bottom: 80,
    left: 0,
    width: 36,
    zIndex: 25,
  },
  edgeTapRight: {
    position: 'absolute',
    top: 60,
    bottom: 80,
    right: 0,
    width: 36,
    zIndex: 25,
  },
});
