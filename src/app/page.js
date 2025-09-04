"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRef } from 'react';
import DownloadPDF from "../components/DownloadPDF";
import Print from "../components/Print";
import Formate from "@/components/Formate";


const DEFAULT_SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "1KOr9dTMKcvwjp2M3I5rFfs2G0I279Euqdsa8PoJ1Llw";
const DEFAULT_SHEET_GID = process.env.NEXT_PUBLIC_SHEET_GID || "1218107331";

// Return multiple candidate URLs we will try in order.
function buildCandidateUrls(sheetId, sheetGid) {
  if (!sheetId || sheetId === 'REPLACE_WITH_SHEET_ID') return [];
  const urls = [];
  const isPublishedToken = sheetId.startsWith('2PACX');
  if (isPublishedToken) {
    // Published sheet (File > Share > Publish to web) pattern
    // Base: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv(&gid=)
    // urls.push(`https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv${sheetGid ? `&gid=${sheetGid}` : ''}`);
  } else {
    // Normal spreadsheet ID
    if (sheetGid) {
      urls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`);
    }
  }
  return urls;
}

// Robust CSV parser: handles quoted fields, embedded commas, and newlines inside quotes.
function parseCSV(text) {
  const rows = [];
  let field = '';
  let current = [];
  let inQuotes = false;
  const pushField = () => { current.push(field); field = ''; };
  const pushRow = () => {
    // Ignore completely empty rows
    if (current.some(c => c.trim() !== '')) rows.push(current);
    current = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      pushField();
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // Handle CRLF \r\n: skip following \n
      if (ch === '\r' && text[i + 1] === '\n') i++;
      pushField();
      pushRow();
    } else {
      field += ch;
    }
  }
  // Flush last field/row
  pushField();
  pushRow();

  if (!rows.length) return [];
  // Find header: row containing at least Name + (E.ID or S.L)
  let headerIdx = rows.findIndex(r => r.some(c => /name/i.test(c)) && r.some(c => /E\.ID|S\.L/i.test(c)));
  if (headerIdx === -1) headerIdx = 0;
  const headers = rows[headerIdx].map(h => h.trim());
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.length && r.some(c => c.trim().length));
  const results = dataRows.map((r, rowIdx) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    // Ensure E.ID exists: if empty, fallback to S.L or generate synthetic ID
    if (!obj['E.ID']) {
      if (obj['S.L']) obj['E.ID'] = obj['S.L'];
      else obj['E.ID'] = `GEN-${rowIdx + 1}`; // synthetic fallback
    }
    return obj;
  });
  return results;
}

export default function Home() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");
  const [sheetId, setSheetId] = useState(DEFAULT_SHEET_ID);
  const [sheetGid, setSheetGid] = useState(DEFAULT_SHEET_GID);
  const [period, setPeriod] = useState('full'); // full | first | second
  const reportRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!sheetId || sheetId === "REPLACE_WITH_SHEET_ID") return;
      setLoading(true); setError(null);
      try {
        const urls = buildCandidateUrls(sheetId, sheetGid);
        if (!urls.length) return;
        let lastErr = null;
        for (const url of urls) {
          try {
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
          throw new Error(
            `Failed to load sheet${status ? ` (HTTP ${status})` : ''}. Check: 1) Did you use the Spreadsheet ID (not the full URL or 2PACX token unless published)? 2) Is sheet shared: Anyone with link (Viewer)? 3) If using 2PACX token, ensure you published the sheet (File > Share > Publish to web).`
          );
        }
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    load();
  }, [sheetId, sheetGid]);

  // Detect columns (adapted for your sheet)
  const idKey = useMemo(() => findColumnKey(rows, ["id", "employee id", "emp id", "employee"]), [rows]);
  const nameKey = useMemo(() => findColumnKey(rows, ["Name", "name", "employee name"], true), [rows]);
  // Day columns: 1,2,3,...,31
  const dayColumns = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.filter(k => /^\d+$/.test(k));
  }, [rows]);

  // Employees extraction for wide format
  const employees = useMemo(() => {
    if (!rows.length) return [];
    return rows
      .filter(r => (r[idKey] || r['S.L']) && r[nameKey])
      .map(r => {
        // Internal navigation id prefers S.L (serial) then fallback to detected id column
        const internalId = (r['S.L'] && r['S.L'].trim()) || (idKey && r[idKey]) || '';
        const eId = (r['E.ID'] && r['E.ID'].trim()) || 'N/A';
        const logs = dayColumns.map(col => ({ date: col, status: (r[col] || '').trim(), raw: r }));
        return { id: internalId, eId, name: r[nameKey], logs };
      });
  }, [rows, idKey, nameKey, dayColumns]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return employees;
    return employees.filter(e => (
      (e.eId && e.eId.toLowerCase().includes(q)) ||
      (e.name && e.name.toLowerCase().includes(q))
    ));
  }, [employees, query]);

  const selectedEmployee = useMemo(() => filtered.find(e => e.id === selectedId) || null, [filtered, selectedId]);

  // Derive day range based on period
  const periodInfo = useMemo(() => {
    if (period === 'first') return { start: 1, end: 15, label: '1 – 15 '+currentMonthName(rows) };
    if (period === 'second') return { start: 16, end: 31, label: '16 – 31 '+currentMonthName(rows) };
    return { start: 1, end: 31, label: 'Full Month '+currentMonthName(rows) };
  }, [period, rows]);

  // Filter logs for selected employee according to period
  const periodLogs = useMemo(() => {
    if (!selectedEmployee) return [];
    return selectedEmployee.logs.filter(l => {
      const day = parseInt(l.date,10);
      if (isNaN(day)) return false;
      return day >= periodInfo.start && day <= periodInfo.end;
    });
  }, [selectedEmployee, periodInfo]);

  console.log({ selectedEmployee });


  const attendanceStats = useMemo(() => {
    if (!selectedEmployee) return { totalPresent: 0, totalAbsent: 0, totalLate: 0, casual: 0, sickLeave: 0, earlyLeave: 0, withOutReason: 0 };
    let present = 0, absent = 0, late = 0, casual = 0, sickLeave = 0, earlyLeave = 0, withOutReason = 0;
    periodLogs.forEach(l => {
      const s = (l.status || '').toUpperCase();
      if (!s || s === 'W.H') return; // ignore weekends/holidays
      if (['P', 'CL', 'SL'].includes(s)) present++; // T.P style
      if (['A', 'CL', 'SL'].includes(s)) absent++; // TA counts actual absences
      if (s === 'L') late++;
      if (s === 'A') withOutReason++;
      if (s === 'CL') casual++;
      if (s === 'SL') sickLeave++;
      if (s === 'EL') earlyLeave++;
    });
    return { totalPresent: present, totalAbsent: absent, totalLate: late, casual, sickLeave, earlyLeave, withOutReason };
  }, [selectedEmployee, periodLogs]);



  // PDF functionality removed

  return (
    <div className="min-h-screen p-6 sm:p-10 bg-gradient-to-b from-white to-slate-50 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Quick Report</h1>
            <p className="text-xs text-slate-500">Load Google Sheet & view employee attendance.</p>
          </div>
          <div className="flex gap-3 items-center">
            <input value={sheetId} onChange={e => setSheetId(e.target.value)} placeholder="Sheet ID" className="border rounded-md px-3 py-2 text-sm w-48 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " />
            <input value={sheetGid} onChange={e => setSheetGid(e.target.value)} placeholder="Sheet GID" className="border rounded-md px-3 py-2 text-sm w-32 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by ID or Name" className="border rounded-md px-3 py-2 text-sm w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 " />
          </div>
        </header>
        {loading && <div className="text-xs text-slate-500">Loading...</div>}
        {error && (<div className="text-xs text-red-600">Error: {error}</div>)}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-1 space-y-2">
            <h2 className="text-sm font-medium text-slate-600 uppercase">Employees</h2>
            <div className="border rounded-md divide-y max-h-[480px] overflow-auto bg-white">
              {filtered.map(emp => (
                <button
                  key={emp.id || emp.eId}
                  onClick={() => { setSelectedId(emp.id); setReason(''); }}
                  className={`w-full flex flex-col items-start px-3 py-2 text-left text-sm hover:bg-indigo-50 ${emp.id === selectedId ? 'bg-indigo-100 font-medium' : ''}`}
                >
                  <span>{emp.name || 'Unnamed'}</span>
                  <span className="text-[11px] text-slate-500">E.ID: {emp.eId} | ID: {emp.id || '—'}</span>
                </button>
              ))}
              {!filtered.length && <div className="px-3 py-4 text-xs text-slate-500">No matches.</div>}
            </div>
          </div>
          <div className="md:col-span-3">
            {selectedEmployee ? (
              <div id="employee-report" className="space-y-4 bg-white rounded-lg border shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedEmployee.name}</h2>
                    <p className="text-xs text-slate-500">E.ID: {selectedEmployee.eId} (ID: {selectedEmployee.id || '—'})</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Records: {selectedEmployee.logs.length}</p>
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <Stat label="T.P" value={attendanceStats.totalPresent} color="text-emerald-600" />
                  <Stat label="TA" value={attendanceStats.totalAbsent} color="text-rose-600" />
                  <Stat label="TL" value={attendanceStats.totalLate} color="text-orange-600" />
                  <Stat label="CL" value={attendanceStats.casual} color="text-indigo-600" />
                  <Stat label="SL" value={attendanceStats.sickLeave} color="text-amber-600" />
                </div>
                {/* Performance Tracking Template */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">Performance Tracking Report (Bi-weekly)</h3>
                    <div className="flex gap-2 items-center">
                      <div className="flex border rounded overflow-hidden text-xs">
                        <button onClick={()=>setPeriod('full')} className={`px-2 py-2 cursor-pointer  ${period==='full'?'bg-indigo-600 text-white hover:bg-indigo-700':'bg-white text-slate-600 hover:bg-slate-100'}`}>Full</button>
                        <button onClick={()=>setPeriod('first')} className={`px-2 py-2 border-l cursor-pointer  ${period==='first'?'bg-indigo-600 text-white hover:bg-indigo-700':'bg-white text-slate-600 hover:bg-slate-100'}`}>1st</button>
                        <button onClick={()=>setPeriod('second')} className={`px-2 py-2 border-l cursor-pointer  ${period==='second'?'bg-indigo-600 text-white hover:bg-indigo-700':'bg-white text-slate-600 hover:bg-slate-100'}`}>2nd</button>
                      </div>
                      <Print targetRef={reportRef} />
                      <DownloadPDF targetRef={reportRef} fileName={`report-${selectedEmployee.name}-${period}`} />
                    </div>
                  </div>
                  <Formate reportRef={reportRef} selectedEmployee={selectedEmployee} attendanceStats={attendanceStats} reason={reason} rangeLabel={periodInfo.label} />
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
                        {periodLogs.map((l, i) => (
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
  let color = 'bg-slate-200 text-slate-700'; let text = s || '-';
  if (s === 'P') { color = 'bg-emerald-100 text-emerald-700'; text = 'P'; }
  else if (s === 'A') { color = 'bg-rose-100 text-rose-700'; text = 'A'; }
  else if (s === 'L') { color = 'bg-orange-100 text-orange-700'; text = 'L'; }
  else if (s === 'CL') { color = 'bg-indigo-100 text-indigo-700'; text = 'CL'; }
  else if (s === 'SL') { color = 'bg-amber-100 text-amber-700'; text = 'SL'; }
  else if (s === 'W.H') { color = 'bg-slate-100 text-slate-500'; text = 'W.H'; }
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${color}`}>{text}</span>;
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

function currentMonthName(rows){
  if(!rows || !rows.length) return '';
  // Find a row with 'Month' key
  const row = rows.find(r => r['Month']);
  const m = row && row['Month'];
  return m || '';
}
