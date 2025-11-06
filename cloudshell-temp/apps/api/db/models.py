from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String, nullable=False)
    symbols = Column(ARRAY(String), nullable=False, default=[])
    market = Column(String, nullable=False, default='spot')  # spot or futures
    capital = Column(Numeric, nullable=False)
    trade_amount = Column(Numeric, nullable=False)
    secret = Column(String, nullable=True)
    cooldown_sec = Column(Integer, nullable=False, default=300)
    max_entries_per_day = Column(Integer, nullable=False, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    raw = Column(JSON, nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # buy or sell
    price = Column(Numeric, nullable=False)
    bar_time = Column(DateTime(timezone=True), nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted = Column(Boolean, nullable=False)
    reason = Column(Text, nullable=True)
    dedupe_key = Column(String, nullable=True, unique=True, index=True)


class PaperEntry(Base):
    __tablename__ = "paper_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # buy or sell
    qty = Column(Numeric, nullable=False)
    exec_price = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

