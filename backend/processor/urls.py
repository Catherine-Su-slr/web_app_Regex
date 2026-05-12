"""
URL routing for the processor app.
All routes are prefixed with /api/ from the root urls.py.
"""

from django.urls import path
from .views import (
    HealthCheckView,
    FileUploadView,
    GenerateRegexView,
    PreviewMatchesView,
    ReplaceView,
    DownloadView,
    TransformView,
)

urlpatterns = [
    path('health/',          HealthCheckView.as_view(),    name='health'),
    path('upload/',          FileUploadView.as_view(),     name='upload'),
    path('generate-regex/',  GenerateRegexView.as_view(),  name='generate-regex'),
    path('preview/',         PreviewMatchesView.as_view(), name='preview'),
    path('replace/',         ReplaceView.as_view(),        name='replace'),
    path('download/',        DownloadView.as_view(),       name='download'),
    path('transform/',       TransformView.as_view(),      name='transform'),
]
