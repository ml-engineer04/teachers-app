import React, { useEffect, useRef, useState } from 'react';

export type DrawTool = 'PEN' | 'HIGHLIGHTER' | 'ERASER' | null;
export type DrawStrokeSize = 'SM' | 'MD' | 'LG';

export interface DrawPoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
}

export interface WebDrawStroke {
  id: string;
  tool: 'PEN' | 'HIGHLIGHTER';
  color: string;
  width: number;
  alpha: number;
  points: DrawPoint[];
}

export const HIGHLIGHTER_COLORS = [
  { id: 'yellow', hex: '#FDE047', label: 'Sariq' },
  { id: 'green', hex: '#4ADE80', label: 'Yashil' },
  { id: 'blue', hex: '#38BDF8', label: 'Moviy' },
  { id: 'pink', hex: '#F472B6', label: 'Pushti' },
  { id: 'orange', hex: '#FB923C', label: 'Apelsin' },
];

export const PEN_COLORS = [
  { id: 'indigo', hex: '#4F46E5', label: 'Indigo' },
  { id: 'red', hex: '#EF4444', label: 'Qizil' },
  { id: 'emerald', hex: '#10B981', label: 'Yashil' },
  { id: 'amber', hex: '#F59E0B', label: 'Sariq' },
  { id: 'slate', hex: '#0F172A', label: 'Qora' },
  { id: 'purple', hex: '#9333EA', label: 'Binafsha' },
];

export function getStrokeWidth(tool: 'PEN' | 'HIGHLIGHTER', size: DrawStrokeSize): number {
  if (tool === 'HIGHLIGHTER') {
    return size === 'SM' ? 14 : size === 'LG' ? 28 : 20;
  }
  return size === 'SM' ? 2.5 : size === 'LG' ? 6 : 4;
}

interface DrawingCanvasLayerProps {
  activeTool: DrawTool;
  activeColor: string;
  strokeSize: DrawStrokeSize;
  width: number;
  height: number;
  initialStrokes?: WebDrawStroke[];
  onStrokesChange?: (strokes: WebDrawStroke[]) => void;
}

export const DrawingCanvasLayer: React.FC<DrawingCanvasLayerProps> = ({
  activeTool,
  activeColor,
  strokeSize,
  width,
  height,
  initialStrokes = [],
  onStrokesChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<WebDrawStroke[]>(initialStrokes);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawPoint[]>([]);

  // Keep internal strokes in sync with props
  useEffect(() => {
    setStrokes(initialStrokes);
  }, [initialStrokes]);

  // Redraw canvas whenever strokes, width, or height change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = stroke.alpha ?? (stroke.tool === 'HIGHLIGHTER' ? 0.35 : 1.0);
      ctx.lineWidth = stroke.width;

      const first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * width, pt.y * height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, width, height]);

  if (!activeTool) {
    // In passive mode, just render the static canvas on top with no pointer events
    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none z-10"
      />
    );
  }

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (activeTool === 'ERASER') {
      // Erase strokes near pointer
      eraseStrokesAt(pt);
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (activeTool === 'ERASER' && e.buttons === 1) {
      eraseStrokesAt(pt);
      return;
    }

    if (!isDrawingRef.current) return;

    currentPointsRef.current.push(pt);

    // Fast progressive canvas preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentPointsRef.current;
    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeColor;
    ctx.globalAlpha = activeTool === 'HIGHLIGHTER' ? 0.35 : 1.0;
    ctx.lineWidth = getStrokeWidth(activeTool as 'PEN' | 'HIGHLIGHTER', strokeSize);

    const prev = pts[pts.length - 2];
    ctx.moveTo(prev.x * width, prev.y * height);
    ctx.lineTo(pt.x * width, pt.y * height);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length >= 2 && (activeTool === 'PEN' || activeTool === 'HIGHLIGHTER')) {
      const newStroke: WebDrawStroke = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: activeTool,
        color: activeColor,
        width: getStrokeWidth(activeTool, strokeSize),
        alpha: activeTool === 'HIGHLIGHTER' ? 0.35 : 1.0,
        points: [...currentPointsRef.current],
      };

      const nextStrokes = [...strokes, newStroke];
      setStrokes(nextStrokes);
      onStrokesChange?.(nextStrokes);
    }
    currentPointsRef.current = [];
  };

  const eraseStrokesAt = (target: DrawPoint) => {
    const threshold = 0.03; // ~3% hit radius
    const remaining = strokes.filter((stroke) => {
      return !stroke.points.some((p) => {
        const dx = p.x - target.x;
        const dy = p.y - target.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });
    });

    if (remaining.length !== strokes.length) {
      setStrokes(remaining);
      onStrokesChange?.(remaining);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 z-20 touch-none ${
        activeTool === 'ERASER' ? 'cursor-cell' : 'cursor-crosshair'
      }`}
    />
  );
};
