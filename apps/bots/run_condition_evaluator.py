#!/usr/bin/env python3
"""
Centralized Condition Evaluator Service Runner

This service continuously evaluates trading conditions and publishes triggers
when conditions are met. It runs as a background service.

Usage:
    python run_condition_evaluator.py
"""

import asyncio
import logging
import signal
import sys
import os
from typing import Optional

# Setup logging
# Determine log path (use /app/logs in Docker, ./ in local)
log_dir = os.getenv('LOG_DIR', './')
if not os.path.exists(log_dir):
    os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'condition_evaluator.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file)
    ]
)

logger = logging.getLogger(__name__)

# Add paths
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

# Add parent paths for imports
api_path = os.path.join(os.path.dirname(__file__), '..', 'api')
if api_path not in sys.path:
    sys.path.insert(0, api_path)

# Add root path for 'backend' and 'apps' modules
root_path = os.path.join(os.path.dirname(__file__), '..', '..')
if root_path not in sys.path:
    sys.path.insert(0, root_path)

try:
    from condition_evaluator import CentralizedConditionEvaluator
    from apps.api.clients.supabase_client import supabase
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error("Make sure you're running from the correct directory")
    import traceback
    traceback.print_exc()
    sys.exit(1)


class ConditionEvaluatorService:
    """Service wrapper for the centralized condition evaluator."""
    
    def __init__(self):
        self.evaluator: Optional[CentralizedConditionEvaluator] = None
        self.running = False
        
    async def start(self):
        """Start the evaluator service."""
        try:
            logger.info("=" * 70)
            logger.info("Starting Centralized Condition Evaluator Service")
            logger.info("=" * 70)
            
            # Check Supabase connection
            if not supabase:
                logger.error("Supabase client not available. Cannot start evaluator.")
                logger.error("Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
                return False
            
            # Initialize event bus (if Redis available)
            from event_bus import create_event_bus
            event_bus = await create_event_bus()
            
            if event_bus:
                logger.info("Event bus initialized - triggers will be published to Redis")
            else:
                logger.warning("Event bus not available - triggers will only be logged to database")
            
            # Initialize evaluator
            self.evaluator = CentralizedConditionEvaluator(
                supabase_client=supabase,
                event_bus=event_bus
            )
            
            await self.evaluator.initialize()
            
            # Get evaluation interval from environment (default: 60 seconds)
            interval_seconds = int(os.getenv("EVALUATOR_INTERVAL_SECONDS", "60"))
            
            # Get timeframes to evaluate (default: 1m, 5m, 15m, 1h)
            timeframes_str = os.getenv("EVALUATOR_TIMEFRAMES", "1m,5m,15m,1h")
            timeframes = [tf.strip() for tf in timeframes_str.split(",")]
            
            logger.info(f"Evaluation interval: {interval_seconds} seconds")
            logger.info(f"Timeframes: {timeframes}")
            logger.info("=" * 70)
            
            # Start evaluation loop
            self.running = True
            
            # Run evaluation loop in background
            await self.evaluator.start_evaluation_loop(
                symbols=None,  # Auto-discover from conditions
                timeframes=timeframes,
                interval_seconds=interval_seconds
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error starting evaluator service: {e}", exc_info=True)
            return False
    
    async def stop(self):
        """Stop the evaluator service."""
        logger.info("Stopping Condition Evaluator Service...")
        self.running = False
        
        if self.evaluator:
            await self.evaluator.stop()
            
            # Disconnect event bus if available
            if self.evaluator.event_bus:
                await self.evaluator.event_bus.disconnect()
        
        logger.info("Condition Evaluator Service stopped")
    
    def handle_signal(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        if self.evaluator:
            # Schedule stop in event loop
            asyncio.create_task(self.evaluator.stop())


async def main():
    """Main entry point."""
    service = ConditionEvaluatorService()
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, service.handle_signal)
    signal.signal(signal.SIGTERM, service.handle_signal)
    
    try:
        # Start service
        success = await service.start()
        
        if not success:
            logger.error("Failed to start evaluator service")
            sys.exit(1)
        
        # Keep running until stopped
        while service.running:
            await asyncio.sleep(1)
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
    finally:
        await service.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

