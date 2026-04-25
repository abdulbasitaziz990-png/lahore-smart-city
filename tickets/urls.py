from django.urls import path
from . import views

urlpatterns = [
    path('', views.ticket_list, name='ticket_list'),
    path('my/', views.my_tickets, name='my_tickets'),
    path('<uuid:pk>/', views.ticket_detail, name='ticket_detail'),
    path('<uuid:pk>/reply/', views.ticket_reply, name='ticket_reply'),
    path('<uuid:pk>/status/', views.update_ticket_status, name='update_ticket_status'),
]