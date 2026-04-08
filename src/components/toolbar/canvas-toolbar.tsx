import { useAtom, useSetAtom } from 'jotai';
import { Button } from '@/components/common/ui/button';
import {
  viewModeAtom,
  modalAtom,
  focusIdAtom,
  typeFilterAtom,
  centerTriggerAtom,
} from '@/store/atoms';

export function CanvasToolbar() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const setModal = useSetAtom(modalAtom);
  const [focusId, setFocusId] = useAtom(focusIdAtom);
  const setCenterTrigger = useSetAtom(centerTriggerAtom);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-border flex-shrink-0">
      {/* View mode toggle */}
      <div className="flex items-center bg-gray-100 rounded-md p-0.5">
        <Button
          variant={viewMode === 'architecture' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('architecture')}
          className="text-[11px] h-6 px-2"
        >
          Architecture
        </Button>
        <Button
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('table')}
          className="text-[11px] h-6 px-2"
        >
          Table
        </Button>
      </div>

      <div className="w-px h-5 bg-gray-200" />

      {/* Add interface button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModal({ mode: 'full' })}
        className="text-[11px] h-6 gap-1"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Interface
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Focus breadcrumb / clear */}
      {focusId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFocusId(null);
            setCenterTrigger((c: number) => c + 1);
          }}
          className="text-[11px] h-6 gap-1 text-primary"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Clear Focus
        </Button>
      )}
    </div>
  );
}
