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
    const [manual, setManual] = useState({
        range: rangeLabel || "N/A",
        leaveReason: "N/A",
        workFromHome: "N/A",
        activity: "N/A",
        recommendation: "N/A",
        behavior: "Good",
        comment: reason || "N/A",
    });

    // Keep range in sync with external rangeLabel changes
    useEffect(() => {
        setManual(prev => ({ ...prev, range: rangeLabel || 'N/A' }));
    }, [rangeLabel]);

    const handleChange = (key, value) => {
        setManual(prev => ({ ...prev, [key]: value }));
    };

    return (
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
    );
};

export default Formate;
