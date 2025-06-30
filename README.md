# Event-Driven Analytics & Blockchain Audit Pipeline

A comprehensive, production-ready analytics platform that combines real-time event processing, blockchain audit trails, and advanced anomaly detection. Built with modern technologies and designed for enterprise-scale deployments.

![Analytics Dashboard](https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop)

## 🚀 Features

### Core Capabilities
- **Real-time Event Processing** with Apache Kafka and Apache Flink
- **Immutable Audit Trail** using Ethereum smart contracts and IPFS
- **Advanced Anomaly Detection** with machine learning algorithms
- **Multi-storage Architecture** (PostgreSQL, Elasticsearch, IPFS)
- **Interactive Dashboard** with real-time charts and monitoring
- **Blockchain Explorer** for audit trail verification
- **WebSocket Live Feed** for real-time event streaming

### Security & Compliance
- **Zero-Trust Architecture** with service mesh (Istio)
- **OAuth2/OIDC Authentication** via Okta integration
- **End-to-end Encryption** for sensitive data
- **GDPR/SOX Compliance** ready audit trails
- **Role-based Access Control** (RBAC)

### DevOps & Monitoring
- **Container-first** deployment with Docker and Kubernetes
- **Infrastructure as Code** with Terraform
- **CI/CD Pipeline** with automated testing and deployment
- **Comprehensive Monitoring** with Prometheus and Grafana
- **Chaos Engineering** with Chaos Mesh
- **Security Scanning** with SonarQube and OWASP ZAP

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│  Kafka Cluster  │───▶│  Flink Jobs     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │  Elasticsearch  │    │   IPFS Network  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │───▶│   React UI      │    │  Ethereum Node │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **PostgreSQL** - Primary transactional database
- **Elasticsearch** - Search and analytics engine
- **Apache Kafka** - Event streaming platform
- **Apache Flink** - Stream processing framework
- **GraphQL** - Query language with Strawberry
- **WebSockets** - Real-time communication

### Blockchain & Storage
- **Ethereum** - Smart contract platform for audit trails
- **Solidity** - Smart contract programming language
- **IPFS** - Distributed file storage
- **Web3.py** - Ethereum integration

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive charts and visualizations
- **Framer Motion** - Smooth animations
- **React Query** - Data fetching and caching

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Container orchestration
- **Terraform** - Infrastructure as Code
- **Azure AKS** - Managed Kubernetes service
- **Prometheus** - Monitoring and alerting
- **Grafana** - Visualization and dashboards

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Python 3.11+
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd analytics-pipeline
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

3. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Initialize database**
   ```bash
   # Database will be automatically initialized via Docker Compose
   # Check logs: docker-compose logs postgres
   ```

5. **Deploy smart contracts**
   ```bash
   cd smart-contracts
   npm install
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network localhost
   ```

6. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   python main.py
   
   # Frontend (Terminal 2)
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - GraphQL Playground: http://localhost:8000/graphql

### Using Setup Scripts

For automated setup, use the provided scripts:

```bash
# Complete local setup
./scripts/setup-local.sh

# Production deployment
./scripts/deploy.sh --registry your-registry.com
```

## 📊 Dashboard Features

### Real-time Analytics
- **Live Event Metrics** - Events per minute, anomaly rates
- **System Health** - CPU, memory, network utilization
- **Threat Analysis** - Risk score distribution and trends
- **Performance Monitoring** - Response times and throughput

### Audit Explorer
- **Blockchain Verification** - Immutable audit trail verification
- **Transaction Details** - Gas usage, block numbers, IPFS hashes
- **Search & Filter** - Advanced search across audit records
- **Export Capabilities** - CSV, JSON export for compliance

### Event Stream
- **Live Event Feed** - Real-time event monitoring
- **Severity Filtering** - Filter by event severity levels
- **Event Details** - Comprehensive event metadata
- **Alert Integration** - Real-time alert notifications

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
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
```

### Smart Contract Configuration

Update `smart-contracts/hardhat.config.js` for different networks:

```javascript
networks: {
  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 1337,
  },
  goerli: {
    url: process.env.GOERLI_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
  },
}
```

## 🚀 Production Deployment

### Azure Kubernetes Service (AKS)

1. **Provision infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Configure kubectl**
   ```bash
   az aks get-credentials --resource-group analytics-pipeline-rg --name analytics-aks
   ```

3. **Deploy application**
   ```bash
   kubectl apply -f k8s/
   ```

4. **Verify deployment**
   ```bash
   kubectl get pods -n analytics-pipeline
   kubectl get services -n analytics-pipeline
   ```

### Docker Compose (Staging)

```bash
# Build and deploy all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale fastapi-backend=3
```

## 📈 Monitoring & Observability

### Metrics Collection
- **Application Metrics** - Custom business metrics
- **Infrastructure Metrics** - CPU, memory, disk, network
- **Blockchain Metrics** - Gas usage, transaction counts
- **Security Metrics** - Failed authentications, anomalies

### Alerting Rules
- **High Error Rate** - >10% error rate for 5 minutes
- **Anomaly Detection** - >5% anomaly rate for 2 minutes
- **System Resources** - >85% CPU/memory usage
- **Blockchain Issues** - Failed transactions, sync lag

### Dashboards
- **Executive Dashboard** - High-level KPIs and trends
- **Operations Dashboard** - System health and performance
- **Security Dashboard** - Threat landscape and incidents
- **Developer Dashboard** - API performance and errors

## 🔒 Security

### Authentication & Authorization
- **OAuth2/OIDC** integration with Okta
- **JWT tokens** for API authentication
- **Role-based access control** (RBAC)
- **Multi-factor authentication** (MFA) support

### Data Protection
- **Encryption at rest** - Database and file storage
- **Encryption in transit** - TLS 1.3 for all communications
- **Key management** - Azure Key Vault integration
- **Data masking** - PII protection in logs and exports

### Security Scanning
- **SAST** - Static application security testing with SonarQube
- **DAST** - Dynamic application security testing with OWASP ZAP
- **Container scanning** - Vulnerability scanning with Trivy
- **Dependency scanning** - NPM and pip vulnerability checks

## 🧪 Testing

### Unit Tests
```bash
# Backend tests
cd backend
pytest --cov=. --cov-report=html

# Frontend tests
npm test

# Smart contract tests
cd smart-contracts
npx hardhat test
```

### Integration Tests
```bash
# API integration tests
pytest tests/integration/

# End-to-end tests
npm run test:e2e
```

### Performance Tests
```bash
# Load testing with k6
k6 run tests/performance/load-test.js

# Stress testing
k6 run tests/performance/stress-test.js
```

## 📚 API Documentation

### REST API
- **OpenAPI Specification** - Available at `/docs`
- **Authentication** - Bearer token required
- **Rate Limiting** - 1000 requests per hour per user
- **Versioning** - API versioning with `/v1/` prefix

### GraphQL API
- **Schema** - Available at `/graphql`
- **Playground** - Interactive query interface
- **Subscriptions** - Real-time data updates
- **Introspection** - Schema exploration enabled

### WebSocket API
- **Real-time Events** - Live event streaming
- **Authentication** - Token-based authentication
- **Channels** - Topic-based event filtering
- **Heartbeat** - Connection health monitoring

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- **Python** - Follow PEP 8, use Black formatter
- **TypeScript** - Follow ESLint rules, use Prettier
- **Solidity** - Follow Solidity style guide
- **Documentation** - Update README and API docs

### Testing Requirements
- **Unit tests** - Minimum 80% code coverage
- **Integration tests** - All API endpoints covered
- **E2E tests** - Critical user journeys tested
- **Security tests** - SAST/DAST passing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **API Reference** - `/docs` endpoint
- **Architecture Guide** - `docs/architecture.md`
- **Deployment Guide** - `docs/deployment.md`
- **Troubleshooting** - `docs/troubleshooting.md`

### Community
- **Issues** - GitHub Issues for bug reports
- **Discussions** - GitHub Discussions for questions
- **Slack** - Join our community Slack workspace
- **Email** - support@analytics-pipeline.com

### Professional Support
- **Enterprise Support** - 24/7 support available
- **Consulting** - Architecture and implementation consulting
- **Training** - Team training and workshops
- **Custom Development** - Feature development services

---

## 🎯 Roadmap

### Q1 2024
- [ ] Machine Learning Pipeline Integration
- [ ] Advanced Anomaly Detection Models
- [ ] Multi-tenant Architecture
- [ ] Enhanced Security Features

### Q2 2024
- [ ] Real-time Collaboration Features
- [ ] Advanced Analytics Capabilities
- [ ] Mobile Application
- [ ] API Gateway Integration

### Q3 2024
- [ ] Edge Computing Support
- [ ] Advanced Visualization Tools
- [ ] Compliance Automation
- [ ] Performance Optimizations

---

**Built with ❤️ by the Analytics Pipeline Team**

For more information, visit our [documentation site](https://docs.analytics-pipeline.com) or contact us at [hello@analytics-pipeline.com](mailto:hello@analytics-pipeline.com).
