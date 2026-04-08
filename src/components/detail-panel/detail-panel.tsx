import { useAtom, useAtomValue } from 'jotai';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/common/ui/separator';
import {
  detailIfaceIdAtom,
  detailWidthAtom,
  ifacesAtom,
  allRequirementsAtom,
} from '@/store/atoms';
import {
  DVInterfaceIcon,
  DVPackageIcon,
  DVRequirementIcon,
  DVArrowIcon,
  DVUserIcon,
} from '@/components/common/icons';

// ═══════════════════════════════════════════════════════
//  DETAIL PANEL — slide-over from right
// ═══════════════════════════════════════════════════════

export function DetailPanel() {
  const [detailIfaceId, setDetailIfaceId] = useAtom(detailIfaceIdAtom);
  const detailWidth = useAtomValue(detailWidthAtom);
  const ifaces = useAtomValue(ifacesAtom);
  const allRequirements = useAtomValue(allRequirementsAtom);

  const isOpen = detailIfaceId !== null;
  const activeIface = detailIfaceId ? ifaces.find(i => i.id === detailIfaceId) : null;
  const panelWidth = detailWidth || 380;

  const handleClose = () => setDetailIfaceId(null);

  // Maturity icon renderer
  const maturityIcon = (level?: string) => {
    const ml = level?.toLowerCase();
    if (ml === 'verified') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13.8002 10.7999L11.1154 13.1999L10.2002 12.3818M16.8002 8.99994L16.8002 15C16.8002 15.9941 15.9943 16.8 15.0002 16.8H9.0002C8.00608 16.8 7.2002 15.9941 7.2002 15V8.99994C7.2002 8.00583 8.00608 7.19995 9.0002 7.19995H15.0002C15.9943 7.19995 16.8002 8.00583 16.8002 8.99994Z" stroke="#00A469" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (ml === 'defined') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M10.7399 17.7598H7.85992C7.06462 17.7598 6.41992 17.1151 6.41992 16.3198L6.41998 7.67986C6.41998 6.88457 7.06469 6.23987 7.85998 6.23987H14.3401C15.1354 6.23987 15.7801 6.88458 15.7801 7.67987V11.6399M12.9001 15.7199L14.2201 17.0399L17.5801 13.4399" stroke="#1046D0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (ml === 'in progress' || ml === 'progress') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <g opacity="0.9">
            <path d="M15.3756 12C15.3756 13.6602 14.1769 15.0404 12.5977 15.3223C12.2715 15.3806 12.0006 15.1063 12.0006 14.775V9.22498C12.0006 8.8936 12.2715 8.6194 12.5977 8.67764C14.1769 8.95956 15.3756 10.3398 15.3756 12Z" stroke="#DCAE09" strokeWidth="1.2" />
            <path fillRule="evenodd" clipRule="evenodd" d="M17.4006 12C17.4006 14.9823 14.9829 17.4 12.0006 17.4C9.01825 17.4 6.60059 14.9823 6.60059 12C6.60059 9.01764 9.01825 6.59998 12.0006 6.59998C14.9829 6.59998 17.4006 9.01764 17.4006 12Z" stroke="#DCAE09" strokeWidth="1.2" />
          </g>
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M7.68023 17.7605H16.3202C17.1155 17.7605 17.7602 17.1158 17.7602 16.3205V7.68048C17.7602 6.88519 17.1155 6.24048 16.3202 6.24048H7.68023C6.88494 6.24048 6.24023 6.88519 6.24023 7.68048V16.3205C6.24023 17.1158 6.88494 17.7605 7.68023 17.7605Z" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Type icon renderer
  const typeIcon = (interfaceType?: string) => {
    if (!interfaceType) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7.68023 17.7605H16.3202C17.1155 17.7605 17.7602 17.1158 17.7602 16.3205V7.68048C17.7602 6.88519 17.1155 6.24048 16.3202 6.24048H7.68023C6.88494 6.24048 6.24023 6.88519 6.24023 7.68048V16.3205C6.24023 17.1158 6.88494 17.7605 7.68023 17.7605Z" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    const typeColor: Record<string, string> = { Signal: '#ec4899', Mechanical: '#22c55e', Electrical: '#f59e0b' };
    const color = typeColor[interfaceType] || 'black';
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M11.6305 7.353C11.8345 7.14893 12.1654 7.14893 12.3694 7.353L16.6469 11.6305C16.851 11.8345 16.851 12.1654 16.6469 12.3694L12.3694 16.6469C12.1654 16.851 11.8345 16.851 11.6305 16.6469L7.353 12.3694C7.14893 12.1654 7.14893 11.8345 7.353 11.6305L11.6305 7.353Z" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={handleClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full flex flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ width: panelWidth }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAEAEA] shrink-0">
          <div className="flex items-center gap-2">
            <DVInterfaceIcon size={24} />
            <span className="text-xs font-medium text-black">
              {activeIface?.id || ''}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#151414" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto py-3 flex flex-col gap-5">
          {activeIface && (
            <>
              {/* Title + Description */}
              <div className="px-4 flex flex-col gap-2">
                <span className="text-sm font-medium text-black">{activeIface.name}</span>
                {activeIface.desc && (
                  <span className="text-xs text-black leading-[17px]">{activeIface.desc}</span>
                )}
              </div>

              <Separator className="bg-[#EAEAEA]" />

              {/* Detail section */}
              <div className="px-4 flex flex-col gap-3">
                <span className="text-xs font-medium text-black">Detail</span>

                <div className="flex flex-col gap-2">
                  {/* Direction */}
                  <div className="flex items-center gap-4 w-full">
                    <span className="text-xs font-medium text-black whitespace-nowrap">Direction</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 flex items-center px-1.5 py-0.5 rounded-md border border-[#E4E4E4] bg-white">
                        <div className="flex items-center flex-1 min-w-0">
                          <DVPackageIcon size={24} />
                          <span className="text-xs font-medium text-[#151414] overflow-hidden text-ellipsis whitespace-nowrap">
                            {activeIface.source}
                          </span>
                        </div>
                      </div>
                      <DVArrowIcon size={24} />
                      <div className="flex-1 flex items-center px-1.5 py-0.5 rounded-md border border-[#E4E4E4] bg-white">
                        <div className="flex items-center flex-1 min-w-0">
                          <DVPackageIcon size={24} />
                          <span className="text-xs font-medium text-[#151414] overflow-hidden text-ellipsis whitespace-nowrap">
                            {activeIface.target}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-black whitespace-nowrap">Type</span>
                    <div className="flex-1 flex items-center justify-end">
                      <div
                        className={cn(
                          'inline-flex items-center rounded-md bg-white max-w-[160px]',
                          activeIface.interfaceType
                            ? 'py-0.5 pl-1 pr-3 border border-[#E4E4E4]'
                            : 'py-1 pl-1 pr-3 border border-dashed border-[#C1C1C1]',
                        )}
                      >
                        {typeIcon(activeIface.interfaceType)}
                        <span
                          className={cn(
                            'text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap',
                            activeIface.interfaceType ? 'text-[#151414]' : 'text-[#C1C1C1]',
                          )}
                        >
                          {activeIface.interfaceType || 'Type'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Maturity */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-black whitespace-nowrap">Maturity</span>
                    <div className="flex-1 flex items-center justify-end">
                      <div
                        className={cn(
                          'inline-flex items-center rounded-md bg-white max-w-[160px]',
                          activeIface.maturityLevel
                            ? 'py-0.5 pl-1 pr-3 border border-[#E4E4E4]'
                            : 'py-1 pl-1 pr-3 border border-dashed border-[#C1C1C1]',
                        )}
                      >
                        {maturityIcon(activeIface.maturityLevel)}
                        <span
                          className={cn(
                            'text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap capitalize',
                            activeIface.maturityLevel ? 'text-[#151414]' : 'text-[#C1C1C1]',
                          )}
                        >
                          {activeIface.maturityLevel || 'Maturity'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-black whitespace-nowrap">Owner</span>
                    <DVUserIcon size={30} />
                  </div>
                </div>
              </div>

              <Separator className="bg-[#EAEAEA]" />

              {/* Requirement section */}
              <div className="px-4 flex flex-col gap-3">
                <span className="text-xs font-medium text-black">Requirement</span>

                <div className="flex flex-col gap-1.5">
                  {(activeIface.requirements || []).map(req => {
                    const reqId = typeof req === 'string' ? req : req.id;
                    const reqData = allRequirements.find(r => r.id === reqId);
                    return (
                      <div
                        key={reqId}
                        className="flex items-center justify-between px-1.5 py-1 rounded-md border border-[#E4E4E4] bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <DVRequirementIcon size={24} />
                            <span className="text-xs text-[#8A8A8A]">{reqId}</span>
                          </div>
                          <span className="text-xs font-medium text-[#151414]">
                            {reqData?.label || 'Requirement'}
                          </span>
                        </div>
                        <div className="border-[0.833px] border-dashed border-[#8A8A8A] rounded-full flex items-center">
                          <DVUserIcon size={20} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Add requirement */}
                  <div className="flex items-center px-3 py-2 rounded-md border border-dashed border-[#c1c1c1] cursor-pointer">
                    <span className="text-xs text-[#c1c1c1]">Add requirement</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default DetailPanel;
