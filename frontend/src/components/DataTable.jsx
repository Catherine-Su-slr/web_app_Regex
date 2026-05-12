import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

const s = {
  wrapper: { overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' },
  th: {
    background: 'var(--surface)', color: 'var(--muted)', fontWeight: 600,
    padding: '0.6rem 0.9rem', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  thHighlight: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' },
  td: {
    padding: '0.55rem 0.9rem', borderBottom: '1px solid var(--border)',
    color: 'var(--text)', maxWidth: '260px', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tdNull: { color: 'var(--muted)', fontStyle: 'italic' },
  tr: { transition: 'background 0.1s' },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderTop: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: '0.8rem', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
  },
  pgBtns: { display: 'flex', gap: '0.4rem' },
  pgBtn: (disabled) => ({
    background: 'none', border: '1px solid var(--border)', borderRadius: 6,
    color: disabled ? 'var(--border)' : 'var(--text)', padding: '2px 8px',
    cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
  }),
};

export default function DataTable({ columns, rows, highlightColumns = [], totalRows }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [rows, page]
  );

  if (!columns || columns.length === 0) return null;

  return (
    <div>
      <div style={s.wrapper}>
        <table style={s.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{ ...s.th, ...(highlightColumns.includes(col) ? s.thHighlight : {}) }}
                >
                  {col}
                  {highlightColumns.includes(col) && (
                    <span style={{ marginLeft: 4, fontSize: '0.65rem', color: 'var(--accent)' }}>✦</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                style={s.tr}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td
                      key={col}
                      style={{ ...s.td, ...(val === null || val === undefined ? s.tdNull : {}) }}
                      title={val !== null && val !== undefined ? String(val) : ''}
                    >
                      {val === null || val === undefined ? 'null' : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={s.pagination}>
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {totalRows ?? rows.length} rows
            </span>
            <div style={s.pgBtns}>
              <button style={s.pgBtn(page === 0)} onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: '2px 8px', color: 'var(--text)' }}>{page + 1} / {totalPages}</span>
              <button style={s.pgBtn(page === totalPages - 1)} onClick={() => setPage((p) => p + 1)} disabled={page === totalPages - 1}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
