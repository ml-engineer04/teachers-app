import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
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
  const [zoomScale, setZoomScale] = useState<number>(1);
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
        }, 280);
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
            🔍 Zoom Active ({Math.round(zoomScale * 100)}%) — Page curl disabled for inspection
          </Text>
        </View>
      )}

      {/* Main Page Canvas Container */}
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
      </View>

      {/* Reader Bottom Navigation Controls */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={currentPage <= 1}
          style={[styles.navButton, currentPage <= 1 && styles.buttonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>← Oldingi</Text>
        </TouchableOpacity>

        {/* Page Indicator and Dot Scrubber */}
        <View style={styles.pageIndicatorContainer}>
          <Text style={styles.pageIndicatorText}>
            Sahifa {currentPage} / {totalPages}
          </Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => onPageChange(p)}
                activeOpacity={0.7}
                style={[styles.dotPill, p === currentPage && styles.dotPillActive]}
              >
                <Text style={[styles.dotPillText, p === currentPage && styles.dotPillTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleNext}
          disabled={currentPage >= totalPages}
          style={[styles.navButtonAccent, currentPage >= totalPages && styles.buttonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonAccentText}>Keyingi →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: '#0F172A', // Cohesive with ReaderScreen dark theme
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 72, // Leave room for floating BottomNavigationDock
  },
  zoomBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  zoomBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pageViewport: {
    flex: 1,
    width: '92%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 10,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    maxWidth: 600,
    paddingTop: 12,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  navButtonAccent: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 9999,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonAccentText: {
    color: '#0F2942',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  pageIndicatorContainer: {
    alignItems: 'center',
    gap: 4,
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  dotPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotPillActive: {
    backgroundColor: '#2563EB',
  },
  dotPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dotPillTextActive: {
    color: '#FFFFFF',
  },
  turnStyleBadge: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
