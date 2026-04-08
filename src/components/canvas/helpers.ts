import type { Node, Edge } from '@xyflow/react';
import type { PositionedBlock, Interface, DotAssignment, PillRect } from '@/store/types';
import { PILL_H, PILL_MIN_W } from '@/store/constants';

export const NODE_TYPES = {
  'system-block': 'system-block',
  'system-group': 'system-group',
  'interface-pill': 'interface-pill',
  'external-stub': 'external-stub',
} as const;

export const EDGE_TYPES = {
  elbow: 'elbow',
} as const;

/**
 * Converts the layout engine output (positioned blocks + interfaces + pills)
 * into React Flow nodes and edges.
 */
export function buildReactFlowGraph(params: {
  visible: Record<string, PositionedBlock>;
  containers: string[];
  ifaces: Interface[];
  dots: Record<string, DotAssignment>;
  pills: Record<string, PillRect>;
  focusIds: Set<string> | null;
  selId: string | null;
  selBlockId: string | null;
}): { nodes: Node[]; edges: Edge[] } {
  const { visible, containers, ifaces, dots, pills, focusIds, selId, selBlockId } = params;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Collect block rects for edge routing (leaf blocks only)
  const blockRects = Object.values(visible)
    .filter((b) => !(b.expanded && b.hasChildren))
    .map((b) => ({ x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }));

  // Create nodes for visible blocks
  for (const [blockId, block] of Object.entries(visible)) {
    const isDimmed = focusIds ? !focusIds.has(blockId) : false;
    const isGroup = block.expanded && block.hasChildren;

    nodes.push({
      id: blockId,
      type: isGroup ? 'system-group' : 'system-block',
      position: { x: block.x, y: block.y },
      data: {
        ...block,
        dimmed: isDimmed,
      },
      // Group nodes should be behind leaf nodes
      zIndex: isGroup ? 0 : 1,
      draggable: true,
      selectable: true,
      style: {
        width: block.w,
        height: block.h,
      },
    });
  }

  // Create pill nodes and edges for each visible interface
  for (const iface of ifaces) {
    const pill = pills[iface.id];
    const dot = dots[iface.id];
    if (!pill) continue;

    const isDimmed = focusIds
      ? !(focusIds.has(iface.source) && focusIds.has(iface.target))
      : false;

    const pillW = Math.max(iface.name.length * 7.2 + 28, PILL_MIN_W);

    // Pill node
    const pillNodeId = `pill-${iface.id}`;
    nodes.push({
      id: pillNodeId,
      type: 'interface-pill',
      position: { x: pill.x, y: pill.y },
      data: {
        ifaceId: iface.id,
        name: iface.name,
        pillW,
        dimmed: isDimmed,
        verificationStatus: iface.verificationStatus,
      },
      zIndex: 2,
      draggable: true,
      selectable: false,
      style: {
        width: pillW,
        height: PILL_H,
      },
    });

    if (!dot) continue;

    // Edge: source block -> pill
    edges.push({
      id: `edge-${iface.id}-source`,
      source: iface.source,
      sourceHandle: dot.s.id,
      target: pillNodeId,
      targetHandle: 'pill-left',
      type: 'elbow',
      data: {
        ifaceId: iface.id,
        sDotId: dot.s.id,
        tDotId: null,
        blockRects,
      },
      animated: false,
      selectable: false,
    });

    // Edge: pill -> target block
    edges.push({
      id: `edge-${iface.id}-target`,
      source: pillNodeId,
      sourceHandle: 'pill-right',
      target: iface.target,
      targetHandle: dot.t.id,
      type: 'elbow',
      data: {
        ifaceId: iface.id,
        sDotId: null,
        tDotId: dot.t.id,
        blockRects,
      },
      animated: false,
      selectable: false,
    });
  }

  return { nodes, edges };
}
