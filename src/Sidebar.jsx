import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ── Figma Design Tokens ──
const TOKENS = {
  bgSidebar: "#f4f4f4",
  bgHover: "#e4e4e4",
  bgSelected: "#EDECF5",
  accent: "#2709DC",
  black: "#151414",
  divider: "#e4e4e4",
  border: "#E4E4E4",
  lineGrey: "#C1C1C1",
  textPrimary: "#0A090B",
  textSecondary: "#6E6E6E",
  white: "#FFFFFF",
};

const FONT = "'AktivGrotesk','DM Sans',sans-serif";

// ═══════════════════════════════════════════════════════
//  ICON COMPONENTS (exact SVG from provided files)
// ═══════════════════════════════════════════════════════

function ProjectLogo({ size = 25 }) {
  return (
    <svg width={size} height={size * 0.989} viewBox="0 0 25 25" fill="none">
      <rect width="25" height="24.7283" rx="5.40541" fill="black"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.49797 4.36096C4.91615 4.4374 4.52883 5.01418 4.38341 6.02087C4.33013 6.38964 4.3378 7.50899 4.39708 8.02049C4.53903 9.24497 4.81461 10.551 5.17865 11.7245C5.39173 12.4113 5.38174 12.3656 5.34427 12.4809C4.86196 13.9642 4.54955 15.365 4.39655 16.7302C4.33777 17.2549 4.33062 18.3486 4.38355 18.7164C4.50595 19.5668 4.78818 20.0913 5.23572 20.3C5.38956 20.3718 5.43604 20.3805 5.66668 20.3805C6.08877 20.3805 6.4655 20.2229 7.0007 19.8221C7.25577 19.6312 7.9269 18.9874 8.28334 18.5918L8.55278 18.2927L8.96776 18.6995C9.87815 19.592 10.6821 20.0691 11.6967 20.3192C11.8496 20.3569 12.0084 20.3662 12.4998 20.3666C13.0863 20.3671 13.1251 20.3638 13.4118 20.2904C14.3622 20.0471 15.1589 19.5616 16.0488 18.6835C16.2714 18.4639 16.4557 18.2879 16.4585 18.2923C16.5132 18.381 17.0841 18.9861 17.3904 19.28C18.2259 20.0819 18.7561 20.3805 19.3442 20.3805C19.5803 20.3805 19.6111 20.3739 19.7912 20.2851C20.2256 20.0708 20.494 19.5606 20.6163 18.7164C20.6635 18.3905 20.664 17.2862 20.6172 16.851C20.4698 15.4818 20.1692 14.0732 19.74 12.7406C19.6808 12.5567 19.6324 12.3893 19.6324 12.3686C19.6324 12.3479 19.6808 12.1805 19.74 11.9967C20.1692 10.6641 20.4698 9.25548 20.6172 7.88627C20.664 7.45104 20.6635 6.34672 20.6163 6.02087C20.4972 5.19914 20.2194 4.66168 19.808 4.45724C19.6337 4.3706 19.5296 4.34962 19.2877 4.35239C18.7715 4.35833 18.1607 4.71325 17.3924 5.4538C17.1054 5.73034 16.4971 6.37582 16.4588 6.44449C16.4564 6.44863 16.266 6.26744 16.0357 6.04178C15.446 5.4641 14.9604 5.10307 14.3891 4.81747C13.722 4.48409 13.1872 4.35242 12.4998 4.35242C12.0423 4.35242 11.6914 4.40765 11.2653 4.54667C10.4665 4.80731 9.74793 5.27375 8.96776 6.03801L8.55278 6.44456L8.28362 6.14549C7.93255 5.75539 7.25795 5.10873 7.00014 4.91514C6.68468 4.67824 6.37332 4.50534 6.12494 4.42911C5.86251 4.34858 5.71463 4.33248 5.49797 4.36096ZM6.13041 5.01726C6.25722 5.07732 6.48958 5.22188 6.64682 5.33851C6.96684 5.57593 7.56622 6.15364 7.94874 6.59344L8.2016 6.88414L8.13592 6.96919C7.21427 8.16229 6.36599 9.73 5.70811 11.4561C5.68336 11.521 5.69482 11.5519 5.54642 11.0202C5.29818 10.1308 5.08454 9.06696 4.96761 8.13765C4.93038 7.84207 4.91913 7.55789 4.91941 6.92001C4.91976 6.15485 4.92478 6.06545 4.98177 5.80775C5.04984 5.50007 5.19285 5.16493 5.3074 5.04473C5.48984 4.85324 5.76472 4.84408 6.13041 5.01726ZM13.0544 4.93539C13.7088 5.04826 14.381 5.36695 15.0375 5.87555C15.2737 6.0585 16.0661 6.83178 16.0661 6.8793C16.0661 6.89758 15.9823 7.01691 15.88 7.14444C15.1963 7.99596 14.3204 9.21093 13.1045 10.9943L12.5043 11.8746L12.3296 11.6251C12.2335 11.4878 11.9241 11.0373 11.642 10.624C10.7028 9.2477 9.89266 8.12427 9.25609 7.3154C9.0787 7.08997 8.93358 6.89247 8.93358 6.87647C8.93358 6.82601 9.78064 6.01206 10.0225 5.83007C10.664 5.34739 11.3015 5.04919 11.9362 4.93473C12.2121 4.885 12.7641 4.88531 13.0544 4.93539ZM19.5311 4.93052C19.7952 5.04193 19.984 5.46669 20.0677 6.13747C20.1054 6.44 20.1055 7.33838 20.0678 7.75419C20.0218 8.26119 19.9361 8.86545 19.8339 9.40276C19.7428 9.88237 19.4671 11.0224 19.3644 11.3447L19.3143 11.5017L19.1436 11.077C18.4957 9.46518 17.6987 8.03625 16.8226 6.91549C16.79 6.87374 17.1895 6.41629 17.6859 5.92694C18.2163 5.40407 18.6748 5.07227 19.0603 4.9321C19.1881 4.88566 19.423 4.8849 19.5311 4.93052ZM9.12006 8.04216C9.88134 9.04491 10.6964 10.1995 11.9753 12.0868L12.1663 12.3686L11.4767 13.3809C10.687 14.5402 10.198 15.2383 9.66665 15.9652C9.19023 16.617 8.60087 17.3809 8.56589 17.392C8.51749 17.4073 8.01183 16.6762 7.63489 16.0458C7.05552 15.0768 6.37587 13.5986 6.02413 12.5423L5.96577 12.3671L6.05862 12.0994C6.60245 10.5321 7.45455 8.8452 8.28853 7.68496C8.48874 7.40642 8.55338 7.33344 8.58356 7.35182C8.59628 7.3596 8.83772 7.67024 9.12006 8.04216ZM16.6682 7.62487C17.5324 8.82581 18.3388 10.4057 18.9247 12.0456L19.0394 12.3666L18.978 12.5421C18.4821 13.9605 17.7313 15.5211 17.0343 16.5826C16.8206 16.908 16.465 17.4006 16.4434 17.4009C16.4195 17.4013 15.9038 16.7393 15.4609 16.1397C14.9697 15.4747 14.3494 14.5912 13.5199 13.3752L12.8333 12.3686L13.0243 12.0868C13.5213 11.3536 14.5606 9.84871 14.8781 9.40276C15.5217 8.49864 16.4027 7.33565 16.4434 7.33634C16.453 7.33651 16.5542 7.46635 16.6682 7.62487ZM14.1279 15.2271C14.7998 16.1818 15.439 17.045 15.8796 17.5928C15.9822 17.7204 16.0661 17.8386 16.0661 17.8556C16.0661 17.909 15.3569 18.6057 15.0724 18.8318C13.344 20.2055 11.5666 20.1866 9.85915 18.7764C9.58978 18.5539 8.93358 17.9016 8.93358 17.8562C8.93358 17.8419 9.0604 17.6703 9.21536 17.4748C9.81481 16.7188 10.6595 15.5512 11.5599 14.234C11.8273 13.8428 12.1492 13.3742 12.2752 13.1927L12.5042 12.8626L13.1319 13.7832C13.4771 14.2895 13.9253 14.9393 14.1279 15.2271ZM5.86721 13.6857C6.49232 15.2216 7.20954 16.5324 8.00693 17.5962L8.20339 17.8583L7.92873 18.1648C7.10624 19.0826 6.47482 19.6121 6.00005 19.782C5.80324 19.8524 5.5651 19.8628 5.45444 19.8058C5.25692 19.7041 5.081 19.3779 4.98177 18.9295C4.92478 18.6718 4.91976 18.5824 4.91941 17.8172C4.91913 17.1794 4.93038 16.8952 4.96761 16.5996C5.04045 16.0208 5.16442 15.3067 5.28668 14.7615C5.39485 14.2792 5.67022 13.2354 5.68536 13.2503C5.68967 13.2545 5.77152 13.4505 5.86721 13.6857ZM19.577 14.1938C19.9304 15.5941 20.0965 16.7565 20.097 17.8327C20.0975 18.8081 19.9705 19.3868 19.6891 19.6918C19.5854 19.8041 19.4896 19.8437 19.3212 19.8437C19.0413 19.8437 18.6743 19.6622 18.2167 19.2977C17.7687 18.9407 16.7725 17.886 16.8226 17.8218C17.6989 16.7008 18.484 15.2938 19.1437 13.6623L19.3151 13.2382L19.3648 13.3939C19.3921 13.4795 19.4876 13.8395 19.577 14.1938Z" fill="white"/>
    </svg>
  );
}

function SearchIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.9561 15.024L17.04 17.04M16.368 11.664C16.368 14.2619 14.2619 16.368 11.664 16.368C9.06601 16.368 6.95996 14.2619 6.95996 11.664C6.95996 9.06601 9.06601 6.95996 11.664 6.95996C14.2619 6.95996 16.368 9.06601 16.368 11.664Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function SidebarFoldIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.5 8H7C6.44772 8 6 8.44772 6 9V14.5C6 15.0523 6.44772 15.5 7 15.5H8.5C9.05228 15.5 9.5 15.0523 9.5 14.5V9C9.5 8.44772 9.05228 8 8.5 8Z" fill="currentColor" fillOpacity="0.7"/>
    </svg>
  );
}

function MergeIcon({ size = 21.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect width="21.6" height="21.6" rx="3.6" fill="white"/>
      <path d="M12.425 13.05C12.425 13.7956 13.0284 14.4 13.7727 14.4C14.5171 14.4 15.1205 13.7956 15.1205 13.05C15.1205 12.3045 14.5171 11.7 13.7727 11.7C13.0284 11.7 12.425 12.3045 12.425 13.05ZM12.425 13.05H11.0777C9.29415 13.05 7.84834 11.6018 7.84834 9.81529V9.17262M7.84834 9.00073V9.17262M7.84834 9.17262V16.2M9.17592 7.65005C9.17592 8.39563 8.57252 9.00005 7.8282 9.00005C7.08387 9.00005 6.48047 8.39563 6.48047 7.65005C6.48047 6.90446 7.08387 6.30005 7.8282 6.30005C8.57252 6.30005 9.17592 6.90446 9.17592 7.65005Z" stroke="black" strokeWidth="1.08" strokeLinecap="round"/>
    </svg>
  );
}

function FocusIcon({ size = 21.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect width="21.6" height="21.6" rx="3.6" fill="white"/>
      <path d="M9.18043 5.93994H7.02043C6.42396 5.93994 5.94043 6.42347 5.94043 7.01994V9.17994M9.18043 15.6599H7.02043C6.42396 15.6599 5.94043 15.1764 5.94043 14.5799V12.4199M12.4204 5.93994H14.5804C15.1769 5.93994 15.6604 6.42347 15.6604 7.01994V9.17994M15.6604 12.4199V14.5799C15.6604 15.1764 15.1769 15.6599 14.5804 15.6599H12.4204M9.58543 12.6224H12.0154C12.3509 12.6224 12.6229 12.3505 12.6229 12.0149V9.58494C12.6229 9.24943 12.3509 8.97744 12.0154 8.97744H9.58543C9.24992 8.97744 8.97793 9.24943 8.97793 9.58494V12.0149C8.97793 12.3505 9.24992 12.6224 9.58543 12.6224Z" stroke="black" strokeWidth="1.08" strokeLinecap="round"/>
    </svg>
  );
}

function PlusIcon({ size = 21.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect width="21.6" height="21.6" rx="3.6" fill="white"/>
      <path d="M10.8001 6.91211L10.8001 14.6881M14.6881 10.8001L6.91211 10.8001" stroke="black" strokeWidth="1.08" strokeLinecap="round"/>
    </svg>
  );
}

function PlusIconSmall({ size = 24, stroke = "white" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path d="M10.8001 6.91211L10.8001 14.6881M14.6881 10.8001L6.91211 10.8001" stroke={stroke} strokeWidth="1.08" strokeLinecap="round"/>
    </svg>
  );
}

function HomeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10.1996 17.4001V13.2918C10.1996 12.9136 10.522 12.6071 10.9196 12.6071H13.0796C13.4773 12.6071 13.7996 12.9136 13.7996 13.2918V17.4001M11.5824 6.7268L6.90235 9.89172C6.71242 10.0202 6.59961 10.2281 6.59961 10.4497V16.373C6.59961 16.9403 7.08314 17.4001 7.67961 17.4001H16.3196C16.9161 17.4001 17.3996 16.9403 17.3996 16.373V10.4497C17.3996 10.2281 17.2868 10.0202 17.0969 9.89172L12.4169 6.7268C12.1671 6.55786 11.8322 6.55786 11.5824 6.7268Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronDown({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PackageIcon({ size = 24, color = "#f97316" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function InterfaceIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M11.9811 15.4162V17.8598M9.88654 7.38712V6.33984M14.0756 7.38712V6.33984M16.1702 9.83075H7.79199M8.83927 9.83075H15.1229V12.6235C15.1229 14.1659 13.8726 15.4162 12.3302 15.4162H11.632C10.0896 15.4162 8.83927 14.1659 8.83927 12.6235V9.83075Z" stroke="#6E6E6E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  BRANCH DATA
// ═══════════════════════════════════════════════════════

const branchData = {
  id: "base",
  name: "Base",
  children: [
    {
      id: "pdr",
      name: "PDR",
      children: [
        { id: "pdr-structures-update", name: "pdr-structures-update", children: [] },
        { id: "pdr-propulsion-main", name: "pdr-propulsion-main", children: [] },
      ],
    },
    { id: "pdr-root", name: "PDR", children: [] },
  ],
};

// ═══════════════════════════════════════════════════════
//  BRANCH TREE (SVG Overlay Approach)
//  Rules:
//    1. Base branch line goes straight down
//    2. Branches curve out from the parent line
//    3. Sub-branches with children use an S-curve connector
// ═══════════════════════════════════════════════════════

const B_COL = 18, B_ROW = 30, B_DOT = 3, B_LINE = "#C1C1C1", ITEM_ROW_H = 30;

let _branchSeq = 0;
function genBranchId() { return `branch-${Date.now()}-${++_branchSeq}`; }

function cloneBranchTree(node) {
  return { ...node, children: node.children ? node.children.map(cloneBranchTree) : [] };
}

function addChildInTree(tree, parentId, child) {
  const t = cloneBranchTree(tree);
  (function walk(n) {
    if (n.id === parentId) { n.children.push(child); return true; }
    return n.children?.some(walk);
  })(t);
  return t;
}

function removeFromTree(tree, nodeId) {
  const t = cloneBranchTree(tree);
  (function walk(n) {
    if (!n.children) return false;
    const idx = n.children.findIndex(c => c.id === nodeId);
    if (idx !== -1) { n.children.splice(idx, 1); return true; }
    return n.children.some(walk);
  })(t);
  return t;
}

function renameInTree(tree, nodeId, newName) {
  const t = cloneBranchTree(tree);
  (function walk(n) {
    if (n.id === nodeId) { n.name = newName; return true; }
    return n.children?.some(walk);
  })(t);
  return t;
}

function BranchNameInput({ initialName, onDone }) {
  const [value, setValue] = useState(initialName);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { onDone((value.trim() || initialName)); };
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") onDone(initialName);
      }}
      onClick={e => e.stopPropagation()}
      style={{
        flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 400,
        color: TOKENS.textPrimary, border: `1px solid ${TOKENS.accent}`,
        borderRadius: 4, padding: "1px 4px", outline: "none",
        background: TOKENS.white, minWidth: 0,
      }}
    />
  );
}

function flattenBranch(node, depth = 0, isLast = true, parentId = null, result = []) {
  const hasChildren = !!(node.children?.length);
  result.push({ id: node.id, name: node.name, depth, isLast, hasChildren, parentId, rowIndex: result.length });
  if (hasChildren) {
    node.children.forEach((child, i) => {
      flattenBranch(child, depth + 1, i === node.children.length - 1, node.id, result);
    });
  }
  return result;
}

function BranchTree({ data, hovId, setHovId, selId, setSelId, onMerge, onAddChild, editingId, onEditDone }) {
  const rows = useMemo(() => flattenBranch(data), [data]);

  const childMap = useMemo(() => {
    const m = {};
    for (const r of rows) {
      if (r.parentId != null) (m[r.parentId] ||= []).push(r);
    }
    return m;
  }, [rows]);

  const svgEls = useMemo(() => {
    const els = [];

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
        <line key={`vl-${row.id}`}
          x1={cx} y1={lineTop} x2={cx} y2={lineBot}
          stroke={B_LINE} strokeWidth={1}
        />
      );

      for (const kid of kids) {
        const kcx = kid.depth * B_COL + 9;
        const kcy = kid.rowIndex * B_ROW + B_ROW / 2;

        if (kid.hasChildren) {
          const exitY = kcy - 20;
          const entryY = kcy - B_DOT;
          els.push(
            <path key={`sc-${kid.id}`}
              d={`M${cx} ${exitY} C${cx} ${entryY},${kcx} ${exitY},${kcx} ${entryY}`}
              stroke={B_LINE} fill="none" strokeWidth={1}
            />
          );
          els.push(<circle key={`sd-${kid.id}`} cx={kcx} cy={kcy} r={B_DOT} fill={B_LINE} />);
        } else {
          const depY = kcy - 9;
          const arrX = cx + 9;
          els.push(
            <path key={`jc-${kid.id}`}
              d={`M${cx} ${depY} C${cx} ${kcy - 2},${cx + 1.5} ${kcy},${arrX} ${kcy}`}
              stroke={B_LINE} fill="none" strokeWidth={1}
            />
          );
          els.push(
            <line key={`hc-${kid.id}`}
              x1={arrX} y1={kcy} x2={kcx - B_DOT} y2={kcy}
              stroke={B_LINE} strokeWidth={1}
            />
          );
          els.push(<circle key={`ld-${kid.id}`} cx={kcx} cy={kcy} r={B_DOT} fill={B_LINE} />);
        }
      }
    }
    return els;
  }, [rows, childMap]);

  const maxCol = Math.max(...rows.map(r => r.depth + 1));
  const svgW = maxCol * B_COL;
  const svgH = rows.length * B_ROW;

  return (
    <div style={{ position: "relative" }}>
      <svg style={{
        position: "absolute", top: 0, left: 4,
        width: svgW, height: svgH, pointerEvents: "none", zIndex: 1,
      }}>
        {svgEls}
      </svg>
      {rows.map(row => {
        const isHov = hovId === row.id;
        const isSel = selId === row.id;
        const isEditing = editingId === row.id;
        const bg = isSel ? TOKENS.bgHover : isHov ? TOKENS.bgHover : "transparent";
        const textX = (row.depth + 1) * B_COL;
        const showActions = !isEditing && (isHov || isSel);

        return (
          <div key={row.id}
            style={{
              display: "flex", alignItems: "center", height: B_ROW,
              paddingLeft: 4 + textX, paddingRight: 4,
              borderRadius: 8, background: bg, cursor: "pointer", userSelect: "none",
            }}
            onMouseEnter={() => setHovId(row.id)}
            onMouseLeave={() => setHovId(null)}
            onClick={() => setSelId(row.id)}
          >
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4, paddingLeft: 4, minWidth: 0 }}>
              {isEditing ? (
                <BranchNameInput
                  initialName={row.name}
                  onDone={name => onEditDone(row.id, name)}
                />
              ) : (
                <span style={{
                  flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 400,
                  color: TOKENS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {row.name}
                </span>
              )}
              {showActions && row.depth > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <div onClick={e => { e.stopPropagation(); onMerge(row.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Merge into parent">
                    <MergeIcon size={21.6} />
                  </div>
                  <div onClick={e => { e.stopPropagation(); onAddChild(row.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Add child branch">
                    <PlusIcon size={21.6} />
                  </div>
                </div>
              )}
              {showActions && row.depth === 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <div onClick={e => { e.stopPropagation(); onAddChild(row.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Add child branch">
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
//  ITEMS TREE RENDERER
// ═══════════════════════════════════════════════════════

function IndentLines({ lines }) {
  if (!lines.length) return null;
  return (
    <div style={{ display: "flex", alignSelf: "stretch", flexShrink: 0 }}>
      {lines.map((show, i) => (
        <div key={i} style={{ width: 12, flexShrink: 0, display: "flex", justifyContent: "center" }}>
          {show && <div style={{ width: 1, minHeight: "100%", background: "#d9d9d9" }} />}
        </div>
      ))}
    </div>
  );
}

function ItemTreeNode({ node, ifaces, depth, hovId, setHovId, selId, onSel, onSelBlock, focusSys, sbExp, togSb, onQuickAdd, lines = [] }) {
  const hasChildren = !!(node.children?.length);
  const nodeIfaces = ifaces.filter(i => i.source === node.id || i.target === node.id);
  const isOpen = sbExp.has(node.id);
  const isHovered = hovId === node.id;
  const isSelected = selId === node.id;
  const canExpand = hasChildren || nodeIfaces.length > 0;

  const allItems = [];
  if (isOpen) {
    nodeIfaces.forEach(iface => allItems.push({ type: "iface", data: iface }));
    if (hasChildren) node.children.forEach(child => allItems.push({ type: "sys", data: child }));
  }

  return (
    <div>
      {/* System row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: ITEM_ROW_H,
          paddingLeft: 4,
          paddingRight: 4,
          borderRadius: 8,
          background: isSelected ? "rgba(39, 9, 220, 0.05)" : isHovered ? TOKENS.bgHover : "transparent",
          outline: isSelected ? "1px solid #2709DC" : "none",
          outlineOffset: -1,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => { if (onSelBlock) onSelBlock(node.id); }}
        onMouseEnter={() => setHovId(node.id)}
        onMouseLeave={() => setHovId(null)}
      >
        <IndentLines lines={lines} />
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4, minWidth: 0 }}>
          {/* Chevron */}
          {canExpand ? (
            <div
              onClick={e => { e.stopPropagation(); togSb(node.id); }}
              style={{
                display: "flex", alignItems: "center",
                transition: "transform 0.15s",
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                color: TOKENS.textPrimary,
                cursor: "pointer",
              }}
            >
              <ChevronDown size={12} />
            </div>
          ) : (
            <div style={{ width: 12, flexShrink: 0, opacity: 0 }}>
              <ChevronDown size={12} />
            </div>
          )}

          {/* Icon */}
          <div style={{ flexShrink: 0 }}>
            <PackageIcon size={24} />
          </div>

          {/* Name */}
          <span style={{
            flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 400,
            color: TOKENS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {node.name}
          </span>
        </div>

        {/* Hover buttons: Focus + Plus */}
        {isHovered && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <div onClick={e => { e.stopPropagation(); focusSys(node.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Focus">
              <FocusIcon size={21.6} />
            </div>
            <div onClick={e => { e.stopPropagation(); onQuickAdd(node.id); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Add">
              <PlusIcon size={21.6} />
            </div>
          </div>
        )}
      </div>

      {/* Children: interfaces first, then child systems */}
      {allItems.map((item, idx) => {
        const childLines = [...lines, true];

        if (item.type === "iface") {
          const iface = item.data;
          return (
            <div
              key={iface.id + node.id}
              style={{
                display: "flex", alignItems: "center", height: ITEM_ROW_H,
                paddingLeft: 4, paddingRight: 4, borderRadius: 8,
                cursor: "pointer", userSelect: "none",
              }}
              onClick={() => onSel(iface.id)}
            >
              <IndentLines lines={childLines} />
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4, minWidth: 0 }}>
                <div style={{ width: 12, flexShrink: 0, opacity: 0 }}>
                  <ChevronDown size={12} />
                </div>
                <div style={{ flexShrink: 0 }}><InterfaceIcon size={24} /></div>
                <span style={{
                  flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 400,
                  color: TOKENS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {iface.name}
                </span>
              </div>
            </div>
          );
        }

        const child = item.data;
        return (
          <ItemTreeNode
            key={child.id} node={child} ifaces={ifaces} depth={depth + 1}
            hovId={hovId} setHovId={setHovId} selId={selId} onSel={onSel} onSelBlock={onSelBlock}
            focusSys={focusSys} sbExp={sbExp} togSb={togSb} onQuickAdd={onQuickAdd}
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

export default function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarWidth,
  hierarchy,
  ifaces,
  selId,
  selBlockId,
  hovId,
  onSel,
  onSelBlock,
  onHov,
  sbExp,
  togSb,
  focusSys,
  hovSys,
  setHovSys,
  onQuickAdd,
  allRequirements,
  sbIfaceExp,
  togSbIface,
  setModal,
  resizingRef,
}) {
  const [branchHovId, setBranchHovId] = useState(null);
  const [branchSelId, setBranchSelId] = useState(null);
  const [branchTree, setBranchTree] = useState(branchData);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [itemHovId, setItemHovId] = useState(null);
  const [itemSelId, setItemSelId] = useState(null);
  const effectiveItemSelId = selBlockId || itemSelId || selId;

  const [branchHeight, setBranchHeight] = useState(null);
  const dividerDrag = useRef(null);

  const onDividerDown = useCallback((e) => {
    e.preventDefault();
    const branchEl = e.currentTarget.previousElementSibling;
    if (!branchEl) return;
    const startY = e.clientY;
    const startH = branchEl.getBoundingClientRect().height;

    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.max(40, Math.min(startH + delta, window.innerHeight - 200));
      setBranchHeight(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dividerDrag.current = false;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    dividerDrag.current = true;
  }, []);

  const handleNewBranch = useCallback(() => {
    const id = genBranchId();
    setBranchTree(t => addChildInTree(t, t.id, { id, name: "new-branch", children: [] }));
    setEditingBranchId(id);
    setBranchSelId(id);
  }, []);

  const handleAddChild = useCallback((parentId) => {
    const id = genBranchId();
    setBranchTree(t => addChildInTree(t, parentId, { id, name: "new-branch", children: [] }));
    setEditingBranchId(id);
    setBranchSelId(id);
  }, []);

  const handleMerge = useCallback((nodeId) => {
    setBranchTree(t => removeFromTree(t, nodeId));
    setBranchSelId(prev => prev === nodeId ? null : prev);
    setBranchHovId(null);
  }, []);

  const handleEditDone = useCallback((nodeId, newName) => {
    setBranchTree(t => renameInTree(t, nodeId, newName));
    setEditingBranchId(null);
  }, []);

  return (
    <div style={{
      width: sidebarCollapsed ? 0 : sidebarWidth,
      background: TOKENS.bgSidebar,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      transition: resizingRef?.current ? "none" : "width 0.2s ease",
      position: "relative",
      gap: 8,
      height: "100%",
    }}>

      {/* ═══ 1. TOP BAR: Project selector + Search + Fold ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 12, paddingBottom: 12, paddingLeft: 10, paddingRight: 10,
        minWidth: sidebarWidth,
      }}>
        {/* Project name + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ProjectLogo size={25} />
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: TOKENS.black, whiteSpace: "nowrap" }}>
              Flow engineering
            </span>
          </div>
          <div style={{ color: TOKENS.textPrimary, display: "flex", alignItems: "center" }}>
            <ChevronDown size={12} />
          </div>
        </div>

        {/* Right: Search + Fold */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "flex-end", minWidth: 0, minHeight: 1 }}>
          <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TOKENS.textPrimary, flexShrink: 0 }} title="Search">
            <SearchIcon size={24} />
          </div>
          <div onClick={() => setSidebarCollapsed(true)} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TOKENS.textPrimary, flexShrink: 0 }} title="Fold sidebar">
            <SidebarFoldIcon size={24} />
          </div>
        </div>
      </div>

      {/* ═══ 2. BRANCH SECTION ═══ */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10, paddingRight: 10, minWidth: sidebarWidth,
        ...(branchHeight != null ? { height: branchHeight, flexShrink: 0, overflowY: "auto", overflowX: "clip" } : {}),
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: TOKENS.black }}>
            Branch
          </span>
          <button onClick={handleNewBranch} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingLeft: 2, paddingRight: 7, paddingTop: 2, paddingBottom: 2,
            borderRadius: 6, border: "none", boxShadow: `inset 0 0 0 1px ${TOKENS.border}`, background: TOKENS.white,
            cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 400, color: TOKENS.black,
          }}>
            <PlusIconSmall size={24} stroke="black" />
            New Branch
          </button>
        </div>

        {/* Branch tree */}
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
        />
      </div>

      {/* ═══ Draggable Divider ═══ */}
      <div
        onMouseDown={onDividerDown}
        style={{
          width: "100%", flexShrink: 0,
          height: 9, marginTop: -4, marginBottom: -4,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "row-resize", zIndex: 1,
        }}
      >
        <div style={{ width: "100%", height: 1, background: TOKENS.divider }} />
      </div>

      {/* ═══ 3. ITEMS SECTION ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 10, paddingRight: 10, flex: 1, overflow: "hidden", minWidth: sidebarWidth }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: TOKENS.black }}>
            Items
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* System selector */}
            <button style={{
              display: "flex", alignItems: "center", gap: 2,
              paddingLeft: 4, paddingTop: 2, paddingBottom: 2,
              borderRadius: 6, border: "none", boxShadow: `inset 0 0 0 1px ${TOKENS.border}`, background: TOKENS.white,
              cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 400, color: TOKENS.black,
            }}>
              <PackageIcon size={24} />
              System
              <div style={{ transform: "rotate(-90deg)", display: "flex", alignItems: "center", color: TOKENS.textPrimary }}>
                <ChevronDown size={12} />
              </div>
            </button>

            {/* Blue New button */}
            <button onClick={() => setModal({ mode: "full" })} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingLeft: 2, paddingRight: 7, paddingTop: 2, paddingBottom: 2,
              borderRadius: 6, border: "none", background: TOKENS.accent,
              cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 400, color: TOKENS.white,
            }}>
              <PlusIconSmall size={24} stroke="white" />
              New
            </button>
          </div>
        </div>

        {/* Items tree */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", overflowX: "clip" }}>
          {/* Project root */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, height: ITEM_ROW_H, borderRadius: 8, userSelect: "none" }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 4, minWidth: 0 }}>
              <div style={{ color: TOKENS.textPrimary, flexShrink: 0 }}><HomeIcon size={24} /></div>
              <span style={{
                flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 400,
                color: TOKENS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                Project name
              </span>
            </div>
          </div>

          {/* System items */}
          {hierarchy.map(node => (
            <ItemTreeNode
              key={node.id} node={node} ifaces={ifaces} depth={0}
              hovId={itemHovId} setHovId={setItemHovId}
              selId={effectiveItemSelId}
              onSel={id => { setItemSelId(id); if (onSel) onSel(id); }}
              onSelBlock={id => { setItemSelId(null); if (onSelBlock) onSelBlock(id); }}
              focusSys={focusSys} sbExp={sbExp} togSb={togSb} onQuickAdd={onQuickAdd}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
