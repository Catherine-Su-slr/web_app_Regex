/**
 * API client for the Django backend.
 * All requests go through the CRA proxy (http://localhost:8000).
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — LLM calls can be slow
});

// ─── Response interceptor: normalise errors ───────────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.message ||
      'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a multipart FormData from an object (supports File values). */
function toFormData(obj) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Upload a CSV/Excel file.
 * @param {File} file
 * @returns {Promise<{columns, rows, total_rows, text_columns, filename}>}
 */
export async function uploadFile(file) {
  const fd = toFormData({ file });
  const { data } = await client.post('/upload/', fd);
  return data;
}

/**
 * Ask the LLM to generate a regex from a natural language description.
 * @param {string} description
 * @param {string[]} columns  - all column names in the uploaded file
 * @returns {Promise<{regex, explanation, suggested_columns}>}
 */
export async function generateRegex(description, columns) {
  const { data } = await client.post('/generate-regex/', { description, columns });
  return data;
}

/**
 * Preview how many cells match the pattern (no replacement).
 * @param {File} file
 * @param {string} pattern
 * @param {string[]} columns
 * @param {boolean} caseSensitive
 * @returns {Promise<{total_matches, by_column}>}
 */
export async function previewMatches(file, pattern, columns, caseSensitive = false) {
  const fd = toFormData({
    file,
    pattern,
    columns,
    case_sensitive: caseSensitive ? 'true' : 'false',
  });
  const { data } = await client.post('/preview/', fd);
  return data;
}

/**
 * Apply regex replacement and return updated table data.
 * @param {File} file
 * @param {string} pattern
 * @param {string} replacement
 * @param {string[]} columns
 * @param {boolean} caseSensitive
 * @returns {Promise<{columns, rows, total_rows, matches_found, column_match_counts, warnings}>}
 */
export async function applyReplacement(file, pattern, replacement, columns, caseSensitive = false) {
  const fd = toFormData({
    file,
    pattern,
    replacement,
    columns,
    case_sensitive: caseSensitive ? 'true' : 'false',
  });
  const { data } = await client.post('/replace/', fd);
  return data;
}

/**
 * Download the processed file as CSV or XLSX.
 * Triggers a browser download directly.
 */
export async function downloadProcessed(file, pattern, replacement, columns, format = 'csv', caseSensitive = false) {
  const fd = toFormData({
    file,
    pattern,
    replacement,
    columns,
    format,
    case_sensitive: caseSensitive ? 'true' : 'false',
  });
  const response = await client.post('/download/', fd, { responseType: 'blob' });

  // Extract filename from Content-Disposition header
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `processed.${format}`;

  // Create a temporary link and trigger download
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Apply an optional LLM transformation to a column.
 * @param {File} file
 * @param {'summarise'|'classify'} transformType
 * @param {string} column
 * @param {string[]} [categories]  - required for 'classify'
 */
export async function applyTransform(file, transformType, column, categories = []) {
  const fd = toFormData({ file, transform_type: transformType, column, categories });
  const { data } = await client.post('/transform/', fd);
  return data;
}
