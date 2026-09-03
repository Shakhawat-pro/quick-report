// Inline style objects used by the printable report layout
export const reportStyles = {
  container: {
    padding: '24px',
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    fontSize: '14px',
    lineHeight: 1.4,
    color: '#111'
  },
  heading: {
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 4px'
  },
  subHeading: {
    textAlign: 'center',
    margin: '0 0 16px',
    fontWeight: 400
  },
  sectionWrapper: { marginBottom: '16px' },
  columnStack: { display: 'flex', flexDirection: 'column', gap: '20px' },
  row: {
    border: '1px solid #000',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '56px'
  },
  rowAuto: {
    border: '1px solid #000',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch'
  },
  cell: {
    flex: 1,
    padding: '4px 8px',
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
    border: '0',
    outline: 'none',
    background: 'transparent',
    boxSizing: 'border-box'
  },
  footerText: { textAlign: 'center', fontWeight: 600, margin: 0 },
  date: { padding: '4px 8px', fontWeight: 600 }
};
