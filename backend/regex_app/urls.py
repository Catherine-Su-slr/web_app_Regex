"""
Root URL configuration for regex_app project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('processor.urls')),
]
