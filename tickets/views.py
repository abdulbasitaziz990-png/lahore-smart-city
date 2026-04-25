from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Ticket, TicketMessage
from reports.models import Report
from .serializers import TicketSerializer, TicketCreateSerializer
import random
import string


def generate_ticket_number():
    timestamp = ''.join(random.choices(string.digits, k=6))
    random_part = ''.join(random.choices(string.digits, k=3))
    return f"SUP-{timestamp}-{random_part}"


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ticket_list(request):
    if request.method == 'GET':
        if request.user.role == 'admin':
            tickets = Ticket.objects.all()
        else:
            tickets = Ticket.objects.filter(user=request.user)
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = TicketCreateSerializer(data=request.data)
        if serializer.is_valid():
            report_id = serializer.validated_data['report'].id
            
            # Only allow tickets for resolved reports
            report = Report.objects.filter(id=report_id, status='resolved').first()
            if not report:
                return Response({'error': 'Tickets can only be created for resolved reports'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            ticket = Ticket.objects.create(
                ticket_number=generate_ticket_number(),
                report=report,
                user=request.user,
                user_name=request.user.name,
                subject=serializer.validated_data['subject']
            )
            
            TicketMessage.objects.create(
                ticket=ticket,
                user=request.user,
                user_name=request.user.name,
                message=serializer.validated_data['message'],
                is_admin=False
            )
            
            return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ticket_detail(request, pk):
    try:
        ticket = Ticket.objects.get(pk=pk)
        if request.user.role != 'admin' and ticket.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TicketSerializer(ticket)
        return Response(serializer.data)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ticket_reply(request, pk):
    try:
        ticket = Ticket.objects.get(pk=pk)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    
    message = request.data.get('message')
    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    is_admin = request.user.role == 'admin'
    TicketMessage.objects.create(
        ticket=ticket,
        user=request.user,
        user_name=request.user.name,
        message=message,
        is_admin=is_admin
    )
    
    ticket.status = 'replied' if is_admin else 'awaiting_reply'
    ticket.save()
    
    return Response(TicketSerializer(ticket).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_ticket_status(request, pk):
    if request.user.role != 'admin':
        return Response({'error': 'Only admin can update ticket status'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(pk=pk)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    
    new_status = request.data.get('status')
    if new_status in ['open', 'awaiting_reply', 'replied', 'closed']:
        ticket.status = new_status
        ticket.save()
        return Response(TicketSerializer(ticket).data)
    
    return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tickets(request):
    tickets = Ticket.objects.filter(user=request.user)
    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data)