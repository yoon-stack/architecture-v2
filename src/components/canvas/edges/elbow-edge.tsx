import { memo } from 'react';
import { type EdgeProps, BaseEdge } from '@xyflow/react';
import { useAtomValue } from 'jotai';
import { selIdAtom, hovIdAtom } from '@/store/atoms';
import { smartElbowPath, roundPath } from '@/lib/path-routing';

export type ElbowEdgeData = {
  ifaceId: string;
  sDotId: string | null;
  tDotId: string | null;
  blockRects: Array<{ x: number; y: number; w: number; h: number }>;
  midOverride?: number;
};

function ElbowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}: EdgeProps) {
  const edgeData = data as ElbowEdgeData;
  const selId = useAtomValue(selIdAtom);
  const hovId = useAtomValue(hovIdAtom);

  const isSelected = selId === edgeData?.ifaceId;
  const isHovered = hovId === edgeData?.ifaceId;

  // Compute the elbow path using the original routing algorithm
  const rawPath = smartElbowPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    edgeData?.sDotId ?? null,
    edgeData?.tDotId ?? null,
    edgeData?.midOverride,
    edgeData?.blockRects ?? []
  );

  const path = roundPath(rawPath, 6);

  const strokeColor = isSelected
    ? '#2709dc'
    : isHovered
      ? '#3b82f6'
      : '#c1c1c1';
  const strokeWidth = isSelected || isHovered ? 2 : 1.2;

  return (
    <>
      {/* Invisible wider hit area for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />
    </>
  );
}

export default memo(ElbowEdge);
