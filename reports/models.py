from django.db import models
import uuid
from accounts.models import User


class Zone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    areas = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'zones'


class Report(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in-progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_number = models.CharField(max_length=20, unique=True)
    category = models.CharField(max_length=50)
    description = models.TextField()
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    address = models.CharField(max_length=255, null=True, blank=True)
    zone = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    reporter_name = models.CharField(max_length=150, null=True, blank=True)
    reporter_email = models.EmailField(null=True, blank=True)
    reporter_phone = models.CharField(max_length=20, null=True, blank=True)
    photo = models.ImageField(upload_to='reports/', null=True, blank=True)
    admin_notes = models.TextField(null=True, blank=True)
    admin_photo = models.ImageField(upload_to='reports/admin/', null=True, blank=True)
    estimated_resolution = models.DateField(null=True, blank=True)
    resolution_date = models.DateTimeField(null=True, blank=True)
    delay_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']

    def __str__(self):
        return self.report_number