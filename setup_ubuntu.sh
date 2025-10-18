#!/bin/bash

echo "=========================================="
echo "  🐧 UBUNTU SERVER SETUP GUIDE"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Please don't run as root. Run as regular user with sudo privileges."
    exit 1
fi

# Step 1: Update system
print_info "Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Step 2: Install Docker
print_info "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Install prerequisites
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    
    # Add Docker repository
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    
    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed"
    print_warning "You may need to log out and back in for docker group membership to take effect"
else
    print_success "Docker already installed"
fi

# Step 3: Install Docker Compose
print_info "Step 3: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Step 4: Install Python3 and pip
print_info "Step 4: Installing Python3 and pip..."
sudo apt install -y python3 python3-pip
pip3 install requests
print_success "Python3 and requests library installed"

# Step 5: Configure firewall
print_info "Step 5: Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 3000/tcp  # Frontend
    sudo ufw allow 8081/tcp  # User Service
    sudo ufw allow 8082/tcp  # Product Service
    sudo ufw allow 8083/tcp  # Inventory Service
    print_success "Firewall configured (ports: 22, 3000, 8081-8083)"
fi

# Step 6: Start Docker service
print_info "Step 6: Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker
print_success "Docker service started and enabled"

echo ""
echo "=========================================="
print_success "SETUP COMPLETE!"
echo "=========================================="
echo ""
echo -e "${CYAN}📝 Next steps:${NC}"
echo "1. If you just added your user to docker group, log out and back in"
echo "2. Clone or upload your microservice project"
echo "3. Navigate to project directory"
echo "4. Run: chmod +x start.sh seed_data.sh"
echo "5. Run: ./start.sh"
echo "6. Wait for services to start (30 seconds)"
echo "7. Run: ./seed_data.sh"
echo ""
echo -e "${CYAN}🔍 Check system:${NC}"
echo "   docker --version"
echo "   docker-compose --version"
echo "   docker ps"
echo ""
echo -e "${CYAN}🌐 Access application:${NC}"
echo "   http://YOUR_SERVER_IP:3000"
echo ""
