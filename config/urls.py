from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/tickets/', include('tickets.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('citizen.html', TemplateView.as_view(template_name='citizen.html'), name='citizen'),
    path('admin-page.html', TemplateView.as_view(template_name='admin.html'), name='admin_page'),
    path('admin-login.html', TemplateView.as_view(template_name='admin-login.html'), name='admin_login'),
    path('emergency.html', TemplateView.as_view(template_name='emergency.html'), name='emergency'),
    path('about.html', TemplateView.as_view(template_name='about.html'), name='about'),
    path('citizen-support.html', TemplateView.as_view(template_name='citizen-support.html'), name='support'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)