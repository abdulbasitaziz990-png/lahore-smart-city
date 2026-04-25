from rest_framework import serializers
from .models import Report, Zone


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['id', 'report_number', 'created_at', 'updated_at', 'reporter']


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['category', 'description', 'latitude', 'longitude', 'address', 
                  'priority', 'reporter_name', 'reporter_email', 'reporter_phone', 'photo']


class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['status', 'admin_notes', 'admin_photo', 'estimated_resolution', 'delay_reason']