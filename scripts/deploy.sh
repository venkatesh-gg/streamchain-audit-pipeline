#!/bin/bash

set -e

# Analytics Pipeline Deployment Script
# This script deploys the entire analytics pipeline to Kubernetes

NAMESPACE="analytics-pipeline"
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
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install helm first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        log_success "Namespace $NAMESPACE created"
    fi
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Apply Kubernetes manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f "$PROJECT_ROOT/k8s/"
    
    log_success "Infrastructure components deployed"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Build backend image
    log_info "Building backend image..."
    docker build -t analytics-pipeline/backend:latest "$PROJECT_ROOT/backend/"
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -t analytics-pipeline/frontend:latest "$PROJECT_ROOT/"
    
    # If using a registry, push images
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        log_info "Pushing images to registry: $DOCKER_REGISTRY"
        
        docker tag analytics-pipeline/backend:latest "$DOCKER_REGISTRY/analytics-pipeline/backend:latest"
        docker tag analytics-pipeline/frontend:latest "$DOCKER_REGISTRY/analytics-pipeline/frontend:latest"
        
        docker push "$DOCKER_REGISTRY/analytics-pipeline/backend:latest"
        docker push "$DOCKER_REGISTRY/analytics-pipeline/frontend:latest"
        
        log_success "Images pushed to registry"
    else
        log_warning "DOCKER_REGISTRY not set, skipping image push"
    fi
}

# Wait for deployments to be ready
wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."
    
    # List of deployments to wait for
    deployments=(
        "postgres"
        "kafka"
        "elasticsearch"
        "fastapi-backend"
        "react-frontend"
        "prometheus"
        "grafana"
    )
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for $deployment to be ready..."
        kubectl wait --for=condition=available deployment/"$deployment" -n "$NAMESPACE" --timeout=300s || {
            log_warning "Deployment $deployment is not ready yet, continuing..."
        }
    done
    
    log_success "All deployments are ready"
}

# Deploy Helm charts
deploy_helm_charts() {
    log_info "Deploying Helm charts..."
    
    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add elastic https://helm.elastic.co
    helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/
    helm repo update
    
    # Deploy Prometheus monitoring stack
    if ! helm list -n monitoring | grep -q prometheus; then
        log_info "Installing Prometheus monitoring stack..."
        helm install prometheus prometheus-community/kube-prometheus-stack \
            --namespace monitoring \
            --create-namespace \
            --values "$PROJECT_ROOT/helm-values/prometheus-values.yaml" || {
            log_warning "Prometheus installation failed or already exists"
        }
    fi
    
    # Deploy ELK stack
    if ! helm list -n logging | grep -q elasticsearch; then
        log_info "Installing ELK stack..."
        helm install elasticsearch elastic/elasticsearch \
            --namespace logging \
            --create-namespace \
            --values "$PROJECT_ROOT/helm-values/elasticsearch-values.yaml" || {
            log_warning "Elasticsearch installation failed or already exists"
        }
    fi
    
    log_success "Helm charts deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for PostgreSQL to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s
    
    # Run migrations using a job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migration
        image: analytics-pipeline/backend:latest
        command: ["/bin/sh"]
        args: ["-c", "python -c 'from main import engine, Base; Base.metadata.create_all(bind=engine); print(\"Migrations completed\")'"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    log_success "Database migrations completed"
}

# Setup IPFS
setup_ipfs() {
    log_info "Setting up IPFS..."
    
    # Deploy IPFS
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipfs
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ipfs
  template:
    metadata:
      labels:
        app: ipfs
    spec:
      containers:
      - name: ipfs
        image: ipfs/kubo:latest
        ports:
        - containerPort: 4001
        - containerPort: 5001
        - containerPort: 8080
        volumeMounts:
        - name: ipfs-data
          mountPath: /data/ipfs
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: ipfs-data
        persistentVolumeClaim:
          claimName: ipfs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ipfs
  namespace: $NAMESPACE
spec:
  selector:
    app: ipfs
  ports:
  - name: swarm
    port: 4001
    targetPort: 4001
  - name: api
    port: 5001
    targetPort: 5001
  - name: gateway
    port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ipfs-pvc
  namespace: $NAMESPACE
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
EOF
    
    log_success "IPFS setup completed"
}

# Deploy smart contracts
deploy_smart_contracts() {
    log_info "Deploying smart contracts..."
    
    # Check if Ethereum node is ready
    kubectl wait --for=condition=ready pod -l app=ethereum-node -n "$NAMESPACE" --timeout=300s || {
        log_warning "Ethereum node not ready, skipping smart contract deployment"
        return
    }
    
    # Deploy smart contracts using a job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: contract-deployment-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: deploy-contracts
        image: node:18-alpine
        command: ["/bin/sh"]
        args: ["-c", "cd /app && npm install && npx hardhat run scripts/deploy.js --network localhost"]
        workingDir: /app
        volumeMounts:
        - name: contracts-code
          mountPath: /app
        env:
        - name: ETHEREUM_RPC_URL
          value: "http://ethereum-node:8545"
      volumes:
      - name: contracts-code
        configMap:
          name: smart-contracts-code
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    log_success "Smart contracts deployed"
}

# Create ingress and expose services
setup_ingress() {
    log_info "Setting up ingress and exposing services..."
    
    # Apply ingress configurations
    kubectl apply -f "$PROJECT_ROOT/k8s/ingress/"
    
    # Get external IP
    log_info "Waiting for external IP..."
    external_ip=""
    while [ -z "$external_ip" ]; do
        external_ip=$(kubectl get svc nginx-ingress-controller -n ingress-nginx --template="{{range .status.loadBalancer.ingress}}{{.ip}}{{end}}" 2>/dev/null)
        [ -z "$external_ip" ] && sleep 10
    done
    
    log_success "Services exposed at IP: $external_ip"
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check if all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    
    # Check if services are accessible
    log_info "Checking service health..."
    
    # Test backend health endpoint
    kubectl port-forward svc/fastapi-backend 8000:8000 -n "$NAMESPACE" &
    PORT_FORWARD_PID=$!
    sleep 5
    
    if curl -f http://localhost:8000/health &> /dev/null; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed"
    fi
    
    kill $PORT_FORWARD_PID 2>/dev/null || true
    
    log_success "Deployment validation completed"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Setup trap for cleanup
trap cleanup EXIT

# Main deployment function
main() {
    log_info "Starting deployment of Analytics Pipeline..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --registry)
                DOCKER_REGISTRY="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-build     Skip building Docker images"
                echo "  --registry URL   Docker registry URL"
                echo "  --namespace NAME Kubernetes namespace (default: analytics-pipeline)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    create_namespace
    
    if [ "$SKIP_BUILD" != "true" ]; then
        build_and_push_images
    fi
    
    deploy_infrastructure
    deploy_helm_charts
    setup_ipfs
    run_migrations
    deploy_smart_contracts
    wait_for_deployments
    setup_ingress
    validate_deployment
    
    log_success "Analytics Pipeline deployment completed successfully!"
    
    # Display access information
    echo ""
    log_info "Access Information:"
    log_info "Namespace: $NAMESPACE"
    log_info "Frontend: http://analytics-pipeline.com"
    log_info "API: http://api.analytics-pipeline.com"
    log_info "Grafana: http://grafana.analytics-pipeline.com"
    log_info "Prometheus: http://prometheus.analytics-pipeline.com"
    echo ""
    log_info "To access services locally, use port-forwarding:"
    log_info "kubectl port-forward svc/fastapi-backend 8000:8000 -n $NAMESPACE"
    log_info "kubectl port-forward svc/react-frontend 3000:80 -n $NAMESPACE"
    log_info "kubectl port-forward svc/grafana 3001:3000 -n monitoring"
}

# Run main function
main "$@"