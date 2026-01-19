import { useEffect, useRef } from 'react';
import { useGenerationStore } from '@/stores/useGenerationStore';
import type { GenerationResult } from '@/core/generation/types';

interface GenerationPreviewProps {
  result: GenerationResult | null;
  width?: number;
  height?: number;
  showCoastlines?: boolean;
}

export function GenerationPreview({
  result,
  width = 256,
  height = 256,
  showCoastlines = true,
}: GenerationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { landMask, heightmap, coastlinePoints } = result;
    const srcWidth = Math.sqrt(landMask.length);
    const srcHeight = srcWidth;

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Scale factors
    const scaleX = srcWidth / width;
    const scaleY = srcHeight / height;

    // Draw terrain
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIdx = srcY * srcWidth + srcX;
        const dstIdx = (y * width + x) * 4;

        const isLand = landMask[srcIdx] === 1;
        const elevation = heightmap[srcIdx] ?? 0;

        if (isLand) {
          // Land colors based on elevation
          const green = Math.floor(80 + elevation * 100);
          const brown = Math.floor(60 + elevation * 80);
          data[dstIdx] = brown; // R
          data[dstIdx + 1] = green; // G
          data[dstIdx + 2] = 40; // B
        } else {
          // Water colors based on depth
          const depth = 1 - elevation;
          data[dstIdx] = Math.floor(30 + depth * 20); // R
          data[dstIdx + 1] = Math.floor(60 + depth * 40); // G
          data[dstIdx + 2] = Math.floor(120 + depth * 60); // B
        }
        data[dstIdx + 3] = 255; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw coastlines
    if (showCoastlines && coastlinePoints.length > 0) {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;

      for (const coastline of coastlinePoints) {
        if (coastline.length < 2) continue;

        const firstPoint = coastline[0];
        if (!firstPoint) continue;

        ctx.beginPath();
        ctx.moveTo(firstPoint.x / scaleX, firstPoint.y / scaleY);

        for (let i = 1; i < coastline.length; i++) {
          const point = coastline[i];
          if (point) {
            ctx.lineTo(point.x / scaleX, point.y / scaleY);
          }
        }

        ctx.stroke();
      }
    }
  }, [result, width, height, showCoastlines]);

  // Metadata display
  const metadata = result?.metadata;

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-ink-700"
        style={{ imageRendering: 'pixelated' }}
      />

      {metadata && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-400">
          <div>Land: {(metadata.landCoverage * 100).toFixed(1)}%</div>
          <div>Continents: {metadata.continentCount}</div>
          <div>Islands: {metadata.islandCount}</div>
          <div>Time: {metadata.generationTime.toFixed(0)}ms</div>
        </div>
      )}
    </div>
  );
}

/**
 * Connected preview that uses store state
 */
export function ConnectedGenerationPreview() {
  const result = useGenerationStore((s) => s.result);
  const previewResult = useGenerationStore((s) => s.previewResult);
  const previewEnabled = useGenerationStore((s) => s.previewEnabled);

  const displayResult = previewEnabled ? previewResult : result;

  if (!displayResult) {
    return (
      <div className="flex items-center justify-center h-64 bg-ink-800/50 rounded border border-ink-700">
        <p className="text-sm text-ink-500">No world generated yet</p>
      </div>
    );
  }

  return <GenerationPreview result={displayResult} />;
}
