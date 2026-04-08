import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export type ExternalStubData = {
  systemName: string;
  color: string;
  direction: 'left' | 'right' | 'top' | 'bottom';
  revealed?: boolean;
};

function ExternalStubNode({ data }: NodeProps) {
  const stubData = data as ExternalStubData;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-gray-300 bg-white/80 text-[10px] text-gray-500 font-medium">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: stubData.color }}
      />
      <span className="truncate">{stubData.systemName}</span>

      <Handle
        id="stub-in"
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <Handle
        id="stub-out"
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </div>
  );
}

export default memo(ExternalStubNode);
