"""
Prometheus metrics for Tradeeon API.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response
import time

# Counters
alerts_evaluated_total = Counter(
    'alerts_evaluated_total',
    'Total number of alerts evaluated',
    ['symbol', 'timeframe', 'user_id']
)

alerts_triggered_total = Counter(
    'alerts_triggered_total', 
    'Total number of alerts triggered',
    ['symbol', 'timeframe', 'user_id', 'action_type']
)

webhook_failures_total = Counter(
    'webhook_failures_total',
    'Total number of webhook failures',
    ['url', 'error_type']
)

api_requests_total = Counter(
    'api_requests_total',
    'Total number of API requests',
    ['method', 'endpoint', 'status_code']
)

# Histograms
runner_loop_seconds = Histogram(
    'runner_loop_seconds',
    'Time spent in alert runner loop',
    ['symbol']
)

alert_evaluation_seconds = Histogram(
    'alert_evaluation_seconds',
    'Time spent evaluating individual alerts',
    ['symbol', 'timeframe']
)

api_request_duration_seconds = Histogram(
    'api_request_duration_seconds',
    'Duration of API requests',
    ['method', 'endpoint']
)

# Gauges
active_alerts_gauge = Gauge(
    'active_alerts_count',
    'Number of active alerts',
    ['user_id']
)

active_connections_gauge = Gauge(
    'active_connections_count',
    'Number of active connections'
)

def get_metrics_response():
    """Get Prometheus metrics response."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

def record_alert_evaluation(symbol: str, timeframe: str, user_id: str, duration: float):
    """Record alert evaluation metrics."""
    alerts_evaluated_total.labels(
        symbol=symbol,
        timeframe=timeframe,
        user_id=user_id
    ).inc()
    
    alert_evaluation_seconds.labels(
        symbol=symbol,
        timeframe=timeframe
    ).observe(duration)

def record_alert_trigger(symbol: str, timeframe: str, user_id: str, action_type: str):
    """Record alert trigger metrics."""
    alerts_triggered_total.labels(
        symbol=symbol,
        timeframe=timeframe,
        user_id=user_id,
        action_type=action_type
    ).inc()

def record_webhook_failure(url: str, error_type: str):
    """Record webhook failure metrics."""
    webhook_failures_total.labels(
        url=url,
        error_type=error_type
    ).inc()

def record_api_request(method: str, endpoint: str, status_code: int, duration: float):
    """Record API request metrics."""
    api_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status_code=status_code
    ).inc()
    
    api_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)

def update_active_alerts_count(user_id: str, count: int):
    """Update active alerts count gauge."""
    active_alerts_gauge.labels(user_id=user_id).set(count)

def update_active_connections_count(count: int):
    """Update active connections count gauge."""
    active_connections_gauge.set(count)



