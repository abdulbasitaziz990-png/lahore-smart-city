from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Count, Max
from django.db.models.functions import Round
from django.utils import timezone
import requests
import random
import string

from .models import Report, Zone
from .serializers import ReportSerializer, ReportCreateSerializer, ReportStatusSerializer, ZoneSerializer


def generate_report_number():
    timestamp = ''.join(random.choices(string.digits, k=8))
    random_part = ''.join(random.choices(string.digits, k=3))
    return f"LHR-{timestamp}-{random_part}"


def get_zone_from_coords(lat, lng):
    zones = Zone.objects.all()
    closest = None
    min_dist = float('inf')
    for zone in zones:
        if zone.latitude and zone.longitude:
            dist = ((float(lat) - float(zone.latitude))**2 + (float(lng) - float(zone.longitude))**2)**0.5
            if dist < min_dist:
                min_dist = dist
                closest = zone
    return closest.name if closest else 'Unknown'


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def report_list(request):
    if request.method == 'GET':
        if request.user.role == 'admin':
            reports = Report.objects.all()
        else:
            reports = Report.objects.filter(reporter=request.user)
        serializer = ReportSerializer(reports, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ReportCreateSerializer(data=request.data)
        if serializer.is_valid():
            report = serializer.save(
                reporter=request.user,
                report_number=generate_report_number(),
                zone=get_zone_from_coords(
                    serializer.validated_data['latitude'],
                    serializer.validated_data['longitude']
                ),
                reporter_name=request.user.name,
                reporter_email=request.user.email,
                reporter_phone=request.user.phone
            )
            if 'photo' in request.FILES:
                report.photo = request.FILES['photo']
                report.save()
            
            return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_detail(request, pk):
    try:
        report = Report.objects.get(pk=pk)
        if request.user.role != 'admin' and report.reporter != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ReportSerializer(report)
        return Response(serializer.data)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_report_status(request, pk):
    if request.user.role != 'admin':
        return Response({'error': 'Only admin can update status'}, status=status.HTTP_403_FORBIDDEN)
    try:
        report = Report.objects.get(pk=pk)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ReportStatusSerializer(report, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        if serializer.validated_data.get('status') == 'resolved':
            report.resolution_date = timezone.now()
            report.save()
        return Response(ReportSerializer(report).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reports(request):
    reports = Report.objects.filter(reporter=request.user)
    serializer = ReportSerializer(reports, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_by_zone(request, zone_name):
    reports = Report.objects.filter(zone__iexact=zone_name)
    serializer = ReportSerializer(reports, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def zone_list(request):
    zones = Zone.objects.all()
    serializer = ZoneSerializer(zones, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_report_location(request):
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    user_address = request.data.get('address', '').lower()
    if not lat or not lng:
        return Response({'verified': True})
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
        response = requests.get(url, headers={'User-Agent': 'LahoreSmartCity/1.0'}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            display_name = data.get('display_name', '').lower()
            address_words = user_address.split()
            match_count = sum(1 for word in address_words if word in display_name)
            is_verified = match_count >= 2 or len(address_words) <= 1
            return Response({'verified': is_verified, 'gps_location': display_name[:100], 'match_score': match_count, 'flagged': not is_verified})
    except:
        pass
    return Response({'verified': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def priority_reports(request):
    if request.user.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    reports = Report.objects.annotate(rounded_lat=Round('latitude', 3), rounded_lng=Round('longitude', 3)).values('rounded_lat', 'rounded_lng', 'category').annotate(count=Count('id'), latest=Max('created_at'), zone_name=Max('zone')).filter(count__gt=1).order_by('-count')[:20]
    return Response(list(reports))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def heatmap_data(request):
    if request.user.role != 'admin':
        return Response({'error': 'Unauthorized'}, status=403)
    reports = Report.objects.filter(status__in=['pending', 'in-progress']).values('latitude', 'longitude', 'category', 'priority', 'status')
    return Response(list(reports))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def zone_heatmap(request, zone_name):
    reports = Report.objects.filter(zone__iexact=zone_name, status__in=['pending', 'in-progress']).values('latitude', 'longitude', 'category', 'priority', 'status')
    return Response(list(reports))