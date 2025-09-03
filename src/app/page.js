"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

/*
Features:
1. Fetch Google Sheet as CSV -> JSON by sheet ID.
2. Search employees by ID or Name.
3. Calculate attendance stats (Present/Absent/Sick) client-side.
4. JavaScript + functional components.
5. Clean minimal UI with Tailwind.
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
    urls.push(`https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv${SHEET_GID ? `&gid=${SHEET_GID}` : ''}`);
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
    headers.forEach((h, i) => obj[h] = cells[i] || "");
    return obj;
  });
}

export default function Home() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState(""); // kept for UI, no PDF export now
  // debug logging removed

  useEffect(() => {
    const load = async () => {
      if (!SHEET_ID || SHEET_ID === "REPLACE_WITH_SHEET_ID") return;
      setLoading(true); setError(null);
      try {
        const urls = buildCandidateUrls();
        console.log(urls);

        if (!urls.length) return;
        let lastErr = null;
        for (const url of urls) {
          try {
            console.log(url);
            const response = await axios.get(url, { responseType: 'text' });
            if (response.status === 200 && response.data && response.data.trim().length) {
              setRows(parseCSV(response.data));
              console.log("Response data:", response.data);
              
              lastErr = null;
              break;
            }
          } catch (err) {
            lastErr = err;
          }
        }
        if (lastErr) {
          const status = lastErr.response?.status;
          // Provide targeted guidance for 404
          throw new Error(
            `Failed to load sheet${status ? ` (HTTP ${status})` : ''}. Check: 1) Did you use the Spreadsheet ID (not the full URL or 2PACX token unless published)? 2) Is sheet shared: Anyone with link (Viewer)? 3) If using 2PACX token, ensure you published the sheet (File > Share > Publish to web).`
          );
        }
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    load();
  }, []);

  // Detect columns
  const idKey = useMemo(() => findColumnKey(rows, ["id", "employee id", "emp id", "employee"]), [rows]);
  const nameKey = useMemo(() => findColumnKey(rows, ["name", "employee name"], true), [rows]);
  const statusKey = useMemo(() => findColumnKey(rows, ["status", "attendance", "state"], true), [rows]);

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
    if (!selectedEmployee) return { present: 0, absent: 0, sick: 0, total: 0 };
    let present = 0, absent = 0, sick = 0;
    selectedEmployee.logs.forEach(l => {
      const s = (l.status || '').toUpperCase();
      if (s === 'P' || s === 'PRESENT') present++; else if (s === 'A' || s === 'ABSENT') absent++; else if (s === 'S' || s === 'SICK') sick++;
    });
    const total = present + absent + sick;
    return { present, absent, sick, total };
  }, [selectedEmployee]);

  // PDF functionality removed

  return (
    <div className="min-h-screen p-6 sm:p-10 bg-gradient-to-b from-white to-slate-50 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Quick Report</h1>
            <p className="text-xs text-slate-500">Load Google Sheet & view employee attendance.</p>
          </div>
          <div className="flex gap-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by ID or Name" className="border rounded-md px-3 py-2 text-sm w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </header>
        {/* {!SHEET_ID || SHEET_ID === 'REPLACE_WITH_SHEET_ID' ? <div className="p-3 border border-amber-300 bg-amber-50 text-amber-700 rounded text-xs">Set <code className="font-mono">NEXT_PUBLIC_SHEET_ID</code> to your Spreadsheet ID (the part between /d/ and /edit) or a published 2PACX token.</div> : null} */}
        {loading && <div className="text-xs text-slate-500">Loading...</div>}
  {error && (<div className="text-xs text-red-600">Error: {error}</div>)}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-2">
            <h2 className="text-sm font-medium text-slate-600 uppercase">Employees</h2>
            <div className="border rounded-md divide-y max-h-[480px] overflow-auto bg-white">
              {filtered.map(emp => (
                <button key={emp.id} onClick={() => { setSelectedId(emp.id); setReason(''); }} className={`w-full flex flex-col items-start px-3 py-2 text-left text-sm hover:bg-indigo-50 ${emp.id === selectedId ? 'bg-indigo-100 font-medium' : ''}`}> <span>{emp.name || 'Unnamed'}</span> <span className="text-[11px] text-slate-500">ID: {emp.id}</span></button>
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
                    <p className="text-xs text-slate-500">Employee ID: {selectedEmployee.id}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Records: {selectedEmployee.logs.length}</p>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Present" value={attendanceStats.present} color="text-emerald-600" />
                  <Stat label="Absent" value={attendanceStats.absent} color="text-rose-600" />
                  <Stat label="Sick" value={attendanceStats.sick} color="text-amber-600" />
                  <Stat label="Total" value={attendanceStats.total} color="text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-600">Daily Logs</h3>
                  <div className="border rounded-md max-h-60 overflow-auto text-xs">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-slate-600">
                          <th className="py-1 px-2 font-medium">Date</th>
                          <th className="py-1 px-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployee.logs.slice(0, 150).map((l, i) => (
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
                  <label className="text-sm font-medium text-slate-600">Notes</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Write a note..." className="w-full border rounded-md p-2 text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {reason && <p className="text-[10px] text-slate-500 italic">Note saved locally (no export).</p>}
                </div>
                {/* Download PDF button removed */}
              </div>
            ) : <div className="text-sm text-slate-500 border rounded-md p-6 bg-white">Select an employee to view details.</div>}
          </div>
        </div>
        <footer className="pt-4 text-center text-[11px] text-slate-400">Local generation • Google Sheets data</footer>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return <div className="rounded-md bg-slate-50 border p-3 flex flex-col items-center gap-1"><div className={`text-base font-semibold ${color}`}>{value}</div><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div></div>;
}

function StatusPill({ status }) {
  const s = (status || '').toUpperCase();
  let color = 'bg-slate-200 text-slate-700'; let text = s;
  if (s === 'P' || s === 'PRESENT') { color = 'bg-emerald-100 text-emerald-700'; text = 'Present'; }
  else if (s === 'A' || s === 'ABSENT') { color = 'bg-rose-100 text-rose-700'; text = 'Absent'; }
  else if (s === 'S' || s === 'SICK') { color = 'bg-amber-100 text-amber-700'; text = 'Sick'; }
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${color}`}>{text || '-'}</span>;
}

function findColumnKey(rows, candidates) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  for (const c of candidates) {
    const hit = keys.find(k => k.trim().toLowerCase() === c);
    if (hit) return hit;
  }
  return null;
}

// PDF-related helper code removed
