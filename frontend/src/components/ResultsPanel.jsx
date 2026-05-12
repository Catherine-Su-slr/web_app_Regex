import React, { useState } from 'react';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';
import DataTable from './DataTable';
import { downloadProcessed } from '../api';
import toast from 'react-hot-toast';

const s = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--success)',
    borderRadius: 'var(--radius)', overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '0.75rem',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  title: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' },
  statsRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  stat: {
    fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
    color: 'var(--muted)',
  },
  statVal: { color: 'var(--success)', fontWeight: 700 },
  actions: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  dlBtn: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 1.1rem', borderRadius: 8, fontFamily: 'var(--font-sans)',
    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
    border: `1px solid ${active ? 'var(--success)' : 'var(--border)'}`,
    background: active ? 'rgba(34,197,94,0.1)' : 'transparent',
    color: active ? 'var(--success)' : 'var(--muted)',
    transition: 'all 0.15s',
  }),
  warnings: {
    margin: '0.75rem 1.5rem',
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 8, padding: '0.75rem 1rem',
  },
  warnItem: { fontSize: '0.8rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 },
  tableWrap: { padding: '1rem 1.5rem' },
};

export default function ResultsPanel({ result, file, pattern, replacement, selectedCols, caseSensitive }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (fmt) => {
    if (!file || !pattern) return;
    setDownloading(true);
    try {
      await downloadProcessed(file, pattern, replacement, selectedCols, fmt, caseSensitive);
      toast.success(`Downloaded as ${fmt.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!result) return null;

  const { columns, rows, total_rows, matches_found, column_match_counts, warnings, new_column } = result;
  const highlightCols = new_column ? [new_column, ...selectedCols] : selectedCols;

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <CheckCircle size={18} color="var(--success)" />
          <span style={s.title}>Processed Results</span>
        </div>
        <div style={s.statsRow}>
          <span style={s.stat}>
            Rows: <span style={s.statVal}>{total_rows?.toLocaleString()}</span>
          </span>
          {matches_found !== undefined && (
            <span style={s.stat}>
              Replacements: <span style={s.statVal}>{matches_found?.toLocaleString()}</span>
            </span>
          )}
          {column_match_counts && Object.entries(column_match_counts).map(([col, n]) => (
            <span key={col} style={s.stat}>
              {col}: <span style={s.statVal}>{n}</span>
            </span>
          ))}
        </div>
      </div>

      {!new_column && (
        <div style={s.actions}>
          <button style={s.dlBtn(!downloading)} onClick={() => handleDownload('csv')} disabled={downloading}>
            <Download size={14} /> Download CSV
          </button>
          <button style={s.dlBtn(!downloading)} onClick={() => handleDownload('xlsx')} disabled={downloading}>
            <Download size={14} /> Download XLSX
          </button>
        </div>
      )}

      {warnings?.length > 0 && (
        <div style={s.warnings}>
          {warnings.map((w, i) => (
            <p key={i} style={s.warnItem}>⚠ {w}</p>
          ))}
        </div>
      )}

      <div style={s.tableWrap}>
        <DataTable
          columns={columns}
          rows={rows}
          highlightColumns={highlightCols}
          totalRows={total_rows}
        />
      </div>
    </div>
  );
}
