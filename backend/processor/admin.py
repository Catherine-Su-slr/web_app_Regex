from django.contrib import admin
from .models import ProcessingLog


@admin.register(ProcessingLog)
class ProcessingLogAdmin(admin.ModelAdmin):
    list_display = ('filename', 'file_type', 'row_count', 'matches_found', 'success', 'created_at')
    list_filter = ('file_type', 'success', 'created_at')
    search_fields = ('filename', 'natural_language_input', 'generated_regex')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
