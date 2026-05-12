import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText } from 'lucide-react';

const styles = {
  zone: (isDragActive) => ({
    border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: '3rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: isDragActive ? 'rgba(0,229,255,0.04)' : 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  }),
  icon: (isDragActive) => ({
    color: isDragActive ? 'var(--accent)' : 'var(--muted)',
    transition: 'color 0.2s',
  }),
  title: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' },
  sub: { fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  badge: {
    display: 'inline-flex', gap: '0.5rem', marginTop: '0.5rem',
    flexWrap: 'wrap', justifyContent: 'center',
  },
  pill: {
    fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
    background: 'var(--border)', color: 'var(--muted)',
    padding: '2px 8px', borderRadius: '999px',
  },
  fileInfo: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'rgba(0,229,255,0.08)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem',
    marginTop: '1rem',
  },
  fileName: { fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--accent)' },
  fileSize: { fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
};

export default function FileUploadZone({ onFile, currentFile }) {
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const fmt = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div>
      <div {...getRootProps()} style={styles.zone(isDragActive)}>
        <input {...getInputProps()} />
        <UploadCloud size={40} style={styles.icon(isDragActive)} />
        <div>
          <p style={styles.title}>
            {isDragActive ? 'Drop your file here' : 'Upload a CSV or Excel file'}
          </p>
          <p style={styles.sub}>Drag & drop or click to browse</p>
        </div>
        <div style={styles.badge}>
          {['.csv', '.xlsx', '.xls'].map((ext) => (
            <span key={ext} style={styles.pill}>{ext}</span>
          ))}
          <span style={styles.pill}>max 50 MB</span>
        </div>
      </div>

      {currentFile && (
        <div style={styles.fileInfo}>
          <FileText size={18} color="var(--accent)" />
          <div>
            <p style={styles.fileName}>{currentFile.name}</p>
            <p style={styles.fileSize}>{fmt(currentFile.size)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
