"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PdfRendererButton from "./PdfRendererButton";
import AutoWidthInput from "./AutoWidthInput";
import { reportStyles as styles } from "@/styles/reportStyles";
import { presetOptions } from "@/constants/presets";
import { buildActivityText, computeMonthRange } from "@/utils/attendance";



const Formate = ({ reportRef, selectedEmployee, attendanceStats, reason, rangeLabel, period }) => {
    // Store per-employee manual states so switching employees preserves their values
    const perEmployeeRef = useRef({}); // { eId: manualState }

    const createInitialManual = ({ late, absent }) => {
        return {
            range: rangeLabel || "N/A",
            month: "",
            leaveReason: "N/A",
            workFromHome: "N/A",
            activity: buildActivityText({ late, absent }),
            recommendation: "N/A",
            behavior: "Good",
            comment: reason || "N/A",
        };
    };

    const [manual, setManual] = useState(createInitialManual({ late: attendanceStats?.totalLate || 0, absent: attendanceStats?.totalAbsent || 0 }));

    // Compute dynamic period label when a month is chosen.
    const computedMonthRange = useMemo(() => computeMonthRange(manual.month, period), [manual.month, period]);

    // When month changes, auto-populate the editable range based on selected period
    useEffect(() => {
        if (!selectedEmployee?.eId) return;
        if (!manual.month) return; // only act when a month is selected
        if (!computedMonthRange) return;
        if (manual.range === computedMonthRange) return;
        setManual(prev => {
            const next = { ...prev, range: computedMonthRange };
            perEmployeeRef.current[selectedEmployee.eId] = next;
            return next;
        });
    }, [manual.month, computedMonthRange, selectedEmployee?.eId]);

    // Reset manual fields whenever period changes
    useEffect(() => {
        if (!selectedEmployee?.eId) return;
        const id = selectedEmployee.eId;

        // Create initial manual using current attendance stats
        const initial = createInitialManual({
            late: attendanceStats?.totalLate || 0,
            absent: attendanceStats?.totalAbsent || 0
        });

        // Update cache and state
        perEmployeeRef.current[id] = initial;
        setManual(initial);

    }, [period, selectedEmployee?.eId, attendanceStats?.totalLate, attendanceStats?.totalAbsent]);


    // Keep range in sync with external rangeLabel changes (update current employee's cached state too)
    useEffect(() => {
        if (!selectedEmployee?.eId) return;
        setManual(prev => {
            const next = { ...prev, range: rangeLabel || 'N/A' };
            perEmployeeRef.current[selectedEmployee.eId] = next;
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeLabel]);

    const handleChange = (key, value) => {
        setManual(prev => {
            const next = { ...prev, [key]: value };
            if (selectedEmployee?.eId) {
                perEmployeeRef.current[selectedEmployee.eId] = next;
            }
            return next;
        });
    };


    return (
        <>
            <div className="mb-4 border-b-1 border-gray-200  p-3 ">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold tracking-wide text-slate-600 uppercase">Report Fields</h4>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedEmployee?.eId) return;
                                const initial = createInitialManual({
                                    late: attendanceStats?.totalLate || 0,
                                    absent: attendanceStats?.totalAbsent || 0
                                });
                                perEmployeeRef.current[selectedEmployee.eId] = initial;
                                setManual(initial);
                            }}
                            disabled={!selectedEmployee?.eId}
                            className="px-3 py-2 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >Reset</button>
                        <PdfRendererButton manual={manual} selectedEmployee={selectedEmployee} attendanceStats={attendanceStats} />
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 text-[12px]">
                    {[
                        { key: 'leaveReason', label: 'Leave Reason', opts: presetOptions.leaveReason, w: 'min-w-[160px]' },
                        { key: 'activity', label: 'Activity', opts: presetOptions.activity, w: 'min-w-[160px]' },
                        { key: 'recommendation', label: 'Recommendation', opts: presetOptions.recommendation, w: 'min-w-[180px]' },
                        { key: 'behavior', label: 'Behavior', opts: presetOptions.behavior, w: 'min-w-[140px]' },
                        { key: 'comment', label: 'Comment', opts: presetOptions.comment, w: 'min-w-[180px]' },
                        { key: 'month', label: 'Month', opts: presetOptions.months, w: 'min-w-[140px]' }
                    ].map(f => (
                        <div key={f.key} className={f.w}>
                            <label htmlFor={`sel-${f.key}`} className="block font-semibold mb-0.5">{f.label}</label>
                            <select
                                id={`sel-${f.key}`}
                                value={manual[f.key]}
                                onChange={e => handleChange(f.key, e.target.value)}
                                className="w-full border border-slate-300 rounded-sm bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select…</option>
                                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
            {/* Printable content */}
            <div ref={reportRef} style={styles.container}>
                <h2 style={styles.heading}>Performance tracking report (Bi-weekly)</h2>
                <p style={styles.subHeading}>
                    (Report from HR department)
                    <span style={{ marginLeft: 5 }}>(
                        {!manual.month && (
                            <AutoWidthInput
                                value={manual.range}
                                onChange={(val) => handleChange('range', val)}
                                placeholder="Manual write"
                                style={{ marginLeft: '20px' }}
                            />
                        )}
                        {manual.month && (
                            <AutoWidthInput
                                value={manual.range}
                                onChange={(val) => handleChange('range', val)}
                                placeholder="Range"
                                style={{ marginLeft: '20px', fontWeight: 600, fontSize: '14px' }}
                            />
                        )}
                        )</span>
                </p>
                <div style={styles.sectionWrapper}>
                    <div style={styles.columnStack}>
                        {/* Employee Name */}
                        <div style={styles.row}>
                            <div style={styles.cell}>Employee name -</div>
                            <div style={styles.cellBorderLeft}>{selectedEmployee.name}</div>
                        </div>

                        {/* Employee ID */}
                        <div style={styles.row}>
                            <div style={styles.cell}>Employee ID -</div>
                            <div style={styles.cellBorderLeft}>{selectedEmployee.eId}</div>
                        </div>

                        {/* Attendance / Late */}
                        <div style={styles.row}>
                            <div style={styles.cell}>Attendance – {attendanceStats?.totalAbsent} days Leave</div>
                            <div style={styles.cellBorderLeft}>Late attendance – {attendanceStats.totalLate} days</div>
                        </div>

                        {/* Early Leave / Without Reason */}
                        <div style={styles.row}>
                            <div style={styles.cell}>Early Leave - {attendanceStats.earlyLeave}</div>
                            <div style={styles.cellBorderLeft}>Leaves (without reason) - {attendanceStats.withOutReason}</div>
                        </div>

                        {/* Leaves with reason / textarea */}
                        <div style={styles.rowAuto}>
                            <div style={styles.cell}>Leaves (with reason) - {attendanceStats.withReason}</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    value={manual.leaveReason}
                                    onChange={(e) => handleChange('leaveReason', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

                        {/* Activity */}
                        <div style={styles.rowAuto}>
                            <div style={styles.cell}>Activity -</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    value={manual.activity}
                                    onChange={(e) => handleChange('activity', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div style={styles.rowAuto}>
                            <div style={styles.cell}>Suggestion or Recommendations -</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    value={manual.recommendation}
                                    onChange={(e) => handleChange('recommendation', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

                        {/* Behavior */}
                        <div style={styles.rowAuto}>
                            <div style={styles.cell}>Behavior -</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    value={manual.behavior}
                                    onChange={(e) => handleChange('behavior', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

                        {/* Comment */}
                        <div style={styles.rowAuto}>
                            <div style={styles.cell}>Comment -</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    ref={(el) => {
                                        if (el) {
                                            el.style.height = "auto";           // reset height
                                            el.style.height = el.scrollHeight + "px"; // set to scrollHeight
                                        }
                                    }}
                                    value={manual.comment || 'N/A'}
                                    onChange={(e) => handleChange('comment', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

                        {/* <div style={styles.rowAuto}>
                            <div style={styles.cell}>Comment -</div>
                            <div style={styles.textAreaCell}>
                                <textarea
                                    value={manual.comment || 'N/A'}
                                    onChange={e => handleChange('comment', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                    rows={1}
                                    ref={el => {
                                        if (el) {
                                            el.style.height = "auto";
                                            el.style.height = el.scrollHeight + "px";
                                        }
                                    }}
                                    onInput={e => {
                                        e.target.style.height = "auto";
                                        e.target.style.height = e.target.scrollHeight + "px";
                                    }}
                                />
                            </div>
                        </div> */}

                        {/* Date */}
                        <div style={styles.date}>Submitted Date – {new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <p style={styles.footerText}>*** Attach additional documents or attachments with this report ***</p>
            </div>
        </>
    );
};

export default Formate;
