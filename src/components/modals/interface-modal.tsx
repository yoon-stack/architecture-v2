import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';
import { Separator } from '@/components/common/ui/separator';
import { Badge } from '@/components/common/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog';
import type { PositionedBlock, Requirement } from '@/store/types';

// ═══════════════════════════════════════════════════════
//  INTERFACE MODAL
// ═══════════════════════════════════════════════════════

interface InterfaceModalProps {
  mode: 'full' | 'quick' | 'drag';
  sourceId: string;
  targetId: string;
  allSystems: Record<string, PositionedBlock>;
  allRequirements: Requirement[];
  onClose: () => void;
  onCreate: (src: string, tgt: string, name: string, desc: string, reqIds: string[]) => void;
  onAddReq: (req: Requirement) => void;
}

export function InterfaceModal({
  mode,
  sourceId,
  targetId,
  allSystems,
  allRequirements,
  onClose,
  onCreate,
  onAddReq,
}: InterfaceModalProps) {
  const [src, setSrc] = useState(sourceId || '');
  const [tgt, setTgt] = useState(targetId || '');
  const [nm, setNm] = useState('');
  const [desc, setDesc] = useState('');
  const [selReqs, setSelReqs] = useState<string[]>([]);
  const [reqDropOpen, setReqDropOpen] = useState(false);
  const [newReqText, setNewReqText] = useState('');
  const reqDropRef = useRef<HTMLDivElement>(null);

  const opts = Object.values(allSystems).filter(s => !s.expanded || !s.hasChildren);

  useEffect(() => {
    if (src && tgt) {
      setNm(`${allSystems[src]?.name || src} \u2192 ${allSystems[tgt]?.name || tgt}`);
    }
  }, [src, tgt, allSystems]);

  useEffect(() => {
    if (!reqDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (reqDropRef.current && !reqDropRef.current.contains(e.target as Node)) {
        setReqDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reqDropOpen]);

  const canCreate = src && tgt && nm.trim();

  const handleCreateReq = () => {
    if (!newReqText.trim()) return;
    const nextNum = Math.max(0, ...allRequirements.map(r => parseInt(r.id.split('-')[1]) || 0)) + 1;
    const newId = `REQ-${nextNum}`;
    onAddReq({ id: newId, label: newReqText.trim() });
    setSelReqs(p => [...p, newId]);
    setNewReqText('');
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto p-7 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-bold">New Interface</DialogTitle>
        </DialogHeader>

        {mode === 'quick' && (
          <p className="text-xs text-slate-500 -mt-2">
            From: <strong>{allSystems[src]?.name || src}</strong>
          </p>
        )}
        {mode === 'drag' && (
          <p className="text-xs text-slate-500 -mt-2">
            <strong>{allSystems[src]?.name}</strong> {'\u2192'} <strong>{allSystems[tgt]?.name}</strong>
          </p>
        )}

        {/* Source selector */}
        {mode === 'full' && (
          <div className="mt-3">
            <label className="block mb-1.5 text-[11.5px] font-semibold text-slate-600">Source</label>
            <select
              value={src}
              onChange={e => setSrc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none mb-3.5"
            >
              <option value="">Select source...</option>
              {opts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Target selector */}
        {(mode === 'full' || mode === 'quick') && (
          <div>
            <label className="block mb-1.5 text-[11.5px] font-semibold text-slate-600">Target</label>
            <select
              value={tgt}
              onChange={e => setTgt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none mb-3.5"
            >
              <option value="">Select target...</option>
              {opts
                .filter(s => s.id !== src)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Interface details (shown when source + target selected) */}
        {(canCreate || mode === 'drag') && (
          <>
            <Separator className="my-1" />

            <div>
              <label className="block mb-1.5 text-[11.5px] font-semibold text-slate-600">Interface Name</label>
              <Input
                value={nm}
                onChange={e => setNm(e.target.value)}
                className="mb-3.5 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-[11.5px] font-semibold text-slate-600">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none mb-3.5 resize-y font-[inherit]"
                placeholder="Describe the interface purpose, data flows, constraints..."
              />
            </div>

            <div>
              <label className="block mb-1.5 text-[11.5px] font-semibold text-slate-600">Requirements</label>
              <div ref={reqDropRef} className="relative mb-3.5">
                {/* Selected requirements display */}
                <div
                  onClick={() => setReqDropOpen(!reqDropOpen)}
                  className="w-full min-h-[38px] flex flex-wrap gap-1 items-center cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  {selReqs.length === 0 && (
                    <span className="text-xs text-slate-400">Select requirements...</span>
                  )}
                  {selReqs.map(rId => {
                    const r = allRequirements.find(x => x.id === rId);
                    return (
                      <Badge
                        key={rId}
                        variant="secondary"
                        className="bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        {r ? `${r.id} ${r.label}` : rId}
                        <span
                          onClick={e => { e.stopPropagation(); setSelReqs(p => p.filter(x => x !== rId)); }}
                          className="cursor-pointer text-[13px] leading-none text-blue-400 ml-1"
                        >
                          {'\u00d7'}
                        </span>
                      </Badge>
                    );
                  })}
                </div>

                {/* Requirements dropdown */}
                {reqDropOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-[180px] overflow-y-auto mt-1">
                    {allRequirements
                      .filter(r => !selReqs.includes(r.id))
                      .map(r => (
                        <div
                          key={r.id}
                          onClick={() => setSelReqs(p => [...p, r.id])}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-700">{r.id}</span>
                          <span className="text-slate-500">{r.label}</span>
                        </div>
                      ))}
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2',
                        allRequirements.length > 0 && 'border-t border-slate-200',
                      )}
                    >
                      <input
                        value={newReqText}
                        onChange={e => setNewReqText(e.target.value)}
                        placeholder="New requirement..."
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateReq(); }}
                        className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11.5px] outline-none"
                      />
                      <Button
                        size="sm"
                        onClick={e => { e.stopPropagation(); handleCreateReq(); }}
                        className="h-7 px-2.5 text-[11px] font-semibold"
                      >
                        + Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end mt-1">
          <Button variant="outline" onClick={onClose} className="text-xs font-semibold">
            Cancel
          </Button>
          {(canCreate || (mode === 'drag' && nm.trim())) && (
            <Button
              onClick={() => onCreate(src, tgt, nm.trim(), desc, selReqs)}
              className="text-xs font-semibold"
            >
              Create Interface
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InterfaceModal;
