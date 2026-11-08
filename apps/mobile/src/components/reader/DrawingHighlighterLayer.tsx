import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type DrawingTool = 'OFF' | 'PEN' | 'HIGHLIGHTER' | 'ERASER';

interface Stroke {
  id: string;
  tool: 'PEN' | 'HIGHLIGHTER';
  color: string;
  pageNumber: number;
  points: string; // SVG path or demo box coordinate
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DrawingHighlighterLayerProps {
  pageNumber: number;
  activeTool: DrawingTool;
  onCloseTool: () => void;
}

export const DrawingHighlighterLayer: React.FC<DrawingHighlighterLayerProps> = ({
  pageNumber,
  activeTool,
  onCloseTool,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#2563EB');
  const [strokes, setStrokes] = useState<Stroke[]>([
    {
      id: 'demo_highlight_1',
      tool: 'HIGHLIGHTER',
      color: 'rgba(254, 240, 138, 0.65)', // Translucent yellow highlighter
      pageNumber: 2,
      points: '',
      top: 130,
      left: 24,
      width: 220,
      height: 18,
    },
    {
      id: 'demo_pen_1',
      tool: 'PEN',
      color: '#DC2626', // Teacher red underline
      pageNumber: 2,
      points: '',
      top: 195,
      left: 24,
      width: 140,
      height: 3,
    },
  ]);

  if (activeTool === 'OFF') {
    // Render existing strokes in read-only overlay
    const pageStrokes = strokes.filter((s) => s.pageNumber === pageNumber);
    return (
      <View style={styles.container} pointerEvents="none">
        {pageStrokes.map((s) => (
          <View
            key={s.id}
            style={[
              styles.strokeElement,
              {
                top: s.top,
                left: s.left,
                width: s.width,
                height: s.height,
                backgroundColor: s.color,
                borderRadius: s.tool === 'HIGHLIGHTER' ? 4 : 1,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  const handleCanvasTap = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    if (activeTool === 'HIGHLIGHTER') {
      setStrokes((prev) => [
        ...prev,
        {
          id: `strk_${Date.now()}`,
          tool: 'HIGHLIGHTER',
          color: 'rgba(254, 240, 138, 0.65)',
          pageNumber,
          points: '',
          top: locationY - 10,
          left: locationX - 50,
          width: 120,
          height: 20,
        },
      ]);
    } else if (activeTool === 'PEN') {
      setStrokes((prev) => [
        ...prev,
        {
          id: `strk_${Date.now()}`,
          tool: 'PEN',
          color: selectedColor,
          pageNumber,
          points: '',
          top: locationY,
          left: locationX - 30,
          width: 60,
          height: 3,
        },
      ]);
    } else if (activeTool === 'ERASER') {
      setStrokes((prev) => prev.filter((s) => s.pageNumber !== pageNumber));
    }
  };

  const pageStrokes = strokes.filter((s) => s.pageNumber === pageNumber);

  return (
    <View style={styles.interactiveContainer}>
      {/* Tap canvas to add strokes */}
      <TouchableOpacity
        style={styles.touchCanvas}
        activeOpacity={1}
        onPress={handleCanvasTap}
      >
        {pageStrokes.map((s) => (
          <View
            key={s.id}
            style={[
              styles.strokeElement,
              {
                top: s.top,
                left: s.left,
                width: s.width,
                height: s.height,
                backgroundColor: s.color,
                borderRadius: s.tool === 'HIGHLIGHTER' ? 4 : 1,
              },
            ]}
          />
        ))}
      </TouchableOpacity>

      {/* Floating Drawing Palette */}
      <View style={styles.paletteBar}>
        <View style={styles.colorsRow}>
          {['#2563EB', '#DC2626', '#16A34A', '#0F172A'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selectedColor === c && styles.colorDotActive,
              ]}
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => setStrokes((prev) => prev.filter((s) => s.pageNumber !== pageNumber))}
        >
          <Text style={styles.clearText}>Tozalash</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={onCloseTool}>
          <Text style={styles.doneText}>Tayyor ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  interactiveContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  touchCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  strokeElement: {
    position: 'absolute',
  },
  paletteBar: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
