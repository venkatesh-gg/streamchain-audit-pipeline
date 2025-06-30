#!/bin/bash

set -e

# Local Development Setup Script
# This script sets up the analytics pipeline for local development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if Python is installed
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_info "Creating .env file..."
        cat > "$PROJECT_ROOT/.env" << EOF
# Database Configuration
DATABASE_URL=postgresql://analytics_user:analytics_password@localhost:5432/analytics_db

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Blockchain Configuration
ETHEREUM_RPC_URL=http://localhost:8545

# IPFS Configuration
IPFS_API_URL=http://localhost:5001

# API Configuration
API_BASE_URL=http://localhost:8000

# Frontend Configuration
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws

# Development Settings
LOG_LEVEL=DEBUG
ENVIRONMENT=development
EOF
        log_success ".env file created"
    else
        log_warning ".env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        log_success "Virtual environment created"
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt
    log_success "Backend dependencies installed"
    
    # Install smart contract dependencies
    log_info "Installing smart contract dependencies..."
    cd "$PROJECT_ROOT/smart-contracts"
    npm install
    log_success "Smart contract dependencies installed"
    
    cd "$PROJECT_ROOT"
}

# Start infrastructure services
start_infrastructure() {
    log_info "Starting infrastructure services..."
    
    # Start Docker Compose services
    docker-compose up -d zookeeper kafka postgres elasticsearch ipfs ethereum-node prometheus grafana
    
    log_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    while ! docker-compose exec postgres pg_isready -U analytics_user -d analytics_db &> /dev/null; do
        sleep 2
    done
    log_success "PostgreSQL is ready"
    
    # Wait for Elasticsearch
    log_info "Waiting for Elasticsearch..."
    while ! curl -s http://localhost:9200/_cluster/health &> /dev/null; do
        sleep 2
    done
    log_success "Elasticsearch is ready"
    
    # Wait for Kafka
    log_info "Waiting for Kafka..."
    sleep 30  # Kafka takes some time to start
    log_success "Kafka should be ready"
    
    # Wait for IPFS
    log_info "Waiting for IPFS..."
    while ! curl -s http://localhost:5001/api/v0/version &> /dev/null; do
        sleep 2
    done
    log_success "IPFS is ready"
    
    log_success "All infrastructure services are running"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose exec postgres psql -U analytics_user -d analytics_db -f /docker-entrypoint-initdb.d/init.sql
    
    log_success "Database setup completed"
}

# Deploy smart contracts
deploy_smart_contracts() {
    log_info "Deploying smart contracts..."
    
    cd "$PROJECT_ROOT/smart-contracts"
    
    # Compile contracts
    log_info "Compiling smart contracts..."
    npx hardhat compile
    
    # Deploy contracts to local network
    log_info "Deploying contracts to local network..."
    npx hardhat run scripts/deploy.js --network localhost
    
    log_success "Smart contracts deployed"
    
    cd "$PROJECT_ROOT"
}

# Setup Kafka topics
setup_kafka_topics() {
    log_info "Setting up Kafka topics..."
    
    topics=("audit-events" "enriched-events" "event-aggregations" "alerts")
    
    for topic in "${topics[@]}"; do
        log_info "Creating topic: $topic"
        docker-compose exec kafka kafka-topics --create --topic "$topic" --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 || {
            log_warning "Topic $topic might already exist"
        }
    done
    
    log_success "Kafka topics setup completed"
}

# Start Flink job
start_flink_job() {
    log_info "Starting Flink stream processing job..."
    
    # Start Flink cluster
    docker-compose up -d flink-jobmanager flink-taskmanager
    
    # Wait for Flink to be ready
    log_info "Waiting for Flink to be ready..."
    while ! curl -s http://localhost:8081/overview &> /dev/null; do
        sleep 2
    done
    
    # Build and submit Flink job
    cd "$PROJECT_ROOT/stream-processing/flink-job"
    mvn clean package -DskipTests
    
    # Submit job to Flink
    docker-compose exec flink-jobmanager flink run /opt/flink/jobs/target/event-enrichment-job-1.0.0.jar
    
    log_success "Flink job started"
    
    cd "$PROJECT_ROOT"
}

# Start development servers
start_dev_servers() {
    log_info "Starting development servers..."
    
    # Start backend server
    log_info "Starting backend server..."
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    python main.py &
    BACKEND_PID=$!
    log_success "Backend server started (PID: $BACKEND_PID)"
    
    # Start frontend development server
    log_info "Starting frontend server..."
    cd "$PROJECT_ROOT"
    npm run dev &
    FRONTEND_PID=$!
    log_success "Frontend server started (PID: $FRONTEND_PID)"
    
    # Save PIDs for cleanup
    echo "$BACKEND_PID" > /tmp/backend.pid
    echo "$FRONTEND_PID" > /tmp/frontend.pid
    
    log_success "Development servers are running"
}

# Create sample data
create_sample_data() {
    log_info "Creating sample data..."
    
    # Wait for backend to be ready
    sleep 10
    
    # Create sample events
    for i in {1..10}; do
        curl -X POST http://localhost:8000/events \
            -H "Content-Type: application/json" \
            -d '{
                "event_type": "USER_AUTHENTICATION",
                "user_id": "user_'$i'",
                "action": "User login attempt",
                "metadata": {
                    "ip": "192.168.1.'$((RANDOM % 255))'",
                    "user_agent": "Mozilla/5.0",
                    "session_id": "session_'$i'"
                }
            }' &> /dev/null
    done
    
    log_success "Sample data created"
}

# Display access information
display_access_info() {
    echo ""
    log_success "Local development environment is ready!"
    echo ""
    log_info "Service Access Information:"
    echo "  Frontend:      http://localhost:5173"
    echo "  Backend API:   http://localhost:8000"
    echo "  API Docs:      http://localhost:8000/docs"
    echo "  GraphQL:       http://localhost:8000/graphql"
    echo "  Grafana:       http://localhost:3000 (admin:admin)"
    echo "  Prometheus:    http://localhost:9090"
    echo "  Elasticsearch: http://localhost:9200"
    echo "  Kafka UI:      http://localhost:9021 (if available)"
    echo "  IPFS Gateway:  http://localhost:8080"
    echo "  Flink UI:      http://localhost:8081"
    echo ""
    log_info "Database Information:"
    echo "  Host:     localhost:5432"
    echo "  Database: analytics_db"
    echo "  Username: analytics_user"
    echo "  Password: analytics_password"
    echo ""
    log_info "To stop the development environment:"
    echo "  docker-compose down"
    echo "  kill \$(cat /tmp/backend.pid)"
    echo "  kill \$(cat /tmp/frontend.pid)"
    echo ""
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Kill development servers
    if [ -f /tmp/backend.pid ]; then
        kill $(cat /tmp/backend.pid) 2>/dev/null || true
        rm -f /tmp/backend.pid
    fi
    
    if [ -f /tmp/frontend.pid ]; then
        kill $(cat /tmp/frontend.pid) 2>/dev/null || true
        rm -f /tmp/frontend.pid
    fi
}

# Setup trap for cleanup
trap cleanup EXIT

# Main setup function
main() {
    log_info "Setting up local development environment for Analytics Pipeline..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-contracts)
                SKIP_CONTRACTS=true
                shift
                ;;
            --skip-flink)
                SKIP_FLINK=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-deps      Skip installing dependencies"
                echo "  --skip-contracts Skip deploying smart contracts"
                echo "  --skip-flink     Skip starting Flink job"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_prerequisites
    setup_environment
    
    if [ "$SKIP_DEPS" != "true" ]; then
        install_dependencies
    fi
    
    start_infrastructure
    setup_database
    setup_kafka_topics
    
    if [ "$SKIP_CONTRACTS" != "true" ]; then
        deploy_smart_contracts
    fi
    
    if [ "$SKIP_FLINK" != "true" ]; then
        start_flink_job
    fi
    
    start_dev_servers
    create_sample_data
    display_access_info
    
    # Keep the script running
    log_info "Development environment is running. Press Ctrl+C to stop."
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"