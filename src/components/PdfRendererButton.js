import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useState } from 'react';

const PdfRendererButton = ({ manual, selectedEmployee, attendanceStats, fileName }) => {

    // PDF styles mirroring on-screen layout (simplified for PDF renderer)
    const pdfStyles = StyleSheet.create({
        page: { padding: 50, fontSize: 11, fontFamily: 'Helvetica', },
        heading: { textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 2 },
        sub: { textAlign: 'center', fontSize: 10, marginBottom: 14 },
        section: { marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 20 },
        row: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', minHeight: 40, alignItems: 'center' },
        cell: { flex: 1, padding: 4, fontWeight: 600, justifyContent: 'center', display: 'flex', minHeight: 40, },
        cellL: { flex: 1, padding: 4, fontWeight: 600, borderLeftWidth: 1, borderLeftColor: '#0 00', justifyContent: 'center', display: 'flex', minHeight: 40, },
        rowAuto: { flexDirection: 'row', borderWidth: 1, borderColor: '#000' },
        cellText: { fontSize: 10 },
        footer: { textAlign: 'center', fontSize: 10, fontWeight: 600, marginTop: 20 }
    });

    const buildPdfDocument = () => (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.heading}>Performance tracking report (Bi-weekly)</Text>
                <Text style={pdfStyles.sub}>Report from HR department ({manual.range || 'N/A'})</Text>
                <View style={pdfStyles.section}>
                    {/* Employee Name */}
                    <View style={pdfStyles.row}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Employee name -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{selectedEmployee?.name || '-'}</Text></View>
                    </View>
                    {/* Employee ID */}
                    <View style={pdfStyles.row}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Employee ID -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{selectedEmployee?.eId || '-'}</Text></View>
                    </View>
                    {/* Attendance / Late */}
                    <View style={pdfStyles.row}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Attendance – {attendanceStats?.totalAbsent ?? 0} days Leave</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>Late attendance – {attendanceStats?.totalLate ?? 0} days</Text></View>
                    </View>
                    {/* Early Leave / Without Reason */}
                    <View style={pdfStyles.row}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Early Leave - {attendanceStats?.earlyLeave ?? 0}</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>Leaves (without reason) - {attendanceStats?.withOutReason ?? 0}</Text></View>
                    </View>
                    {/* Leaves with reason */}
                    <View style={pdfStyles.rowAuto}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Leaves (with reason) - {attendanceStats?.withReason ?? 0}</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{manual.leaveReason || 'N/A'}</Text></View>
                    </View>
                    {/* Activity */}
                    <View style={pdfStyles.rowAuto}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Activity -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{manual.activity || 'N/A'}</Text></View>
                    </View>
                    {/* Recommendation */}
                    <View style={pdfStyles.rowAuto}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Suggestion or Recommendations -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{manual.recommendation || 'N/A'}</Text></View>
                    </View>
                    {/* Behavior */}
                    <View style={pdfStyles.rowAuto}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Behavior -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{manual.behavior || 'N/A'}</Text></View>
                    </View>
                    {/* Comment */}
                    <View style={pdfStyles.rowAuto}>
                        <View style={pdfStyles.cell}><Text style={pdfStyles.cellText}>Comment -</Text></View>
                        <View style={pdfStyles.cellL}><Text style={pdfStyles.cellText}>{manual.comment || 'N/A'}</Text></View>
                    </View>
                    {/* Date */}
                    <View style={{ marginTop: 8 }}>
                        <Text style={pdfStyles.cellText}>Submitted Date – {new Date().toLocaleDateString()}</Text>
                    </View>
                </View>
                <Text style={pdfStyles.footer}>*** Attach additional documents or attachments with this report ***</Text>
            </Page>
        </Document>
    );

    const [pdfGenerating, setPdfGenerating] = useState(false);
    const handlePdfDownload = async () => {
        if (!selectedEmployee) return;
        setPdfGenerating(true);
        try {
            const blob = await pdf(buildPdfDocument()).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `detailed-report-${(selectedEmployee.name || 'employee').replace(/[^a-z0-9-_]/gi, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 300);
        } finally {
            setPdfGenerating(false);
        }
    };
    return (
        <button
            type="button"
            onClick={handlePdfDownload}
            disabled={!selectedEmployee || pdfGenerating}
            className="px-3 py-2  text-xs rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >{pdfGenerating ? 'Generating…' : 'Download PDF'}</button>
    );
};

export default PdfRendererButton;