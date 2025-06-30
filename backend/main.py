from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import strawberry
from strawberry.fastapi import GraphQLRouter
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from kafka import KafkaProducer, KafkaConsumer
from elasticsearch import Elasticsearch
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Optional
import os
import aiofiles
import httpx
from web3 import Web3
import ipfshttpclient
from pydantic import BaseModel

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://analytics_user:analytics_password@localhost:5432/analytics_db")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ETHEREUM_RPC_URL = os.getenv("ETHEREUM_RPC_URL", "http://localhost:8545")
IPFS_API_URL = os.getenv("IPFS_API_URL", "http://localhost:5001")

# Initialize services
app = FastAPI(title="Analytics & Blockchain Audit Pipeline", version="1.0.0")
security = HTTPBearer()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AuditRecord(Base):
    __tablename__ = "audit_records"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)
    user_id = Column(String, index=True)
    action = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    transaction_hash = Column(String, unique=True)
    block_number = Column(Integer)
    ipfs_hash = Column(String)
    verified = Column(Boolean, default=False)
    gas_used = Column(Integer)
    metadata = Column(Text)

Base.metadata.create_all(bind=engine)

# Pydantic models
class EventModel(BaseModel):
    event_type: str
    user_id: str
    action: str
    metadata: dict = {}

class AuditRecordResponse(BaseModel):
    id: int
    event_type: str
    user_id: str
    action: str
    timestamp: datetime
    transaction_hash: Optional[str]
    block_number: Optional[int]
    ipfs_hash: Optional[str]
    verified: bool
    gas_used: Optional[int]

# Services initialization
try:
    kafka_producer = KafkaProducer(
        bootstrap_servers=[KAFKA_BOOTSTRAP_SERVERS],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    es = Elasticsearch([ELASTICSEARCH_URL])
    
    w3 = Web3(Web3.HTTPProvider(ETHEREUM_RPC_URL))
    
    ipfs_client = ipfshttpclient.connect(IPFS_API_URL)
    
except Exception as e:
    logging.error(f"Failed to initialize services: {e}")
    kafka_producer = None
    es = None
    w3 = None
    ipfs_client = None

# GraphQL schema
@strawberry.type
class AuditRecordType:
    id: int
    event_type: str
    user_id: str
    action: str
    timestamp: datetime
    transaction_hash: Optional[str]
    block_number: Optional[int]
    ipfs_hash: Optional[str]
    verified: bool

@strawberry.type
class Query:
    @strawberry.field
    def audit_records(self, limit: int = 50) -> List[AuditRecordType]:
        db = SessionLocal()
        try:
            records = db.query(AuditRecord).order_by(AuditRecord.timestamp.desc()).limit(limit).all()
            return [AuditRecordType(**record.__dict__) for record in records]
        finally:
            db.close()

    @strawberry.field
    def search_records(self, query: str) -> List[AuditRecordType]:
        if not es:
            return []
        
        try:
            response = es.search(
                index="audit_records",
                body={
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": ["event_type", "user_id", "action"]
                        }
                    }
                }
            )
            
            records = []
            for hit in response['hits']['hits']:
                source = hit['_source']
                records.append(AuditRecordType(**source))
            return records
        except Exception as e:
            logging.error(f"Elasticsearch search failed: {e}")
            return []

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Routes
@app.get("/")
async def root():
    return {"message": "Analytics & Blockchain Audit Pipeline API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    services = {
        "database": True,
        "kafka": kafka_producer is not None,
        "elasticsearch": es is not None,
        "ethereum": w3 is not None and w3.isConnected() if w3 else False,
        "ipfs": ipfs_client is not None
    }
    
    return {
        "status": "healthy" if all(services.values()) else "degraded",
        "services": services,
        "timestamp": datetime.utcnow()
    }

@app.post("/events", response_model=dict)
async def create_event(event: EventModel, db: Session = Depends(get_db)):
    try:
        # Store in IPFS
        ipfs_hash = None
        if ipfs_client:
            try:
                event_data = event.dict()
                ipfs_result = ipfs_client.add_json(event_data)
                ipfs_hash = ipfs_result
            except Exception as e:
                logging.error(f"IPFS storage failed: {e}")

        # Create audit record
        audit_record = AuditRecord(
            event_type=event.event_type,
            user_id=event.user_id,
            action=event.action,
            ipfs_hash=ipfs_hash,
            metadata=json.dumps(event.metadata)
        )
        
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)

        # Send to Kafka
        if kafka_producer:
            try:
                kafka_data = {
                    "id": audit_record.id,
                    "event_type": event.event_type,
                    "user_id": event.user_id,
                    "action": event.action,
                    "timestamp": audit_record.timestamp.isoformat(),
                    "ipfs_hash": ipfs_hash,
                    "metadata": event.metadata
                }
                kafka_producer.send('audit-events', kafka_data)
            except Exception as e:
                logging.error(f"Kafka publish failed: {e}")

        # Index in Elasticsearch
        if es:
            try:
                es.index(
                    index="audit_records",
                    id=audit_record.id,
                    body={
                        "id": audit_record.id,
                        "event_type": event.event_type,
                        "user_id": event.user_id,
                        "action": event.action,
                        "timestamp": audit_record.timestamp,
                        "ipfs_hash": ipfs_hash
                    }
                )
            except Exception as e:
                logging.error(f"Elasticsearch indexing failed: {e}")

        # Broadcast to WebSocket connections
        await manager.broadcast(json.dumps({
            "type": "new_event",
            "data": {
                "id": audit_record.id,
                "event_type": event.event_type,
                "user_id": event.user_id,
                "action": event.action,
                "timestamp": audit_record.timestamp.isoformat()
            }
        }))

        return {
            "success": True,
            "id": audit_record.id,
            "ipfs_hash": ipfs_hash,
            "message": "Event recorded successfully"
        }

    except Exception as e:
        logging.error(f"Event creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit/records", response_model=List[AuditRecordResponse])
async def get_audit_records(
    limit: int = 50,
    event_type: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditRecord)
    
    if event_type:
        query = query.filter(AuditRecord.event_type == event_type)
    if user_id:
        query = query.filter(AuditRecord.user_id == user_id)
    
    records = query.order_by(AuditRecord.timestamp.desc()).limit(limit).all()
    return [AuditRecordResponse(**record.__dict__) for record in records]

@app.get("/audit/search")
async def search_audit_records(q: str, limit: int = 50):
    if not es:
        raise HTTPException(status_code=503, detail="Elasticsearch not available")
    
    try:
        response = es.search(
            index="audit_records",
            body={
                "query": {
                    "multi_match": {
                        "query": q,
                        "fields": ["event_type", "user_id", "action"]
                    }
                },
                "size": limit
            }
        )
        
        results = []
        for hit in response['hits']['hits']:
            results.append(hit['_source'])
        
        return {"results": results, "total": response['hits']['total']['value']}
    
    except Exception as e:
        logging.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blockchain/status")
async def blockchain_status():
    if not w3:
        raise HTTPException(status_code=503, detail="Ethereum node not available")
    
    try:
        latest_block = w3.eth.get_block('latest')
        return {
            "connected": w3.isConnected(),
            "latest_block": latest_block.number,
            "network_id": w3.net.version,
            "gas_price": w3.eth.gas_price,
            "accounts": len(w3.eth.accounts)
        }
    except Exception as e:
        logging.error(f"Blockchain status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ipfs/status")
async def ipfs_status():
    if not ipfs_client:
        raise HTTPException(status_code=503, detail="IPFS not available")
    
    try:
        version_info = ipfs_client.version()
        return {
            "connected": True,
            "version": version_info['Version'],
            "protocol_version": version_info['Protocol']
        }
    except Exception as e:
        logging.error(f"IPFS status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for now, can be extended for specific commands
            await manager.send_personal_message(f"Message received: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include GraphQL router
app.include_router(graphql_app, prefix="/graphql")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)