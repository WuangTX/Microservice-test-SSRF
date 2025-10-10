#!/usr/bin/env python
"""
Script to create Django superuser for admin panel
Run this inside the product-service container
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'product_service.settings')
django.setup()

from django.contrib.auth.models import User

def create_superuser():
    """
    Create superuser if it doesn't exist
    """
    username = 'admin'
    email = 'admin@example.com'
    password = 'admin123'
    
    if User.objects.filter(username=username).exists():
        print(f'✅ Superuser "{username}" already exists')
        user = User.objects.get(username=username)
        print(f'   Email: {user.email}')
        print(f'   Is staff: {user.is_staff}')
        print(f'   Is superuser: {user.is_superuser}')
    else:
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f'✅ Superuser created successfully!')
        print(f'   Username: {username}')
        print(f'   Password: {password}')
        print(f'   Email: {email}')
    
    print(f'\n🌐 Access admin panel at: http://localhost:8082/admin/')
    print(f'   Username: {username}')
    print(f'   Password: {password}')

if __name__ == '__main__':
    create_superuser()
