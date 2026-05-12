import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Regex } from 'lucide-react';

import FileUploadZone from './components/FileUploadZone';
import DataTable from './components/DataTable';
import RegexPanel from './components/RegexPanel';
import TransformPanel from './components/TransformPanel';
import ResultsPanel from './components/ResultsPanel';

import {
  uploadFile,
  generateRegex,
  previewMatches,
  applyReplacement,
  applyTransform,
} from './api';

const S = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    borderBottom: '1px solid var(--border)',
    padding: '1rem 2rem',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'var(--surface)',
  },
  logoText: { fontWeight: 800, fontSize: '1.15rem' },
  logoAccent: { color: 'var(--accent)' },
  tagline: { fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' },
  main: {
    flex: 1, maxWidth: 1100, width: '100%',
    margin: '0 auto', padding: '2rem 1.5rem',
    display: 'flex', flexDirection: 'column', gap: '2.5rem',
  },
  stepRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' },
  stepNum: (color) => ({
    width: 28, height: 28, borderRadius: '50%',
    background: color || 'var(--accent)', color: '#ffffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
  }),
  stepTitle: { fontWeight: 700, fontSize: '20px' },
  stepSub: { fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
  },
  divider: { border: 'none', borderTop: '1px solid var(--border)' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)',
    borderRadius: 'var(--radius)', padding: '0.9rem 1.2rem',
    color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
  },
  footer: {
    borderTop: '1px solid var(--border)', padding: '1rem 2rem',
    textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)',
    fontFamily: 'var(--font-mono)', background: 'var(--surface)',
  },
};

export default function App() {
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [generatedRegex, setGeneratedRegex] = useState('');
  const [regexExplanation, setRegexExplanation] = useState('');
  const [suggestedColumns, setSuggestedColumns] = useState([]);
  const [generateLoading, setGenerateLoading] = useState(false);

  const [previewResult, setPreviewResult] = useState(null);
  const [replaceResult, setReplaceResult] = useState(null);
  const [replaceLoading, setReplaceLoading] = useState(false);

  const [lastPattern, setLastPattern] = useState('');
  const [lastReplacement, setLastReplacement] = useState('');
  const [lastCols, setLastCols] = useState([]);
  const [lastCaseSensitive, setLastCaseSensitive] = useState(false);

  const [transformResult, setTransformResult] = useState(null);
  const [transformLoading, setTransformLoading] = useState(false);

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFile = async (f) => {
    setFile(f);
    setTableData(null);
    setUploadError('');
    setGeneratedRegex('');
    setReplaceResult(null);
    setTransformResult(null);
    setPreviewResult(null);
    setUploadLoading(true);

    try {
      const data = await uploadFile(f);
      setTableData(data);
      toast.success(`✓ Loaded ${data.total_rows.toLocaleString()} rows × ${data.columns.length} columns`);
    } catch (err) {
      setUploadError(err.message);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Generate regex ──────────────────────────────────────────────────────
  const handleGenerate = async (description, columns) => {
    setGenerateLoading(true);
    try {
      const res = await generateRegex(description, columns);
      setGeneratedRegex(res.regex);
      setRegexExplanation(res.explanation);
      setSuggestedColumns(res.suggested_columns);
      toast.success('Regex generated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerateLoading(false);
    }
  };

  // ── Preview ─────────────────────────────────────────────────────────────
  const handlePreview = async (f, pattern, columns, caseSensitive) => {
    try {
      const res = await previewMatches(f, pattern, columns, caseSensitive);
      setPreviewResult(res);
      toast(res.total_matches === 0
        ? 'No matches found'
        : `${res.total_matches} match${res.total_matches !== 1 ? 'es' : ''} found`,
        { icon: res.total_matches === 0 ? '🔍' : '✅' }
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Replace ─────────────────────────────────────────────────────────────
  const handleReplace = async (f, pattern, replacement, columns, caseSensitive) => {
    setReplaceLoading(true);
    setLastPattern(pattern);
    setLastReplacement(replacement);
    setLastCols(columns);
    setLastCaseSensitive(caseSensitive);
    try {
      const res = await applyReplacement(f, pattern, replacement, columns, caseSensitive);
      setReplaceResult(res);
      setTransformResult(null);
      toast.success(`Done! ${res.matches_found} replacement${res.matches_found !== 1 ? 's' : ''} applied`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReplaceLoading(false);
    }
  };

  // ── Transform ───────────────────────────────────────────────────────────
  const handleTransform = async (f, transformType, column, categories) => {
    setTransformLoading(true);
    try {
      const res = await applyTransform(f, transformType, column, categories);
      setTransformResult(res);
      setReplaceResult(null);
      toast.success(`New column "${res.new_column}" added`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTransformLoading(false);
    }
  };

  const activeResult = replaceResult || transformResult;

  return (
    <div style={S.root}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
          },
        }}
      />

      {/* Header */}
      <header style={S.header}>
        <Regex size={22} color="var(--accent)" />
        <span style={S.logoText}>
          <span style={S.logoAccent}>Regex</span>Craft
        </span>
        <span style={S.tagline}>AI-powered pattern matching & replacement · CSV / Excel</span>
      </header>

      <main style={S.main}>

        {/* STEP 1 — Upload */}
        <section>
          <div style={S.stepRow}>
            <div style={S.stepNum()}>1</div>
            <div>
              <p style={S.stepTitle}>Upload your file</p>
              <p style={S.stepSub}>CSV or Excel (.csv / .xlsx / .xls) · max 50 MB</p>
            </div>
          </div>
          <FileUploadZone onFile={handleFile} currentFile={file} />
          {uploadLoading && (
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
              ⏳ Parsing file…
            </p>
          )}
          {uploadError && (
            <div style={{ ...S.errorBox, marginTop: '0.75rem' }}>
              ❌ {uploadError}
            </div>
          )}
        </section>

        {/* STEP 2 — Preview uploaded data */}
        {tableData && (
          <section>
            <div style={S.stepRow}>
              <div style={S.stepNum()}>2</div>
              <div>
                <p style={S.stepTitle}>Data Preview — {tableData.filename}</p>
                <p style={S.stepSub}>
                  {tableData.total_rows.toLocaleString()} rows ·{' '}
                  {tableData.columns.length} columns ·{' '}
                  {tableData.text_columns.length} text columns
                </p>
              </div>
            </div>
            <div style={S.card}>
              <DataTable
                columns={tableData.columns}
                rows={tableData.rows}
                totalRows={tableData.total_rows}
              />
            </div>
          </section>
        )}

        {/* STEP 3 — Regex Panel (always shown once file is loaded) */}
        {tableData && (
          <section>
            <div style={S.stepRow}>
              <div style={S.stepNum()}>3</div>
              <div>
                <p style={S.stepTitle}>Find & Replace with AI</p>
                <p style={S.stepSub}>
                  Describe the pattern in plain English — AI converts it to regex automatically
                </p>
              </div>
            </div>
            <RegexPanel
              columns={tableData.columns}
              textColumns={tableData.text_columns}
              file={file}
              onGenerate={handleGenerate}
              onPreview={handlePreview}
              onReplace={handleReplace}
              generatedRegex={generatedRegex}
              regexExplanation={regexExplanation}
              suggestedColumns={suggestedColumns}
              previewResult={previewResult}
              loading={generateLoading}
              replaceLoading={replaceLoading}
            />
          </section>
        )}

        {/* STEP 4 — Optional LLM transforms */}
        {tableData && (
          <section>
            <div style={S.stepRow}>
              <div style={S.stepNum()}>4</div>
              <div>
                <p style={S.stepTitle}>LLM Data Transformations</p>
                <p style={S.stepSub}>Summarise or classify column values using AI (max 100 rows)</p>
              </div>
            </div>
            <TransformPanel
              textColumns={tableData.text_columns}
              file={file}
              onTransform={handleTransform}
              loading={transformLoading}
            />
          </section>
        )}

        {/* Results */}
        {activeResult && (
          <>
            <hr style={S.divider} />
            <ResultsPanel
              result={activeResult}
              file={file}
              pattern={lastPattern}
              replacement={lastReplacement}
              selectedCols={lastCols}
              caseSensitive={lastCaseSensitive}
            />
          </>
        )}

      </main>

      <footer style={S.footer}>
        RegexCraft · Django + React + Groq AI
      </footer>
    </div>
  );
}
