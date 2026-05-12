import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const s = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  title: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' },
  badge: {
    fontSize: '0.65rem', background: 'rgba(124,58,237,0.2)',
    color: '#a78bfa', borderRadius: 4, padding: '2px 6px',
    fontWeight: 700, letterSpacing: '0.05em',
  },
  body: { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--muted)', marginBottom: '0.4rem',
  },
  select: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem', padding: '0.6rem 1rem', outline: 'none',
  },
  input: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem', padding: '0.6rem 1rem', outline: 'none',
  },
  catRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' },
  catPill: {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    background: 'rgba(124,58,237,0.15)', border: '1px solid var(--accent2)',
    color: '#a78bfa', borderRadius: 6, padding: '3px 10px', fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
  },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', display: 'flex' },
  btn: (loading) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.6rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-sans)',
    fontWeight: 700, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none', background: loading ? 'var(--border)' : 'var(--accent)',
    color: '#fff', opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
  }),
  note: {
    fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)',
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 6, padding: '0.6rem 0.9rem',
  },
};

export default function TransformPanel({ textColumns, file, onTransform, loading }) {
  const [transformType, setTransformType] = useState('summarise');
  const [column, setColumn] = useState('');
  const [catInput, setCatInput] = useState('');
  const [categories, setCategories] = useState([]);

  const addCat = () => {
    const val = catInput.trim();
    if (val && !categories.includes(val)) {
      setCategories((prev) => [...prev, val]);
      setCatInput('');
    }
  };

  const canSubmit = file && column && (transformType === 'summarise' || categories.length > 0);

  return (
    <div style={s.card}>
      <div style={s.header}>
        <Sparkles size={16} color="var(--accent)" />
        <span style={s.title}>LLM Data Transformations</span>
      </div>
      <div style={s.body}>
        <p style={s.note}>
          ⚠ Limited to 100 rows · Uses AI · Results appear as a new column in the table
        </p>

        <div>
          <label style={s.label}>Transformation Type</label>
          <select style={s.select} value={transformType} onChange={(e) => setTransformType(e.target.value)}>
            <option value="summarise">Summarise — condense each cell to one sentence</option>
            <option value="classify">Classify — label each cell with a category</option>
          </select>
        </div>

        <div>
          <label style={s.label}>Target Column</label>
          <select style={s.select} value={column} onChange={(e) => setColumn(e.target.value)}>
            <option value="">— select a text column —</option>
            {textColumns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {transformType === 'classify' && (
          <div>
            <label style={s.label}>Categories</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={s.input}
                placeholder='e.g. "Positive", "Negative", "Neutral"'
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCat()}
              />
              <button style={{ ...s.btn(false), padding: '0.6rem 1rem' }} onClick={addCat}>Add</button>
            </div>
            {categories.length > 0 && (
              <div style={s.catRow}>
                {categories.map((cat) => (
                  <span key={cat} style={s.catPill}>
                    {cat}
                    <button style={s.removeBtn} onClick={() => setCategories((p) => p.filter((c) => c !== cat))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          style={s.btn(loading)}
          onClick={() => onTransform(file, transformType, column, categories)}
          disabled={!canSubmit || loading}
        >
          <Sparkles size={15} />
          {loading ? 'Transforming…' : 'Run Transformation'}
        </button>
      </div>
    </div>
  );
}
