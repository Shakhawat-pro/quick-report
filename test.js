"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/*
Features:
1. Fetch Google Sheet as CSV -> JSON by sheet ID.
2. Search employees by ID or Name.
3. Calculate attendance stats (Present/Absent/Sick) client-side.
4. Textarea for manual reason input.
5. Generate downloadable PDF using jsPDF + html2canvas.
6. JavaScript + functional components.
7. Clean minimal UI with Tailwind.
*/

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "REPLACE_WITH_SHEET_ID"; // Use the real Spreadsheet ID (between /d/ and /edit) OR a 2PACX published ID.
const SHEET_GID = process.env.NEXT_PUBLIC_SHEET_GID; // optional tab gid

// Return multiple candidate URLs we will try in order.
function buildCandidateUrls() {
  if (!SHEET_ID || SHEET_ID === 'REPLACE_WITH_SHEET_ID') return [];
  const urls = [];
  const isPublishedToken = SHEET_ID.startsWith('2PACX');
  if (isPublishedToken) {
    // Published sheet (File > Share > Publish to web) pattern
    // Base: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv(&gid=)
    urls.push(`https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv${SHEET_GID?`&gid=${SHEET_GID}`:''}`);
  } else {
    // Normal spreadsheet ID
    if (SHEET_GID) {
      // gviz endpoint (often works when export may 404 for some permissions)
      urls.push(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`);
      // legacy export
      urls.push(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`);
    }
    // Whole sheet (first tab) versions
    urls.push(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`);
    urls.push(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`);
  }
  return urls;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h,i) => obj[h] = cells[i] || "");
    return obj;
  });
}

export default function Home() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");
  const [attemptLog, setAttemptLog] = useState([]); // {url, status}

  useEffect(() => {
    const load = async () => {
      if (!SHEET_ID || SHEET_ID === "REPLACE_WITH_SHEET_ID") return;
      setLoading(true); setError(null);
      try {
        const urls = buildCandidateUrls();
        if (!urls.length) return;
        let lastErr = null;
        setAttemptLog([]);
        for (const url of urls) {
          try {
            setAttemptLog(prev => [...prev, { url, status: 'requesting' }]);
            const response = await axios.get(url, { responseType: 'text' });
            if (response.status === 200 && response.data && response.data.trim().length) {
              setAttemptLog(prev => prev.map(a => a.url === url ? { ...a, status: response.status } : a));
              setRows(parseCSV(response.data));
              lastErr = null;
              break;
            }
            setAttemptLog(prev => prev.map(a => a.url === url ? { ...a, status: response.status || 'no-data' } : a));
          } catch (err) {
            setAttemptLog(prev => prev.map(a => a.url === url ? { ...a, status: err.response?.status || 'ERR' } : a));
            lastErr = err;
          }
        }
        if (lastErr) {
          const status = lastErr.response?.status;
            // Provide targeted guidance for 404
          throw new Error(
            `Failed to load sheet${status?` (HTTP ${status})`:''}. Check: 1) Did you use the Spreadsheet ID (not the full URL or 2PACX token unless published)? 2) Is sheet shared: Anyone with link (Viewer)? 3) If using 2PACX token, ensure you published the sheet (File > Share > Publish to web).`
          );
        }
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    load();
  }, []);

  // Detect columns
  const idKey = useMemo(() => findColumnKey(rows, ["id","employee id","emp id","employee"]), [rows]);
  const nameKey = useMemo(() => findColumnKey(rows, ["name","employee name"], true), [rows]);
  const statusKey = useMemo(() => findColumnKey(rows, ["status","attendance","state"], true), [rows]);

  // Wide format detection: columns like Day 1, Day 2...
  const dayColumns = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.filter(k => /^day\s*\d+/i.test(k));
  }, [rows]);

  const employees = useMemo(() => {
    if (!rows.length || !idKey) return [];
    const wideFormat = !statusKey && dayColumns.length > 0; // row per employee with multiple day columns
    if (wideFormat) {
      return rows.map(r => {
        const logs = dayColumns.map(col => ({ date: col, status: (r[col] || '').trim(), raw: r }));
        return { id: r[idKey], name: r[nameKey] || '', logs };
      }).filter(e => !!e.id);
    }
    // Long format (one row per day)
    const map = new Map();
    rows.forEach(r => {
      const id = r[idKey]; if (!id) return;
      if (!map.has(id)) map.set(id, { id, name: r[nameKey] || '', logs: [] });
      map.get(id).logs.push({ date: r.date || r.day || r.Date || r.Day, status: r[statusKey] || '', raw: r });
    });
    return Array.from(map.values());
  }, [rows, idKey, nameKey, statusKey, dayColumns]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return employees;
    return employees.filter(e => e.id.toLowerCase().includes(q) || (e.name && e.name.toLowerCase().includes(q)));
  }, [employees, query]);

  const selectedEmployee = useMemo(() => filtered.find(e => e.id === selectedId) || null, [filtered, selectedId]);

  const attendanceStats = useMemo(() => {
    if (!selectedEmployee) return { present:0, absent:0, sick:0, total:0 };
    let present=0, absent=0, sick=0;
    selectedEmployee.logs.forEach(l => {
      const s = (l.status || '').toUpperCase();
      if (s==='P' || s==='PRESENT') present++; else if (s==='A' || s==='ABSENT') absent++; else if (s==='S' || s==='SICK') sick++;
    });
    const total = present+absent+sick;
    return { present, absent, sick, total };
  }, [selectedEmployee]);

  const generatePDF = async () => {
    if (!selectedEmployee) return;
    const target = document.getElementById('employee-report');
    if (!target) return;
    let canvas;
    const runCapture = () => html2canvas(target, {
      scale: 2,
      onclone: (clonedDoc) => {
        const clonedTarget = clonedDoc.getElementById('employee-report');
        if (clonedTarget) {
          try { sanitizeUnsupportedColors(clonedTarget); } catch (_) { /* ignore */ }
        }
      }
    });
    try {
      canvas = await runCapture();
    } catch (err) {
      if (/unsupported color function/i.test(err?.message || '')) {
        // Force in-place sanitization and retry once.
        try { sanitizeUnsupportedColors(target); } catch(_) {}
        canvas = await runCapture();
      } else {
        throw err;
      }
    }
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation:'p', unit:'pt', format:'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 40; // margins
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    if (imgHeight <= pdf.internal.pageSize.getHeight()-40) {
      pdf.addImage(imgData,'PNG',20,20,imgWidth,imgHeight);
    } else {
      let position = 0;
      while (position < canvas.height) {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        const pageCanvasHeight = Math.min(canvas.height-position, canvas.width*1.414); // A4 ratio
        sliceCanvas.height = pageCanvasHeight;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas,0,position,canvas.width,pageCanvasHeight,0,0,canvas.width,pageCanvasHeight);
        const data = sliceCanvas.toDataURL('image/png');
        if (position !== 0) pdf.addPage();
        const h = pageCanvasHeight * (imgWidth / canvas.width);
        pdf.addImage(data,'PNG',20,20,imgWidth,h);
        position += pageCanvasHeight;
      }
    }
    pdf.save(`attendance_${selectedEmployee.id}.pdf`);
  };

  return (
  <div className="min-h-screen p-6 sm:p-10 bg-white text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Quick Report</h1>
            <p className="text-xs text-slate-500">Load Google Sheet & generate employee PDF.</p>
          </div>
          <div className="flex gap-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by ID or Name" className="border rounded-md px-3 py-2 text-sm w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {selectedEmployee && <button onClick={generatePDF} className="bg-black hover:bg-neutral-700 text-white text-sm font-medium px-4 rounded-md shadow">PDF</button>}
          </div>
        </header>
  {!SHEET_ID || SHEET_ID === 'REPLACE_WITH_SHEET_ID' ? <div className="p-3 border border-gray-400 bg-gray-100 text-gray-800 rounded text-xs">Set <code className="font-mono">NEXT_PUBLIC_SHEET_ID</code> to your Spreadsheet ID (the part between /d/ and /edit) or a published 2PACX token.</div> : null}
        {loading && <div className="text-xs text-slate-500">Loading...</div>}
        {error && (
          <div className="text-xs space-y-2">
            <div className="text-red-600">Error: {error}</div>
            {!!attemptLog.length && (
              <details className="border rounded p-2 bg-white text-slate-600">
                <summary className="cursor-pointer text-[11px] font-medium">Debug URL Attempts</summary>
                <ul className="mt-1 space-y-1 text-[11px] break-all">
                  {attemptLog.map(a => (
                    <li key={a.url} className="flex gap-2"><span className="font-mono flex-1">{a.url}</span><span className="text-slate-500">{a.status}</span></li>
                  ))}
                </ul>
                <div className="mt-2 text-[10px] text-slate-500">Open one of these URLs directly in a new browser tab. If it 404s you likely used the wrong ID or the sheet is not shared/published.</div>
              </details>
            )}
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-2">
            <h2 className="text-sm font-medium text-gray-700 uppercase">Employees</h2>
            <div className="border rounded-md divide-y max-h-[480px] overflow-auto bg-white">
              {filtered.map(emp => (
                <button key={emp.id} onClick={()=>{setSelectedId(emp.id); setReason('');}} className={`w-full flex flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-100 ${emp.id===selectedId?'bg-gray-200 font-medium':''}`}> <span>{emp.name || 'Unnamed'}</span> <span className="text-[11px] text-gray-500">ID: {emp.id}</span></button>
              ))}
              {!filtered.length && <div className="px-3 py-4 text-xs text-slate-500">No matches.</div>}
            </div>
          </div>
          <div className="md:col-span-2">
            {selectedEmployee ? (
              <div id="employee-report" className="space-y-4 bg-white rounded-lg border shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedEmployee.name}</h2>
                    <p className="text-xs text-gray-600">Employee ID: {selectedEmployee.id}</p>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <p>Records: {selectedEmployee.logs.length}</p>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Present" value={attendanceStats.present} />
                  <Stat label="Absent" value={attendanceStats.absent} />
                  <Stat label="Sick" value={attendanceStats.sick} />
                  <Stat label="Total" value={attendanceStats.total} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Daily Logs</h3>
                  <div className="border rounded-md max-h-60 overflow-auto text-xs">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-gray-700">
                          <th className="py-1 px-2 font-medium">Date</th>
                          <th className="py-1 px-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
            {selectedEmployee.logs.slice(0,150).map((l,i)=>(
                          <tr key={i} className="odd:bg-white even:bg-slate-50">
              <td className="px-2 py-1 whitespace-nowrap">{l.date || '-'}</td>
              <td className="px-2 py-1"><StatusPill status={l.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Reason / Notes</label>
                  <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Manual note to include in PDF..." className="w-full border rounded-md p-2 text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {reason && <p className="text-[10px] text-gray-500 italic">Included when exporting PDF.</p>}
                </div>
                <div className="pt-2 flex justify-end">
                  <button onClick={generatePDF} className="bg-black hover:bg-neutral-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow">Download PDF</button>
                </div>
              </div>
            ) : <div className="text-sm text-gray-600 border rounded-md p-6 bg-white">Select an employee to view details.</div>}
          </div>
        </div>
  <footer className="pt-4 text-center text-[11px] text-gray-500">Local generation • Google Sheets data</footer>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="rounded-md bg-gray-50 border p-3 flex flex-col items-center gap-1"><div className="text-base font-semibold">{value}</div><div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div></div>;
}

function StatusPill({ status }) {
  const s = (status||'').toUpperCase();
  let text = '-';
  if (s==='P' || s==='PRESENT') text='Present';
  else if (s==='A' || s==='ABSENT') text='Absent';
  else if (s==='S' || s==='SICK') text='Sick';
  return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-200 text-gray-800">{text}</span>;
}

function findColumnKey(rows, candidates){
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  for (const c of candidates){
    const hit = keys.find(k => k.trim().toLowerCase() === c);
    if (hit) return hit;
  }
  return null;
}

// html2canvas currently doesn't support CSS color() or lab() color spaces used by some modern frameworks.
// We walk through the subtree and if computed style contains 'lab(' we fallback those properties to rgb(0 0 0 / <alpha>) approximations.
function sanitizeUnsupportedColors(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const COLOR_PROPS = [
    'color','background','backgroundColor','borderColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor'
  ];
  const UNSUPPORTED_RE = /(lab|lch|oklab|oklch|color-mix|color\(|display-p3)/i;
  while (walker.nextNode()) {
    const el = walker.currentNode;
    const cs = window.getComputedStyle(el);
    COLOR_PROPS.forEach(prop => {
      const val = cs[prop];
      if (!val) return;
      if (UNSUPPORTED_RE.test(val)) {
        const isBg = prop.toLowerCase().includes('background');
        // crude heuristic: preserve apparent light/dark by checking lightness via luminance of already rendered rgb if available
        let fallback = isBg ? '#ffffff' : '#000000';
        const rgbMatch = val.match(/rgb[a]?\([^)]*\)/i);
        if (rgbMatch) fallback = rgbMatch[0];
        el.style[prop] = fallback;
      }
      // Remove gradients containing unsupported functions
      if (/gradient/i.test(val) && UNSUPPORTED_RE.test(val)) {
        el.style[prop] = '#ffffff';
      }
    });
  }
}
