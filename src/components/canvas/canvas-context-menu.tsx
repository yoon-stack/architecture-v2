import { useCallback } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import {
  ctxMenuAtom,
  hierarchyAtom,
  ifacesAtom,
  expandedAtom,
  dragOffsetsAtom,
  editingBlockIdAtom,
  detailIfaceIdAtom,
  selIdAtom,
} from '@/store/atoms';
import { COLORS } from '@/store/constants';
import { computeLayout } from '@/lib/layout';

export function CanvasContextMenu() {
  const [ctxMenu, setCtxMenu] = useAtom(ctxMenuAtom);
  const [hierarchy, setHierarchy] = useAtom(hierarchyAtom);
  const ifaces = useAtomValue(ifacesAtom);
  const expanded = useAtomValue(expandedAtom);
  const setDragOffsets = useSetAtom(dragOffsetsAtom);
  const setEditingBlockId = useSetAtom(editingBlockIdAtom);
  const setIfaces = useSetAtom(ifacesAtom);
  const setDetailIfaceId = useSetAtom(detailIfaceIdAtom);
  const setSelId = useSetAtom(selIdAtom);

  const handleAddSystem = useCallback(() => {
    if (!ctxMenu) return;
    const id = `sys-${Date.now()}`;
    const newItem = { id, name: 'New System', reqs: 0, color: COLORS.orange, children: [] };
    const newHier = [...hierarchy, newItem];
    const newLayout = computeLayout(newHier, expanded, ifaces);
    const basePos = newLayout[id];
    const dx = basePos ? ctxMenu.svgX - basePos.x : 0;
    const dy = basePos ? ctxMenu.svgY - basePos.y : 0;
    setHierarchy(newHier);
    setDragOffsets((prev) => ({ ...prev, [id]: { dx, dy } }));
    setEditingBlockId(id);
    setCtxMenu(null);
  }, [ctxMenu, hierarchy, expanded, ifaces, setHierarchy, setDragOffsets, setEditingBlockId, setCtxMenu]);

  const handleAddInterface = useCallback(() => {
    if (!ctxMenu) return;
    const id = `INT-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const newIface = {
      id,
      source: '',
      target: '',
      name: 'New Interface',
      desc: '',
      interfaceType: 'Signal',
      requirements: [],
      dateCreated: today,
      dateLastUpdated: today,
      verificationStatus: 'unknown' as const,
      maturityLevel: 'concept' as const,
      owner: '',
      team: '',
      progress: 0,
    };
    setIfaces((prev) => [...prev, newIface]);
    setDetailIfaceId(id);
    setSelId(id);
    setCtxMenu(null);
  }, [ctxMenu, setIfaces, setDetailIfaceId, setSelId, setCtxMenu]);

  if (!ctxMenu) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
      style={{ left: ctxMenu.screenX, top: ctxMenu.screenY }}
      onClick={() => setCtxMenu(null)}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left"
        onClick={handleAddSystem}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add System
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left"
        onClick={handleAddInterface}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="12" r="3" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
        Add Interface
      </button>
    </div>
  );
}
