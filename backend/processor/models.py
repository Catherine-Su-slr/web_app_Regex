"""
Models for the processor app.

We keep this lightweight since file data is handled in-memory 
(not persisted to DB) for performance and privacy.
"""

from django.db import models


class ProcessingLog(models.Model):
    """
    Audit log for file processing operations.
    Stores metadata only — never actual file content.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)  # 'csv' or 'xlsx'
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    natural_language_input = models.TextField(blank=True)
    generated_regex = models.TextField(blank=True)
    replacement_value = models.CharField(max_length=500, blank=True)
    target_columns = models.JSONField(default=list)
    matches_found = models.IntegerField(default=0)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Processing Log'
        verbose_name_plural = 'Processing Logs'

    def __str__(self):
        return f"{self.filename} @ {self.created_at:%Y-%m-%d %H:%M}"
