"""Main streamer service entry point."""

import asyncio
import logging
import signal
import sys
from typing import Optional

from backend.indicator_engine.registry import IndicatorRegistry
from apps.streamer.hub import ChannelsHub
from apps.streamer.sources.binance import BinanceSource
from apps.streamer.ws_server import StreamWebSocketServer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StreamerService:
    """Main streamer service orchestrating all components."""
    
    def __init__(self):
        self.indicator_registry = IndicatorRegistry()
        self.channels_hub = ChannelsHub(self.indicator_registry)
        self.binance_source = BinanceSource()
        self.ws_server: Optional[StreamWebSocketServer] = None
        self._running = False
    
    async def start(self):
        """Start the streamer service."""
        logger.info("Starting Tradeeon Streamer Service...")
        
        try:
            # Initialize indicator registry
            await self.indicator_registry.initialize()
            logger.info("Indicator registry initialized")
            
            # Start Binance source
            await self.binance_source.start()
            logger.info("Binance source started")
            
            # Start WebSocket server
            self.ws_server = StreamWebSocketServer(self.channels_hub)
            server_task = asyncio.create_task(self.ws_server.start())
            logger.info("WebSocket server started")
            
            # Set up signal handlers
            self._setup_signal_handlers()
            
            self._running = True
            logger.info("Streamer service started successfully")
            
            # Wait for server task
            await server_task
            
        except Exception as e:
            logger.error(f"Failed to start streamer service: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """Stop the streamer service."""
        logger.info("Stopping Tradeeon Streamer Service...")
        
        self._running = False
        
        try:
            if self.ws_server:
                await self.ws_server.stop()
            
            await self.binance_source.stop()
            
            logger.info("Streamer service stopped")
        
        except Exception as e:
            logger.error(f"Error stopping streamer service: {e}")
    
    def _setup_signal_handlers(self):
        """Set up signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down...")
            asyncio.create_task(self.stop())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def subscribe_to_symbol(self, symbol: str, interval: str):
        """Subscribe to a symbol/interval for data updates."""
        async def candle_callback(candle):
            """Callback for new candle data."""
            await self.channels_hub.update_candle(symbol, interval, candle)
            
            # Broadcast to WebSocket clients
            if self.ws_server:
                message = {
                    "type": "kline",
                    "symbol": symbol,
                    "interval": interval,
                    "candle": candle.dict(),
                    "timestamp": candle.t
                }
                await self.ws_server.broadcast_to_channel(symbol, interval, message)
        
        await self.binance_source.subscribe_kline_stream(symbol, interval, candle_callback)
        logger.info(f"Subscribed to {symbol}:{interval}")


async def main():
    """Main entry point."""
    service = StreamerService()
    
    try:
        # Start the service
        await service.start()
        
        # Subscribe to some default symbols for testing
        await service.subscribe_to_symbol("BTCUSDT", "1m")
        await service.subscribe_to_symbol("ETHUSDT", "1m")
        
        # Keep running
        while True:
            await asyncio.sleep(1)
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Service error: {e}")
    finally:
        await service.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

