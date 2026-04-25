from django.contrib import admin
from .models import Zone, Report

@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'latitude', 'longitude', 'created_at')
    search_fields = ('name',)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('report_number', 'category', 'zone', 'status', 'priority', 'reporter_name', 'created_at')
    list_filter = ('status', 'priority', 'category', 'zone')
    search_fields = ('report_number', 'category', 'description', 'reporter_name')
    ordering = ('-created_at',)
    readonly_fields = ('report_number', 'created_at', 'updated_at')