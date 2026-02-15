import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const COLORS = { orange: "#f97316", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308", gray: "#94a3b8" };
const BW = 200, BH = 56, PAD = 20, HEADER_H = 42, PILL_H = 24, PILL_MIN_W = 80;
const INTER_BLOCK = 200, ROW_GAP = 80;

const hierarchy = [
  { id: "du42", name: "du42", reqs: 1, color: COLORS.yellow },
  { id: "ground-station", name: "Ground Station", reqs: 0, color: COLORS.yellow },
  {
    id: "launch-vehicle", name: "Launch Vehicle", reqs: 42, color: COLORS.orange,
    children: [
      {
        id: "stage-1", name: "Stage 1", reqs: 12, color: COLORS.blue,
        children: [
          { id: "s1-avionics", name: "Avionics", reqs: 3, color: COLORS.orange },
          { id: "s1-payload", name: "Payload", reqs: 1, color: COLORS.green },
          { id: "s1-propulsion", name: "Propulsion system", reqs: 4, color: COLORS.blue },
          { id: "s1-structures", name: "Structures", reqs: 1, color: COLORS.orange },
        ]
      },
      {
        id: "stage-2", name: "Stage 2", reqs: 20, color: COLORS.orange,
        children: [
          { id: "s2-avionics", name: "Avionics", reqs: 7, color: COLORS.green },
          { id: "s2-payload-fairing", name: "Payload fairing", reqs: 3, color: COLORS.orange },
          { id: "s2-propulsion", name: "Propulsion system", reqs: 6, color: COLORS.blue },
          { id: "s2-separation", name: "Separation system", reqs: 0, color: COLORS.blue },
          { id: "s2-structures", name: "Structures", reqs: 1, color: COLORS.orange },
          { id: "s2-attitude", name: "Attitude control", reqs: 0, color: COLORS.yellow },
          { id: "s2-navigation", name: "Navigation system", reqs: 0, color: COLORS.orange },
          { id: "s2-data-handling", name: "Data handling", reqs: 0, color: COLORS.blue },
        ]
      },
    ]
  },
  { id: "example", name: "Example", reqs: 0, color: COLORS.gray },
];

function buildParentMap(nodes, pid) { const m = {}; for (const n of nodes) { if (pid) m[n.id] = pid; if (n.children) Object.assign(m, buildParentMap(n.children, n.id)); } return m; }
function getDescendantIds(nodes, tid) { const ids = []; (function f(l) { for (const n of l) { if (n.id === tid && n.children) (function c(ch) { for (const x of ch) { ids.push(x.id); if (x.children) c(x.children); } })(n.children); if (n.children) f(n.children); } })(nodes); return ids; }
function getAncestorIds(id, pm) { const a = []; let c = pm[id]; while (c) { a.push(c); c = pm[c]; } return a; }
function findNode(nodes, id) { for (const n of nodes) { if (n.id === id) return n; if (n.children) { const f = findNode(n.children, id); if (f) return f; } } return null; }

function layoutNode(node, ox, oy, expSet, out) {
  const hasKids = !!(node.children?.length);
  const isExp = hasKids && expSet.has(node.id);
  if (!hasKids || !isExp) {
    const w = BW + (hasKids ? 22 : 0);
    out[node.id] = { ...node, x: ox, y: oy, w, h: BH, expanded: false, hasChildren: hasKids };
    return { w, h: BH };
  }
  const kids = node.children, maxPerRow = 4, rows = [];
  for (let i = 0; i < kids.length; i += maxPerRow) rows.push(kids.slice(i, i + maxPerRow));
  const cs = {}, tmp = {};
  for (const k of kids) cs[k.id] = layoutNode(k, 0, 0, expSet, tmp);
  let totalH = HEADER_H + PAD, maxRowW = 0;
  const rm = [];
  for (const row of rows) {
    let rw = 0, rh = 0;
    for (let i = 0; i < row.length; i++) { rw += cs[row[i].id].w; if (i < row.length - 1) rw += INTER_BLOCK; rh = Math.max(rh, cs[row[i].id].h); }
    rm.push({ rw, rh }); maxRowW = Math.max(maxRowW, rw); totalH += rh + ROW_GAP;
  }
  totalH = totalH - ROW_GAP + PAD + 50;
  const tW = maxRowW + PAD * 2;
  let cy = oy + HEADER_H + PAD;
  for (let ri = 0; ri < rows.length; ri++) {
    let cx = ox + PAD;
    for (const kid of rows[ri]) { layoutNode(kid, cx, cy, expSet, out); cx += cs[kid.id].w + INTER_BLOCK; }
    cy += rm[ri].rh + ROW_GAP;
  }
  out[node.id] = { ...node, x: ox, y: oy, w: tW, h: totalH, expanded: true, hasChildren: true };
  return { w: tW, h: totalH };
}

function computeLayout(expSet) {
  const out = {}; let cx = 40;
  for (const n of hierarchy) { const r = layoutNode(n, cx, 40, expSet, out); cx += r.w + INTER_BLOCK; }
  return out;
}

function getDots(b) {
  const { x, y, w, h } = b;
  return [
    { id: "tc", cx: x + w / 2, cy: y }, { id: "tl", cx: x + w * 0.25, cy: y }, { id: "tr", cx: x + w * 0.75, cy: y },
    { id: "ml", cx: x, cy: y + h / 2 }, { id: "mr", cx: x + w, cy: y + h / 2 },
    { id: "bc", cx: x + w / 2, cy: y + h }, { id: "bl", cx: x + w * 0.25, cy: y + h }, { id: "br", cx: x + w * 0.75, cy: y + h },
    { id: "l3", cx: x, cy: y + h * 0.3 }, { id: "r3", cx: x + w, cy: y + h * 0.3 },
  ];
}

function assignDots(ifaces, vis) {
  const used = {}, out = {};
  for (const iface of ifaces) {
    const src = vis[iface.source], tgt = vis[iface.target]; if (!src || !tgt) continue;
    const sd = getDots(src), td = getDots(tgt);
    const us = used[iface.source] || new Set(), ut = used[iface.target] || new Set();
    const tcx = tgt.x + tgt.w / 2, tcy = tgt.y + tgt.h / 2, scx = src.x + src.w / 2, scy = src.y + src.h / 2;
    let bs = null, bsd = Infinity;
    for (const d of sd) { if (us.has(d.id)) continue; const di = Math.hypot(d.cx - tcx, d.cy - tcy); if (di < bsd) { bsd = di; bs = d; } }
    if (!bs) { bsd = Infinity; for (const d of sd) { const di = Math.hypot(d.cx - tcx, d.cy - tcy); if (di < bsd) { bsd = di; bs = d; } } }
    let bt = null, btd = Infinity;
    for (const d of td) { if (ut.has(d.id)) continue; const di = Math.hypot(d.cx - scx, d.cy - scy); if (di < btd) { btd = di; bt = d; } }
    if (!bt) { btd = Infinity; for (const d of td) { const di = Math.hypot(d.cx - scx, d.cy - scy); if (di < btd) { btd = di; bt = d; } } }
    us.add(bs.id); ut.add(bt.id); used[iface.source] = us; used[iface.target] = ut;
    out[iface.id] = { s: bs, t: bt };
  }
  return out;
}

function computePills(ifaces, vis, dots, offsets) {
  const pills = {}, placed = [];
  const blockRects = Object.values(vis).filter(s => !(s.expanded && s.hasChildren)).map(b => ({ x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 }));
  for (const iface of ifaces) {
    const da = dots[iface.id]; if (!da) continue;
    const pw = Math.max(iface.name.length * 6.4 + 24, PILL_MIN_W);
    const bx = (da.s.cx + da.t.cx) / 2 - pw / 2, by = (da.s.cy + da.t.cy) / 2 - PILL_H / 2;
    const off = offsets[iface.id] || { dx: 0, dy: 0 };
    let px = bx + off.dx, py = by + off.dy;
    const col = (x, y) => {
      for (const br of blockRects) if (x + pw > br.x && x < br.x + br.w && y + PILL_H > br.y && y < br.y + br.h) return true;
      for (const p of placed) if (x + pw + 4 > p.x && x < p.x + p.w + 4 && y + PILL_H + 4 > p.y && y < p.y + p.h + 4) return true;
      return false;
    };
    if (col(px, py)) {
      const dx = da.t.cx - da.s.cx, dy = da.t.cy - da.s.cy, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      let found = false;
      for (let s = 1; s <= 14 && !found; s++) for (const sg of [1, -1]) {
        const tx = bx + nx * s * 30 * sg + off.dx, ty = by + ny * s * 30 * sg + off.dy;
        if (!col(tx, ty)) { px = tx; py = ty; found = true; break; }
      }
    }
    pills[iface.id] = { x: px, y: py, w: pw, h: PILL_H }; placed.push({ x: px, y: py, w: pw, h: PILL_H });
  }
  return pills;
}

function elbowPath(sx, sy, tx, ty) { const mx = (sx + tx) / 2; return `M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`; }

const CubeIcon = ({ x, y, size, color }) => {
  const s = size, cx = x + s / 2, cy = y + s / 2, h = s * 0.45, w = s * 0.42;
  return <g>
    <polygon points={`${cx},${cy - h} ${cx + w},${cy - h * .35} ${cx},${cy + h * .15} ${cx - w},${cy - h * .35}`} fill={color + "30"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <polygon points={`${cx},${cy + h * .15} ${cx + w},${cy - h * .35} ${cx + w},${cy + h * .35} ${cx},${cy + h}`} fill={color + "18"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <polygon points={`${cx},${cy + h * .15} ${cx - w},${cy - h * .35} ${cx - w},${cy + h * .35} ${cx},${cy + h}`} fill={color + "22"} stroke={color} strokeWidth={1} strokeLinejoin="round" />
  </g>;
};

const initRequirements = [
  { id: "REQ-62", label: "First stage thermal" },
  { id: "REQ-67", label: "Baseline structural" },
  { id: "REQ-78", label: "Avionics comms" },
  { id: "REQ-101", label: "Navigation accuracy" },
  { id: "REQ-110", label: "Propulsion safety" },
];

const initIfaces = [
  { id: "INT-1", source: "stage-1", target: "ground-station", name: "Stage 1 → Ground Stn", desc: "", interfaceType: "", requirements: [], dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10" },
  { id: "INT-2", source: "ground-station", target: "stage-2", name: "Ground Stn → Stage 2", desc: "", interfaceType: "", requirements: [], dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14" },
  { id: "INT-3", source: "s1-avionics", target: "s1-propulsion", name: "Avionics → Propulsion", desc: "", interfaceType: "Mechanical", requirements: [], dateCreated: "2025-05-12", dateLastUpdated: "2025-08-10" },
  { id: "INT-5", source: "example", target: "stage-2", name: "Example → Stage 2", desc: "", interfaceType: "", requirements: [], dateCreated: "2024-12-02", dateLastUpdated: "2025-08-10" },
  { id: "INT-24", source: "stage-1", target: "stage-2", name: "Stage 1 → Stage 2", desc: "", interfaceType: "", requirements: ["REQ-78"], dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10" },
  { id: "INT-25", source: "stage-2", target: "stage-1", name: "Stage 2 → Stage 1", desc: "", interfaceType: "", requirements: [], dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14" },
  { id: "INT-30", source: "s1-avionics", target: "s2-avionics", name: "S1 Avio → S2 Avio", desc: "", interfaceType: "Signal", requirements: [], dateCreated: "2025-05-28", dateLastUpdated: "2025-05-28" },
  { id: "INT-31", source: "du42", target: "ground-station", name: "du42 → Ground Stn", desc: "", interfaceType: "", requirements: ["REQ-67"], dateCreated: "2025-02-19", dateLastUpdated: "2025-05-18" },
];

function MiniMap({ blocks, pan, zoom, vw, vh }) {
  const arr = Object.values(blocks); if (!arr.length) return null;
  let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for (const b of arr) { mnX = Math.min(mnX, b.x); mnY = Math.min(mnY, b.y); mxX = Math.max(mxX, b.x + b.w); mxY = Math.max(mxY, b.y + b.h); }
  mnX -= 60; mnY -= 60; mxX += 60; mxY += 60;
  const ww = mxX - mnX, hh = mxY - mnY, mw = 150, mh = Math.min(mw * hh / ww, 100), sc = mw / ww;
  return <div style={{ position: "absolute", bottom: 56, right: 16, zIndex: 10, background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 3 }}>
    <svg width={mw} height={mh}>
      {arr.map(b => <rect key={b.id} x={(b.x - mnX) * sc} y={(b.y - mnY) * sc} width={Math.max(b.w * sc, 2)} height={Math.max(b.h * sc, 2)} rx={1} fill={b.expanded && b.hasChildren ? "none" : (b.color || "#94a3b8") + "40"} stroke={b.color || "#94a3b8"} strokeWidth={0.5} />)}
      <rect x={(-pan.x / zoom - mnX) * sc} y={(-pan.y / zoom - mnY) * sc} width={(vw / zoom) * sc} height={(vh / zoom) * sc} rx={1} fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth={1} />
    </svg>
  </div>;
}

function SidebarTree({ nodes, ifaces, selId, hovId, onSel, onHov, sbExp, togSb, focusSys, hovSys, setHovSys, onQuickAdd, d = 0 }) {
  return nodes.map(node => {
    const ni = ifaces.filter(i => i.source === node.id || i.target === node.id);
    const hk = !!(node.children?.length); const isO = sbExp.has(node.id); const hc = ni.length > 0 || hk;
    const isHov = hovSys === node.id;
    return <div key={node.id}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: `5px 8px 5px ${8 + d * 14}px`, borderRadius: 5, fontSize: 11.5, color: "#334155", fontWeight: 600, userSelect: "none", background: isHov ? "#f8fafc" : "transparent", cursor: hc ? "pointer" : "default" }}
        onClick={() => { if (hc) togSb(node.id); }} onMouseEnter={() => setHovSys(node.id)} onMouseLeave={() => setHovSys(null)}>
        {hc ? <span style={{ fontSize: 8, color: "#94a3b8", width: 10, textAlign: "center", display: "inline-block", transition: "transform 0.15s", transform: isO ? "rotate(90deg)" : "none" }}>▶</span> : <span style={{ width: 10 }} />}
        <svg width="13" height="13" viewBox="0 0 16 16"><polygon points="8,2 13,5.5 8,8 3,5.5" fill={node.color + "40"} stroke={node.color} strokeWidth="1" /><polygon points="8,8 13,5.5 13,10.5 8,14" fill={node.color + "25"} stroke={node.color} strokeWidth="1" /><polygon points="8,8 3,5.5 3,10.5 8,14" fill={node.color + "30"} stroke={node.color} strokeWidth="1" /></svg>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {ni.length > 0 && <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "0 4px", borderRadius: 3 }}>{ni.length}</span>}
        {isHov && <>
          <span onClick={e => { e.stopPropagation(); onQuickAdd(node.id); }} title="Add interface from this system" style={{ fontSize: 14, color: "#2563eb", cursor: "pointer", lineHeight: 1, fontWeight: 700, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, background: "#eff6ff" }}>+</span>
          <span onClick={e => { e.stopPropagation(); focusSys(node.id); }} title="Focus" style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>⊚</span>
        </>}
      </div>
      {isO && <div>
        {ni.map(iface => <div key={iface.id + node.id} onClick={e => { e.stopPropagation(); onSel(iface.id); }} onMouseEnter={() => onHov(iface.id)} onMouseLeave={() => onHov(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: `4px 8px 4px ${22 + d * 14}px`, cursor: "pointer", borderRadius: 5, fontSize: 10.5, marginBottom: 1, background: selId === iface.id ? "#eff6ff" : hovId === iface.id ? "#f8fafc" : "transparent", border: selId === iface.id ? "1px solid #bfdbfe" : "1px solid transparent" }}>
          <span style={{ color: selId === iface.id ? "#2563eb" : "#b0b8c4", fontSize: 12 }}>∞</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selId === iface.id ? 600 : 400, color: selId === iface.id ? "#2563eb" : "#64748b" }}>{iface.name}</span>
          <span style={{ fontSize: 9, color: "#b0b8c4", background: "#f1f5f9", padding: "0 3px", borderRadius: 2 }}>{iface.id}</span>
        </div>)}
        {hk && node.children && <SidebarTree nodes={node.children} ifaces={ifaces} selId={selId} hovId={hovId} onSel={onSel} onHov={onHov} sbExp={sbExp} togSb={togSb} focusSys={focusSys} hovSys={hovSys} setHovSys={setHovSys} onQuickAdd={onQuickAdd} d={d + 1} />}
      </div>}
    </div>;
  });
}

function InterfaceModal({ mode, sourceId, targetId, allSystems, allRequirements, onClose, onCreate, onAddReq }) {
  const [src, setSrc] = useState(sourceId || "");
  const [tgt, setTgt] = useState(targetId || "");
  const [nm, setNm] = useState("");
  const [desc, setDesc] = useState("");
  const [selReqs, setSelReqs] = useState([]);
  const [reqDropOpen, setReqDropOpen] = useState(false);
  const [newReqText, setNewReqText] = useState("");
  const reqDropRef = useRef(null);
  const opts = Object.values(allSystems).filter(s => !s.expanded || !s.hasChildren);
  useEffect(() => { if (src && tgt) setNm(`${allSystems[src]?.name || src} → ${allSystems[tgt]?.name || tgt}`); }, [src, tgt, allSystems]);
  useEffect(() => {
    if (!reqDropOpen) return;
    const handler = (e) => { if (reqDropRef.current && !reqDropRef.current.contains(e.target)) setReqDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reqDropOpen]);
  const is = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, background: "#f8fafc", outline: "none", boxSizing: "border-box" };
  const canCreate = src && tgt && nm.trim();
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", fontFamily: "'DM Sans',sans-serif", maxHeight: "85vh", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>New Interface</h3>
      {mode === "quick" && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>From: <strong>{allSystems[src]?.name || src}</strong></p>}
      {mode === "drag" && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}><strong>{allSystems[src]?.name}</strong> → <strong>{allSystems[tgt]?.name}</strong></p>}
      {mode === "full" && <>
        <label style={{ display: "block", marginBottom: 5, marginTop: 12, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Source</label>
        <select value={src} onChange={e => setSrc(e.target.value)} style={{ ...is, marginBottom: 14 }}><option value="">Select source...</option>{opts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </>}
      {(mode === "full" || mode === "quick") && <>
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Target</label>
        <select value={tgt} onChange={e => setTgt(e.target.value)} style={{ ...is, marginBottom: 14 }}><option value="">Select target...</option>{opts.filter(s => s.id !== src).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </>}
      {(canCreate || mode === "drag") && <>
        <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0 14px" }} />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Interface Name</label>
        <input value={nm} onChange={e => setNm(e.target.value)} style={{ ...is, marginBottom: 14 }} />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...is, marginBottom: 14, resize: "vertical", fontFamily: "inherit" }} placeholder="Describe the interface purpose, data flows, constraints..." />
        <label style={{ display: "block", marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: "#475569" }}>Requirements</label>
        <div ref={reqDropRef} style={{ position: "relative", marginBottom: 14 }}>
          <div onClick={() => setReqDropOpen(!reqDropOpen)} style={{ ...is, minHeight: 38, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", cursor: "pointer", padding: "6px 11px" }}>
            {selReqs.length === 0 && <span style={{ color: "#94a3b8", fontSize: 12 }}>Select requirements...</span>}
            {selReqs.map(rId => {
              const r = allRequirements.find(x => x.id === rId);
              return <span key={rId} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#2563eb", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                {r ? `${r.id} ${r.label}` : rId}
                <span onClick={e => { e.stopPropagation(); setSelReqs(p => p.filter(x => x !== rId)); }} style={{ cursor: "pointer", fontSize: 13, lineHeight: 1, color: "#6b9cf7" }}>×</span>
              </span>;
            })}
          </div>
          {reqDropOpen && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
            {allRequirements.filter(r => !selReqs.includes(r.id)).map(r =>
              <div key={r.id} onClick={() => { setSelReqs(p => [...p, r.id]); }} style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <span style={{ fontWeight: 600, color: "#334155" }}>{r.id}</span>
                <span style={{ color: "#64748b" }}>{r.label}</span>
              </div>
            )}
            <div style={{ padding: "8px 12px", borderTop: allRequirements.length > 0 ? "1px solid #e2e8f0" : "none", display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newReqText} onChange={e => setNewReqText(e.target.value)} placeholder="New requirement..." onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Enter" && newReqText.trim()) { const nextNum = Math.max(0, ...allRequirements.map(r => parseInt(r.id.split("-")[1]) || 0)) + 1; const newId = `REQ-${nextNum}`; onAddReq({ id: newId, label: newReqText.trim() }); setSelReqs(p => [...p, newId]); setNewReqText(""); } }} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11.5, outline: "none" }} />
              <button onClick={e => { e.stopPropagation(); if (!newReqText.trim()) return; const nextNum = Math.max(0, ...allRequirements.map(r => parseInt(r.id.split("-")[1]) || 0)) + 1; const newId = `REQ-${nextNum}`; onAddReq({ id: newId, label: newReqText.trim() }); setSelReqs(p => [...p, newId]); setNewReqText(""); }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>}
        </div>
      </>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
        {(canCreate || (mode === "drag" && nm.trim())) && <button onClick={() => onCreate(src, tgt, nm.trim(), desc, selReqs)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Create Interface</button>}
      </div>
    </div>
  </div>;
}

function TableView({ ifaces, allSystems, allRequirements }) {
  const [sortCol, setSortCol] = useState("dateCreated");
  const [sortDir, setSortDir] = useState("desc");
  const columns = [
    { key: "name", label: "NAME" },
    { key: "id", label: "ID" },
    { key: "interfaceType", label: "INTERFACE TYPE" },
    { key: "source", label: "SOURCE SYSTEM" },
    { key: "target", label: "TARGET SYSTEMS" },
    { key: "requirements", label: "REQUIREMENTS" },
    { key: "dateCreated", label: "DATE CREATED" },
    { key: "dateLastUpdated", label: "DATE LAST UPD." },
  ];
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sorted = useMemo(() => {
    const list = [...ifaces];
    if (!sortCol) return list;
    list.sort((a, b) => {
      let va, vb;
      if (sortCol === "source") { va = allSystems[a.source]?.name || a.source; vb = allSystems[b.source]?.name || b.source; }
      else if (sortCol === "target") { va = allSystems[a.target]?.name || a.target; vb = allSystems[b.target]?.name || b.target; }
      else if (sortCol === "requirements") { va = (a.requirements || []).length; vb = (b.requirements || []).length; }
      else { va = a[sortCol] || ""; vb = b[sortCol] || ""; }
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [ifaces, sortCol, sortDir, allSystems]);

  const formatDate = (d) => { if (!d) return "\u2014"; const dt = new Date(d); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`; };

  const sysColor = (id) => allSystems[id]?.color || "#94a3b8";

  return <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          {columns.map(col => <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
            {col.label} {sortCol === col.key ? <span style={{ color: "#2563eb" }}>{sortDir === "desc" ? "▼" : "▲"}</span> : <span style={{ color: "#d0d5dd" }}>⇅</span>}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {sorted.map(iface => <tr key={iface.id} style={{ borderBottom: "1px solid #f1f5f9" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
          <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 220 }}>{iface.name}</td>
          <td style={{ padding: "14px 16px", color: "#64748b" }}>{iface.id}</td>
          <td style={{ padding: "14px 16px" }}>
            {iface.interfaceType ? <span style={{ background: iface.interfaceType === "Electrical" ? "#fef3c7" : iface.interfaceType === "Mechanical" ? "#dcfce7" : iface.interfaceType === "Signal" ? "#fce7f3" : "#f1f5f9", color: iface.interfaceType === "Electrical" ? "#92400e" : iface.interfaceType === "Mechanical" ? "#166534" : iface.interfaceType === "Signal" ? "#9d174d" : "#475569", fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 12 }}>{iface.interfaceType}</span> : <span style={{ color: "#c0c8d4" }}>&mdash;</span>}
          </td>
          <td style={{ padding: "14px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sysColor(iface.source) + "15", border: `1px solid ${sysColor(iface.source)}40`, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, color: "#334155" }}>{allSystems[iface.source]?.name || iface.source}</span>
          </td>
          <td style={{ padding: "14px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sysColor(iface.target) + "15", border: `1px solid ${sysColor(iface.target)}40`, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500, color: "#334155" }}>{allSystems[iface.target]?.name || iface.target}</span>
          </td>
          <td style={{ padding: "14px 16px" }}>
            {(iface.requirements || []).length > 0 ? (iface.requirements || []).map(rId => {
              const r = allRequirements.find(x => x.id === rId);
              return <span key={rId} style={{ display: "inline-block", background: "#dbeafe", color: "#1e40af", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, marginRight: 4 }}>{r ? `${r.id} ${r.label}` : rId}</span>;
            }) : <span style={{ color: "#c0c8d4" }}>&mdash;</span>}
          </td>
          <td style={{ padding: "14px 16px", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(iface.dateCreated)}</td>
          <td style={{ padding: "14px 16px", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(iface.dateLastUpdated)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export default function SERMTool() {
  const [expanded, setExpanded] = useState(new Set(["launch-vehicle"]));
  const [ifaces, setIfaces] = useState(initIfaces);
  const [allRequirements, setAllRequirements] = useState(initRequirements);
  const [viewMode, setViewMode] = useState("architecture");
  const [selId, setSelId] = useState(null);
  const [hovId, setHovId] = useState(null);
  const [hovBlock, setHovBlock] = useState(null);
  const [selBlockId, setSelBlockId] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.6);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanSt] = useState(false);
  const [dragOffsets, setDragOffsets] = useState({});
  const [sbExp, setSbExp] = useState(new Set(["launch-vehicle", "stage-1", "stage-2"]));
  const [connecting, setConnecting] = useState(null);
  const [modal, setModal] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const [hovSys, setHovSys] = useState(null);
  const [hovStub, setHovStub] = useState(null);
  const [pillOffsets, setPillOffsets] = useState({});
  const [draggingPill, setDraggingPill] = useState(null);
  const [pillDragStart, setPillDragStart] = useState(null);
  const [viewSize, setViewSize] = useState({ w: 900, h: 600 });
  const [viewStates, setViewStates] = useState({});

  const panRef = useRef({}); const dragRef = useRef({}); const svgRef = useRef(null); const canvasRef = useRef(null);
  const dragOffsetsRef = useRef(dragOffsets); dragOffsetsRef.current = dragOffsets;
  const pillOffsetsRef = useRef(pillOffsets); pillOffsetsRef.current = pillOffsets;
  const focusIdRef = useRef(focusId); focusIdRef.current = focusId;
  const viewStatesRef = useRef(viewStates); viewStatesRef.current = viewStates;
  const parentMap = useMemo(() => buildParentMap(hierarchy, null), []);

  useEffect(() => { if (!canvasRef.current) return; const ro = new ResizeObserver(e => { for (const en of e) setViewSize({ w: en.contentRect.width, h: en.contentRect.height }); }); ro.observe(canvasRef.current); return () => ro.disconnect(); }, []);
  useEffect(() => { if (!selId) return; const iface = ifaces.find(i => i.id === selId); if (!iface) return; setSbExp(p => { const n = new Set(p); [iface.source, iface.target].forEach(s => { n.add(s); getAncestorIds(s, parentMap).forEach(a => n.add(a)); }); return n; }); }, [selId, ifaces, parentMap]);

  const baseLayout = useMemo(() => computeLayout(expanded), [expanded]);

  const positioned = useMemo(() => {
    const p = {};
    for (const [id, sys] of Object.entries(baseLayout)) { const off = dragOffsets[id] || { dx: 0, dy: 0 }; p[id] = { ...sys, x: sys.x + off.dx, y: sys.y + off.dy }; }
    const parents = Object.keys(p).filter(id => p[id].expanded && p[id].hasChildren);
    parents.sort((a, b) => getAncestorIds(b, parentMap).length - getAncestorIds(a, parentMap).length);
    for (const pid of parents) {
      const par = p[pid]; const cids = (par.children || []).map(c => c.id); if (!cids.length) continue;
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (const cid of cids) { const c = p[cid]; if (!c) continue; mnX = Math.min(mnX, c.x); mnY = Math.min(mnY, c.y); mxX = Math.max(mxX, c.x + c.w); mxY = Math.max(mxY, c.y + c.h); }
      p[pid] = { ...par, x: mnX - PAD, y: mnY - HEADER_H - PAD, w: mxX - mnX + PAD * 2, h: mxY - mnY + HEADER_H + PAD * 2 + 50 };
    }
    return p;
  }, [baseLayout, dragOffsets, parentMap]);

  const focusIds = useMemo(() => { if (!focusId) return null; const ids = new Set([focusId, ...getDescendantIds(hierarchy, focusId)]); revealed.forEach(id => ids.add(id)); return ids; }, [focusId, revealed]);

  const visible = useMemo(() => {
    const v = {};
    for (const [id, sys] of Object.entries(positioned)) {
      let ok = true, pid = parentMap[id];
      while (pid) { if (!expanded.has(pid)) { ok = false; break; } pid = parentMap[pid]; }
      if (!ok) continue; if (focusIds && !focusIds.has(id)) continue;
      v[id] = sys;
    }
    return v;
  }, [positioned, expanded, parentMap, focusIds]);

  const dotAssign = useMemo(() => assignDots(ifaces, visible), [ifaces, visible]);
  const prevDotsRef = useRef(dotAssign);
  const animFrameRef = useRef(null);
  const [animDots, setAnimDots] = useState(dotAssign);
  useEffect(() => {
    const prev = prevDotsRef.current;
    const next = dotAssign;
    prevDotsRef.current = next;
    // Check if any dots actually changed position (not just same object)
    let changed = false;
    for (const id of Object.keys(next)) {
      if (!prev[id] || prev[id].s.id !== next[id].s.id || prev[id].t.id !== next[id].t.id) { changed = true; break; }
    }
    if (!changed) { setAnimDots(next); return; }
    // Animate from prev to next over 200ms
    const start = performance.now();
    const duration = 200;
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
      const interp = {};
      for (const [id, nd] of Object.entries(next)) {
        const pd = prev[id];
        if (pd) {
          interp[id] = {
            s: { id: nd.s.id, cx: pd.s.cx + (nd.s.cx - pd.s.cx) * ease, cy: pd.s.cy + (nd.s.cy - pd.s.cy) * ease },
            t: { id: nd.t.id, cx: pd.t.cx + (nd.t.cx - pd.t.cx) * ease, cy: pd.t.cy + (nd.t.cy - pd.t.cy) * ease },
          };
        } else {
          interp[id] = nd;
        }
      }
      setAnimDots(interp);
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [dotAssign]);
  const pills = useMemo(() => computePills(ifaces, visible, animDots, pillOffsets), [ifaces, visible, animDots, pillOffsets]);
  const selIface = ifaces.find(i => i.id === selId);
  const relIds = selIface ? [selIface.source, selIface.target] : [];
  const blockRelIfaceIds = useMemo(() => { if (!selBlockId) return new Set(); return new Set(ifaces.filter(i => i.source === selBlockId || i.target === selBlockId).map(i => i.id)); }, [selBlockId, ifaces]);
  const externalIfaces = useMemo(() => { if (!focusIds) return []; return ifaces.filter(i => { const s = focusIds.has(i.source), t = focusIds.has(i.target); return (s && !t) || (!s && t); }); }, [focusIds, ifaces]);
  const breadcrumb = useMemo(() => { if (!focusId) return null; const ch = [{ id: null, name: "All" }]; getAncestorIds(focusId, parentMap).reverse().forEach(a => { const n = findNode(hierarchy, a); if (n) ch.push({ id: a, name: n.name }); }); const fn = findNode(hierarchy, focusId); if (fn) ch.push({ id: focusId, name: fn.name }); return ch; }, [focusId, parentMap]);
  const connDots = useMemo(() => { const m = {}; for (const [ifId, da] of Object.entries(animDots)) { const iface = ifaces.find(i => i.id === ifId); if (!iface) continue; if (!m[iface.source]) m[iface.source] = []; m[iface.source].push({ ...da.s, ifaceId: ifId }); if (!m[iface.target]) m[iface.target] = []; m[iface.target].push({ ...da.t, ifaceId: ifId }); } return m; }, [animDots, ifaces]);

  const handleBlockDown = useCallback((e, id) => { e.stopPropagation(); setDragging(id); dragRef.current = { x: e.clientX, y: e.clientY }; }, []);
  const handleDblClick = useCallback((id) => { setExpanded(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); setDragOffsets({}); setPillOffsets({}); }, []);
  const handleCanvasDown = useCallback((e) => { if (!dragging && !connecting && !draggingPill) { setPanSt(true); panRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; setSelId(null); setSelBlockId(null); } }, [pan, dragging, connecting, draggingPill]);
  const handleDotDown = useCallback((e, sysId, cx, cy) => { e.stopPropagation(); e.preventDefault(); const r = svgRef.current.getBoundingClientRect(); setConnecting({ sourceId: sysId, startX: cx, startY: cy, currentX: (e.clientX - r.left - pan.x) / zoom, currentY: (e.clientY - r.top - pan.y) / zoom }); }, [pan, zoom]);
  const handlePillDown = useCallback((e, ifId) => { e.stopPropagation(); setDraggingPill(ifId); setPillDragStart({ x: e.clientX, y: e.clientY, off: pillOffsets[ifId] || { dx: 0, dy: 0 } }); }, [pillOffsets]);

  // Zoom to cursor
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const r = svgRef.current.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.15, Math.min(3, zoom + delta));
    const ratio = newZoom / zoom;
    // Adjust pan so the point under cursor stays fixed
    const newPanX = cx - (cx - pan.x) * ratio;
    const newPanY = cy - (cy - pan.y) * ratio;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragging) {
        const dx = (e.clientX - dragRef.current.x) / zoom, dy = (e.clientY - dragRef.current.y) / zoom;
        dragRef.current = { x: e.clientX, y: e.clientY };
        const desc = getDescendantIds(hierarchy, dragging);
        setDragOffsets(prev => { const n = { ...prev }; for (const m of [dragging, ...desc]) { const o = n[m] || { dx: 0, dy: 0 }; n[m] = { dx: o.dx + dx, dy: o.dy + dy }; } return n; });
      }
      if (draggingPill && pillDragStart) {
        const dx = (e.clientX - pillDragStart.x) / zoom, dy = (e.clientY - pillDragStart.y) / zoom;
        const sdx = Math.round((pillDragStart.off.dx + dx) / 28) * 28;
        const sdy = Math.round((pillDragStart.off.dy + dy) / 28) * 28;
        setPillOffsets(prev => ({ ...prev, [draggingPill]: { dx: sdx, dy: sdy } }));
      }
      if (panning) setPan({ x: panRef.current.px + e.clientX - panRef.current.x, y: panRef.current.py + e.clientY - panRef.current.y });
      if (connecting) { const r = svgRef.current.getBoundingClientRect(); setConnecting(p => ({ ...p, currentX: (e.clientX - r.left - pan.x) / zoom, currentY: (e.clientY - r.top - pan.y) / zoom })); }
    };
    const onUp = (e) => {
      if (connecting) {
        const r = svgRef.current.getBoundingClientRect(); const mx = (e.clientX - r.left - pan.x) / zoom, my = (e.clientY - r.top - pan.y) / zoom;
        let tid = null;
        for (const [id, sys] of Object.entries(visible)) { if (id === connecting.sourceId) continue; if (mx >= sys.x && mx <= sys.x + sys.w && my >= sys.y && my <= sys.y + sys.h) if (!tid || sys.w * sys.h < visible[tid].w * visible[tid].h) tid = id; }
        if (tid) setModal({ mode: "drag", sourceId: connecting.sourceId, targetId: tid });
        setConnecting(null);
      }
      setDragging(null); setPanSt(false); setDraggingPill(null); setPillDragStart(null);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, panning, connecting, draggingPill, pillDragStart, zoom, pan, visible]);

  const handleCreate = (src, tgt, name, desc, requirements) => {
    const mx = Math.max(0, ...ifaces.map(i => parseInt(i.id.split("-")[1]) || 0));
    const nid = `INT-${mx + 1}`;
    const now = new Date().toISOString().split("T")[0];
    setIfaces(p => [...p, { id: nid, source: src, target: tgt, name, desc: desc || "", interfaceType: "", requirements: requirements || [], dateCreated: now, dateLastUpdated: now }]);
    setModal(null); setSelId(nid);
    // Auto expand sidebar for new interface
    setSbExp(p => { const n = new Set(p); n.add(src); n.add(tgt); getAncestorIds(src, parentMap).forEach(a => n.add(a)); getAncestorIds(tgt, parentMap).forEach(a => n.add(a)); return n; });
  };
  const togSb = useCallback((id) => { setSbExp(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const focusSys = useCallback((id) => {
    const currentKey = focusIdRef.current || "__all__";
    setViewStates(prev => ({ ...prev, [currentKey]: { dragOffsets: dragOffsetsRef.current, pillOffsets: pillOffsetsRef.current } }));
    const targetKey = id || "__all__";
    const saved = viewStatesRef.current[targetKey];
    setDragOffsets(saved ? saved.dragOffsets : {});
    setPillOffsets(saved ? saved.pillOffsets : {});
    setFocusId(id); setRevealed(new Set());
  }, []);

  const containers = Object.values(visible).filter(s => s.expanded && s.hasChildren).sort((a, b) => getAncestorIds(a.id, parentMap).length - getAncestorIds(b.id, parentMap).length);
  const leaves = Object.values(visible).filter(s => !(s.expanded && s.hasChildren));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", margin: 0, padding: 0, fontFamily: "'DM Sans',sans-serif", background: "#f1f5f9", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Top bar */}
      <div style={{ height: 46, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>S</span></div>
          <span style={{ color: "#fff", fontSize: 14.5, fontWeight: 700 }}>SERM Tool</span>
          <span style={{ background: "#22c55e20", color: "#4ade80", fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 10, border: "1px solid #22c55e40" }}>v1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#94a3b8", fontSize: 12.5 }}>Project: <span style={{ color: "#fff", fontWeight: 600 }}>Launch Vehicle Program</span></span>
          <div style={{ display: "flex", background: "#1e293b", borderRadius: 6, padding: 2 }}>
            <button onClick={() => setViewMode("architecture")} style={{ padding: "5px 12px", borderRadius: 5, border: "none", fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: viewMode === "architecture" ? "#3b82f6" : "transparent", color: viewMode === "architecture" ? "#fff" : "#94a3b8", transition: "all 0.15s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Architecture
            </button>
            <button onClick={() => setViewMode("table")} style={{ padding: "5px 12px", borderRadius: 5, border: "none", fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: viewMode === "table" ? "#3b82f6" : "transparent", color: viewMode === "table" ? "#fff" : "#94a3b8", transition: "all 0.15s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Table
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 284, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 12px 0" }}>
            <button onClick={() => setModal({ mode: "full" })} style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginBottom: 10, boxShadow: "0 2px 6px rgba(37,99,235,0.25)" }}>+ New Interface</button>
            {breadcrumb && <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 4px 8px", flexWrap: "wrap" }}>
              {breadcrumb.map((b, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {i > 0 && <span style={{ fontSize: 9, color: "#c0c8d4" }}>›</span>}
                <span onClick={() => { focusSys(b.id || null); }} style={{ fontSize: 10.5, color: i === breadcrumb.length - 1 ? "#2563eb" : "#64748b", fontWeight: i === breadcrumb.length - 1 ? 700 : 500, cursor: "pointer", padding: "1px 4px", borderRadius: 3, background: i === breadcrumb.length - 1 ? "#eff6ff" : "transparent" }}>{b.name}</span>
              </span>)}
            </div>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px" }}>
            <SidebarTree nodes={hierarchy} ifaces={ifaces} selId={selId} hovId={hovId} onSel={id => setSelId(selId === id ? null : id)} onHov={setHovId} sbExp={sbExp} togSb={togSb} focusSys={focusSys} hovSys={hovSys} setHovSys={setHovSys} onQuickAdd={sysId => setModal({ mode: "quick", sourceId: sysId })} />
          </div>
        </div>
        {/* Canvas */}
        {viewMode === "table" && <TableView ifaces={ifaces} allSystems={positioned} allRequirements={allRequirements} />}
        <div ref={canvasRef} style={{ flex: 1, position: "relative", overflow: "hidden", display: viewMode === "architecture" ? undefined : "none" }}>
          <div style={{ position: "absolute", top: 14, left: 18, zIndex: 10, fontSize: 15, fontWeight: 700, color: "#0f172a", background: "rgba(241,245,249,0.92)", padding: "5px 12px", borderRadius: 7, backdropFilter: "blur(8px)" }}>Architecture View{focusId && <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}> (focused)</span>}</div>
          <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 2, background: "#fff", borderRadius: 7, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.min(3, zoom + 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>+</button>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <span style={{ padding: "0 6px", fontSize: 10.5, color: "#94a3b8", fontWeight: 500, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
            <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); const cx = r.width / 2, cy = r.height / 2; const nz = Math.max(0.15, zoom - 0.15); const ratio = nz / zoom; setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio }); setZoom(nz); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, color: "#475569" }}>−</button>
          </div>
          <MiniMap blocks={visible} pan={pan} zoom={zoom} vw={viewSize.w} vh={viewSize.h} />
          <div style={{ position: "absolute", bottom: 16, left: 18, zIndex: 10, fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.9)", padding: "3px 9px", borderRadius: 5, border: "1px solid #e8ebef" }}>Double-click expand/collapse · Drag dots to connect · Drag pills to reposition</div>
          <svg ref={svgRef} width="100%" height="100%" onMouseDown={handleCanvasDown} onWheel={handleWheel} style={{ background: "#f1f5f9", cursor: panning ? "grabbing" : connecting ? "crosshair" : "default" }}>
            <defs>
              <filter id="bs" x="-4%" y="-4%" width="108%" height="116%"><feDropShadow dx="0" dy="1" stdDeviation="2.5" floodOpacity="0.05" /></filter>
              <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}><circle cx="1" cy="1" r="0.5" fill="#c0c8d4" opacity="0.3" /></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {containers.map(sys => { const isSB = selBlockId === sys.id; return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => { e.stopPropagation(); setSelBlockId(selBlockId === sys.id ? null : sys.id); setSelId(null); }} onDoubleClick={e => { e.stopPropagation(); handleDblClick(sys.id); }} style={{ cursor: "grab", opacity: selId && !relIds.includes(sys.id) ? 0.2 : 1, transition: "opacity 0.15s" }}>
                <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={10} fill={`${sys.color}06`} stroke={relIds.includes(sys.id) || isSB ? "#2563eb" : sys.color} strokeWidth={relIds.includes(sys.id) || isSB ? 2.5 : 1.5} strokeDasharray="7 3" />
                <rect x={sys.x} y={sys.y} width={sys.w} height={HEADER_H} rx={10} fill={`${sys.color}0d`} /><rect x={sys.x} y={sys.y + HEADER_H - 8} width={sys.w} height={8} fill={`${sys.color}0d`} />
                <CubeIcon x={sys.x + 10} y={sys.y + 10} size={18} color={sys.color} />
                <text x={sys.x + 34} y={sys.y + 26} fontSize={13} fontFamily="'DM Sans',sans-serif" fontWeight={700} fill="#1e293b">{sys.name}</text>
                <text x={sys.x + sys.w - 12} y={sys.y + 26} textAnchor="end" fontSize={10} fill="#94a3b8">{sys.reqs}</text>
              </g>; })}

              {ifaces.map(iface => {
                const da = animDots[iface.id]; const pill = pills[iface.id];
                if (!da || !pill) return null;
                const pcx = pill.x + pill.w / 2, pcy = pill.y + pill.h / 2;
                const isAct = selId === iface.id || hovId === iface.id || blockRelIfaceIds.has(iface.id);
                return <g key={iface.id}>
                  <path d={elbowPath(da.s.cx, da.s.cy, pcx, pcy)} fill="none" stroke="transparent" strokeWidth={14} onClick={() => { setSelId(selId === iface.id ? null : iface.id); setSelBlockId(null); }} style={{ cursor: "pointer" }} />
                  <path d={elbowPath(pcx, pcy, da.t.cx, da.t.cy)} fill="none" stroke="transparent" strokeWidth={14} onClick={() => { setSelId(selId === iface.id ? null : iface.id); setSelBlockId(null); }} style={{ cursor: "pointer" }} />
                  <path d={elbowPath(da.s.cx, da.s.cy, pcx, pcy)} fill="none" stroke={isAct ? "#2563eb" : "#cdd3db"} strokeWidth={isAct ? 3.5 : 2} />
                  <path d={elbowPath(pcx, pcy, da.t.cx, da.t.cy)} fill="none" stroke={isAct ? "#2563eb" : "#cdd3db"} strokeWidth={isAct ? 3.5 : 2} />
                  <rect x={pill.x} y={pill.y} width={pill.w} height={pill.h} rx={12} fill={isAct ? "#2563eb" : draggingPill === iface.id ? "#e0e7ff" : "#fff"} stroke={isAct ? "#2563eb" : "#dde1e7"} strokeWidth={0.8} style={{ cursor: "grab" }} onMouseDown={e => handlePillDown(e, iface.id)} onClick={() => { setSelId(selId === iface.id ? null : iface.id); setSelBlockId(null); }} />
                  <text x={pcx} y={pcy + 3.5} textAnchor="middle" fontSize={10} fontFamily="'DM Sans',sans-serif" fontWeight={isAct ? 600 : 500} fill={isAct ? "#fff" : "#64748b"} style={{ pointerEvents: "none" }}>{iface.name}</text>
                </g>;
              })}

              {externalIfaces.map(iface => {
                const inId = focusIds?.has(iface.source) ? iface.source : iface.target;
                const outId = inId === iface.source ? iface.target : iface.source;
                const inB = visible[inId]; if (!inB) return null;
                const sx = inB.x, sy = inB.y + inB.h * 0.75, ex = sx - 50, ey = sy + 20;
                const isH = hovStub === iface.id; const isR = revealed.has(outId);
                return <g key={"ext" + iface.id} onMouseEnter={() => setHovStub(iface.id)} onMouseLeave={() => setHovStub(null)}>
                  <path d={`M${sx},${sy} L${sx - 20},${sy} L${sx - 20},${ey} L${ex},${ey}`} fill="none" stroke="#b0b8c4" strokeWidth={2} strokeDasharray="4 3" />
                  <circle cx={ex} cy={ey} r={10} fill="transparent" style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setRevealed(p => { const n = new Set(p); if (n.has(outId)) n.delete(outId); else n.add(outId); return n; }); }} />
                  <circle cx={ex} cy={ey} r={4} fill="#94a3b8" stroke="#fff" strokeWidth={1.5} style={{ pointerEvents: "none" }} /><circle cx={sx} cy={sy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
                  {(isH || isR) && <text x={ex - 8} y={ey + 4} textAnchor="end" fontSize={10} fontFamily="'DM Sans',sans-serif" fill="#64748b" opacity={isR ? 1 : 0.5} style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setRevealed(p => { const n = new Set(p); if (n.has(outId)) n.delete(outId); else n.add(outId); return n; }); }}>{positioned[outId]?.name || outId}</text>}
                </g>;
              })}

              {leaves.map(sys => {
                const dim = selId && !relIds.includes(sys.id);
                const isR = relIds.includes(sys.id); const isSB = selBlockId === sys.id; const isC = !sys.expanded && sys.hasChildren;
                const isH = hovBlock === sys.id && !connecting;
                const allD = getDots(sys); const cD = connDots[sys.id] || []; const cIds = new Set(cD.map(d => d.id));
                return <g key={sys.id} onMouseDown={e => handleBlockDown(e, sys.id)} onClick={e => { e.stopPropagation(); setSelBlockId(selBlockId === sys.id ? null : sys.id); setSelId(null); }} onDoubleClick={e => { e.stopPropagation(); if (sys.hasChildren) handleDblClick(sys.id); }} onMouseEnter={() => setHovBlock(sys.id)} onMouseLeave={() => setHovBlock(null)} style={{ cursor: "grab", opacity: dim ? 0.2 : 1, transition: "opacity 0.15s" }}>
                  <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={8} fill="#fff" stroke={isR || isSB ? "#2563eb" : isH ? "#93b4f0" : "#e2e8f0"} strokeWidth={isR || isSB ? 2.5 : 1} filter="url(#bs)" />
                  <CubeIcon x={sys.x + 10} y={sys.y + (sys.h - 17) / 2} size={17} color={sys.color} />
                  <text x={sys.x + 32} y={sys.y + sys.h / 2 + 4.5} fontSize={12.5} fontFamily="'DM Sans',sans-serif" fontWeight={600} fill="#1e293b">{sys.name.length > 17 ? sys.name.slice(0, 17) + "..." : sys.name}</text>
                  {isC && <text x={sys.x + sys.w - 32} y={sys.y + sys.h / 2 + 4} fontSize={11} fill="#f59e0b" fontWeight={700}>▸</text>}
                  <rect x={sys.x + sys.w - 28} y={sys.y + (sys.h - 19) / 2} width={20} height={19} rx={9.5} fill={sys.reqs > 0 ? "#eff6ff" : "#f8fafc"} stroke={sys.reqs > 0 ? "#bfdbfe" : "#e8ebef"} strokeWidth={0.8} />
                  <text x={sys.x + sys.w - 18} y={sys.y + sys.h / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={sys.reqs > 0 ? "#2563eb" : "#b0b8c4"}>{sys.reqs}</text>
                  {cD.map((d, i) => <circle key={"cd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
                  {isH && allD.filter(d => !cIds.has(d.id)).map((d, i) => <circle key={"hd" + i} cx={d.cx} cy={d.cy} r={3.5} fill="#93b4f0" stroke="#fff" strokeWidth={1.5} opacity={0.5} style={{ cursor: "crosshair" }} onMouseDown={e => handleDotDown(e, sys.id, d.cx, d.cy)} />)}
                </g>;
              })}
              {connecting && <path d={elbowPath(connecting.startX, connecting.startY, connecting.currentX, connecting.currentY)} fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" />}
            </g>
          </svg>
        </div>
      </div>
      {modal && <InterfaceModal mode={modal.mode} sourceId={modal.sourceId} targetId={modal.targetId} allSystems={positioned} allRequirements={allRequirements} onClose={() => setModal(null)} onCreate={handleCreate} onAddReq={r => setAllRequirements(p => [...p, r])} />}
    </div>
  );
}
