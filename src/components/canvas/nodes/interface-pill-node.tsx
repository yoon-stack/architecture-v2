import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAtom, useSetAtom } from 'jotai';
import { cn } from '@/lib/utils';
import {
  selIdAtom,
  hovIdAtom,
  editingIfaceIdAtom,
  detailIfaceIdAtom,
  selBlockIdAtom,
} from '@/store/atoms';
import { PILL_H } from '@/store/constants';

export type InterfacePillData = {
  ifaceId: string;
  name: string;
  pillW: number;
  dimmed?: boolean;
  verificationStatus?: string;
};

function InterfacePillNode({ id, data }: NodeProps) {
  const pillData = data as InterfacePillData;
  const [selId, setSelId] = useAtom(selIdAtom);
  const [hovId, setHovId] = useAtom(hovIdAtom);
  const [editingIfaceId, setEditingIfaceId] = useAtom(editingIfaceIdAtom);
  const setDetailIfaceId = useSetAtom(detailIfaceIdAtom);
  const setSelBlockId = useSetAtom(selBlockIdAtom);
  const [editName, setEditName] = useState(pillData.name);

  const isSelected = selId === pillData.ifaceId;
  const isHovered = hovId === pillData.ifaceId;
  const isEditing = editingIfaceId === pillData.ifaceId;

  const statusColor =
    pillData.verificationStatus === 'success'
      ? '#16a34a'
      : pillData.verificationStatus === 'fail'
        ? '#dc2626'
        : '#94a3b8';

  const openDetailPanel = useCallback(() => {
    setDetailIfaceId(pillData.ifaceId);
    setSelId(pillData.ifaceId);
    setSelBlockId(null);
  }, [pillData.ifaceId, setDetailIfaceId, setSelId, setSelBlockId]);

  const handleClick = useCallback(() => {
    openDetailPanel();
  }, [openDetailPanel]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingIfaceId(pillData.ifaceId);
      setEditName(pillData.name);
    },
    [pillData.ifaceId, pillData.name, setEditingIfaceId]
  );

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 rounded-full border cursor-pointer transition-all duration-100',
        isSelected && 'border-primary bg-primary/5 shadow-sm',
        !isSelected && isHovered && 'border-blue-300 bg-blue-50/50',
        !isSelected && !isHovered && 'border-gray-300 bg-white',
        pillData.dimmed && 'opacity-20 pointer-events-none'
      )}
      style={{
        width: pillData.pillW,
        height: PILL_H,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setHovId(pillData.ifaceId)}
      onMouseLeave={() => setHovId(null)}
    >
      {/* Interface icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isSelected ? '#2709dc' : '#64748b'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="12" r="3" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => setEditingIfaceId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingIfaceId(null);
              if (e.key === 'Escape') setEditingIfaceId(null);
            }}
            className="w-full bg-transparent text-[11px] font-medium text-gray-900 outline-none"
          />
        ) : (
          <span
            className={cn(
              'text-[11px] font-medium truncate block',
              isSelected ? 'text-primary' : 'text-gray-700'
            )}
          >
            {pillData.name}
          </span>
        )}
      </div>

      {/* Status dot */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: statusColor }}
      />

      {/* Left handle (from source block) */}
      <Handle
        id="pill-left"
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      {/* Right handle (to target block) */}
      <Handle
        id="pill-right"
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </div>
  );
}

export default memo(InterfacePillNode);
