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
            self.margin_base_url = "https://testnet.binance.vision"  # Margin uses same base
        else:
            self.base_url = "https://api.binance.com"
            self.futures_base_url = "https://fapi.binance.com"  # USDT-M Futures
            self.margin_base_url = "https://api.binance.com"  # Margin/Funding uses same base
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
    
    async def get_commission_rates(self, symbol: Optional[str] = None) -> Dict:
        """
        Get commission rates for account
        If symbol is provided, returns rates for that symbol, otherwise returns default rates
        
        Args:
            symbol: Optional trading symbol (e.g., 'BTCUSDT'). If None, returns default rates.
        
        Returns:
            Dict with commission rates and VIP level info
        """
        try:
            params = {}
            if symbol:
                params['symbol'] = symbol
            
            # Use /api/v3/account/commission endpoint
            commission_data = await self._make_authenticated_request('GET', '/api/v3/account/commission', params=params)
            
            # Determine VIP level based on commission rates
            # Lower rates = higher VIP level
            # Standard rates: Regular = 0.1% maker/0.1% taker, VIP levels have lower rates
            maker_rate = float(commission_data.get('standardCommission', {}).get('maker', '0.001'))
            taker_rate = float(commission_data.get('standardCommission', {}).get('taker', '0.001'))
            
            # Determine VIP level based on rates
            # Binance VIP levels: Regular (0.1%), VIP0 (0.09%), VIP1 (0.08%), VIP2 (0.07%), etc.
            vip_level = "Regular"
            if maker_rate <= 0.0002:  # 0.02%
                vip_level = "VIP9"
            elif maker_rate <= 0.0004:  # 0.04%
                vip_level = "VIP8"
            elif maker_rate <= 0.0006:  # 0.06%
                vip_level = "VIP7"
            elif maker_rate <= 0.0007:  # 0.07%
                vip_level = "VIP6"
            elif maker_rate <= 0.0008:  # 0.08%
                vip_level = "VIP5"
            elif maker_rate <= 0.0009:  # 0.09%
                vip_level = "VIP4"
            elif maker_rate <= 0.0010:  # 0.10%
                vip_level = "VIP3"
            elif maker_rate <= 0.0011:  # 0.11%
                vip_level = "VIP2"
            elif maker_rate <= 0.0012:  # 0.12%
                vip_level = "VIP1"
            elif maker_rate <= 0.0013:  # 0.13%
                vip_level = "VIP0"
            
            return {
                'maker_commission': maker_rate,
                'taker_commission': taker_rate,
                'buyer_commission': float(commission_data.get('standardCommission', {}).get('buyer', '0.001')),
                'seller_commission': float(commission_data.get('standardCommission', {}).get('seller', '0.001')),
                'tax_maker': float(commission_data.get('taxCommission', {}).get('maker', '0')),
                'tax_taker': float(commission_data.get('taxCommission', {}).get('taker', '0')),
                'discount_enabled': commission_data.get('discount', {}).get('enabledForAccount', False),
                'discount_asset': commission_data.get('discount', {}).get('discountAsset', 'BNB'),
                'discount_rate': float(commission_data.get('discount', {}).get('discount', '0')),
                'vip_level': vip_level,
                'account_type': vip_level  # Alias for consistency
            }
        except Exception as e:
            logger.warning(f"Failed to get commission rates, using account info rates: {e}")
            # Fallback: use rates from account info (in basis points)
            account_info = await self.get_account_info()
            maker_bps = account_info.get('makerCommission', 10)  # Default 10 basis points = 0.1%
            taker_bps = account_info.get('takerCommission', 10)
            
            # Convert basis points to decimal (10 = 0.001 = 0.1%)
            maker_rate = maker_bps / 10000.0
            taker_rate = taker_bps / 10000.0
            
            # Determine VIP level from basis points
            vip_level = "Regular"
            if maker_bps <= 2:
                vip_level = "VIP9"
            elif maker_bps <= 4:
                vip_level = "VIP8"
            elif maker_bps <= 6:
                vip_level = "VIP7"
            elif maker_bps <= 7:
                vip_level = "VIP6"
            elif maker_bps <= 8:
                vip_level = "VIP5"
            elif maker_bps <= 9:
                vip_level = "VIP4"
            elif maker_bps <= 10:
                vip_level = "VIP3"
            elif maker_bps <= 11:
                vip_level = "VIP2"
            elif maker_bps <= 12:
                vip_level = "VIP1"
            elif maker_bps <= 13:
                vip_level = "VIP0"
            
            return {
                'maker_commission': maker_rate,
                'taker_commission': taker_rate,
                'buyer_commission': account_info.get('buyerCommission', 10) / 10000.0,
                'seller_commission': account_info.get('sellerCommission', 10) / 10000.0,
                'tax_maker': 0.0,
                'tax_taker': 0.0,
                'discount_enabled': False,
                'discount_asset': 'BNB',
                'discount_rate': 0.0,
                'vip_level': vip_level,
                'account_type': vip_level
            }
    
    async def get_futures_account_info(self) -> Dict:
        """Get USDT-M Futures account information"""
        # Temporarily override base_url for futures endpoint
        original_base_url = self.base_url
        self.base_url = self.futures_base_url
        try:
            return await self._make_authenticated_request('GET', '/fapi/v2/account')
        except Exception as e:
            # If Futures endpoint returns 404, it likely means Futures trading is not enabled
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str:
                raise Exception("Futures trading not enabled or not available for this API key")
            raise
        finally:
            self.base_url = original_base_url
    
    async def get_futures_positions(self) -> List[Dict]:
        """Get USDT-M Futures positions (including open positions)"""
        original_base_url = self.base_url
        self.base_url = self.futures_base_url
        try:
            # Use /fapi/v2/positionRisk to get all positions (including zero positions)
            # Filter for positions with non-zero positionAmt
            positions = await self._make_authenticated_request('GET', '/fapi/v2/positionRisk')
            # Filter out zero positions
            active_positions = [
                pos for pos in positions 
                if float(pos.get('positionAmt', 0)) != 0
            ]
            return active_positions
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str:
                # Futures not enabled - return empty list
                return []
            raise
        finally:
            self.base_url = original_base_url
    
    async def get_balance(self, asset: Optional[str] = None) -> List[Dict]:
        """
        Get SPOT account balance
        
        Args:
            asset: Optional asset symbol (e.g., 'USDT', 'BTC'). If None, returns all balances.
        
        Returns:
            List of balance dicts with 'asset', 'free', 'locked', 'total', 'account_type'
        """
        account_info = await self.get_account_info()
        balances = account_info.get('balances', [])
        
        # Filter out zero balances and format
        non_zero_balances = [
            {
                'asset': b['asset'],
                'free': float(b['free']),
                'locked': float(b['locked']),
                'total': float(b['free']) + float(b['locked']),
                'account_type': 'SPOT'
            }
            for b in balances
            if float(b['free']) > 0 or float(b['locked']) > 0
        ]
        
        if asset:
            non_zero_balances = [b for b in non_zero_balances if b['asset'] == asset.upper()]
        
        return non_zero_balances
    
    async def get_futures_balance(self, asset: Optional[str] = None) -> List[Dict]:
        """
        Get USDT-M Futures account balance
        
        Args:
            asset: Optional asset symbol (e.g., 'USDT', 'BTC'). If None, returns all balances.
        
        Returns:
            List of balance dicts with 'asset', 'free', 'locked', 'total', 'account_type'
        """
        original_base_url = self.base_url
        self.base_url = self.futures_base_url
        
        try:
            # Use /fapi/v2/balance endpoint for Futures balance
            params = {'timestamp': int(time.time() * 1000)}
            params['signature'] = self._generate_signature(params)
            
            headers = {'X-MBX-APIKEY': self.api_key}
            url = f"{self.base_url}/fapi/v2/balance"
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    futures_balances = await response.json()
                    # Format balances
                    formatted_balances = [
                        {
                            'asset': b['asset'],
                            'free': float(b.get('availableBalance', 0)),
                            'locked': float(b.get('balance', 0)) - float(b.get('availableBalance', 0)),
                            'total': float(b.get('balance', 0)),
                            'account_type': 'FUTURES'
                        }
                        for b in futures_balances
                        if float(b.get('balance', 0)) > 0
                    ]
                    
                    if asset:
                        formatted_balances = [b for b in formatted_balances if b['asset'] == asset.upper()]
                    
                    return formatted_balances
                elif response.status == 404:
                    # Futures not enabled
                    return []
                else:
                    error_text = await response.text()
                    raise Exception(f"Futures balance API error {response.status}: {error_text}")
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str or "not enabled" in error_str.lower():
                # Futures not enabled - return empty list
                return []
            raise
        finally:
            self.base_url = original_base_url
    
    async def get_funding_balance(self, asset: Optional[str] = None) -> List[Dict]:
        """
        Get Funding/Margin account balance (Cross Margin)
        
        Args:
            asset: Optional asset symbol (e.g., 'USDT', 'BTC'). If None, returns all balances.
        
        Returns:
            List of balance dicts with 'asset', 'free', 'locked', 'total', 'account_type'
        """
        original_base_url = self.base_url
        
        try:
            # Use /sapi/v1/margin/account endpoint for Cross Margin balance
            params = {'timestamp': int(time.time() * 1000)}
            params['signature'] = self._generate_signature(params)
            
            headers = {'X-MBX-APIKEY': self.api_key}
            url = f"{self.margin_base_url}/sapi/v1/margin/account"
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    margin_account = await response.json()
                    user_assets = margin_account.get('userAssets', [])
                    
                    # Format balances
                    formatted_balances = [
                        {
                            'asset': b['asset'],
                            'free': float(b.get('free', 0)),
                            'locked': float(b.get('locked', 0)),
                            'total': float(b.get('free', 0)) + float(b.get('locked', 0)),
                            'account_type': 'FUNDING'
                        }
                        for b in user_assets
                        if float(b.get('free', 0)) > 0 or float(b.get('locked', 0)) > 0
                    ]
                    
                    if asset:
                        formatted_balances = [b for b in formatted_balances if b['asset'] == asset.upper()]
                    
                    return formatted_balances
                elif response.status == 404:
                    # Margin/Funding not enabled
                    return []
                else:
                    error_text = await response.text()
                    raise Exception(f"Funding balance API error {response.status}: {error_text}")
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str or "not enabled" in error_str.lower():
                # Margin/Funding not enabled - return empty list
                return []
            raise
        finally:
            self.base_url = original_base_url
    
    async def get_all_balances(self, asset: Optional[str] = None) -> List[Dict]:
        """
        Get balances from all account types: SPOT, FUTURES, and FUNDING
        
        Args:
            asset: Optional asset symbol (e.g., 'USDT', 'BTC'). If None, returns all balances.
        
        Returns:
            List of balance dicts with 'asset', 'free', 'locked', 'total', 'account_type'
        """
        all_balances = []
        
        # Get SPOT balances
        try:
            spot_balances = await self.get_balance(asset)
            all_balances.extend(spot_balances)
        except Exception as e:
            logger.warning(f"Failed to fetch SPOT balances: {e}")
        
        # Get Futures balances
        try:
            futures_balances = await self.get_futures_balance(asset)
            all_balances.extend(futures_balances)
        except Exception as e:
            logger.debug(f"Failed to fetch Futures balances (may not be enabled): {e}")
        
        # Get Funding/Margin balances
        try:
            funding_balances = await self.get_funding_balance(asset)
            all_balances.extend(funding_balances)
        except Exception as e:
            logger.debug(f"Failed to fetch Funding balances (may not be enabled): {e}")
        
        return all_balances
    
    async def get_portfolio_value(self) -> Dict:
        """Get total portfolio value in USDT by fetching prices for all assets from SPOT, FUTURES, and FUNDING"""
        import aiohttp
        
        # Get balances from all account types
        balances = await self.get_all_balances()
        
        total_usdt = 0.0
        holdings = []
        
        # Get prices for all assets
        # Use a separate session for public price API (no auth needed)
        async with aiohttp.ClientSession() as session:
            # Fetch all ticker prices at once (more efficient)
            try:
                price_url = f"{self.base_url}/api/v3/ticker/price"
                logger.debug(f"Fetching all prices from: {price_url}")
                async with session.get(price_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        all_prices = await response.json()
                        # Create a price lookup dictionary: {symbol: price}
                        price_map = {item['symbol']: float(item['price']) for item in all_prices}
                        logger.debug(f"✅ Fetched {len(price_map)} price pairs")
                    else:
                        logger.warning(f"Failed to fetch prices: HTTP {response.status}")
                        price_map = {}
            except Exception as e:
                logger.warning(f"Failed to fetch all prices, will fetch individually: {e}")
                price_map = {}
            
            # Process each balance
            for balance in balances:
                asset = balance['asset']
                amount = balance['total']
                
                if amount <= 0:
                    continue
                
                if asset == 'USDT':
                    # USDT is already in USDT
                    value_usdt = amount
                    total_usdt += value_usdt
                    holdings.append({
                        'asset': asset,
                        'amount': amount,
                        'value_usdt': value_usdt
                    })
                else:
                    # Try to find price for this asset
                    value_usdt = 0.0
                    
                    # Try common USDT pairs first
                    symbols_to_try = [
                        f"{asset}USDT",  # Most common
                        f"{asset}BUSD",  # Alternative stablecoin
                    ]
                    
                    # If price_map is empty, fetch prices individually
                    if not price_map:
                        for symbol in symbols_to_try:
                            try:
                                async with session.get(f"{self.base_url}/api/v3/ticker/price", params={"symbol": symbol}) as price_response:
                                    if price_response.status == 200:
                                        price_data = await price_response.json()
                                        price = float(price_data['price'])
                                        value_usdt = amount * price
                                        break
                            except Exception:
                                continue
                    else:
                        # Use price_map
                        for symbol in symbols_to_try:
                            if symbol in price_map:
                                price = price_map[symbol]
                                value_usdt = amount * price
                                break
                    
                    if value_usdt > 0:
                        total_usdt += value_usdt
                        holdings.append({
                            'asset': asset,
                            'amount': amount,
                            'value_usdt': value_usdt
                        })
                    else:
                        logger.debug(f"⚠️ Could not find price for {asset}, skipping from portfolio value")
        
        logger.info(f"📊 Portfolio value calculation: {len(holdings)} assets, Total: {total_usdt} USDT")
        return {
            'total_value_usdt': total_usdt,
            'holdings': holdings,
            'asset_count': len([b for b in balances if b['total'] > 0])
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
        """Get all open orders from SPOT, optionally filtered by symbol"""
        params = {}
        if symbol:
            params['symbol'] = symbol.upper()
        
        return await self._make_authenticated_request('GET', '/api/v3/openOrders', params)
    
    async def get_futures_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get all open orders from Futures, optionally filtered by symbol"""
        original_base_url = self.base_url
        self.base_url = self.futures_base_url
        try:
            params = {}
            if symbol:
                params['symbol'] = symbol.upper()
            
            return await self._make_authenticated_request('GET', '/fapi/v1/openOrders', params)
        except Exception as e:
            error_str = str(e)
            if "404" in error_str or "Not Found" in error_str:
                # Futures not enabled - return empty list
                return []
            raise
        finally:
            self.base_url = original_base_url
    
    async def get_all_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get all open orders from both SPOT and Futures"""
        all_orders = []
        
        # Get SPOT orders
        try:
            spot_orders = await self.get_open_orders(symbol)
            # Mark orders as SPOT
            for order in spot_orders:
                order['account_type'] = 'SPOT'
            all_orders.extend(spot_orders)
        except Exception as e:
            logger.warning(f"Failed to fetch SPOT orders: {e}")
        
        # Get Futures orders
        try:
            futures_orders = await self.get_futures_open_orders(symbol)
            # Mark orders as FUTURES
            for order in futures_orders:
                order['account_type'] = 'FUTURES'
            all_orders.extend(futures_orders)
        except Exception as e:
            logger.debug(f"Failed to fetch Futures orders (may not be enabled): {e}")
        
        return all_orders
    
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
