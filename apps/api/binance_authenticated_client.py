"""
Binance Authenticated Client - For API key-based requests
Supports account info, portfolio, and order placement
"""

import hmac
import hashlib
import time
import aiohttp
from typing import Dict, Optional, Any, List
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)


class BinanceAuthenticatedClient:
    """Binance client with API key authentication for account operations"""
    
    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        """
        Initialize authenticated Binance client
        
        Args:
            api_key: Binance API key
            api_secret: Binance API secret
            testnet: Use testnet (default: False)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://testnet.binance.vision" if testnet else "https://api.binance.com"
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def _generate_signature(self, params: Dict) -> str:
        """
        Generate HMAC SHA256 signature for authenticated requests.
        Binance requires parameters to be sorted alphabetically before signing.
        """
        # Sort parameters alphabetically by key (Binance requirement)
        sorted_params = sorted(params.items())
        # Create query string from sorted parameters
        query_string = urlencode(sorted_params)
        # Generate HMAC SHA256 signature
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def _make_authenticated_request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        signed: bool = True
    ) -> Dict:
        """Make authenticated request to Binance API"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        if params is None:
            params = {}
        
        # Add timestamp for signed requests
        # IMPORTANT: Generate signature BEFORE adding it to params
        # Signature must be calculated from params that don't include 'signature' itself
        if signed:
            params['timestamp'] = int(time.time() * 1000)
            # Generate signature from params (without signature field)
            signature = self._generate_signature(params)
            # Now add signature to params
            params['signature'] = signature
        
        headers = {
            'X-MBX-APIKEY': self.api_key
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                async with self.session.get(url, params=params, headers=headers) as response:
                    data = await response.json()
                    if response.status != 200:
                        error_msg = data.get('msg', data.get('message', 'Unknown error'))
                        error_code = data.get('code', response.status)
                        raise Exception(f"Binance API error {error_code}: {error_msg}")
                    return data
            elif method.upper() == 'POST':
                async with self.session.post(url, params=params, headers=headers) as response:
                    data = await response.json()
                    if response.status != 200:
                        raise Exception(f"Binance API error {response.status}: {data.get('msg', 'Unknown error')}")
                    return data
            elif method.upper() == 'DELETE':
                async with self.session.delete(url, params=params, headers=headers) as response:
                    data = await response.json()
                    if response.status != 200:
                        raise Exception(f"Binance API error {response.status}: {data.get('msg', 'Unknown error')}")
                    return data
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
        except aiohttp.ClientError as e:
            logger.error(f"Network error: {e}")
            raise Exception(f"Network error: {str(e)}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test API key connection by getting account info
        Returns: Dict with 'ok', 'code', 'message', and optionally 'latency_ms'
        """
        start_time = time.time()
        try:
            # Use account info endpoint to test connection
            account_info = await self.get_account_info()
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                "ok": True,
                "code": "ok",
                "message": "Connection successful",
                "latency_ms": latency_ms,
                "account_type": account_info.get("accountType", "SPOT")
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Binance connection test failed: {error_msg}")
            # Parse common Binance errors
            if "Invalid API-key" in error_msg or "invalid signature" in error_msg.lower():
                return {
                    "ok": False,
                    "code": "invalid_credentials",
                    "message": f"Invalid API credentials: {error_msg}"
                }
            elif "IP" in error_msg or "whitelist" in error_msg.lower():
                return {
                    "ok": False,
                    "code": "ip_not_whitelisted",
                    "message": f"IP address not whitelisted: {error_msg}. Please add your server IP (52.77.227.148) to Binance API key whitelist."
                }
            elif "permission" in error_msg.lower() or "scope" in error_msg.lower():
                return {
                    "ok": False,
                    "code": "scope_missing",
                    "message": f"API key missing required permissions: {error_msg}"
                }
            else:
                return {
                    "ok": False,
                    "code": "connection_error",
                    "message": f"Connection failed: {error_msg}"
                }
    
    async def get_account_info(self) -> Dict:
        """Get account information"""
        return await self._make_authenticated_request('GET', '/api/v3/account')
    
    async def get_balance(self, asset: Optional[str] = None) -> List[Dict]:
        """
        Get account balance
        
        Args:
            asset: Optional asset symbol (e.g., 'USDT', 'BTC'). If None, returns all balances.
        
        Returns:
            List of balance dicts with 'asset', 'free', 'locked'
        """
        account_info = await self.get_account_info()
        balances = account_info.get('balances', [])
        
        # Filter out zero balances and format
        non_zero_balances = [
            {
                'asset': b['asset'],
                'free': float(b['free']),
                'locked': float(b['locked']),
                'total': float(b['free']) + float(b['locked'])
            }
            for b in balances
            if float(b['free']) > 0 or float(b['locked']) > 0
        ]
        
        if asset:
            non_zero_balances = [b for b in non_zero_balances if b['asset'] == asset.upper()]
        
        return non_zero_balances
    
    async def get_portfolio_value(self) -> Dict:
        """Get total portfolio value in USDT"""
        balances = await self.get_balance()
        
        # Get current prices for all assets
        # For now, return balances - can be enhanced to calculate total USDT value
        total_usdt = 0.0
        holdings = []
        
        for balance in balances:
            if balance['asset'] == 'USDT':
                total_usdt += balance['total']
                holdings.append({
                    'asset': 'USDT',
                    'amount': balance['total'],
                    'value_usdt': balance['total']
                })
            # TODO: Fetch prices for other assets and calculate USDT value
        
        return {
            'total_value_usdt': total_usdt,
            'holdings': holdings,
            'asset_count': len(balances)
        }
    
    async def place_order(
        self,
        symbol: str,
        side: str,  # 'BUY' or 'SELL'
        order_type: str,  # 'MARKET', 'LIMIT', etc.
        quantity: Optional[float] = None,
        price: Optional[float] = None,
        time_in_force: str = 'GTC'  # GTC, IOC, FOK
    ) -> Dict:
        """
        Place an order on Binance
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: 'BUY' or 'SELL'
            order_type: 'MARKET', 'LIMIT', 'STOP_LOSS', etc.
            quantity: Order quantity (required for MARKET, optional for LIMIT)
            price: Order price (required for LIMIT orders)
            time_in_force: 'GTC', 'IOC', 'FOK'
        
        Returns:
            Order response from Binance
        """
        params = {
            'symbol': symbol.upper(),
            'side': side.upper(),
            'type': order_type.upper()
        }
        
        if order_type.upper() == 'LIMIT':
            if price is None:
                raise ValueError("Price required for LIMIT orders")
            params['price'] = str(price)
            params['timeInForce'] = time_in_force
        
        if quantity:
            params['quantity'] = str(quantity)
        
        return await self._make_authenticated_request('POST', '/api/v3/order', params)
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get all open orders, optionally filtered by symbol"""
        params = {}
        if symbol:
            params['symbol'] = symbol.upper()
        
        return await self._make_authenticated_request('GET', '/api/v3/openOrders', params)
    
    async def cancel_order(self, symbol: str, order_id: int) -> Dict:
        """Cancel an order"""
        params = {
            'symbol': symbol.upper(),
            'orderId': order_id
        }
        return await self._make_authenticated_request('DELETE', '/api/v3/order', params)
    
    async def get_order_status(self, symbol: str, order_id: int) -> Dict:
        """Get order status"""
        params = {
            'symbol': symbol.upper(),
            'orderId': order_id
        }
        return await self._make_authenticated_request('GET', '/api/v3/order', params)

