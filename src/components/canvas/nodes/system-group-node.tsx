import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAtom, useSetAtom } from 'jotai';
import { cn } from '@/lib/utils';
import {
  selBlockIdAtom,
  hovBlockAtom,
  expandedAtom,
  centerTriggerAtom,
  focusIdAtom,
} from '@/store/atoms';
import type { PositionedBlock } from '@/store/types';

const TOP_HANDLES = [0.08, 0.248, 0.416, 0.584, 0.752, 0.92];
const BOTTOM_HANDLES = TOP_HANDLES;
const SIDE_HANDLES = [0.25, 0.5, 0.75];

export type SystemGroupData = PositionedBlock & {
  dimmed?: boolean;
};

function SystemGroupNode({ id, data }: NodeProps) {
  const groupData = data as SystemGroupData;
  const [selBlockId, setSelBlockId] = useAtom(selBlockIdAtom);
  const [hovBlock, setHovBlock] = useAtom(hovBlockAtom);
  const setExpanded = useSetAtom(expandedAtom);
  const setCenterTrigger = useSetAtom(centerTriggerAtom);
  const setFocusId = useSetAtom(focusIdAtom);

  const isSelected = selBlockId === id;
  const isHovered = hovBlock === id;
  const color = groupData.color || '#94a3b8';

  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setCenterTrigger((c: number) => c + 1);
    },
    [id, setExpanded, setCenterTrigger]
  );

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-150',
        isSelected && 'ring-2 ring-primary',
        groupData.dimmed && 'opacity-20 pointer-events-none'
      )}
      style={{
        width: groupData.w,
        height: groupData.h,
        borderColor: isSelected ? '#2709dc' : color + '40',
        backgroundColor: color + '08',
      }}
      onClick={() => setSelBlockId((prev: string | null) => (prev === id ? null : id))}
      onMouseEnter={() => setHovBlock(id)}
      onMouseLeave={() => setHovBlock(null)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 h-10">
        {/* Cube icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
          <path
            d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036"
            stroke={color}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="text-sm font-semibold text-gray-700 truncate flex-1">
          {groupData.name}
        </span>

        {/* Req count */}
        {groupData.reqs > 0 && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
            {groupData.reqs}
          </span>
        )}

        {/* Collapse button */}
        <button
          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          onClick={handleCollapse}
          title="Collapse"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Focus button */}
        {isHovered && (
          <button
            className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[10px] text-gray-500 hover:border-primary hover:text-primary shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              setFocusId(id);
              setCenterTrigger((c: number) => c + 1);
            }}
          >
            ⊚
          </button>
        )}
      </div>

      {/* Handles - same as block node */}
      {TOP_HANDLES.map((pos, i) => (
        <Handle key={`t${i + 1}`} id={`t${i + 1}`} type="source" position={Position.Top}
          style={{ left: `${pos * 100}%`, background: 'transparent', width: 7, height: 7, border: 'none' }} />
      ))}
      {BOTTOM_HANDLES.map((pos, i) => (
        <Handle key={`b${i + 1}`} id={`b${i + 1}`} type="source" position={Position.Bottom}
          style={{ left: `${pos * 100}%`, background: 'transparent', width: 7, height: 7, border: 'none' }} />
      ))}
      {SIDE_HANDLES.map((pos, i) => (
        <Handle key={`l${i + 1}`} id={`l${i + 1}`} type="target" position={Position.Left}
          style={{ top: `${pos * 100}%`, background: 'transparent', width: 7, height: 7, border: 'none' }} />
      ))}
      {SIDE_HANDLES.map((pos, i) => (
        <Handle key={`r${i + 1}`} id={`r${i + 1}`} type="source" position={Position.Right}
          style={{ top: `${pos * 100}%`, background: 'transparent', width: 7, height: 7, border: 'none' }} />
      ))}
    </div>
  );
}

export default memo(SystemGroupNode);
