import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import {
  hierarchyAtom,
  expandedAtom,
  ifacesAtom,
  dragOffsetsAtom,
  pillOffsetsAtom,
  dotOverridesAtom,
  focusIdAtom,
  revealedAtom,
  selIdAtom,
  selBlockIdAtom,
} from '@/store/atoms';
import { PAD, HEADER_H, GRID } from '@/store/constants';
import { computeLayout } from '@/lib/layout';
import { assignDots, computePills } from '@/lib/dot-assignment';
import { buildParentMap, getAncestorIds, getDescendantIds } from '@/lib/hierarchy-utils';
import { buildReactFlowGraph } from '../helpers';
import { snapToGrid } from '@/store/constants';

export function useLayoutEngine() {
  const hierarchy = useAtomValue(hierarchyAtom);
  const expanded = useAtomValue(expandedAtom);
  const ifaces = useAtomValue(ifacesAtom);
  const dragOffsets = useAtomValue(dragOffsetsAtom);
  const pillOffsets = useAtomValue(pillOffsetsAtom);
  const dotOverrides = useAtomValue(dotOverridesAtom);
  const focusId = useAtomValue(focusIdAtom);
  const revealed = useAtomValue(revealedAtom);
  const selId = useAtomValue(selIdAtom);
  const selBlockId = useAtomValue(selBlockIdAtom);

  const parentMap = useMemo(() => buildParentMap(hierarchy, null), [hierarchy]);

  // Base layout from hierarchy
  const baseLayout = useMemo(
    () => computeLayout(hierarchy, expanded, ifaces),
    [hierarchy, expanded, ifaces]
  );

  // Apply drag offsets and recalculate parent bounds
  const positioned = useMemo(() => {
    const p: Record<string, any> = {};
    for (const [id, sys] of Object.entries(baseLayout)) {
      const off = dragOffsets[id] || { dx: 0, dy: 0 };
      p[id] = { ...sys, x: sys.x + off.dx, y: sys.y + off.dy };
    }
    // Recalculate parent bounds based on children positions
    const parents = Object.keys(p).filter((id) => p[id].expanded && p[id].hasChildren);
    parents.sort(
      (a, b) => getAncestorIds(b, parentMap).length - getAncestorIds(a, parentMap).length
    );
    for (const pid of parents) {
      const par = p[pid];
      const cids = (par.children || []).map((c: any) => c.id);
      if (!cids.length) continue;
      let mnX = Infinity,
        mnY = Infinity,
        mxX = -Infinity,
        mxY = -Infinity;
      for (const cid of cids) {
        const c = p[cid];
        if (!c) continue;
        mnX = Math.min(mnX, c.x);
        mnY = Math.min(mnY, c.y);
        mxX = Math.max(mxX, c.x + c.w);
        mxY = Math.max(mxY, c.y + c.h);
      }
      p[pid] = {
        ...par,
        x: snapToGrid(mnX - PAD),
        y: snapToGrid(mnY - HEADER_H - PAD),
        w: snapToGrid(mxX - mnX + PAD * 2),
        h: snapToGrid(mxY - mnY + HEADER_H + PAD * 2 + GRID),
      };
    }
    return p;
  }, [baseLayout, dragOffsets, parentMap]);

  // Focus mode: which IDs are visible
  const focusIds = useMemo(() => {
    if (!focusId) return null;
    const ids = new Set([focusId, ...getDescendantIds(hierarchy, focusId)]);
    getAncestorIds(focusId, parentMap).forEach((a) => ids.add(a));
    revealed.forEach((id) => {
      ids.add(id);
      getDescendantIds(hierarchy, id).forEach((d) => ids.add(d));
      getAncestorIds(id, parentMap).forEach((a) => ids.add(a));
    });
    return ids;
  }, [focusId, revealed, parentMap, hierarchy]);

  // Visible blocks (expanded parents show children)
  const visible = useMemo(() => {
    const v: Record<string, any> = {};
    for (const [id, sys] of Object.entries(positioned)) {
      let ok = true;
      let pid = parentMap[id];
      while (pid) {
        if (!expanded.has(pid)) {
          ok = false;
          break;
        }
        pid = parentMap[pid];
      }
      if (!ok) continue;
      if (focusIds && !focusIds.has(id)) continue;
      v[id] = sys;
    }
    return v;
  }, [positioned, expanded, parentMap, focusIds]);

  // Container IDs (root-level visible blocks)
  const containers = useMemo(
    () => Object.keys(visible).filter((id) => !parentMap[id] || !visible[parentMap[id]]),
    [visible, parentMap]
  );

  // Dot assignments and pills
  const dotAssign = useMemo(
    () => assignDots(ifaces, visible, dotOverrides),
    [ifaces, visible, dotOverrides]
  );

  const pills = useMemo(
    () => computePills(ifaces, visible, dotAssign, pillOffsets),
    [ifaces, visible, dotAssign, pillOffsets]
  );

  // Build React Flow graph
  const { nodes, edges } = useMemo(
    () =>
      buildReactFlowGraph({
        visible,
        containers,
        ifaces,
        dots: dotAssign,
        pills,
        focusIds,
        selId,
        selBlockId,
      }),
    [visible, containers, ifaces, dotAssign, pills, focusIds, selId, selBlockId]
  );

  return {
    nodes,
    edges,
    visible,
    positioned,
    parentMap,
    focusIds,
    pills,
    dotAssign,
  };
}
