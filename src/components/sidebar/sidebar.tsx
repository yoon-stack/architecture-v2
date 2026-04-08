import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';
import { Separator } from '@/components/common/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/common/ui/tooltip';
import {
  hierarchyAtom,
  ifacesAtom,
  selIdAtom,
  selBlockIdAtom,
  hovIdAtom,
  sbExpAtom,
  sbIfaceExpAtom,
  sidebarCollapsedAtom,
  sidebarWidthAtom,
  focusIdAtom,
  modalAtom,
} from '@/store/atoms';
import type { SystemNode, Interface } from '@/store/types';
import {
  ProjectLogo,
  SearchIcon,
  SidebarFoldIcon,
  MergeIcon,
  FocusIcon,
  PlusIcon,
  PlusIconSmall,
  HomeIcon,
  ChevronDownIcon,
  PackageIcon,
  InterfaceIcon,
} from '@/components/common/icons';

// ── Design Tokens ──
const TOKENS = {
  bgSidebar: '#F7F7F7',
  bgHover: '#eeeeee',
  bgSelected: '#EDECF5',
  accent: '#2709DC',
  black: '#151414',
  divider: '#e4e4e4',
  border: '#E4E4E4',
  lineGrey: '#C1C1C1',
  textPrimary: '#0A090B',
  textSecondary: '#6E6E6E',
  white: '#FFFFFF',
};

// ═══════════════════════════════════════════════════════
//  BRANCH DATA & HELPERS
// ═══════════════════════════════════════════════════════

const B_COL = 18;
const B_ROW = 30;
const B_DOT = 3;
const B_LINE = '#C1C1C1';
const ITEM_ROW_H = 30;

interface BranchNode {
  id: string;
  name: string;
  children: BranchNode[];
}

const branchData: BranchNode = {
  id: 'base',
  name: 'Base',
  children: [
    {
      id: 'pdr',
      name: 'PDR',
      children: [
        { id: 'pdr-structures-update', name: 'pdr-structures-update', children: [] },
        { id: 'pdr-propulsion-main', name: 'pdr-propulsion-main', children: [] },
      ],
    },
    { id: 'pdr-root', name: 'PDR', children: [] },
  ],
};

let _branchSeq = 0;
function genBranchId() {
  return `branch-${Date.now()}-${++_branchSeq}`;
}

function cloneBranchTree(node: BranchNode): BranchNode {
  return { ...node, children: node.children ? node.children.map(cloneBranchTree) : [] };
}

function addChildInTree(tree: BranchNode, parentId: string, child: BranchNode): BranchNode {
  const t = cloneBranchTree(tree);
  (function walk(n: BranchNode): boolean {
    if (n.id === parentId) { n.children.push(child); return true; }
    return n.children?.some(walk) ?? false;
  })(t);
  return t;
}

function removeFromTree(tree: BranchNode, nodeId: string): BranchNode {
  const t = cloneBranchTree(tree);
  (function walk(n: BranchNode): boolean {
    if (!n.children) return false;
    const idx = n.children.findIndex(c => c.id === nodeId);
    if (idx !== -1) { n.children.splice(idx, 1); return true; }
    return n.children.some(walk);
  })(t);
  return t;
}

function renameInTree(tree: BranchNode, nodeId: string, newName: string): BranchNode {
  const t = cloneBranchTree(tree);
  (function walk(n: BranchNode): boolean {
    if (n.id === nodeId) { n.name = newName; return true; }
    return n.children?.some(walk) ?? false;
  })(t);
  return t;
}

// ═══════════════════════════════════════════════════════
//  BRANCH NAME INPUT
// ═══════════════════════════════════════════════════════

function BranchNameInput({ initialName, onDone }: { initialName: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState(initialName);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { onDone(value.trim() || initialName); };
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') onDone(initialName);
      }}
      onClick={e => e.stopPropagation()}
      className="flex-1 text-xs font-normal text-foreground border border-[#2709DC] rounded px-1 py-px outline-none bg-white min-w-0"
    />
  );
}

// ═══════════════════════════════════════════════════════
//  BRANCH TREE FLATTENING & SVG
// ═══════════════════════════════════════════════════════

interface FlatRow {
  id: string;
  name: string;
  depth: number;
  isLast: boolean;
  hasChildren: boolean;
  parentId: string | null;
  rowIndex: number;
}

function flattenBranch(node: BranchNode, depth = 0, isLast = true, parentId: string | null = null, result: FlatRow[] = []): FlatRow[] {
  const hasChildren = !!(node.children?.length);
  result.push({ id: node.id, name: node.name, depth, isLast, hasChildren, parentId, rowIndex: result.length });
  if (hasChildren) {
    node.children.forEach((child, i) => {
      flattenBranch(child, depth + 1, i === node.children.length - 1, node.id, result);
    });
  }
  return result;
}

function BranchTree({
  data,
  hovId,
  setHovId,
  selId,
  setSelId,
  onMerge,
  onAddChild,
  editingId,
  onEditDone,
  onStartEdit,
}: {
  data: BranchNode;
  hovId: string | null;
  setHovId: (id: string | null) => void;
  selId: string | null;
  setSelId: (id: string | null) => void;
  onMerge: (id: string) => void;
  onAddChild: (id: string) => void;
  editingId: string | null;
  onEditDone: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
}) {
  const rows = useMemo(() => flattenBranch(data), [data]);
  const [mergeHovId, setMergeHovId] = useState<string | null>(null);

  const childMap = useMemo(() => {
    const m: Record<string, FlatRow[]> = {};
    for (const r of rows) {
      if (r.parentId != null) (m[r.parentId] ||= []).push(r);
    }
    return m;
  }, [rows]);

  const rowMap = useMemo(() => {
    const m: Record<string, FlatRow> = {};
    for (const r of rows) m[r.id] = r;
    return m;
  }, [rows]);

  // Build SVG elements for the branch tree lines/dots
  const svgEls = useMemo(() => {
    const els: React.ReactElement[] = [];
    for (const row of rows) {
      const cx = row.depth * B_COL + 9;
      const cy = row.rowIndex * B_ROW + B_ROW / 2;
      if (row.depth === 0) {
        els.push(<circle key={`rd-${row.id}`} cx={cx} cy={cy} r={B_DOT} fill={B_LINE} />);
      }
      const kids = childMap[row.id];
      if (!kids?.length) continue;
      const lastKid = kids[kids.length - 1];
      const lastKidCy = lastKid.rowIndex * B_ROW + B_ROW / 2;
      const lineTop = cy + B_DOT;
      const lineBot = lastKid.hasChildren ? lastKidCy - 20 : lastKidCy - 9;
      els.push(
        <line key={`vl-${row.id}`} x1={cx} y1={lineTop} x2={cx} y2={lineBot} stroke={B_LINE} strokeWidth={1} />,
      );
      for (const kid of kids) {
        const kcx = kid.depth * B_COL + 9;
        const kcy = kid.rowIndex * B_ROW + B_ROW / 2;
        if (kid.hasChildren) {
          const exitY = kcy - 20;
          const entryY = kcy - B_DOT;
          els.push(
            <path key={`sc-${kid.id}`} d={`M${cx} ${exitY} C${cx} ${entryY},${kcx} ${exitY},${kcx} ${entryY}`} stroke={B_LINE} fill="none" strokeWidth={1} />,
          );
          els.push(<circle key={`sd-${kid.id}`} cx={kcx} cy={kcy} r={B_DOT} fill={B_LINE} />);
        } else {
          const depY = kcy - 9;
          const arrX = cx + 9;
          els.push(
            <path key={`jc-${kid.id}`} d={`M${cx} ${depY} C${cx} ${kcy - 2},${cx + 1.5} ${kcy},${arrX} ${kcy}`} stroke={B_LINE} fill="none" strokeWidth={1} />,
          );
          els.push(
            <line key={`hc-${kid.id}`} x1={arrX} y1={kcy} x2={kcx - B_DOT} y2={kcy} stroke={B_LINE} strokeWidth={1} />,
          );
          els.push(<circle key={`ld-${kid.id}`} cx={kcx} cy={kcy} r={B_DOT} fill={B_LINE} />);
        }
      }
    }
    return els;
  }, [rows, childMap]);

  // Build SVG path `d` string connecting a child row to its parent row
  const buildConnectionPath = useCallback((childRow: FlatRow, parentRow: FlatRow) => {
    const cx = parentRow.depth * B_COL + 9;
    const cy = parentRow.rowIndex * B_ROW + B_ROW / 2;
    const kcx = childRow.depth * B_COL + 9;
    const kcy = childRow.rowIndex * B_ROW + B_ROW / 2;
    if (childRow.hasChildren) {
      const exitY = kcy - 20;
      const entryY = kcy - B_DOT;
      return `M${kcx} ${entryY} C${kcx} ${exitY},${cx} ${entryY},${cx} ${exitY} L${cx} ${cy + B_DOT}`;
    } else {
      const depY = kcy - 9;
      const arrX = cx + 9;
      return `M${kcx} ${kcy} L${arrX} ${kcy} C${cx + 1.5} ${kcy},${cx} ${kcy - 2},${cx} ${depY} L${cx} ${cy + B_DOT}`;
    }
  }, []);

  // Static black overlay for selected branch -> parent connection
  const selOverlay = useMemo(() => {
    if (!selId) return null;
    const selRow = rowMap[selId];
    if (!selRow || selRow.depth === 0) return null;
    const parentRow = rowMap[selRow.parentId!];
    if (!parentRow) return null;
    if (mergeHovId === selId) return null;
    const cx = parentRow.depth * B_COL + 9;
    const cy = parentRow.rowIndex * B_ROW + B_ROW / 2;
    const kcx = selRow.depth * B_COL + 9;
    const kcy = selRow.rowIndex * B_ROW + B_ROW / 2;
    const pathD = buildConnectionPath(selRow, parentRow);
    return (
      <>
        <circle cx={cx} cy={cy} r={B_DOT} fill="#5a5a5a" />
        <path d={pathD} stroke="#5a5a5a" fill="none" strokeWidth={1} />
        <circle cx={kcx} cy={kcy} r={B_DOT} fill="#5a5a5a" />
      </>
    );
  }, [selId, mergeHovId, rowMap, buildConnectionPath]);

  // Animated gradient-sweep overlay for merge hover
  const mergeOverlay = useMemo(() => {
    if (!mergeHovId) return null;
    const childRow = rowMap[mergeHovId];
    if (!childRow || childRow.depth === 0) return null;
    const parentRow = rowMap[childRow.parentId!];
    if (!parentRow) return null;
    const cx = parentRow.depth * B_COL + 9;
    const cy = parentRow.rowIndex * B_ROW + B_ROW / 2;
    const kcx = childRow.depth * B_COL + 9;
    const kcy = childRow.rowIndex * B_ROW + B_ROW / 2;
    const pathD = buildConnectionPath(childRow, parentRow);
    return (
      <>
        <circle cx={cx} cy={cy} r={B_DOT} fill="#5a5a5a" />
        <circle cx={kcx} cy={kcy} r={B_DOT} fill="#5a5a5a" />
        <path d={pathD} stroke={B_LINE} fill="none" strokeWidth={1} />
        <path
          d={pathD}
          stroke="#5a5a5a"
          fill="none"
          strokeWidth={1.5}
          pathLength={1}
          strokeDasharray="0.4 0.6"
          strokeLinecap="round"
          className="animate-[mergeSweep_2.6s_linear_infinite]"
        />
      </>
    );
  }, [mergeHovId, rowMap, buildConnectionPath]);

  const maxCol = Math.max(...rows.map(r => r.depth + 1));
  const svgW = maxCol * B_COL;
  const svgH = rows.length * B_ROW;

  return (
    <div className="relative">
      <style>{`
        @keyframes mergeSweep {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: -1; }
        }
      `}</style>
      <svg
        className="absolute top-0 left-1 pointer-events-none z-[1]"
        style={{ width: svgW, height: svgH }}
      >
        {svgEls}
        {selOverlay}
        {mergeOverlay}
      </svg>
      {rows.map(row => {
        const isHov = hovId === row.id;
        const isSel = selId === row.id;
        const isEditing = editingId === row.id;
        const showActions = !isEditing && (isHov || isSel);
        const textX = (row.depth + 1) * B_COL;

        return (
          <div
            key={row.id}
            className={cn(
              'flex items-center h-[30px] rounded-lg cursor-pointer select-none',
              isSel && 'bg-[#eaeaea] outline outline-1 outline-[#e4e4e4] -outline-offset-1',
              !isSel && isHov && 'bg-[#eeeeee]',
            )}
            style={{ paddingLeft: 4 + textX, paddingRight: 4 }}
            onMouseEnter={() => setHovId(row.id)}
            onMouseLeave={() => { setHovId(null); setMergeHovId(null); }}
            onClick={() => setSelId(row.id)}
          >
            <div className="flex flex-1 items-center gap-1 pl-1 min-w-0">
              {isEditing ? (
                <BranchNameInput initialName={row.name} onDone={name => onEditDone(row.id, name)} />
              ) : (
                <span
                  onDoubleClick={e => { e.stopPropagation(); onStartEdit(row.id); }}
                  className="flex-1 text-xs font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {row.name}
                </span>
              )}
              {showActions && row.depth > 0 && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <div
                    onClick={e => { e.stopPropagation(); onMerge(row.id); }}
                    onMouseEnter={() => setMergeHovId(row.id)}
                    onMouseLeave={() => setMergeHovId(null)}
                    className="cursor-pointer flex items-center justify-center"
                    title="Merge into parent"
                  >
                    <MergeIcon size={21.6} />
                  </div>
                  <div
                    onClick={e => { e.stopPropagation(); onAddChild(row.id); }}
                    className="cursor-pointer flex items-center justify-center"
                    title="Add child branch"
                  >
                    <PlusIcon size={21.6} />
                  </div>
                </div>
              )}
              {showActions && row.depth === 0 && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <div
                    onClick={e => { e.stopPropagation(); onAddChild(row.id); }}
                    className="cursor-pointer flex items-center justify-center"
                    title="Add child branch"
                  >
                    <PlusIcon size={21.6} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  INDENT LINES
// ═══════════════════════════════════════════════════════

function IndentLines({ lines }: { lines: boolean[] }) {
  if (!lines.length) return null;
  return (
    <div className="flex self-stretch shrink-0">
      {lines.map((show, i) => (
        <div key={i} className="w-3 shrink-0 flex justify-center">
          {show && <div className="w-px min-h-full bg-[#d9d9d9]" />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ITEM TREE NODE
// ═══════════════════════════════════════════════════════

interface ItemTreeNodeProps {
  node: SystemNode;
  ifaces: Interface[];
  depth: number;
  hovId: string | null;
  setHovId: (id: string | null) => void;
  selId: string | null;
  onSel: (id: string) => void;
  onSelBlock: (id: string) => void;
  focusSys: (id: string | null) => void;
  sbExp: Set<string>;
  togSb: (id: string) => void;
  onQuickAdd: (id: string) => void;
  editingItemId: string | null;
  onRenameItem: (id: string, name: string) => void;
  onStartEditItem: (id: string) => void;
  editingIfaceId: string | null;
  onStartEditIface: (id: string) => void;
  onRenameIface: (id: string, name: string) => void;
  lines?: boolean[];
}

function ItemTreeNode({
  node,
  ifaces,
  depth,
  hovId,
  setHovId,
  selId,
  onSel,
  onSelBlock,
  focusSys,
  sbExp,
  togSb,
  onQuickAdd,
  editingItemId,
  onRenameItem,
  onStartEditItem,
  editingIfaceId,
  onStartEditIface,
  onRenameIface,
  lines = [],
}: ItemTreeNodeProps) {
  const hasChildren = !!(node.children?.length);
  const nodeIfaces = ifaces.filter(i => i.source === node.id || i.target === node.id);
  const isOpen = sbExp.has(node.id);
  const isHovered = hovId === node.id;
  const isSelected = selId === node.id;
  const canExpand = hasChildren || nodeIfaces.length > 0;
  const isEditing = editingItemId === node.id;

  const allItems: Array<{ type: 'iface' | 'sys'; data: Interface | SystemNode }> = [];
  if (isOpen) {
    nodeIfaces.forEach(iface => allItems.push({ type: 'iface', data: iface }));
    if (hasChildren) node.children!.forEach(child => allItems.push({ type: 'sys', data: child }));
  }

  return (
    <div>
      {/* System row */}
      <div
        className={cn(
          'flex items-center px-1 rounded-lg cursor-pointer select-none',
          isSelected && 'bg-[rgba(39,9,220,0.05)] outline outline-1 outline-[#2709DC] -outline-offset-1',
          !isSelected && isHovered && 'bg-[#eeeeee]',
        )}
        style={{ height: ITEM_ROW_H }}
        onClick={() => { if (!isEditing && onSelBlock) onSelBlock(node.id); }}
        onMouseEnter={() => setHovId(node.id)}
        onMouseLeave={() => setHovId(null)}
      >
        <IndentLines lines={lines} />
        <div className="flex flex-1 items-center gap-1 min-w-0">
          {/* Chevron */}
          {canExpand ? (
            <div
              onClick={e => { e.stopPropagation(); togSb(node.id); }}
              className={cn(
                'flex items-center cursor-pointer transition-transform duration-150',
                isOpen ? 'rotate-0' : '-rotate-90',
              )}
            >
              <ChevronDownIcon size={12} />
            </div>
          ) : (
            <div className="w-3 shrink-0 opacity-0">
              <ChevronDownIcon size={12} />
            </div>
          )}

          {/* Icon */}
          <div className="shrink-0">
            <PackageIcon size={24} />
          </div>

          {/* Name */}
          {isEditing ? (
            <BranchNameInput initialName={node.name} onDone={name => onRenameItem(node.id, name)} />
          ) : (
            <span
              onDoubleClick={e => { e.stopPropagation(); onStartEditItem(node.id); }}
              className="flex-1 text-xs font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {node.name}
            </span>
          )}
        </div>

        {/* Hover buttons: Focus + Plus */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <div
              onClick={e => { e.stopPropagation(); focusSys(node.id); }}
              className="cursor-pointer flex items-center justify-center"
              title="Focus"
            >
              <FocusIcon size={21.6} />
            </div>
            <div
              onClick={e => { e.stopPropagation(); onQuickAdd(node.id); }}
              className="cursor-pointer flex items-center justify-center"
              title="Add"
            >
              <PlusIcon size={21.6} />
            </div>
          </div>
        )}
      </div>

      {/* Children: interfaces first, then child systems */}
      {allItems.map((item) => {
        const childLines = [...lines, true];

        if (item.type === 'iface') {
          const iface = item.data as Interface;
          const isIfSel = selId === iface.id;
          const isIfHov = hovId === iface.id;
          return (
            <div
              key={iface.id + node.id}
              onMouseEnter={() => setHovId(iface.id)}
              onMouseLeave={() => setHovId(null)}
              className={cn(
                'flex items-center px-1 rounded-lg cursor-pointer select-none',
                isIfSel && 'bg-[rgba(39,9,220,0.05)] outline outline-1 outline-[#2709DC] -outline-offset-1',
                !isIfSel && isIfHov && 'bg-[#eeeeee]',
              )}
              style={{ height: ITEM_ROW_H }}
              onClick={() => onSel(iface.id)}
            >
              <IndentLines lines={childLines} />
              <div className="flex flex-1 items-center gap-1 min-w-0">
                <div className="w-3 shrink-0 opacity-0">
                  <ChevronDownIcon size={12} />
                </div>
                <div className="shrink-0"><InterfaceIcon size={24} /></div>
                {editingIfaceId === iface.id ? (
                  <BranchNameInput initialName={iface.name} onDone={name => onRenameIface(iface.id, name)} />
                ) : (
                  <span
                    onDoubleClick={e => { e.stopPropagation(); onStartEditIface(iface.id); }}
                    className="flex-1 text-xs font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {iface.name}
                  </span>
                )}
              </div>
            </div>
          );
        }

        const child = item.data as SystemNode;
        return (
          <ItemTreeNode
            key={child.id}
            node={child}
            ifaces={ifaces}
            depth={depth + 1}
            hovId={hovId}
            setHovId={setHovId}
            selId={selId}
            onSel={onSel}
            onSelBlock={onSelBlock}
            focusSys={focusSys}
            sbExp={sbExp}
            togSb={togSb}
            onQuickAdd={onQuickAdd}
            editingItemId={editingItemId}
            onRenameItem={onRenameItem}
            onStartEditItem={onStartEditItem}
            editingIfaceId={editingIfaceId}
            onStartEditIface={onStartEditIface}
            onRenameIface={onRenameIface}
            lines={childLines}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════

interface SidebarProps {
  resizingRef?: React.MutableRefObject<boolean>;
  focusSys: (id: string | null) => void;
  onQuickAdd: (id: string) => void;
  breadcrumb?: Array<{ id: string | null; name: string }>;
  onAddItem?: () => void;
  editingItemId: string | null;
  onRenameItem: (id: string, name: string) => void;
  onStartEditItem: (id: string) => void;
  onRenameIface?: (id: string, name: string) => void;
}

export function Sidebar({
  resizingRef,
  focusSys,
  onQuickAdd,
  breadcrumb,
  onAddItem,
  editingItemId,
  onRenameItem,
  onStartEditItem,
  onRenameIface,
}: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const sidebarWidth = useAtomValue(sidebarWidthAtom);
  const hierarchy = useAtomValue(hierarchyAtom);
  const ifaces = useAtomValue(ifacesAtom);
  const [selId, setSelId] = useAtom(selIdAtom);
  const [selBlockId, setSelBlockId] = useAtom(selBlockIdAtom);
  const hovId = useAtomValue(hovIdAtom);
  const [sbExp, setSbExp] = useAtom(sbExpAtom);
  const focusId = useAtomValue(focusIdAtom);

  const togSb = useCallback((id: string) => {
    setSbExp(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [setSbExp]);

  // Branch state
  const [branchHovId, setBranchHovId] = useState<string | null>(null);
  const [branchSelId, setBranchSelId] = useState<string | null>(null);
  const [branchTree, setBranchTree] = useState<BranchNode>(branchData);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Item state
  const [itemHovId, setItemHovId] = useState<string | null>(null);
  const [itemSelId, setItemSelId] = useState<string | null>(null);
  const [editingSidebarIfaceId, setEditingSidebarIfaceId] = useState<string | null>(null);
  const effectiveItemSelId = selBlockId || itemSelId || selId;

  // Divider resize
  const [branchHeight, setBranchHeight] = useState<number | null>(null);
  const dividerDrag = useRef(false);

  const onDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const branchEl = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
    if (!branchEl) return;
    const startY = e.clientY;
    const startH = branchEl.getBoundingClientRect().height;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const next = Math.max(40, Math.min(startH + delta, window.innerHeight - 200));
      setBranchHeight(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      dividerDrag.current = false;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    dividerDrag.current = true;
  }, []);

  const handleNewBranch = useCallback(() => {
    const id = genBranchId();
    setBranchTree(t => addChildInTree(t, t.id, { id, name: 'new-branch', children: [] }));
    setEditingBranchId(id);
    setBranchSelId(id);
  }, []);

  const handleAddChild = useCallback((parentId: string) => {
    const id = genBranchId();
    setBranchTree(t => addChildInTree(t, parentId, { id, name: 'new-branch', children: [] }));
    setEditingBranchId(id);
    setBranchSelId(id);
  }, []);

  const handleMerge = useCallback((nodeId: string) => {
    setBranchTree(t => removeFromTree(t, nodeId));
    setBranchSelId(prev => prev === nodeId ? null : prev);
    setBranchHovId(null);
  }, []);

  const handleEditDone = useCallback((nodeId: string, newName: string) => {
    setBranchTree(t => renameInTree(t, nodeId, newName));
    setEditingBranchId(null);
  }, []);

  const handleRenameIfaceSidebar = useCallback((id: string, newName: string) => {
    if (onRenameIface) onRenameIface(id, newName);
    setEditingSidebarIfaceId(null);
  }, [onRenameIface]);

  return (
    <div
      className={cn(
        'flex flex-col shrink-0 overflow-hidden relative gap-2 h-full bg-[#F7F7F7]',
        !resizingRef?.current && 'transition-[width] duration-200 ease-in-out',
      )}
      style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
    >
      {/* 1. TOP BAR: Project selector + Search + Fold */}
      <div
        className="flex items-center justify-between pt-3 pb-3 px-2.5"
        style={{ minWidth: sidebarWidth }}
      >
        {/* Project name + chevron */}
        <div className="flex items-center gap-1 cursor-pointer">
          <div className="flex items-center gap-3">
            <ProjectLogo size={25} />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Flow engineering
            </span>
          </div>
          <ChevronDownIcon size={12} />
        </div>

        {/* Right: Search + Fold */}
        <div className="flex items-center gap-0.5 flex-1 justify-end min-w-0 min-h-[1px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-6 h-6 flex items-center justify-center cursor-pointer text-foreground shrink-0">
                <SearchIcon size={24} />
              </div>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={() => setSidebarCollapsed(true)}
                className="w-6 h-6 flex items-center justify-center cursor-pointer text-foreground shrink-0"
              >
                <SidebarFoldIcon size={24} />
              </div>
            </TooltipTrigger>
            <TooltipContent>Fold sidebar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. BRANCH SECTION */}
      <div
        className="flex flex-col gap-2 px-2.5 overflow-hidden"
        style={{
          minWidth: sidebarWidth,
          ...(branchHeight != null ? { height: branchHeight, flexShrink: 0 } : {}),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-foreground">Branch</span>
          <button
            onClick={handleNewBranch}
            className="flex items-center justify-center pl-0.5 pr-[7px] py-0.5 rounded-md border-0 shadow-[inset_0_0_0_1px_#E4E4E4] bg-white cursor-pointer text-xs font-normal text-foreground"
          >
            <PlusIconSmall size={24} stroke="black" />
            New Branch
          </button>
        </div>

        {/* Branch tree */}
        <div className="flex-1 overflow-y-auto overflow-x-clip">
          <BranchTree
            data={branchTree}
            hovId={branchHovId}
            setHovId={setBranchHovId}
            selId={branchSelId}
            setSelId={setBranchSelId}
            onMerge={handleMerge}
            onAddChild={handleAddChild}
            editingId={editingBranchId}
            onEditDone={handleEditDone}
            onStartEdit={setEditingBranchId}
          />
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={onDividerDown}
        className="w-full shrink-0 flex items-center justify-center cursor-row-resize z-[1] -my-1"
        style={{ height: 9 }}
      >
        <Separator className="w-full" />
      </div>

      {/* 3. ITEMS SECTION */}
      <div
        className="flex flex-col gap-2 px-2.5 flex-1 overflow-hidden"
        style={{ minWidth: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-foreground">Items</span>
          <div className="flex items-center gap-1">
            {/* System selector */}
            <button className="flex items-center gap-0.5 pl-1 py-0.5 rounded-md border-0 shadow-[inset_0_0_0_1px_#E4E4E4] bg-white cursor-pointer text-xs font-normal text-foreground">
              <PackageIcon size={24} />
              System
              <div className="-rotate-90 flex items-center">
                <ChevronDownIcon size={12} />
              </div>
            </button>

            {/* Blue New button */}
            <button
              onClick={() => onAddItem?.()}
              className="flex items-center justify-center pl-0.5 pr-[7px] py-0.5 rounded-md border-0 bg-[#2709DC] cursor-pointer text-[13px] font-normal text-white"
            >
              <PlusIconSmall size={24} stroke="white" />
              New
            </button>
          </div>
        </div>

        {/* Breadcrumb in focus mode */}
        {focusId && breadcrumb && breadcrumb.length > 1 && (
          <>
            <div className="flex items-center flex-wrap">
              {breadcrumb.map((crumb, idx, arr) => (
                <div key={crumb.id || 'root'} className="flex items-center">
                  <div
                    onClick={() => focusSys(crumb.id)}
                    className="flex items-center gap-0.5 pr-1 rounded cursor-pointer"
                  >
                    {crumb.id === null ? <HomeIcon size={24} /> : <PackageIcon size={24} />}
                    <span className="text-xs font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {crumb.name}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="flex items-center justify-center w-6 h-6 -rotate-90">
                      <ChevronDownIcon size={12} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Separator className="-mx-2.5 w-[calc(100%+20px)]" />
          </>
        )}

        {/* Items tree */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-clip">
          {/* Project root */}
          <div className="flex items-center rounded-lg select-none" style={{ height: ITEM_ROW_H }}>
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <div className="shrink-0"><HomeIcon size={24} /></div>
              <span className="flex-1 text-xs font-normal text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                Project name
              </span>
            </div>
          </div>

          {/* System items */}
          {hierarchy.map(node => (
            <ItemTreeNode
              key={node.id}
              node={node}
              ifaces={ifaces}
              depth={0}
              hovId={itemHovId}
              setHovId={setItemHovId}
              selId={effectiveItemSelId}
              onSel={id => { setItemSelId(id); setSelId(id); }}
              onSelBlock={id => { setItemSelId(null); setSelBlockId(id); }}
              focusSys={focusSys}
              sbExp={sbExp}
              togSb={togSb}
              onQuickAdd={onQuickAdd}
              editingItemId={editingItemId}
              onRenameItem={onRenameItem}
              onStartEditItem={onStartEditItem}
              editingIfaceId={editingSidebarIfaceId}
              onStartEditIface={setEditingSidebarIfaceId}
              onRenameIface={handleRenameIfaceSidebar}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
