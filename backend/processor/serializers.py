"""
DRF Serializers for request validation and response formatting.
"""

from rest_framework import serializers


class FileUploadSerializer(serializers.Serializer):
    """Validates the file upload request."""
    file = serializers.FileField(
        help_text="CSV or Excel file (.csv, .xlsx, .xls)"
    )

    def validate_file(self, value):
        import os
        _, ext = os.path.splitext(value.name.lower())
        allowed = {'.csv', '.xlsx', '.xls'}
        if ext not in allowed:
            raise serializers.ValidationError(
                f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed)}"
            )
        # 50 MB limit
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File too large ({value.size / 1e6:.1f} MB). Maximum allowed: 50 MB."
            )
        return value


class RegexGenerateSerializer(serializers.Serializer):
    """Validates the natural-language-to-regex request."""
    description = serializers.CharField(
        min_length=3,
        max_length=1000,
        help_text="Natural language description of the pattern to match"
    )
    columns = serializers.ListField(
        child=serializers.CharField(),
        min_length=1,
        help_text="List of column names present in the uploaded file"
    )


class ReplaceSerializer(serializers.Serializer):
    """Validates the find-and-replace request."""
    # File re-uploaded for stateless processing
    file = serializers.FileField()
    pattern = serializers.CharField(
        min_length=1,
        max_length=2000,
        help_text="Regex pattern to find"
    )
    replacement = serializers.CharField(
        allow_blank=True,
        max_length=500,
        help_text="Replacement string (can be empty to delete matches)"
    )
    columns = serializers.ListField(
        child=serializers.CharField(),
        min_length=1,
        help_text="Column names to apply replacement to"
    )
    case_sensitive = serializers.BooleanField(
        default=False,
        help_text="Whether the match is case-sensitive"
    )

    def validate_file(self, value):
        import os
        _, ext = os.path.splitext(value.name.lower())
        if ext not in {'.csv', '.xlsx', '.xls'}:
            raise serializers.ValidationError("Unsupported file type.")
        return value

    def validate_pattern(self, value):
        import re
        try:
            re.compile(value)
        except re.error as exc:
            raise serializers.ValidationError(f"Invalid regex pattern: {exc}")
        return value


class TransformSerializer(serializers.Serializer):
    """Validates optional LLM transformation requests."""
    file = serializers.FileField()
    transform_type = serializers.ChoiceField(
        choices=['summarise', 'classify'],
        help_text="Type of LLM transformation"
    )
    column = serializers.CharField(
        help_text="Column to transform"
    )
    # For classify only
    categories = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Category labels (required for 'classify' transform type)"
    )

    def validate(self, data):
        if data.get('transform_type') == 'classify':
            if not data.get('categories'):
                raise serializers.ValidationError(
                    {"categories": "Categories are required for 'classify' transformation."}
                )
        return data
