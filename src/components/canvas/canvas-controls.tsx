import { useReactFlow } from '@xyflow/react';
import { MiniMap, Background, Controls } from '@xyflow/react';
import { BackgroundVariant } from '@xyflow/react';
import { Button } from '@/components/common/ui/button';

export function CanvasControls() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <>
      <Background variant={BackgroundVariant.Dots} gap={40} size={1} color="#d0d5dd" />
      <MiniMap
        pannable
        zoomable
        style={{
          bottom: 56,
          right: 16,
          width: 150,
          height: 100,
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
        nodeColor={(node) => {
          const data = node.data as any;
          if (node.type === 'system-group') return 'transparent';
          if (node.type === 'interface-pill') return '#3b82f6';
          return (data?.color || '#94a3b8') + '60';
        }}
        nodeStrokeColor={(node) => {
          const data = node.data as any;
          return data?.color || '#94a3b8';
        }}
        nodeStrokeWidth={1}
      />
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-0.5 z-10">
        <Button variant="ghost" size="icon-sm" onClick={() => zoomOut()} title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => fitView({ padding: 0.15, duration: 300 })} title="Fit view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => zoomIn()} title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Button>
      </div>
    </>
  );
}
