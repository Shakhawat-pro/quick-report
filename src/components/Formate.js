"use client";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

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
    comment: ['Keep up the good work', 'Monitor next period', 'Follow up required']
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

const Formate = ({ reportRef, selectedEmployee, attendanceStats, reason, rangeLabel }) => {
    // Store per-employee manual states so switching employees preserves their values
    const perEmployeeRef = useRef({}); // { eId: manualState }

    const createInitialManual = () => ({
        range: rangeLabel || "N/A",
        leaveReason: "N/A",
        workFromHome: "N/A",
        activity: "N/A",
        recommendation: "N/A",
        behavior: "Good",
        comment: reason || "N/A",
    });

    const [manual, setManual] = useState(createInitialManual);

    // On employee change: load existing manual state or create & cache a new one
    useEffect(() => {
        if (!selectedEmployee?.eId) return;
        const id = selectedEmployee.eId;
        if (perEmployeeRef.current[id]) {
            setManual(perEmployeeRef.current[id]);
        } else {
            const initial = createInitialManual();
            perEmployeeRef.current[id] = initial;
            setManual(initial);
        }
    }, [selectedEmployee?.eId]);

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
            {/* Non-print controls (presets) */}
            <div className="flex flex-wrap gap-3 mb-3 text-[12px] itemce">
                <div className="min-w-[160px]">
                    <label className="block font-semibold mb-0.5">Leave Reason</label>
                    <select
                        value={manual.leaveReason}
                        onChange={(e) => handleChange('leaveReason', e.target.value)}
                        className="w-full border border-gray-400 rounded-sm bg-white/70 px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="">Select…</option>
                        {presetOptions.leaveReason.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div className="min-w-[160px]">
                    <label className="block font-semibold mb-0.5">Activity</label>
                    <select
                        value={manual.activity}
                        onChange={(e) => handleChange('activity', e.target.value)}
                        className="w-full border border-gray-400 rounded-sm bg-white/70 px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="">Select…</option>
                        {presetOptions.activity.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div className="min-w-[180px]">
                    <label className="block font-semibold mb-0.5">Recommendation</label>
                    <select
                        value={manual.recommendation}
                        onChange={(e) => handleChange('recommendation', e.target.value)}
                        className="w-full border border-gray-400 rounded-sm bg-white/70 px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="">Select…</option>
                        {presetOptions.recommendation.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div className="min-w-[140px]">
                    <label className="block font-semibold mb-0.5">Behavior</label>
                    <select
                        value={manual.behavior}
                        onChange={(e) => handleChange('behavior', e.target.value)}
                        className="w-full border border-gray-400 rounded-sm bg-white/70 px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="">Select…</option>
                        {presetOptions.behavior.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div className="min-w-[180px]">
                    <label className="block font-semibold mb-0.5">Comment</label>
                    <select
                        value={manual.comment}
                        onChange={(e) => handleChange('comment', e.target.value)}
                        className="w-full border border-gray-400 rounded-sm bg-white/70 px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="">Select…</option>
                        {presetOptions.comment.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                {/* Reset current employee manual values */}
                <div className="flex flex-col justify-end ">
                    <button
                        type="button"
                        onClick={() => {
                            if (!selectedEmployee?.eId) return;
                            const initial = createInitialManual();
                            perEmployeeRef.current[selectedEmployee.eId] = initial;
                            setManual(initial);
                        }}
                        disabled={!selectedEmployee?.eId}
                        className="px-3 py-3 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >Reset</button>
                </div>
            </div>
            {/* Printable content */}
            <div ref={reportRef} style={styles.container}>
                <h2 style={styles.heading}>Performance tracking report (Bi-weekly)</h2>
                <p style={styles.subHeading}>
                    (Report from HR department)
                    <span style={{ marginLeft: 5 }}>(
                        <AutoWidthInput
                            value={manual.range}
                            onChange={(val) => handleChange('range', val)}
                            placeholder="Manual write"
                            style={{ marginLeft: '12px' }}
                        />
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
                            <div style={styles.cell}>Leaves (with reason) - {attendanceStats.casual + attendanceStats.sickLeave}</div>
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
