"use client";
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import PdfRendererButton from "./PdfRendererButton";

// Inline (raw) CSS style objects to replace Tailwind utility classes
const styles = {
    container: {
        padding: '24px', // p-6
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif', // font-sans
        fontSize: '14px', // text-sm
        lineHeight: 1.4,
        color: '#111'
    },
    heading: {
        textAlign: 'center',
        fontSize: '20px', // text-xl
        fontWeight: 700,
        margin: '0 0 4px'
    },
    subHeading: {
        textAlign: 'center',
        margin: '0 0 16px',
        fontWeight: 400
    },
    sectionWrapper: {
        marginBottom: '16px'
    },
    columnStack: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px' // gap-5
    },
    row: {
        border: '1px solid #000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '56px' // h-14
    },
    rowAuto: {
        border: '1px solid #000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'stretch'
    },
    cell: {
        flex: 1,
        padding: '4px 8px', // py-1 px-2
        fontWeight: 600,
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    },
    cellBorderLeft: {
        flex: 1,
        padding: '4px 8px',
        fontWeight: 600,
        borderLeft: '1px solid #000',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    },
    textAreaCell: {
        flex: 1,
        padding: '4px 8px',
        fontWeight: 600,
        borderLeft: '1px solid #000',
        display: 'flex'
    },
    textarea: {
        width: '100%',
        minHeight: '46px',
        resize: 'vertical',
        fontFamily: 'inherit',
        fontSize: '13px',
        lineHeight: 1.3,
        padding: '4px 6px',
        border: '0', // remove inner border to avoid double border effect
        outline: 'none',
        background: 'transparent',
        boxSizing: 'border-box'
    },
    footerText: {
        textAlign: 'center',
        fontWeight: 600,
        margin: 0
    },
    date: {
        padding: '4px 8px',
        fontWeight: 600
    }
};

// Preset options for quick selection (user can still manually edit textarea)
const presetOptions = {
    leaveReason: ['Sick Leave', 'Casual Leave', 'Official Duty'],
    activity: ['Consistent Output', 'Improving Performance', 'Needs Attention'],
    recommendation: ['Continue Current Plan', 'Provide Training', 'Consider Promotion'],
    behavior: ['Excellent', 'Good', 'Needs Improvement'],
    comment: [
        // ✅ Positive / Satisfactory
        'Attendance is regular and satisfactory.',
        'No late arrivals recorded this period.',
        'Good improvement in punctuality.',
        'Consistently maintained full attendance.',
        'No uninformed absences reported.',
        'Leave taken as per prior approval.',
        'Attendance trend is stable.',
        'Positive change compared to last period.',
        'Maintained office timing properly.',
        'Excellent attendance record this cycle.',

        // ⚠️ Needs Improvement
        'Frequent late arrivals, needs improvement.',
        'Absent without notice on one occasion.',
        'Needs to be more regular in attendance.',
        'Punctuality is below expectations.',
        'Attendance is not consistent this period.',
        'Requires better time management.',
        'Multiple uninformed absences recorded.',
        'Needs to improve presence in the office.',
        'Late reporting is affecting overall performance.',
        'Should reduce casual late arrivals.',

        // 🔄 Mixed / Neutral
        'Attendance is better than previous report, but still room for improvement.',
        'Slight improvement noticed in punctuality.',
        'Regular attendance with a few exceptions.',
        'Late arrivals reduced compared to earlier.',
        'Absent days slightly higher this period.',
        'Maintains attendance but needs more consistency.',
        'Leave management is fine, punctuality needs attention.',
        'Attendance overall acceptable with minor issues.',
        'Good attendance but late coming is frequent.',
        'Noticeable improvement, keep it up.'
    ],
    months: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
};


// (Tailwind will be used for the non-print controls block only)

// Auto-resizing text input based on content width
function AutoWidthInput({ value, onChange, placeholder, style }) {
    const spanRef = useRef(null);
    const [w, setW] = useState(60); // px
    useLayoutEffect(() => {
        if (spanRef.current) {
            const width = spanRef.current.getBoundingClientRect().width;
            // Add small padding buffer
            setW(Math.max(40, Math.min(width + 12, 260)));
        }
    }, [value, placeholder]);


    return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
                ref={spanRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    font: 'inherit',
                    padding: '0 6px',
                    fontWeight: 400
                }}
            >{value || placeholder}</span>
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                style={{
                    font: 'inherit',
                    fontWeight: 400,
                    height: '24px',
                    padding: '0 6px',
                    border: '0',
                    outline: 'none',
                    background: 'transparent',
                    width: w,
                    boxSizing: 'content-box',
                    ...style
                }}
            />
        </span>
    );
}

const Formate = ({ reportRef, selectedEmployee, attendanceStats, reason, rangeLabel, period }) => {
    // Store per-employee manual states so switching employees preserves their values
    const perEmployeeRef = useRef({}); // { eId: manualState }

    const createInitialManual = ({ late, absent }) => {

        let activity;
        if (late === 0 && absent === 0) {
            activity = "No late arrivals or absences recorded during this period.";
        } else {
            const lateText = `${late} ${late === 1 ? "late arrival" : "late arrivals"}`;
            const absentText = `${absent} ${absent === 1 ? "absence" : "absences"}`;
            activity = `${lateText} and ${absentText} recorded during this period.`;
        }

        return {
            range: rangeLabel || "N/A",
            month: "",
            leaveReason: "N/A",
            workFromHome: "N/A",
            activity,
            recommendation: "N/A",
            behavior: "Good",
            comment: reason || "N/A",
        };
    };

    const [manual, setManual] = useState(createInitialManual({ late: attendanceStats?.totalLate || 0, absent: attendanceStats?.totalAbsent || 0 }));

    // Compute dynamic period label when a month is chosen.
    const computedMonthRange = useMemo(() => {
        if (!manual.month) return null;
        const monthIndex = presetOptions.months.indexOf(manual.month); // 0-based
        if (monthIndex === -1) return null;
        const year = new Date().getFullYear();
        const lastDay = new Date(year, monthIndex + 1, 0).getDate();
        if (period === 'first') return `1 ${manual.month} - 15 ${manual.month}`;
        if (period === 'second') return `16 ${manual.month} - ${lastDay} ${manual.month}`;
        return `1 ${manual.month} - ${lastDay} ${manual.month}`;
    }, [manual.month, period]);

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
                                const initial = createInitialManual();
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
                                    value={manual.comment || 'N/A'}
                                    onChange={(e) => handleChange('comment', e.target.value)}
                                    placeholder="Manual write"
                                    style={styles.textarea}
                                />
                            </div>
                        </div>

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
