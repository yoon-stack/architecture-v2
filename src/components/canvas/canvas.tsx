import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSetAtom } from 'jotai';
import { dragOffsetsAtom, pillOffsetsAtom, selIdAtom, selBlockIdAtom, ctxMenuAtom } from '@/store/atoms';
import { GRID } from '@/store/constants';
import { snapToGrid } from '@/store/constants';
import { useLayoutEngine } from './hooks/use-layout-engine';
import { CanvasControls } from './canvas-controls';
import SystemBlockNode from './nodes/system-block-node';
import SystemGroupNode from './nodes/system-group-node';
import InterfacePillNode from './nodes/interface-pill-node';
import ExternalStubNode from './nodes/external-stub-node';
import ElbowEdge from './edges/elbow-edge';
import styles from './style.module.css';

const nodeTypes: NodeTypes = {
  'system-block': SystemBlockNode,
  'system-group': SystemGroupNode,
  'interface-pill': InterfacePillNode,
  'external-stub': ExternalStubNode,
};

const edgeTypes: EdgeTypes = {
  elbow: ElbowEdge,
};

function CanvasInner() {
  const { nodes: layoutNodes, edges: layoutEdges } = useLayoutEngine();
  const setDragOffsets = useSetAtom(dragOffsetsAtom);
  const setPillOffsets = useSetAtom(pillOffsetsAtom);
  const setSelId = useSetAtom(selIdAtom);
  const setSelBlockId = useSetAtom(selBlockIdAtom);
  const setCtxMenu = useSetAtom(ctxMenuAtom);

  const handleNodeDragStop = useCallback(
    (_: any, node: any) => {
      if (node.type === 'interface-pill') {
        // Update pill offset
        const ifaceId = node.data.ifaceId;
        setPillOffsets((prev) => ({
          ...prev,
          [ifaceId]: {
            dx: (prev[ifaceId]?.dx || 0) + (node.position.x - node.positionAbsolute.x),
            dy: (prev[ifaceId]?.dy || 0) + (node.position.y - node.positionAbsolute.y),
          },
        }));
      } else {
        // Update block drag offset
        setDragOffsets((prev) => ({
          ...prev,
          [node.id]: {
            dx: snapToGrid(node.position.x - (node.data.x || 0) + (prev[node.id]?.dx || 0)),
            dy: snapToGrid(node.position.y - (node.data.y || 0) + (prev[node.id]?.dy || 0)),
          },
        }));
      }
    },
    [setDragOffsets, setPillOffsets]
  );

  const handlePaneClick = useCallback(() => {
    setSelId(null);
    setSelBlockId(null);
    setCtxMenu(null);
  }, [setSelId, setSelBlockId, setCtxMenu]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setCtxMenu({
        screenX: event.clientX,
        screenY: event.clientY,
        svgX: event.clientX,
        svgY: event.clientY,
      });
    },
    [setCtxMenu]
  );

  return (
    <div className="flex-1 h-full bg-surface">
      <ReactFlow
        nodes={layoutNodes}
        edges={layoutEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onContextMenu={handleContextMenu}
        snapToGrid
        snapGrid={[GRID, GRID]}
        minZoom={0.15}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        className={styles['react-flow__node']}
      >
        <CanvasControls />
      </ReactFlow>
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
