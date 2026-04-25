import random
import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer


# ============================================
# OTP STORES
# ============================================

# Store OTPs temporarily (in production use cache or database)
otp_store = {}

# Store password reset OTPs
reset_otp_store = {}


# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_otp():
    return str(random.randint(100000, 999999))


# ============================================
# REGISTRATION & VERIFICATION
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        otp = generate_otp()
        otp_store[user.email] = otp
        print(f"[DEV] OTP for {user.email}: {otp}")
        return Response({
            'message': 'Registration successful. OTP sent to your email.',
            'email': user.email,
            'dev_otp': otp
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    stored_otp = otp_store.get(email)
    if not stored_otp:
        return Response({'error': 'OTP expired or not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    if stored_otp != otp:
        return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.filter(email=email).first()
    if user:
        user.is_verified = True
        user.save()
        del otp_store[email]
        return Response({'message': 'Email verified successfully'})
    
    return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    otp = generate_otp()
    otp_store[email] = otp
    print(f"[DEV] New OTP for {email}: {otp}")
    
    return Response({
        'message': 'New OTP sent',
        'dev_otp': otp
    })


# ============================================
# LOGIN
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'error': 'No account found with this email'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_verified:
            return Response({'error': 'Please verify your email first'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.check_password(password):
            return Response({'error': 'Incorrect password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    user = User.objects.filter(email=email, role='admin').first()
    if not user:
        return Response({'error': 'Invalid admin credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.check_password(password):
        return Response({'error': 'Invalid admin credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


# ============================================
# FORGOT PASSWORD
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send OTP to user's email for password reset"""
    email = request.data.get('email', '').strip().lower()
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'No account found with this email'}, status=status.HTTP_404_NOT_FOUND)
    
    otp = str(random.randint(100000, 999999))
    
    reset_otp_store[email] = {
        'otp': otp,
        'expires_at': timezone.now() + timedelta(minutes=10)
    }
    
    print(f"[DEV] Password Reset OTP for {email}: {otp}")
    
    return Response({
        'message': 'OTP sent to your email',
        'dev_otp': otp
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_reset_otp(request):
    """Verify OTP for password reset"""
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()
    
    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    stored = reset_otp_store.get(email)
    if not stored:
        return Response({'error': 'No OTP found. Please request again.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if timezone.now() > stored['expires_at']:
        del reset_otp_store[email]
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if stored['otp'] != otp:
        return Response({'error': 'Incorrect OTP'}, status=status.HTTP_400_BAD_REQUEST)
    
    reset_token = secrets.token_urlsafe(32)
    reset_otp_store[email]['verified'] = True
    reset_otp_store[email]['reset_token'] = reset_token
    
    return Response({
        'message': 'OTP verified',
        'reset_token': reset_token
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password after OTP verification"""
    email = request.data.get('email', '').strip().lower()
    reset_token = request.data.get('reset_token', '')
    new_password = request.data.get('new_password', '')
    
    if not all([email, reset_token, new_password]):
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    stored = reset_otp_store.get(email)
    if not stored or not stored.get('verified'):
        return Response({'error': 'OTP not verified. Please verify OTP first.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if stored.get('reset_token') != reset_token:
        return Response({'error': 'Invalid reset token'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        del reset_otp_store[email]
        return Response({'message': 'Password reset successful. You can now login with your new password.'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)