import React, { useState } from 'react';
import { Wand2, Search, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

const s = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', overflow: 'hidden',
  },
  section: { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' },
  label: {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--muted)', marginBottom: '0.5rem',
  },
  textarea: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-sans)',
    fontSize: '0.9rem', padding: '0.75rem 1rem', resize: 'vertical',
    minHeight: 80, outline: 'none', transition: 'border-color 0.2s',
  },
  input: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem', padding: '0.6rem 1rem', outline: 'none',
    transition: 'border-color 0.2s',
  },
  regexBox: {
    background: 'var(--bg)', border: '1px solid var(--accent)',
    borderRadius: 8, padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem', color: 'var(--accent)', wordBreak: 'break-all',
    position: 'relative',
  },
  explanation: {
    marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)',
    fontStyle: 'italic',
  },
  colGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.5rem', marginTop: '0.5rem',
  },
  colPill: (selected) => ({
    padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s',
    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    background: selected ? 'rgba(0,229,255,0.1)' : 'transparent',
    color: selected ? 'var(--accent)' : 'var(--muted)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }),
  row: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '0.75rem' },
  btn: (variant = 'primary', loading = false) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.6rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-sans)',
    fontWeight: 700, fontSize: '0.85rem', cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
    ...(variant === 'primary' ? {
      background: loading ? 'var(--border)' : 'var(--accent)',
      color: '#ffffff',
    } : variant === 'ghost' ? {
      background: 'transparent', border: '1px solid var(--border)',
      color: 'var(--muted)',
    } : {
      background: 'var(--accent2)', color: '#fff',
    }),
    opacity: loading ? 0.6 : 1,
  }),
  matchBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: 'rgba(34,197,94,0.12)', border: '1px solid var(--success)',
    color: 'var(--success)', borderRadius: 6, padding: '0.3rem 0.75rem',
    fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
  },
  copyBtn: {
    position: 'absolute', top: 8, right: 8, background: 'none',
    border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4,
  },
};

export default function RegexPanel({
  columns, textColumns, file,
  onGenerate, onPreview, onReplace,
  generatedRegex, regexExplanation, suggestedColumns,
  previewResult, loading, replaceLoading,
}) {
  const [description, setDescription] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [selectedCols, setSelectedCols] = useState([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync generated regex into the editable pattern field
  React.useEffect(() => {
    if (generatedRegex) setPattern(generatedRegex);
  }, [generatedRegex]);

  // Auto-select suggested columns
  React.useEffect(() => {
    if (suggestedColumns?.length) setSelectedCols(suggestedColumns);
  }, [suggestedColumns]);

  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const handleCopy = () => {
    navigator.clipboard.writeText(pattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canPreview = pattern && selectedCols.length > 0 && file;
  const canReplace = canPreview;

  return (
    <div style={s.card}>
      {/* Natural Language Input */}
      <div style={s.section}>
        <label style={s.label}>🔍 Describe the pattern in plain English</label>
        <textarea
          style={s.textarea}
          placeholder='e.g. "Find all email addresses" or "Match phone numbers in format (XXX) XXX-XXXX"'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <div style={{ marginTop: '0.75rem' }}>
          <button
            style={s.btn('primary', loading)}
            onClick={() => onGenerate(description, columns)}
            disabled={!description.trim() || loading || !file}
          >
            <Wand2 size={15} />
            {loading ? 'Generating…' : 'Generate Regex with AI'}
          </button>
        </div>
      </div>

      {/* Regex Pattern (editable) */}
      <div style={s.section}>
        <label style={s.label}>⚡ Regex Pattern (editable)</label>
        {pattern ? (
          <div style={s.regexBox}>
            <code>{pattern}</code>
            <button style={s.copyBtn} onClick={handleCopy} title="Copy">
              {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            </button>
          </div>
        ) : null}
        <input
          style={{ ...s.input, marginTop: pattern ? '0.75rem' : 0 }}
          placeholder="Or type / paste a regex pattern directly…"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        {regexExplanation && (
          <p style={s.explanation}>💡 {regexExplanation}</p>
        )}
      </div>

      {/* Column Selector */}
      <div style={s.section}>
        <label style={s.label}>🗂 Target Columns (text columns highlighted)</label>
        <div style={s.colGrid}>
          {columns.map((col) => {
            const isText = textColumns.includes(col);
            return (
              <button
                key={col}
                style={{
                  ...s.colPill(selectedCols.includes(col)),
                  opacity: isText ? 1 : 0.4,
                }}
                onClick={() => isText && toggleCol(col)}
                title={isText ? col : `${col} (non-text column)`}
              >
                {col}
              </button>
            );
          })}
        </div>
        {selectedCols.length > 0 && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Selected: {selectedCols.join(', ')}
          </p>
        )}
      </div>

      {/* Replacement Value */}
      <div style={s.section}>
        <label style={s.label}>✏️ Replacement Value</label>
        <input
          style={s.input}
          placeholder='e.g. "REDACTED" or leave empty to delete matches'
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />

        {/* Advanced toggle */}
        <button
          style={{ ...s.btn('ghost'), marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Advanced options
        </button>

        {showAdvanced && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
            />
            Case-sensitive matching
          </label>
        )}
      </div>

      {/* Actions */}
      <div style={{ ...s.section, borderBottom: 'none', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          style={s.btn('ghost')}
          onClick={() => onPreview(file, pattern, selectedCols, caseSensitive)}
          disabled={!canPreview || loading}
        >
          <Search size={15} />
          Preview Matches
        </button>
        <button
          style={s.btn('primary', replaceLoading)}
          onClick={() => onReplace(file, pattern, replacement, selectedCols, caseSensitive)}
          disabled={!canReplace || replaceLoading}
        >
          <RotateCcw size={15} />
          {replaceLoading ? 'Processing…' : 'Apply Replacement'}
        </button>

        {previewResult && (
          <span style={s.matchBadge}>
            ✓ {previewResult.total_matches} match{previewResult.total_matches !== 1 ? 'es' : ''} found
          </span>
        )}
      </div>
    </div>
  );
}
