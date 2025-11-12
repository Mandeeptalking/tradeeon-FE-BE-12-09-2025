// Copy and paste this entire script into browser console (F12 → Console tab)
// This will test the dashboard endpoint step by step

(async function testDashboard() {
  console.log('🔍 Testing Dashboard Endpoint...\n');
  
  // Step 1: Check if Supabase is configured
  console.log('Step 1: Checking Supabase configuration...');
  const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL;
  const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY;
  console.log('Supabase URL:', supabaseUrl ? '✅ Configured' : '❌ Missing');
  console.log('Supabase Key:', supabaseKey ? '✅ Configured' : '❌ Missing');
  
  // Step 2: Check authentication
  console.log('\nStep 2: Checking authentication...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Error getting session:', error);
      return;
    }
    if (!session) {
      console.error('❌ No session found. Please sign in.');
      return;
    }
    console.log('✅ Session found');
    console.log('User ID:', session.user.id);
    console.log('Token exists:', session.access_token ? '✅' : '❌');
    console.log('Token preview:', session.access_token ? session.access_token.substring(0, 20) + '...' : 'None');
  } catch (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  // Step 3: Test CORS Preflight (OPTIONS)
  console.log('\nStep 3: Testing CORS Preflight (OPTIONS request)...');
  try {
    const optionsResponse = await fetch('https://api.tradeeon.com/dashboard/summary', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type,x-csrf-token'
      }
    });
    console.log('OPTIONS Status:', optionsResponse.status);
    console.log('CORS Headers:', {
      'allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
      'allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
      'allow-headers': optionsResponse.headers.get('access-control-allow-headers'),
      'allow-credentials': optionsResponse.headers.get('access-control-allow-credentials')
    });
    
    if (optionsResponse.status === 200) {
      console.log('✅ CORS Preflight successful');
    } else if (optionsResponse.status === 400) {
      console.error('❌ CORS Preflight failed (400). Backend needs redeployment with CORS fix.');
    } else {
      console.warn('⚠️ Unexpected OPTIONS status:', optionsResponse.status);
    }
  } catch (err) {
    console.error('❌ CORS Preflight error:', err);
  }
  
  // Step 4: Test actual GET request (without auth - should get 401)
  console.log('\nStep 4: Testing GET request without auth (should return 401)...');
  try {
    const noAuthResponse = await fetch('https://api.tradeeon.com/dashboard/summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Status:', noAuthResponse.status);
    const noAuthData = await noAuthResponse.text();
    console.log('Response:', noAuthData.substring(0, 200));
    
    if (noAuthResponse.status === 401) {
      console.log('✅ Endpoint exists and requires auth (expected)');
    } else if (noAuthResponse.status === 400) {
      console.error('❌ CORS issue - request blocked');
    } else if (noAuthResponse.status === 404) {
      console.error('❌ Route not found - backend router issue');
    }
  } catch (err) {
    console.error('❌ GET request error:', err);
  }
  
  // Step 5: Test with authentication
  console.log('\nStep 5: Testing GET request with authentication...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('❌ No auth token available');
      return;
    }
    
    // Generate CSRF token (same as frontend does)
    let csrfToken = sessionStorage.getItem('csrf_token');
    if (!csrfToken) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      csrfToken = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      sessionStorage.setItem('csrf_token', csrfToken);
    }
    
    const authResponse = await fetch('https://api.tradeeon.com/dashboard/summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-CSRF-Token': csrfToken,
        'Origin': window.location.origin
      },
      credentials: 'include'
    });
    
    console.log('Status:', authResponse.status);
    console.log('Status Text:', authResponse.statusText);
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log('✅ Success! Data received:', {
        hasData: !!data,
        accountTypes: data?.account?.account_types,
        assetsCount: data?.assets?.length,
        hasUsdtBalance: !!data?.usdt_balance
      });
    } else {
      const errorData = await authResponse.text();
      console.error('❌ Request failed:', errorData.substring(0, 200));
      
      if (authResponse.status === 401) {
        console.error('Authentication failed. Token may be expired. Try signing in again.');
      } else if (authResponse.status === 404) {
        console.error('Route not found. Check backend router configuration.');
      } else if (authResponse.status === 400) {
        console.error('Bad request. Likely CORS or header issue.');
      }
    }
  } catch (err) {
    console.error('❌ Authenticated request error:', err);
    if (err.message?.includes('fetch')) {
      console.error('Network error - backend may be unreachable or CORS blocking');
    }
  }
  
  console.log('\n✅ Testing complete. Check results above.');
})();

