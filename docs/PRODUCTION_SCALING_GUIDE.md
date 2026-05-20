# Production Scaling Guide

Comprehensive guide to scaling the Immunology Investment Intelligence platform from prototype to production-grade system.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Immediate Production Readiness (Week 1)](#immediate-production-readiness-week-1)
3. [Infrastructure Scaling (Month 1)](#infrastructure-scaling-month-1)
4. [Data Pipeline Optimization (Month 2)](#data-pipeline-optimization-month-2)
5. [Enterprise Features (Month 3+)](#enterprise-features-month-3)
6. [Cost Optimization](#cost-optimization)
7. [Monitoring & Observability](#monitoring--observability)

---

## Current State Assessment

### What's Working
- ✅ Clean, modular Python codebase (8,000+ lines)
- ✅ Advanced ML models (trial success predictor, regression suite)
- ✅ Quantitative analysis frameworks (pairs trading, regime detection)
- ✅ Professional UI/UX (2026 clinical aesthetic)
- ✅ Legal disclaimers and compliance documentation
- ✅ Comprehensive testing and validation

### Current Limitations
- ⚠️ Single-threaded Streamlit (not horizontally scalable)
- ⚠️ In-memory data storage (no persistence)
- ⚠️ Manual data updates (no automated pipelines)
- ⚠️ No user authentication/authorization
- ⚠️ No API for programmatic access
- ⚠️ Limited to ~1000 concurrent users

---

## Immediate Production Readiness (Week 1)

### 1. Deploy to Streamlit Cloud (Free Tier)

**Quick Win**: Get public URL in 10 minutes

```bash
# Already done - just need to push
git push origin main

# Then deploy at:
# https://share.streamlit.io/
```

**Limitations**:
- 1 GB RAM
- 1 CPU core
- ~50 concurrent users
- Public repository required

**Cost**: FREE

---

### 2. Add Basic Analytics

**File**: `dashboard/analytics.py`

```python
import streamlit as st
from datetime import datetime
import json
from pathlib import Path

class Analytics:
    """Track basic usage metrics"""
    
    def __init__(self):
        self.log_file = Path("data/analytics/usage.jsonl")
        self.log_file.parent.mkdir(exist_ok=True)
    
    def track_page_view(self, page: str):
        """Log page view"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "page": page,
            "session_id": st.session_state.get("session_id"),
            "user_agent": st.context.headers.get("User-Agent", "unknown")
        }
        
        with open(self.log_file, "a") as f:
            f.write(json.dumps(event) + "\n")
    
    def get_daily_active_users(self) -> int:
        """Count unique sessions in last 24h"""
        # Implementation
        pass

# Usage in app.py
analytics = Analytics()
analytics.track_page_view("home")
```

**Benefit**: Understand user behavior, optimize features

---

### 3. Add Error Tracking (Sentry)

```bash
pip install sentry-sdk
```

**File**: `dashboard/app.py`

```python
import sentry_sdk

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    traces_sample_rate=0.1,
    environment="production"
)

# Errors automatically tracked
```

**Cost**: FREE (up to 5k events/month)

---

### 4. Add Caching for Performance

```python
import streamlit as st

@st.cache_data(ttl=3600)  # Cache for 1 hour
def load_clinical_trials(disease: str):
    """Cached data loading"""
    return expensive_data_load(disease)

@st.cache_resource
def load_ml_model():
    """Cache ML model (singleton)"""
    return load_model("data/models/predictor.pkl")
```

**Benefit**: 10-100x faster page loads

---

## Infrastructure Scaling (Month 1)

### Option A: Streamlit Cloud (Paid)

**Specs**:
- 4 GB RAM
- 2 CPU cores
- ~200 concurrent users
- Private repositories
- Custom domain

**Cost**: $250/month

**Pros**:
- Zero DevOps
- Auto-scaling
- Built-in SSL

**Cons**:
- Limited customization
- Streamlit-only

---

### Option B: AWS/GCP with Docker

**Architecture**:

```
┌─────────────────┐
│   CloudFlare    │  CDN + DDoS protection
│   (Free tier)   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │  AWS ALB / GCP Load Balancer
│   (Auto-scale)  │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│ App 1 │ │ App 2│ │ App 3│ │ App N│  Streamlit containers
└───┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
    │        │        │        │
    └────────┴────────┴────────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │  RDS / Cloud SQL
    │   (Managed DB)  │
    └─────────────────┘
```

**Dockerfile**:

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Run app
CMD ["streamlit", "run", "dashboard/app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true"]
```

**Deploy with ECS/Cloud Run**:

```bash
# Build and push
docker build -t immunology-dashboard .
docker tag immunology-dashboard:latest YOUR_REGISTRY/immunology-dashboard:latest
docker push YOUR_REGISTRY/immunology-dashboard:latest

# Deploy (AWS ECS example)
aws ecs create-service \
  --cluster production \
  --service-name immunology-dashboard \
  --task-definition immunology-dashboard:1 \
  --desired-count 3 \
  --launch-type FARGATE
```

**Cost**: $150-500/month (depending on traffic)

**Pros**:
- Full control
- Horizontal scaling
- Custom infrastructure

**Cons**:
- Requires DevOps expertise
- More maintenance

---

### Option C: FastAPI + React (Full Rewrite)

**For 10,000+ concurrent users**

**Backend**: FastAPI (async Python)

```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()

@app.get("/api/trials/{disease}")
async def get_trials(disease: str):
    """Async endpoint for clinical trials"""
    data = await fetch_trials_async(disease)
    return {"trials": data}

@app.post("/api/predict")
async def predict_trial_success(trial_data: dict):
    """ML prediction endpoint"""
    model = get_cached_model()
    prediction = await asyncio.to_thread(model.predict, trial_data)
    return {"success_probability": prediction}
```

**Frontend**: React with Material-UI

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line } from 'recharts';

function TrialDashboard() {
  const [trials, setTrials] = useState([]);
  
  useEffect(() => {
    fetch('/api/trials/sickle-cell')
      .then(res => res.json())
      .then(data => setTrials(data.trials));
  }, []);
  
  return (
    <div className="dashboard">
      <h1>Clinical Trials</h1>
      <LineChart data={trials}>
        <Line dataKey="enrollment" stroke="#5A8A6F" />
      </LineChart>
    </div>
  );
}
```

**Cost**: $500-2000/month

**Pros**:
- Scales to millions of users
- Best performance
- Full customization

**Cons**:
- Complete rewrite (2-3 months)
- Requires frontend expertise

---

## Data Pipeline Optimization (Month 2)

### 1. Automated Data Collection

**Current**: Manual CSV updates
**Production**: Automated pipelines

**Architecture**:

```python
# airflow/dags/clinical_trials_pipeline.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'clinical_trials_etl',
    default_args=default_args,
    schedule_interval='0 2 * * *',  # Daily at 2 AM
    start_date=datetime(2026, 1, 1)
)

def extract_trials():
    """Fetch from ClinicalTrials.gov API"""
    from src.data_collection.clinical_trials_collector import fetch_all_trials
    trials = fetch_all_trials()
    return trials

def transform_trials(trials):
    """Clean and enrich data"""
    # Add NLP features, calculate metrics
    return enriched_trials

def load_to_database(trials):
    """Store in PostgreSQL"""
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    # Bulk insert
    
extract = PythonOperator(task_id='extract', python_callable=extract_trials, dag=dag)
transform = PythonOperator(task_id='transform', python_callable=transform_trials, dag=dag)
load = PythonOperator(task_id='load', python_callable=load_to_database, dag=dag)

extract >> transform >> load
```

**Tools**:
- **Apache Airflow**: Workflow orchestration
- **dbt**: Data transformations
- **Great Expectations**: Data quality checks

**Cost**: $100-300/month (managed Airflow)

---

### 2. Database Migration

**From**: CSV files
**To**: PostgreSQL (production) or Snowflake (enterprise)

**Schema**:

```sql
-- Clinical trials table
CREATE TABLE clinical_trials (
    nct_id VARCHAR(20) PRIMARY KEY,
    disease VARCHAR(100) NOT NULL,
    phase VARCHAR(20),
    status VARCHAR(50),
    enrollment INTEGER,
    start_date DATE,
    completion_date DATE,
    sponsor VARCHAR(200),
    intervention TEXT,
    primary_outcome TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disease ON clinical_trials(disease);
CREATE INDEX idx_phase ON clinical_trials(phase);
CREATE INDEX idx_status ON clinical_trials(status);

-- ML predictions table
CREATE TABLE trial_predictions (
    id SERIAL PRIMARY KEY,
    nct_id VARCHAR(20) REFERENCES clinical_trials(nct_id),
    success_probability DECIMAL(5,4),
    model_version VARCHAR(20),
    features JSONB,
    predicted_at TIMESTAMP DEFAULT NOW()
);

-- User activity table
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY,
    user_id VARCHAR(100),
    page_views JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);
```

**Migration Script**:

```python
import pandas as pd
import psycopg2
from sqlalchemy import create_engine

# Read CSV
df = pd.read_csv('data/raw/clinical_trials_scd.csv')

# Connect to PostgreSQL
engine = create_engine(DATABASE_URL)

# Bulk insert
df.to_sql('clinical_trials', engine, if_exists='append', index=False, method='multi', chunksize=1000)
```

**Cost**: 
- PostgreSQL RDS: $50-200/month
- Snowflake: $200-1000/month

---

### 3. Caching Layer (Redis)

**For high-traffic endpoints**:

```python
import redis
import json
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache_result(ttl=3600):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key
            key = f"{func.__name__}:{json.dumps(args)}:{json.dumps(kwargs)}"
            
            # Check cache
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)
            
            # Compute and cache
            result = func(*args, **kwargs)
            redis_client.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache_result(ttl=1800)  # 30 minutes
def get_trial_statistics(disease: str):
    """Expensive aggregation query"""
    # Complex database query
    return stats
```

**Cost**: $20-100/month (managed Redis)

---

## Enterprise Features (Month 3+)

### 1. User Authentication & Authorization

**Auth0 / Cognito Integration**:

```python
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401)
        return user_id
    except jwt.JWTError:
        raise HTTPException(status_code=401)

@app.get("/api/trials")
async def get_trials(user_id: str = Depends(get_current_user)):
    """Protected endpoint"""
    # Check user permissions
    if not has_permission(user_id, "view_trials"):
        raise HTTPException(status_code=403)
    return trials
```

**Features**:
- SSO (Google, Microsoft, SAML)
- Role-based access control (RBAC)
- Audit logging
- Session management

**Cost**: $0-500/month (depending on users)

---

### 2. REST API for Programmatic Access

**OpenAPI Spec**:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="Immunology Investment Intelligence API",
    version="1.0.0",
    docs_url="/api/docs"
)

class TrialPredictionRequest(BaseModel):
    nct_id: str
    phase: str
    enrollment: int
    sponsor_type: str

class TrialPredictionResponse(BaseModel):
    nct_id: str
    success_probability: float
    confidence_interval: tuple[float, float]
    feature_importance: dict

@app.post("/api/v1/predict", response_model=TrialPredictionResponse)
async def predict_trial_success(request: TrialPredictionRequest):
    """Predict clinical trial success probability"""
    model = get_ml_model()
    prediction = model.predict(request.dict())
    return TrialPredictionResponse(**prediction)
```

**Auto-generated docs**: `/api/docs` (Swagger UI)

---

### 3. Real-Time Data Streaming

**WebSocket for live updates**:

```python
from fastapi import WebSocket
import asyncio

@app.websocket("/ws/trials/{disease}")
async def websocket_endpoint(websocket: WebSocket, disease: str):
    await websocket.accept()
    
    try:
        while True:
            # Check for new trials
            new_trials = await check_new_trials(disease)
            
            if new_trials:
                await websocket.send_json({
                    "type": "new_trials",
                    "data": new_trials
                })
            
            await asyncio.sleep(60)  # Check every minute
    except:
        await websocket.close()
```

**Frontend**:

```javascript
const ws = new WebSocket('ws://api.example.com/ws/trials/sickle-cell');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_trials') {
    updateDashboard(data.data);
  }
};
```

---

### 4. Advanced ML Model Serving

**TensorFlow Serving / TorchServe**:

```python
import tensorflow as tf
from tensorflow_serving.apis import predict_pb2, prediction_service_pb2_grpc

class ModelServer:
    """Serve ML models via gRPC"""
    
    def __init__(self, model_name: str, version: int):
        self.stub = prediction_service_pb2_grpc.PredictionServiceStub(channel)
        self.model_name = model_name
        self.version = version
    
    async def predict(self, features: dict):
        """Make prediction via gRPC"""
        request = predict_pb2.PredictRequest()
        request.model_spec.name = self.model_name
        request.model_spec.version.value = self.version
        
        # Add features
        for key, value in features.items():
            request.inputs[key].CopyFrom(tf.make_tensor_proto(value))
        
        result = await self.stub.Predict(request, timeout=10.0)
        return result
```

**Benefits**:
- A/B testing (multiple model versions)
- Canary deployments
- Auto-scaling
- GPU acceleration

**Cost**: $200-1000/month (GPU instances)

---

## Cost Optimization

### Tier 1: Prototype (Current)
**Users**: <100
**Cost**: $0/month
- Streamlit Cloud (free tier)
- CSV files
- No auth

---

### Tier 2: Small Production
**Users**: 100-1000
**Cost**: $400-600/month

| Service | Cost |
|---------|------|
| Streamlit Cloud (paid) | $250 |
| PostgreSQL RDS (db.t3.small) | $50 |
| Redis (cache.t3.micro) | $20 |
| CloudFlare (CDN) | $0 |
| Sentry (error tracking) | $26 |
| Auth0 (1000 users) | $0 |
| **Total** | **~$350/month** |

---

### Tier 3: Medium Production
**Users**: 1000-10,000
**Cost**: $1000-2000/month

| Service | Cost |
|---------|------|
| AWS ECS (3x t3.large) | $300 |
| PostgreSQL RDS (db.r5.large) | $200 |
| Redis (cache.r5.large) | $100 |
| S3 + CloudFront | $50 |
| Application Load Balancer | $25 |
| Airflow (managed) | $200 |
| Monitoring (Datadog) | $100 |
| **Total** | **~$975/month** |

---

### Tier 4: Enterprise
**Users**: 10,000+
**Cost**: $5000-15,000/month

| Service | Cost |
|---------|------|
| Kubernetes (EKS/GKE) | $500 |
| Auto-scaling instances | $2000 |
| Snowflake (data warehouse) | $1000 |
| Redis Cluster | $300 |
| CDN (CloudFlare Pro) | $200 |
| ML model serving (GPU) | $1000 |
| Monitoring & logging | $500 |
| Security & compliance | $500 |
| **Total** | **~$6000/month** |

---

## Monitoring & Observability

### 1. Application Monitoring

**Datadog / New Relic**:

```python
from ddtrace import tracer

@tracer.wrap(service="immunology-dashboard", resource="get_trials")
def get_clinical_trials(disease: str):
    """Traced function"""
    with tracer.trace("database.query"):
        trials = db.query(f"SELECT * FROM trials WHERE disease = '{disease}'")
    
    with tracer.trace("ml.predict"):
        predictions = model.predict(trials)
    
    return predictions
```

**Metrics to track**:
- Request latency (p50, p95, p99)
- Error rate
- Database query time
- Cache hit rate
- ML model inference time
- Active users

---

### 2. Custom Dashboards

**Grafana + Prometheus**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'immunology-dashboard'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

**Python metrics**:

```python
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')
active_users = Gauge('active_users', 'Number of active users')

# Track metrics
@request_duration.time()
def handle_request():
    request_count.labels(method='GET', endpoint='/trials').inc()
    # Handle request
```

---

### 3. Alerting

**PagerDuty / Opsgenie**:

```yaml
# alertmanager.yml
route:
  receiver: 'pagerduty'
  group_by: ['alertname', 'severity']
  
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_KEY'

# Alert rules
groups:
  - name: immunology_dashboard
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowResponse
        expr: http_request_duration_seconds{quantile="0.95"} > 2
        for: 10m
        annotations:
          summary: "95th percentile latency > 2s"
```

---

## Recommended Scaling Path

### Phase 1: Weeks 1-2 (Quick Wins)
1. ✅ Deploy to Streamlit Cloud (free tier)
2. ✅ Add Sentry error tracking
3. ✅ Implement caching (`@st.cache_data`)
4. ✅ Add basic analytics
5. ✅ Set up monitoring (uptime checks)

**Cost**: $0-50/month
**Effort**: 1-2 days

---

### Phase 2: Month 1 (Production Ready)
1. ✅ Upgrade to Streamlit Cloud paid ($250/month)
2. ✅ Migrate to PostgreSQL database
3. ✅ Add Redis caching layer
4. ✅ Implement user authentication (Auth0)
5. ✅ Set up automated data pipelines (Airflow)
6. ✅ Add comprehensive monitoring (Datadog)

**Cost**: $400-600/month
**Effort**: 2-3 weeks

---

### Phase 3: Months 2-3 (Scale to 1000s)
1. ✅ Dockerize application
2. ✅ Deploy to AWS ECS / GCP Cloud Run
3. ✅ Add load balancer + auto-scaling
4. ✅ Implement REST API (FastAPI)
5. ✅ Add WebSocket for real-time updates
6. ✅ Set up CI/CD pipeline (GitHub Actions)

**Cost**: $1000-2000/month
**Effort**: 1-2 months

---

### Phase 4: Months 4-6 (Enterprise Scale)
1. ✅ Migrate to Kubernetes
2. ✅ Rewrite frontend in React (optional)
3. ✅ Add ML model serving infrastructure
4. ✅ Implement data warehouse (Snowflake)
5. ✅ Add advanced security (SOC2, HIPAA compliance)
6. ✅ Multi-region deployment

**Cost**: $5000-15,000/month
**Effort**: 3-6 months

---

## Next Steps

### Immediate (This Week)
1. **Deploy to Streamlit Cloud**: Get public URL
2. **Add error tracking**: Install Sentry
3. **Optimize caching**: Add `@st.cache_data` decorators
4. **Document API**: Create API documentation

### Short-term (This Month)
1. **Set up database**: Migrate from CSV to PostgreSQL
2. **Add authentication**: Implement user login
3. **Automate data**: Set up Airflow pipelines
4. **Monitor performance**: Add Datadog/New Relic

### Long-term (3-6 Months)
1. **Build REST API**: FastAPI backend
2. **Scale infrastructure**: Kubernetes + auto-scaling
3. **Enterprise features**: SSO, RBAC, audit logs
4. **Compliance**: SOC2, HIPAA certification

---

## Resources

### Documentation
- [Streamlit Cloud Docs](https://docs.streamlit.io/streamlit-community-cloud)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/deployment/)
- [AWS ECS Guide](https://docs.aws.amazon.com/ecs/)
- [Kubernetes Patterns](https://kubernetes.io/docs/concepts/)

### Tools
- **Monitoring**: Datadog, New Relic, Prometheus + Grafana
- **Error Tracking**: Sentry, Rollbar
- **CI/CD**: GitHub Actions, GitLab CI, CircleCI
- **Infrastructure**: Terraform, Pulumi
- **Data Pipelines**: Airflow, Prefect, Dagster

### Estimated Costs by Scale

| Users | Monthly Cost | Infrastructure |
|-------|--------------|----------------|
| <100 | $0 | Streamlit Cloud (free) |
| 100-1K | $400 | Streamlit Cloud (paid) + DB |
| 1K-10K | $1000 | AWS ECS + RDS + Redis |
| 10K-100K | $5000 | Kubernetes + Snowflake |
| 100K+ | $15K+ | Multi-region + CDN + GPUs |

---

**Ready to scale? Start with Phase 1 this week!**
