import asyncio, os, math, time, logging
from typing import Dict, List
from apps.alerts.datasource import CandleSource
from apps.alerts.alert_manager import AlertManager
from apps.alerts import dispatch
from apps.api.metrics import record_alert_evaluation, record_alert_trigger, runner_loop_seconds

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

POLL_MS = int(os.getenv("ALERT_RUNNER_POLL_MS", "1000"))
MAX_PER_SYMBOL = int(os.getenv("ALERT_MAX_ALERTS_PER_SYMBOL","200"))

async def run_once(manager: AlertManager):
    loop_start = time.time()
    alerts = manager.fetch_active_alerts()
    if not alerts:
        return

    # Batch by symbol for efficiency
    by_symbol: Dict[str, List[dict]] = {}
    for a in alerts:
        by_symbol.setdefault(a["symbol"], []).append(a)

    for symbol, arr in by_symbol.items():
        symbol_start = time.time()
        if len(arr) > MAX_PER_SYMBOL:
            arr = arr[:MAX_PER_SYMBOL]  # safety
        for alert in arr:
            start_time = time.time()
            try:
                payload = manager.evaluate_alert(alert)
                evaluation_time = time.time() - start_time
                
                # Record metrics
                record_alert_evaluation(
                    symbol=alert.get("symbol", "unknown"),
                    timeframe=alert.get("base_timeframe", "unknown"),
                    user_id=alert.get("user_id", "unknown"),
                    duration=evaluation_time
                )
                
                # Log slow evaluations
                if evaluation_time > 0.2:  # 200ms threshold
                    logger.warning(
                        f"Slow alert evaluation: {evaluation_time:.3f}s",
                        extra={
                            "alert_id": alert.get("alert_id"),
                            "user_id": alert.get("user_id"),
                            "symbol": alert.get("symbol"),
                            "evaluation_time": evaluation_time
                        }
                    )
                
                if payload:
                    logger.info(
                        f"Alert triggered: {alert.get('alert_id')}",
                        extra={
                            "alert_id": alert.get("alert_id"),
                            "user_id": alert.get("user_id"),
                            "symbol": alert.get("symbol"),
                            "timeframe": alert.get("base_timeframe"),
                            "conditions_count": len(alert.get("conditions", []))
                        }
                    )
                    
                    # Record trigger metrics
                    action_type = alert.get("action", {}).get("type", "notify")
                    record_alert_trigger(
                        symbol=alert.get("symbol", "unknown"),
                        timeframe=alert.get("base_timeframe", "unknown"),
                        user_id=alert.get("user_id", "unknown"),
                        action_type=action_type
                    )
                    
                    manager.log_and_dispatch(alert, payload)
                    # Fire side-effects async
                    action = alert.get("action") or {}
                    if action.get("type") == "webhook" and action.get("url"):
                        asyncio.create_task(dispatch.send_webhook(action["url"], {
                            "alert_id": alert["alert_id"],
                            "user_id": alert["user_id"],
                            "symbol": alert["symbol"],
                            "triggered_at": payload["snapshot"]["time"],
                            "conditions": alert["conditions"],
                            "snapshot": payload["snapshot"]
                        }))
                    else:
                        asyncio.create_task(dispatch.notify_in_app(alert["user_id"], {
                            "type":"ALERT_TRIGGERED",
                            "alert_id": alert["alert_id"],
                            "symbol": alert["symbol"],
                            "time": payload["snapshot"]["time"]
                        }))
            except Exception as e:
                logger.error(
                    f"Error evaluating alert: {e}",
                    extra={
                        "alert_id": alert.get("alert_id"),
                        "user_id": alert.get("user_id"),
                        "symbol": alert.get("symbol"),
                        "error": str(e)
                    }
                )
        
        # Record symbol processing time
        symbol_duration = time.time() - symbol_start
        runner_loop_seconds.labels(symbol=symbol).observe(symbol_duration)
    
    # Record total loop time
    loop_duration = time.time() - loop_start
    runner_loop_seconds.labels(symbol="total").observe(loop_duration)

async def main():
    src = CandleSource()
    manager = AlertManager(src)
    while True:
        await run_once(manager)
        await asyncio.sleep(POLL_MS / 1000)

if __name__ == "__main__":
    asyncio.run(main())
