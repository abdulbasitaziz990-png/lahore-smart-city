from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_list, name='report_list'),
    path('my/', views.my_reports, name='my_reports'),
    path('zones/', views.zone_list, name='zone_list'),
    path('verify-location/', views.verify_report_location, name='verify_location'),
    path('priority/', views.priority_reports, name='priority_reports'),
    path('heatmap/', views.heatmap_data, name='heatmap_data'),
    path('heatmap/<str:zone_name>/', views.zone_heatmap, name='zone_heatmap'),
    path('<uuid:pk>/', views.report_detail, name='report_detail'),
    path('<uuid:pk>/status/', views.update_report_status, name='update_report_status'),
    path('zone/<str:zone_name>/', views.reports_by_zone, name='reports_by_zone'),
]