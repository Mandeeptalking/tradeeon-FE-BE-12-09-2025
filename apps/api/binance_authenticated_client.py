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
        if testnet:
            self.base_url = "https://testnet.binance.vision"
            self.futures_base_url = "https://testnet.binancefuture.com"
        else:
            self.base_url = "https://api.binance.com"
            self.futures_base_url = "https://fapi.binance.com"  # USDT-M Futures
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
        # Filter out None values and empty strings (Binance requirement)
        filtered_params = {k: v for k, v in params.items() if v is not None and v != ''}
        # Sort parameters alphabetically by key (Binance requirement)
        sorted_params = sorted(filtered_params.items())
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
                    response_text = await response.text()
                    try:
                        data = await response.json()
                    except Exception as json_error:
                        # If response is not JSON, log the text
                        logger.error(f"Binance API returned non-JSON response (status {response.status}): {response_text[:500]}")
                        raise Exception(f"Binance API returned non-JSON response (status {response.status}): {response_text[:200]}")
                    
                    if response.status != 200:
                        error_msg = data.get('msg', data.get('message', 'Unknown error'))
                        error_code = data.get('code', response.status)
                        # Log full error details
                        logger.error(f"Binance API error {error_code}: {error_msg}. URL: {url}. Full response: {data}")
                        # Raise exception with detailed error
                        raise Exception(f"Binance API error {error_code}: {error_msg}")
                    return data
            elif method.upper() == 'POST':
                async with self.session.post(url, params=params, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        data = await response.json()
                    except Exception as json_error:
                        logger.error(f"Binance API returned non-JSON response (status {response.status}): {response_text[:500]}")
                        raise Exception(f"Binance API returned non-JSON response (status {response.status}): {response_text[:200]}")
                    
                    if response.status != 200:
                        error_msg = data.get('msg', data.get('message', 'Unknown error'))
                        error_code = data.get('code', response.status)
                        logger.error(f"Binance API error {error_code}: {error_msg}. URL: {url}. Full response: {data}")
                        raise Exception(f"Binance API error {error_code}: {error_msg}")
                    return data
            elif method.upper() == 'DELETE':
                async with self.session.delete(url, params=params, headers=headers) as response:
                    response_text = await response.text()
                    try:
                        data = await response.json()
                    except Exception as json_error:
                        logger.error(f"Binance API returned non-JSON response (status {response.status}): {response_text[:500]}")
                        raise Exception(f"Binance API returned non-JSON response (status {response.status}): {response_text[:200]}")
                    
                    if response.status != 200:
                        error_msg = data.get('msg', data.get('message', 'Unknown error'))
                        error_code = data.get('code', response.status)
                        logger.error(f"Binance API error {error_code}: {error_msg}. URL: {url}. Full response: {data}")
                        raise Exception(f"Binance API error {error_code}: {error_msg}")
                    return data
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
        except aiohttp.ClientError as e:
            logger.error(f"Network error connecting to Binance: {e}")
            raise Exception(f"Network error: {str(e)}")
        except Exception as e:
            # Re-raise Binance API errors as-is
            raise
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test API key connection by getting account info for SPOT and Futures
        Returns: Dict with 'ok', 'code', 'message', 'latency_ms', 'account_types' list, and 'errors' dict
        """
        start_time = time.time()
        account_types = []
        errors = {}
        
        # Test SPOT account
        spot_error = None
        try:
            logger.info(f"Testing SPOT account access for API key: {self.api_key[:10]}...")
            account_info = await self.get_account_info()
            account_types.append("SPOT")
            logger.info("✅ SPOT account access successful")
        except Exception as e:
            spot_error = str(e)
            error_code = None
            # Try to extract error code from error message
            if "error" in spot_error.lower():
                parts = spot_error.split(":")
                if len(parts) > 1:
                    try:
                        error_code = int(parts[0].split()[-1])
                    except:
                        pass
            
            errors["spot"] = {
                "error": spot_error,
                "code": error_code
            }
            logger.error(f"❌ SPOT account check failed: {spot_error}")
        
        # Test USDT-M Futures account
        futures_error = None
        try:
            logger.info(f"Testing Futures account access for API key: {self.api_key[:10]}...")
            futures_info = await self.get_futures_account_info()
            account_types.append("FUTURES")
            logger.info("✅ Futures account access successful")
        except Exception as e:
            futures_error = str(e)
            error_code = None
            
            # Check if it's a 404 (Futures not enabled)
            if "404" in futures_error or "Not Found" in futures_error or "not enabled" in futures_error.lower():
                # This is expected if Futures trading is not enabled - not a critical error
                logger.info(f"ℹ️ Futures trading not available: {futures_error}")
                errors["futures"] = {
                    "error": "Futures trading not enabled or not available for this API key",
                    "code": None,
                    "note": "This is normal if Futures trading is not enabled on your Binance account"
                }
            else:
                # Try to extract error code from error message
                if "error" in futures_error.lower() or "code" in futures_error.lower():
                    parts = futures_error.split(":")
                    if len(parts) > 1:
                        try:
                            error_code = int(parts[0].split()[-1])
                        except:
                            # Try to find error code in the message
                            import re
                            code_match = re.search(r'error\s+(-?\d+)', futures_error, re.IGNORECASE)
                            if code_match:
                                error_code = int(code_match.group(1))
                
                errors["futures"] = {
                    "error": futures_error,
                    "code": error_code
                }
                logger.error(f"❌ Futures account check failed: {futures_error}")
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # If we have at least one account type, return success
        if account_types:
            result = {
                "ok": True,
                "code": "ok",
                "message": "Connection successful",
                "latency_ms": latency_ms,
                "account_type": account_types[0],  # Keep for backward compatibility
                "account_types": account_types  # List of all available account types
            }
            # Include errors for account types that failed (for debugging)
            if errors:
                result["partial_errors"] = errors
            return result
        
        # If no account types found, determine the most specific error
        logger.error(f"Both SPOT and Futures account checks failed. Errors: {errors}")
        
        # Check for specific error codes
        spot_code = errors.get("spot", {}).get("code")
        futures_code = errors.get("futures", {}).get("code")
        futures_note = errors.get("futures", {}).get("note")
        
        # -2015: Invalid API-key, IP, or permissions for action
        if spot_code == -2015 or futures_code == -2015:
            spot_msg = errors.get("spot", {}).get("error", "")
            futures_msg = errors.get("futures", {}).get("error", "")
            
            # If Futures error is just "not enabled", focus on SPOT error
            if futures_note and "not enabled" in futures_msg.lower():
                return {
                    "ok": False,
                    "code": "ip_not_whitelisted",
                    "message": f"IP address not whitelisted. Please add IP 52.77.227.148 to Binance API key whitelist. SPOT error: {spot_msg}. Note: Futures trading is not enabled (this is normal).",
                    "errors": errors
                }
            
            combined_msg = f"SPOT: {spot_msg}"
            if futures_msg and "not enabled" not in futures_msg.lower():
                combined_msg += f"; Futures: {futures_msg}"
            
            return {
                "ok": False,
                "code": "ip_not_whitelisted",
                "message": f"IP address not whitelisted or invalid API key permissions. Please add IP 52.77.227.148 to Binance API key whitelist. Details: {combined_msg}",
                "errors": errors
            }
        
        # -1022: Invalid signature
        if spot_code == -1022 or futures_code == -1022:
            return {
                "ok": False,
                "code": "invalid_signature",
                "message": "Invalid signature. This usually indicates an API secret mismatch.",
                "errors": errors
            }
        
        # Generic error - return the actual error messages
        spot_msg = errors.get("spot", {}).get("error", "Unknown error")
        futures_msg = errors.get("futures", {}).get("error", "Unknown error")
        
        # Determine primary error message
        if "IP" in spot_msg or "whitelist" in spot_msg.lower() or "IP" in futures_msg or "whitelist" in futures_msg.lower():
            primary_code = "ip_not_whitelisted"
            primary_msg = f"IP address not whitelisted. Please add IP 52.77.227.148 to Binance API key whitelist. SPOT error: {spot_msg}; Futures error: {futures_msg}"
        elif "Invalid API-key" in spot_msg or "Invalid API-key" in futures_msg:
            primary_code = "invalid_credentials"
            primary_msg = f"Invalid API credentials. SPOT error: {spot_msg}; Futures error: {futures_msg}"
        elif "permission" in spot_msg.lower() or "permission" in futures_msg.lower() or "scope" in spot_msg.lower() or "scope" in futures_msg.lower():
            primary_code = "scope_missing"
            primary_msg = f"API key missing required permissions. SPOT error: {spot_msg}; Futures error: {futures_msg}"
        else:
            primary_code = "no_account_access"
            primary_msg = f"Unable to access any Binance account type. SPOT error: {spot_msg}; Futures error: {futures_msg}"
        
        return {
            "ok": False,
            "code": primary_code,
            "message": primary_msg,
            "errors": errors
        }
    
    async def get_account_info(self) -> Dict:
        """Get SPOT account information"""
        return await self._make_authenticated_request('GET', '/api/v3/account')
    
    async def get_futures_account_info(self) -> Dict:
        """Get USDT-M Futures account information"""
        # Temporarily override base_url for futures endpoint
        original_base_url = self.base_url
        self.base_url = self.futures_base_url
        try:
            return await self._make_authenticated_request('GET', '/fapi/v1/account')
        except Exception as e:
            # If Futures endpoint returns 404, it likely means Futures trading is not enabled
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str:
                raise Exception("Futures trading not enabled or not available for this API key")
            raise
        finally:
            self.base_url = original_base_url
    
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
