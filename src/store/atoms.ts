import { atom } from 'jotai';
import type {
  SystemNode,
  Interface,
  Requirement,
  PositionedBlock,
  Chat,
  DragOffset,
  PillOffset,
} from './types';
import { initialHierarchy, initIfaces, initRequirements, initialChatList } from './initial-data';

// Core data
export const hierarchyAtom = atom<SystemNode[]>(initialHierarchy);
export const expandedAtom = atom<Set<string>>(new Set());
export const ifacesAtom = atom<Interface[]>(initIfaces);
export const allRequirementsAtom = atom<Requirement[]>(initRequirements);

// View mode
export const viewModeAtom = atom<'architecture' | 'table'>('architecture');

// Selection & hover
export const selIdAtom = atom<string | null>(null);
export const hovIdAtom = atom<string | null>(null);
export const selBlockIdAtom = atom<string | null>(null);
export const hovBlockAtom = atom<string | null>(null);
export const hovCursorAtom = atom<string | null>(null);

// Canvas state
export const dragOffsetsAtom = atom<Record<string, DragOffset>>({});
export const pillOffsetsAtom = atom<Record<string, PillOffset>>({});
export const lineOffsetsAtom = atom<Record<string, number>>({});
export const dotOverridesAtom = atom<Record<string, string>>({});

// Focus mode
export const focusIdAtom = atom<string | null>(null);
export const revealedAtom = atom<Set<string>>(new Set());

// Editing
export const editingBlockIdAtom = atom<string | null>(null);
export const editingIfaceIdAtom = atom<string | null>(null);

// Connecting mode
export const connectingAtom = atom<{
  sourceId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null>(null);

// Modal state
export const modalAtom = atom<{
  mode: 'full' | 'quick' | 'drag';
  sourceId?: string;
  targetId?: string;
} | null>(null);

// Context menu
export const ctxMenuAtom = atom<{
  screenX: number;
  screenY: number;
  svgX: number;
  svgY: number;
} | null>(null);

// Sidebar
export const sidebarCollapsedAtom = atom(false);
export const sidebarWidthAtom = atom(250);
export const sbExpAtom = atom<Set<string>>(new Set());
export const sbIfaceExpAtom = atom<Set<string>>(new Set());

// Detail panel (slide-over from right)
export const detailIfaceIdAtom = atom<string | null>(null);
export const detailWidthAtom = atom(380);

// AI Chat
export const chatListAtom = atom<Chat[]>(initialChatList);
export const activeChatIdAtom = atom('c1');
export const chatCollapsedAtom = atom(false);
export const chatWidthAtom = atom(284);
export const agentsPanelOpenAtom = atom(false);

// Views
export const typeFilterAtom = atom<Set<string>>(new Set());
export const savedViewsAtom = atom<Array<{ id: string; name: string }>>([]);
export const activeViewIdAtom = atom<string | null>(null);

// Center trigger (used to recenter canvas on focus change)
export const centerTriggerAtom = atom(0);
