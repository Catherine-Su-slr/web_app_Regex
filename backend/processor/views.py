"""
API Views for the regex processor application.
"""

import re
import io
import json
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser

from django.conf import settings
from django.http import HttpResponse

from .services import FileParserService, LLMService, RegexService
from .models import ProcessingLog

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({'status': 'ok', 'version': '1.0.0'})


class FileUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        logger.info("Upload received. FILES=%s", list(request.FILES.keys()))

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'No file received. Please attach a file with the key "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = uploaded_file.name
        logger.info("Parsing: %s  size=%d bytes", filename, uploaded_file.size)

        import os
        _, ext = os.path.splitext(filename.lower())
        if ext not in {'.csv', '.xlsx', '.xls'}:
            return Response(
                {'error': f'Unsupported file type "{ext}". Please upload .csv, .xlsx, or .xls'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = FileParserService.parse(uploaded_file, filename)
            logger.info("Parsed OK: %d rows x %d columns", len(df), len(df.columns))
        except ValueError as exc:
            logger.warning("Parse error: %s", exc)
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as exc:
            logger.exception("Unexpected parse error for '%s'", filename)
            return Response({'error': f'Failed to parse file: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        max_rows = getattr(settings, 'MAX_DISPLAY_ROWS', 1000)
        response_data = FileParserService.dataframe_to_response(df, max_rows=max_rows)
        response_data['filename'] = filename

        try:
            ProcessingLog.objects.create(
                filename=filename,
                file_type=ext.lstrip('.'),
                row_count=len(df),
                column_count=len(df.columns),
            )
        except Exception:
            pass

        return Response(response_data, status=status.HTTP_200_OK)


class GenerateRegexView(APIView):
    parser_classes = [JSONParser, MultiPartParser]

    def post(self, request):
        data = request.data
        description = data.get('description', '').strip()
        columns = data.get('columns', [])

        if isinstance(columns, str):
            try:
                columns = json.loads(columns)
            except json.JSONDecodeError:
                columns = [c.strip() for c in columns.split(',') if c.strip()]

        if not description:
            return Response({'error': 'description is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not columns:
            return Response({'error': 'columns list is required.'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("GenerateRegex: description=%r  columns=%s", description, columns)

        try:
            llm = LLMService()
            result = llm.natural_language_to_regex(description, columns)
            logger.info("Generated regex: %s", result.get('regex'))
            return Response(result, status=status.HTTP_200_OK)
        except EnvironmentError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as exc:
            logger.exception("LLM call failed")
            return Response({'error': f'LLM error: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PreviewMatchesView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        pattern = request.data.get('pattern', '').strip()
        columns_raw = request.data.get('columns', '[]')
        case_sensitive = str(request.data.get('case_sensitive', 'false')).lower() == 'true'

        if not file_obj:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pattern:
            return Response({'error': 'No pattern provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            columns = json.loads(columns_raw) if isinstance(columns_raw, str) else columns_raw
        except json.JSONDecodeError:
            return Response({'error': 'Invalid columns format.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = FileParserService.parse(file_obj, file_obj.name)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            preview = RegexService.preview_matches(df, pattern, columns, flags=flags)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        return Response(preview, status=status.HTTP_200_OK)


class ReplaceView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        pattern = request.data.get('pattern', '').strip()
        replacement = request.data.get('replacement', '')
        columns_raw = request.data.get('columns', '[]')
        case_sensitive = str(request.data.get('case_sensitive', 'false')).lower() == 'true'

        if not file_obj:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pattern:
            return Response({'error': 'No pattern provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            columns = json.loads(columns_raw) if isinstance(columns_raw, str) else columns_raw
        except json.JSONDecodeError:
            return Response({'error': 'Invalid columns format.'}, status=status.HTTP_400_BAD_REQUEST)

        if not columns:
            return Response({'error': 'Please select at least one column.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = FileParserService.parse(file_obj, file_obj.name)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            result = RegexService.apply_replacement(df, pattern, replacement, columns, flags=flags)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        max_rows = getattr(settings, 'MAX_DISPLAY_ROWS', 1000)
        response_data = FileParserService.dataframe_to_response(result['dataframe'], max_rows=max_rows)
        response_data['matches_found'] = result['matches_found']
        response_data['column_match_counts'] = result['column_match_counts']
        response_data['warnings'] = result['errors']

        try:
            ProcessingLog.objects.create(
                filename=file_obj.name,
                file_type=file_obj.name.rsplit('.', 1)[-1].lower(),
                row_count=len(df),
                column_count=len(df.columns),
                generated_regex=pattern,
                replacement_value=replacement,
                target_columns=columns,
                matches_found=result['matches_found'],
            )
        except Exception:
            pass

        return Response(response_data, status=status.HTTP_200_OK)


class DownloadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        pattern = request.data.get('pattern', '').strip()
        replacement = request.data.get('replacement', '')
        columns_raw = request.data.get('columns', '[]')
        case_sensitive = str(request.data.get('case_sensitive', 'false')).lower() == 'true'
        download_format = request.data.get('format', 'csv').lower()

        if not file_obj or not pattern:
            return Response({'error': 'file and pattern are required.'}, status=400)

        try:
            columns = json.loads(columns_raw) if isinstance(columns_raw, str) else columns_raw
            df = FileParserService.parse(file_obj, file_obj.name)
        except (ValueError, json.JSONDecodeError) as exc:
            return Response({'error': str(exc)}, status=422)

        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            result = RegexService.apply_replacement(df, pattern, replacement, columns, flags=flags)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=422)

        processed_df = result['dataframe']
        buf = io.BytesIO()

        if download_format == 'xlsx':
            processed_df.to_excel(buf, index=False, engine='openpyxl')
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ext = 'xlsx'
        else:
            processed_df.to_csv(buf, index=False, encoding='utf-8-sig')
            content_type = 'text/csv'
            ext = 'csv'

        buf.seek(0)
        base_name = file_obj.name.rsplit('.', 1)[0]
        response = HttpResponse(buf.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{base_name}_processed.{ext}"'
        return response


class TransformView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        transform_type = request.data.get('transform_type', '').strip()
        column = request.data.get('column', '').strip()
        categories_raw = request.data.get('categories', '[]')

        if not file_obj:
            return Response({'error': 'No file provided.'}, status=400)
        if transform_type not in ('summarise', 'classify'):
            return Response({'error': 'transform_type must be "summarise" or "classify".'}, status=400)
        if not column:
            return Response({'error': 'column is required.'}, status=400)

        try:
            categories = json.loads(categories_raw) if isinstance(categories_raw, str) else categories_raw
        except json.JSONDecodeError:
            categories = []

        if transform_type == 'classify' and not categories:
            return Response({'error': 'categories are required for classify.'}, status=400)

        try:
            df = FileParserService.parse(file_obj, file_obj.name)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=422)

        if column not in df.columns:
            return Response({'error': f'Column "{column}" not found.'}, status=400)

        values = df[column].fillna('').astype(str).tolist()

        MAX_TRANSFORM_ROWS = 100
        if len(values) > MAX_TRANSFORM_ROWS:
            return Response(
                {'error': f'Transform is limited to {MAX_TRANSFORM_ROWS} rows. Your file has {len(values)}.'},
                status=400,
            )

        try:
            llm = LLMService()
            if transform_type == 'summarise':
                transformed = llm.summarise_column(values, column)
                new_col = f"{column}_summary"
            else:
                transformed = llm.classify_column(values, column, categories)
                new_col = f"{column}_category"
        except EnvironmentError as exc:
            return Response({'error': str(exc)}, status=503)
        except Exception as exc:
            logger.exception("Transform failed")
            return Response({'error': f'Transform failed: {str(exc)}'}, status=500)

        result_df = df.copy()
        result_df[new_col] = transformed

        max_rows = getattr(settings, 'MAX_DISPLAY_ROWS', 1000)
        response_data = FileParserService.dataframe_to_response(result_df, max_rows=max_rows)
        response_data['new_column'] = new_col

        return Response(response_data, status=status.HTTP_200_OK)
