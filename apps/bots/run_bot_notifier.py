#!/usr/bin/env python3
"""
Bot Notification Service Runner

This service listens for condition triggers from the event bus
and executes bot actions when conditions are met.

Usage:
    python run_bot_notifier.py
"""

import asyncio
import logging
import signal
import sys
import os
from typing import Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('bot_notifier.log')
    ]
)

logger = logging.getLogger(__name__)

# Add paths - same pattern as run_condition_evaluator.py
bots_path = os.path.dirname(__file__)
if bots_path not in sys.path:
    sys.path.insert(0, bots_path)

# Add parent paths for imports
api_path = os.path.join(os.path.dirname(__file__), '..', 'api')
if api_path not in sys.path:
    sys.path.insert(0, api_path)

# Add root for 'apps' module
root_path = os.path.join(os.path.dirname(__file__), '..', '..')
if root_path not in sys.path:
    sys.path.insert(0, root_path)

try:
    from bot_notifier import BotNotifier
    from event_bus import create_event_bus
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error("Make sure you're running from the correct directory")
    sys.exit(1)


class BotNotifierService:
    """Service wrapper for the bot notifier."""
    
    def __init__(self):
        self.notifier: Optional[BotNotifier] = None
        self.running = False
        
    async def start(self):
        """Start the bot notifier service."""
        try:
            logger.info("=" * 70)
            logger.info("Starting Bot Notification Service")
            logger.info("=" * 70)
            
            # Check Supabase connection
            from apps.api.clients.supabase_client import supabase
            if not supabase:
                logger.error("Supabase client not available. Cannot start notifier.")
                logger.error("Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
                return False
            
            # Create event bus
            event_bus = await create_event_bus()
            
            if not event_bus or not event_bus.connected:
                logger.error("Event bus not available. Cannot start notifier.")
                logger.error("Please ensure Redis is running and REDIS_URL is set correctly")
                return False
            
            logger.info("Event bus connected - listening for condition triggers")
            
            # Create bot notifier
            self.notifier = BotNotifier(event_bus=event_bus)
            
            # Initialize
            success = await self.notifier.initialize()
            
            if not success:
                logger.error("Failed to initialize bot notifier")
                return False
            
            logger.info("Bot notifier initialized successfully")
            logger.info("=" * 70)
            
            # Start listening
            self.running = True
            await self.notifier.start_listening()
            
            return True
            
        except Exception as e:
            logger.error(f"Error starting bot notifier service: {e}", exc_info=True)
            return False
    
    async def stop(self):
        """Stop the bot notifier service."""
        logger.info("Stopping Bot Notification Service...")
        self.running = False
        
        if self.notifier:
            await self.notifier.stop()
        
        logger.info("Bot Notification Service stopped")
    
    def handle_signal(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        if self.notifier:
            # Schedule stop in event loop
            asyncio.create_task(self.notifier.stop())


async def main():
    """Main entry point."""
    service = BotNotifierService()
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, service.handle_signal)
    signal.signal(signal.SIGTERM, service.handle_signal)
    
    try:
        # Start service
        success = await service.start()
        
        if not success:
            logger.error("Failed to start bot notifier service")
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

