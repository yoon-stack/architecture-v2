import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAtom, useSetAtom } from 'jotai';
import { cn } from '@/lib/utils';
import {
  selBlockIdAtom,
  hovBlockAtom,
  editingBlockIdAtom,
  expandedAtom,
  centerTriggerAtom,
  focusIdAtom,
} from '@/store/atoms';
import type { PositionedBlock } from '@/store/types';

// Handle positions matching the original getDots() layout
const TOP_HANDLES = [0.08, 0.248, 0.416, 0.584, 0.752, 0.92];
const BOTTOM_HANDLES = TOP_HANDLES;
const SIDE_HANDLES = [0.25, 0.5, 0.75];

export type SystemBlockData = PositionedBlock & {
  dimmed?: boolean;
};

function SystemBlockNode({ id, data, selected }: NodeProps) {
  const blockData = data as SystemBlockData;
  const [selBlockId, setSelBlockId] = useAtom(selBlockIdAtom);
  const [hovBlock, setHovBlock] = useAtom(hovBlockAtom);
  const [editingBlockId, setEditingBlockId] = useAtom(editingBlockIdAtom);
  const setExpanded = useSetAtom(expandedAtom);
  const setCenterTrigger = useSetAtom(centerTriggerAtom);
  const setFocusId = useSetAtom(focusIdAtom);
  const [editName, setEditName] = useState(blockData.name);

  const isSelected = selBlockId === id;
  const isHovered = hovBlock === id;
  const isEditing = editingBlockId === id;
  const color = blockData.color || '#94a3b8';

  const handleClick = useCallback(() => {
    setSelBlockId((prev: string | null) => (prev === id ? null : id));
  }, [id, setSelBlockId]);

  const handleDoubleClick = useCallback(() => {
    if (blockData.hasChildren) {
      setExpanded((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setCenterTrigger((c: number) => c + 1);
    }
  }, [id, blockData.hasChildren, setExpanded, setCenterTrigger]);

  const handleRename = useCallback(
    (newName: string) => {
      // Rename handled by parent via editingBlockIdAtom
      setEditingBlockId(null);
    },
    [setEditingBlockId]
  );

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-white shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing',
        isSelected && 'ring-2 ring-primary',
        isHovered && !isSelected && 'ring-1 ring-gray-300',
        blockData.dimmed && 'opacity-20 pointer-events-none'
      )}
      style={{
        width: blockData.w,
        height: blockData.h,
        borderColor: isSelected ? '#2709dc' : color + '60',
        borderWidth: isSelected ? 2 : 1,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovBlock(id)}
      onMouseLeave={() => setHovBlock(null)}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-3 right-3 h-0.5 rounded-b"
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2 h-full">
        {/* Cube icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
          <path
            d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036"
            stroke={color}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleRename(editName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(editName);
                if (e.key === 'Escape') setEditingBlockId(null);
              }}
              className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none border-b border-primary"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900 truncate block">
              {blockData.name}
            </span>
          )}
        </div>

        {/* Requirements count badge */}
        {blockData.reqs > 0 && (
          <span className="flex-shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
            {blockData.reqs}
          </span>
        )}

        {/* Expand indicator */}
        {blockData.hasChildren && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            className="flex-shrink-0"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {/* Focus button on hover */}
      {isHovered && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[10px] text-gray-500 hover:border-primary hover:text-primary shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            setFocusId(id);
            setCenterTrigger((c: number) => c + 1);
          }}
        >
          ⊚
        </button>
      )}

      {/* Handles - Top */}
      {TOP_HANDLES.map((pos, i) => (
        <Handle
          key={`t${i + 1}`}
          id={`t${i + 1}`}
          type="source"
          position={Position.Top}
          style={{ left: `${pos * 100}%`, background: isHovered || isSelected ? color : 'transparent', width: 7, height: 7, border: `1.5px solid ${color}`, borderRadius: '50%' }}
          className={cn(isHovered || isSelected ? 'visible' : '')}
        />
      ))}
      {/* Handles - Bottom */}
      {BOTTOM_HANDLES.map((pos, i) => (
        <Handle
          key={`b${i + 1}`}
          id={`b${i + 1}`}
          type="source"
          position={Position.Bottom}
          style={{ left: `${pos * 100}%`, background: isHovered || isSelected ? color : 'transparent', width: 7, height: 7, border: `1.5px solid ${color}`, borderRadius: '50%' }}
          className={cn(isHovered || isSelected ? 'visible' : '')}
        />
      ))}
      {/* Handles - Left */}
      {SIDE_HANDLES.map((pos, i) => (
        <Handle
          key={`l${i + 1}`}
          id={`l${i + 1}`}
          type="target"
          position={Position.Left}
          style={{ top: `${pos * 100}%`, background: isHovered || isSelected ? color : 'transparent', width: 7, height: 7, border: `1.5px solid ${color}`, borderRadius: '50%' }}
          className={cn(isHovered || isSelected ? 'visible' : '')}
        />
      ))}
      {/* Handles - Right */}
      {SIDE_HANDLES.map((pos, i) => (
        <Handle
          key={`r${i + 1}`}
          id={`r${i + 1}`}
          type="source"
          position={Position.Right}
          style={{ top: `${pos * 100}%`, background: isHovered || isSelected ? color : 'transparent', width: 7, height: 7, border: `1.5px solid ${color}`, borderRadius: '50%' }}
          className={cn(isHovered || isSelected ? 'visible' : '')}
        />
      ))}
    </div>
  );
}

export default memo(SystemBlockNode);
