#!/bin/bash

echo "=========================================="
echo "  🚀 SEED DATA FOR MICROSERVICE SHOP"
echo "=========================================="

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Installing..."
    sudo apt update
    sudo apt install -y python3 python3-pip
fi

# Check if requests library is available
if ! python3 -c "import requests" &> /dev/null 2>&1; then
    echo "📦 Installing requests library..."
    pip3 install requests
fi

# Run seed data script
echo ""
echo "🌱 Seeding data..."
python3 seed_data.py

echo ""
echo "=========================================="
echo "  ✅ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access your application:"
echo "   http://YOUR_SERVER_IP:3000"
echo ""
echo "📝 Login credentials:"
echo "   Admin:"
echo "     - Username: admin"
echo "     - Password: admin123"
echo ""
echo "   Test Users:"
echo "     - Username: user1, user2, user3"
echo "     - Password: user123"
echo ""
