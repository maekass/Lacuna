#!/bin/bash
# Quick deployment script for Immunology Investment Intelligence Platform
# Usage: ./deploy.sh [environment]
# Environments: local, staging, production

set -e

ENVIRONMENT=${1:-local}
PROJECT_NAME="immunology-dashboard"

echo "========================================="
echo "Deploying $PROJECT_NAME to $ENVIRONMENT"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_status "Python $(python3 --version) found"
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is not installed"
        exit 1
    fi
    print_status "pip3 found"
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    print_status "git found"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Python dependencies..."
    pip3 install -r requirements.txt --quiet
    print_status "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ -d "tests" ]; then
        python3 -m pytest tests/ -v --tb=short || {
            print_warning "Some tests failed, but continuing..."
        }
    else
        print_warning "No tests directory found, skipping tests"
    fi
}

# Deploy to local
deploy_local() {
    print_status "Starting local Streamlit server..."
    
    # Kill existing processes
    pkill -f "streamlit run" 2>/dev/null || true
    sleep 2
    
    # Start Streamlit
    streamlit run dashboard/app.py \
        --server.port=8501 \
        --server.headless=true \
        --server.address=0.0.0.0 &
    
    sleep 5
    
    # Check if server started
    if curl -s http://localhost:8501/_stcore/health > /dev/null; then
        print_status "Server started successfully!"
        echo ""
        echo "Access your dashboard at:"
        echo "  Local:    http://localhost:8501"
        echo "  Network:  http://$(ipconfig getifaddr en0 2>/dev/null || echo "N/A"):8501"
        echo ""
        echo "Press Ctrl+C to stop the server"
    else
        print_error "Server failed to start"
        exit 1
    fi
}

# Deploy to Streamlit Cloud
deploy_streamlit_cloud() {
    print_status "Preparing for Streamlit Cloud deployment..."
    
    # Check if git repo is clean
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes"
        read -p "Commit and push changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add -A
            git commit -m "deploy: Prepare for Streamlit Cloud deployment"
            git push origin main
            print_status "Changes pushed to GitHub"
        else
            print_error "Deployment cancelled"
            exit 1
        fi
    else
        print_status "Git repository is clean"
        git push origin main
    fi
    
    echo ""
    print_status "Next steps for Streamlit Cloud deployment:"
    echo "1. Go to https://share.streamlit.io/"
    echo "2. Sign in with GitHub"
    echo "3. Click 'New app'"
    echo "4. Select your repository: $(git config --get remote.origin.url)"
    echo "5. Set main file: dashboard/app.py"
    echo "6. Click 'Deploy!'"
    echo ""
    print_status "Your app will be live at: https://immunology-investment-dashboard.streamlit.app"
}

# Deploy with Docker
deploy_docker() {
    print_status "Building Docker image..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Build image
    docker build -t $PROJECT_NAME:latest . || {
        print_error "Docker build failed"
        exit 1
    }
    print_status "Docker image built successfully"
    
    # Stop existing container
    docker stop $PROJECT_NAME 2>/dev/null || true
    docker rm $PROJECT_NAME 2>/dev/null || true
    
    # Run container
    print_status "Starting Docker container..."
    docker run -d \
        --name $PROJECT_NAME \
        -p 8501:8501 \
        --restart unless-stopped \
        $PROJECT_NAME:latest
    
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q $PROJECT_NAME; then
        print_status "Container started successfully!"
        echo ""
        echo "Access your dashboard at: http://localhost:8501"
        echo ""
        echo "Container logs: docker logs -f $PROJECT_NAME"
        echo "Stop container: docker stop $PROJECT_NAME"
    else
        print_error "Container failed to start"
        docker logs $PROJECT_NAME
        exit 1
    fi
}

# Deploy to AWS ECS
deploy_aws_ecs() {
    print_status "Deploying to AWS ECS..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    print_status "AWS credentials verified"
    
    # Build and push to ECR
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=${AWS_REGION:-us-east-1}
    ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME"
    
    print_status "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_REPO
    
    print_status "Building and pushing Docker image..."
    docker build -t $PROJECT_NAME:latest .
    docker tag $PROJECT_NAME:latest $ECR_REPO:latest
    docker push $ECR_REPO:latest
    
    print_status "Image pushed to ECR: $ECR_REPO:latest"
    
    # Update ECS service
    print_status "Updating ECS service..."
    aws ecs update-service \
        --cluster production \
        --service $PROJECT_NAME \
        --force-new-deployment \
        --region $AWS_REGION
    
    print_status "Deployment initiated. Check AWS Console for status."
}

# Main deployment logic
main() {
    check_prerequisites
    
    case $ENVIRONMENT in
        local)
            install_dependencies
            run_tests
            deploy_local
            ;;
        staging|streamlit)
            install_dependencies
            run_tests
            deploy_streamlit_cloud
            ;;
        docker)
            deploy_docker
            ;;
        production|aws)
            install_dependencies
            run_tests
            deploy_aws_ecs
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            echo "Usage: ./deploy.sh [local|staging|docker|production]"
            exit 1
            ;;
    esac
}

# Run main function
main

print_status "Deployment complete!"
