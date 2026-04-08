import { useAtomValue } from 'jotai';
import { Canvas } from '@/components/canvas/canvas';
import { CanvasToolbar } from '@/components/toolbar/canvas-toolbar';
import { Sidebar } from '@/components/sidebar/sidebar';
import { DetailPanel } from '@/components/detail-panel/detail-panel';
import { AIChatPanel } from '@/components/ai-chat/ai-chat-panel';
import { InterfaceModal } from '@/components/modals/interface-modal';
import { TableView } from '@/components/toolbar/table-view';
import {
  sidebarCollapsedAtom,
  chatCollapsedAtom,
  viewModeAtom,
  modalAtom,
  ctxMenuAtom,
} from '@/store/atoms';
import { CanvasContextMenu } from '@/components/canvas/canvas-context-menu';

export default function App() {
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom);
  const chatCollapsed = useAtomValue(chatCollapsedAtom);
  const viewMode = useAtomValue(viewModeAtom);
  const modal = useAtomValue(modalAtom);
  const ctxMenu = useAtomValue(ctxMenuAtom);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden font-sans">
      {/* Sidebar */}
      {!sidebarCollapsed && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <CanvasToolbar />
        {viewMode === 'architecture' ? <Canvas /> : <TableView />}
      </div>

      {/* AI Chat */}
      {!chatCollapsed && <AIChatPanel />}

      {/* Detail panel — slide-over from right */}
      <DetailPanel />

      {/* Modals */}
      {modal && <InterfaceModal />}

      {/* Context menu */}
      {ctxMenu && <CanvasContextMenu />}
    </div>
  );
}
