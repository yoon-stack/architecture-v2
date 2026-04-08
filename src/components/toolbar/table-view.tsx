import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '@/lib/utils';
import { ifacesAtom, allRequirementsAtom } from '@/store/atoms';
import { useLayoutEngine } from '@/components/canvas/hooks/use-layout-engine';

const columns = [
  { key: 'name', label: 'NAME' },
  { key: 'id', label: 'ID' },
  { key: 'interfaceType', label: 'INTERFACE TYPE' },
  { key: 'source', label: 'SOURCE SYSTEM' },
  { key: 'target', label: 'TARGET SYSTEMS' },
  { key: 'requirements', label: 'REQUIREMENTS' },
  { key: 'dateCreated', label: 'DATE CREATED' },
  { key: 'dateLastUpdated', label: 'DATE LAST UPD.' },
] as const;

type ColumnKey = (typeof columns)[number]['key'];

function formatDate(d?: string) {
  if (!d) return '\u2014';
  const dt = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

const typeStyles: Record<string, { bg: string; text: string }> = {
  Electrical: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Mechanical: { bg: 'bg-green-100', text: 'text-green-800' },
  Signal: { bg: 'bg-pink-100', text: 'text-pink-800' },
};

export function TableView() {
  const ifaces = useAtomValue(ifacesAtom);
  const allRequirements = useAtomValue(allRequirementsAtom);
  const { visible: allSystems } = useLayoutEngine();
  const [sortCol, setSortCol] = useState<ColumnKey>('dateCreated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: ColumnKey) => {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...ifaces];
    if (!sortCol) return list;
    list.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortCol === 'source') {
        va = allSystems[a.source]?.name || a.source;
        vb = allSystems[b.source]?.name || b.source;
      } else if (sortCol === 'target') {
        va = allSystems[a.target]?.name || a.target;
        vb = allSystems[b.target]?.name || b.target;
      } else if (sortCol === 'requirements') {
        va = (a.requirements || []).length;
        vb = (b.requirements || []).length;
      } else {
        va = (a as any)[sortCol] || '';
        vb = (b as any)[sortCol] || '';
      }
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [ifaces, sortCol, sortDir, allSystems, allRequirements]);

  const sysColor = (id: string) => allSystems[id]?.color || '#94a3b8';

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Summary bar */}
      <div className="px-4 py-2.5 text-[11.5px] text-slate-500 border-b border-slate-50 bg-slate-50 font-medium">
        Showing {ifaces.length} interface{ifaces.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-slate-200">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="px-4 py-3 text-left text-[10.5px] font-bold text-slate-500 tracking-wide cursor-pointer select-none whitespace-nowrap sticky top-0 bg-white z-[1]"
              >
                {col.label}{' '}
                {sortCol === col.key ? (
                  <span className="text-blue-600">{sortDir === 'desc' ? '\u25bc' : '\u25b2'}</span>
                ) : (
                  <span className="text-gray-300">{'\u21c5'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(iface => (
            <tr
              key={iface.id}
              className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
            >
              {/* Name */}
              <td className="px-4 py-3.5 font-semibold text-slate-800 max-w-[220px]">
                {iface.name}
              </td>

              {/* ID */}
              <td className="px-4 py-3.5 text-slate-500">{iface.id}</td>

              {/* Interface Type */}
              <td className="px-4 py-3.5">
                {iface.interfaceType ? (
                  <span
                    className={cn(
                      'text-[11.5px] font-semibold px-2.5 py-[3px] rounded-xl',
                      typeStyles[iface.interfaceType]?.bg || 'bg-slate-100',
                      typeStyles[iface.interfaceType]?.text || 'text-slate-600',
                    )}
                  >
                    {iface.interfaceType}
                  </span>
                ) : (
                  <span className="text-gray-300">{'\u2014'}</span>
                )}
              </td>

              {/* Source System */}
              <td className="px-4 py-3.5">
                <span
                  className="inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-xl text-xs font-medium text-slate-700"
                  style={{
                    background: sysColor(iface.source) + '15',
                    border: `1px solid ${sysColor(iface.source)}40`,
                  }}
                >
                  {allSystems[iface.source]?.name || iface.source}
                </span>
              </td>

              {/* Target System */}
              <td className="px-4 py-3.5">
                <span
                  className="inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-xl text-xs font-medium text-slate-700"
                  style={{
                    background: sysColor(iface.target) + '15',
                    border: `1px solid ${sysColor(iface.target)}40`,
                  }}
                >
                  {allSystems[iface.target]?.name || iface.target}
                </span>
              </td>

              {/* Requirements */}
              <td className="px-4 py-3.5">
                {(iface.requirements || []).length > 0 ? (
                  (iface.requirements || []).map(rq => {
                    const rId = typeof rq === 'string' ? rq : rq.id;
                    const r = allRequirements.find(x => x.id === rId);
                    return (
                      <span
                        key={rId}
                        className="inline-block bg-blue-100 text-blue-800 text-[11px] font-semibold px-2 py-[3px] rounded-lg mr-1"
                      >
                        {r ? `${r.id} ${r.label}` : rId}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-gray-300">{'\u2014'}</span>
                )}
              </td>

              {/* Date Created */}
              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                {formatDate(iface.dateCreated)}
              </td>

              {/* Date Last Updated */}
              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                {formatDate(iface.dateLastUpdated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableView;
