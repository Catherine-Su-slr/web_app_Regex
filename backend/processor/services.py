"""
Core service layer for the regex processor application.

Responsibilities:
- File parsing (CSV / Excel)  →  FileParserService
- LLM interaction (natural language → regex)  →  LLMService
- Regex application and replacement  →  RegexService
- Optional LLM-powered data transformations  →  TransformService
"""

import re
import io
import logging
from typing import Any

import pandas as pd
from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# File Parser
# ---------------------------------------------------------------------------

class FileParserService:
    """Parse uploaded CSV / Excel files into pandas DataFrames."""

    SUPPORTED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}

    @staticmethod
    def parse(file_obj, filename: str) -> pd.DataFrame:
        """
        Parse an uploaded file and return a DataFrame.

        Args:
            file_obj: Django UploadedFile object
            filename:  Original filename (used to detect extension)

        Returns:
            pandas DataFrame

        Raises:
            ValueError: unsupported extension or parse error
        """
        ext = FileParserService._get_extension(filename)

        if ext not in FileParserService.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. "
                f"Please upload one of: {', '.join(FileParserService.SUPPORTED_EXTENSIONS)}"
            )

        try:
            content = file_obj.read()
            if ext == '.csv':
                return FileParserService._parse_csv(content)
            else:
                return FileParserService._parse_excel(content)
        except ValueError:
            raise
        except Exception as exc:
            logger.exception("Failed to parse file '%s'", filename)
            raise ValueError(f"Could not parse file: {exc}") from exc

    @staticmethod
    def _get_extension(filename: str) -> str:
        import os
        _, ext = os.path.splitext(filename.lower())
        return ext

    @staticmethod
    def _parse_csv(content: bytes) -> pd.DataFrame:
        """Try multiple encodings to be robust with real-world CSVs."""
        for encoding in ('utf-8', 'utf-8-sig', 'latin-1', 'cp1252'):
            try:
                return pd.read_csv(io.BytesIO(content), encoding=encoding)
            except UnicodeDecodeError:
                continue
        raise ValueError("Unable to decode CSV file. Please save it as UTF-8.")

    @staticmethod
    def _parse_excel(content: bytes) -> pd.DataFrame:
        return pd.read_excel(io.BytesIO(content), engine='openpyxl')

    @staticmethod
    def dataframe_to_response(df: pd.DataFrame, max_rows: int = None) -> dict:
        """
        Convert a DataFrame into a JSON-serialisable dict for the API response.
        Handles NaN, Inf, datetime, and numpy scalar types safely.
        """
        import math
        import numpy as np

        if max_rows and len(df) > max_rows:
            display_df = df.head(max_rows).copy()
        else:
            display_df = df.copy()

        # Convert all column names to strings
        display_df.columns = [str(c) for c in display_df.columns]
        df_cols = [str(c) for c in df.columns]

        # Identify text columns BEFORE any type coercion
        text_columns = [
            str(col) for col in df.columns
            if df[col].dtype == object
        ]

        # Safe cell-level serialiser
        def safe_val(v):
            if v is None:
                return None
            if isinstance(v, float):
                if math.isnan(v) or math.isinf(v):
                    return None
                return v
            if isinstance(v, (np.integer,)):
                return int(v)
            if isinstance(v, (np.floating,)):
                fv = float(v)
                return None if (math.isnan(fv) or math.isinf(fv)) else fv
            if isinstance(v, (np.bool_,)):
                return bool(v)
            if hasattr(v, 'isoformat'):   # datetime / date / Timestamp
                return v.isoformat()
            if isinstance(v, float):
                return v
            return v

        rows = []
        for record in display_df.to_dict(orient='records'):
            rows.append({k: safe_val(v) for k, v in record.items()})

        return {
            'columns': df_cols,
            'rows': rows,
            'total_rows': len(df),
            'displayed_rows': len(display_df),
            'text_columns': text_columns,
        }


# ---------------------------------------------------------------------------
# LLM Service
# ---------------------------------------------------------------------------

class LLMService:
    """
    Interact with OpenAI to convert natural language descriptions into regex
    patterns and perform optional data transformations.
    Uses gpt-4o-mini which is the most cost-effective OpenAI model.
    """

    def __init__(self):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. "
                "Please add it to your .env file. "
                "Get a free key at https://console.groq.com"
            )
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = "llama-3.3-70b-versatile"

    # -- internal helper ----------------------------------------------------

    def _call(self, prompt: str) -> str:
        """Send a prompt to OpenAI and return the text response."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    # -- Regex generation ---------------------------------------------------

    def natural_language_to_regex(self, description: str, columns: list) -> dict:
        """Convert a natural language description into a regex pattern."""
        prompt = self._build_regex_prompt(description, columns)
        raw = self._call(prompt)
        return self._parse_regex_response(raw, columns)

    def _build_regex_prompt(self, description: str, columns: list) -> str:
        cols_str = ', '.join(f'"{c}"' for c in columns)
        return f"""You are a regex expert. Convert the user's description into a Python regex pattern.

Available columns in the dataset: {cols_str}

User description: "{description}"

Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{{
  "regex": "<the regex pattern>",
  "explanation": "<brief human-readable explanation of what the regex matches>",
  "suggested_columns": ["<column1>", "<column2>"]
}}

Rules:
- "regex" must be a valid Python regex pattern string (without surrounding slashes)
- IMPORTANT: In the JSON string, all backslashes must be double-escaped. Write \\\\d not \\d, write \\\\. not \\., write \\\\w not \\w, etc.
- "suggested_columns" should list only column names from the available columns most likely to contain the pattern
- If no columns are obvious, suggest all columns
- Be precise and avoid overly broad patterns
"""

    @staticmethod
    def _fix_backslashes(s: str) -> str:
        """Fix unescaped backslashes inside JSON string values."""
        result = []
        in_string = False
        i = 0
        while i < len(s):
            c = s[i]
            if not in_string:
                result.append(c)
                if c == '"':
                    in_string = True
            else:
                if c == '\\' and i + 1 < len(s):
                    nxt = s[i + 1]
                    if nxt in ('"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'):
                        result.append(c)
                        result.append(nxt)
                        i += 2
                        continue
                    else:
                        # unescaped backslash — double it
                        result.append('\\')
                        result.append('\\')
                elif c == '"':
                    in_string = False
                    result.append(c)
                    i += 1
                    continue
                else:
                    result.append(c)
            i += 1
        return ''.join(result)

    @staticmethod
    def _parse_regex_response(raw: str, columns: list) -> dict:
        import json
        raw = re.sub(r'^\`\`\`(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\`\`\`\s*$', '', raw, flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            # LLMs often forget to double-escape backslashes in JSON strings;
            # try fixing that before giving up.
            try:
                parsed = json.loads(LLMService._fix_backslashes(raw))
            except json.JSONDecodeError as exc:
                logger.warning("LLM returned non-JSON: %s", raw)
                raise ValueError(f"LLM returned an unexpected response: {raw[:200]}") from exc

        regex = parsed.get('regex', '')
        try:
            re.compile(regex)
        except re.error as exc:
            raise ValueError(f"LLM generated an invalid regex '{regex}': {exc}") from exc

        suggested = [c for c in parsed.get('suggested_columns', []) if c in columns]
        if not suggested:
            suggested = columns

        return {
            'regex': regex,
            'explanation': parsed.get('explanation', ''),
            'suggested_columns': suggested,
        }

    # -- Optional transformations -------------------------------------------

    def summarise_column(self, values: list, column_name: str) -> list:
        """[OPTIONAL TRANSFORMATION 1] Summarise each cell to one sentence."""
        import json
        results = []
        batch_size = 20
        for i in range(0, len(values), batch_size):
            batch = values[i:i + batch_size]
            prompt = (
                f"For each of the following text values from column '{column_name}', "
                "produce a concise one-sentence summary (max 15 words). "
                "Respond ONLY with a JSON array of strings, one per input, same order.\n\n"
                + "\n".join(f"{j+1}. {v}" for j, v in enumerate(batch))
            )
            raw = self._call(prompt)
            raw = re.sub(r'^\`\`\`(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'\`\`\`\s*$', '', raw, flags=re.MULTILINE).strip()
            try:
                results.extend(json.loads(raw)[:len(batch)])
            except Exception:
                results.extend(["[summary unavailable]"] * len(batch))
        return results

    def classify_column(self, values: list, column_name: str, categories: list) -> list:
        """[OPTIONAL TRANSFORMATION 2] Classify each cell into one of the provided categories."""
        import json
        cats_str = ', '.join(f'"{c}"' for c in categories)
        results = []
        batch_size = 20
        for i in range(0, len(values), batch_size):
            batch = values[i:i + batch_size]
            prompt = (
                f"Classify each value from column '{column_name}' "
                f"into exactly one of: {cats_str}. "
                "Respond ONLY with a JSON array of category strings, same order.\n\n"
                + "\n".join(f"{j+1}. {v}" for j, v in enumerate(batch))
            )
            raw = self._call(prompt)
            raw = re.sub(r'^\`\`\`(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'\`\`\`\s*$', '', raw, flags=re.MULTILINE).strip()
            try:
                results.extend(json.loads(raw)[:len(batch)])
            except Exception:
                results.extend(["unknown"] * len(batch))
        return results



# ---------------------------------------------------------------------------
# Regex Service
# ---------------------------------------------------------------------------

class RegexService:
    """Apply regex find-and-replace operations to DataFrame columns."""

    @staticmethod
    def apply_replacement(
        df: pd.DataFrame,
        pattern: str,
        replacement: str,
        columns: list[str],
        flags: int = re.IGNORECASE,
    ) -> dict:
        """
        Apply a regex replacement to the specified columns of a DataFrame.

        Args:
            df:          Source DataFrame (not mutated — a copy is returned)
            pattern:     Compiled-ready regex string
            replacement: Replacement string (supports backreferences like \\1)
            columns:     List of column names to operate on
            flags:       Python re flags (default: IGNORECASE)

        Returns:
            {
                "dataframe": pd.DataFrame,   # modified copy
                "matches_found": int,
                "column_match_counts": {col: int, ...},
                "errors": [str, ...]          # per-column errors if any
            }
        """
        result_df = df.copy()
        total_matches = 0
        col_counts: dict[str, int] = {}
        errors: list[str] = []

        try:
            compiled = re.compile(pattern, flags)
        except re.error as exc:
            raise ValueError(f"Invalid regex pattern: {exc}") from exc

        for col in columns:
            if col not in df.columns:
                errors.append(f"Column '{col}' not found in DataFrame.")
                continue

            if df[col].dtype != object:
                errors.append(f"Column '{col}' is not a text column (dtype={df[col].dtype}).")
                continue

            try:
                str_col = result_df[col].fillna('').astype(str)
                match_count = str_col.apply(lambda v: len(compiled.findall(v))).sum()
                result_df[col] = str_col.str.replace(compiled, replacement, regex=True)
                # Restore original NaN positions
                result_df.loc[df[col].isna(), col] = None
                col_counts[col] = int(match_count)
                total_matches += int(match_count)
            except Exception as exc:
                errors.append(f"Error processing column '{col}': {exc}")
                logger.exception("Regex replacement failed on column '%s'", col)

        return {
            'dataframe': result_df,
            'matches_found': total_matches,
            'column_match_counts': col_counts,
            'errors': errors,
        }

    @staticmethod
    def preview_matches(
        df: pd.DataFrame,
        pattern: str,
        columns: list[str],
        flags: int = re.IGNORECASE,
        max_examples: int = 5,
    ) -> dict:
        """
        Return a preview of cells that would be affected by the pattern,
        without performing any replacement.
        """
        try:
            compiled = re.compile(pattern, flags)
        except re.error as exc:
            raise ValueError(f"Invalid regex pattern: {exc}") from exc

        previews: dict[str, list] = {}
        total = 0

        for col in columns:
            if col not in df.columns or df[col].dtype != object:
                continue

            str_col = df[col].fillna('').astype(str)
            mask = str_col.str.contains(compiled, na=False)
            matches = str_col[mask]
            total += int(mask.sum())
            previews[col] = {
                'count': int(mask.sum()),
                'examples': matches.head(max_examples).tolist(),
            }

        return {'total_matches': total, 'by_column': previews}
