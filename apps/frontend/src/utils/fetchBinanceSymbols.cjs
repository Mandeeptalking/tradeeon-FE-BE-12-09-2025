// Utility to fetch all live Binance trading pairs
// Run this script to get the complete list: node fetchBinanceSymbols.js

const https = require('https');
const fs = require('fs');

function fetchBinanceSymbols() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.binance.com',
      port: 443,
      path: '/api/v3/exchangeInfo',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const symbols = response.symbols
            .filter(s => s.status === 'TRADING')
            .map(s => s.symbol)
            .sort();
          
          console.log(`Found ${symbols.length} trading pairs`);
          
          // Group by quote currency
          const grouped = {};
          symbols.forEach(symbol => {
            const quoteMatch = symbol.match(/USDT|USDC|FDUSD|TUSD|BUSD|DAI|BTC|ETH|BNB|EUR|GBP|AUD|TRY|BRL|RUB|UAH|BIDR|IDRT|VAI|NGN|PLN|RON|ZAR|UAH|BVND$/);
            const quote = quoteMatch ? quoteMatch[0] : 'OTHER';
            if (!grouped[quote]) grouped[quote] = [];
            grouped[quote].push(symbol);
          });

          console.log('\nPairs by quote currency:');
          Object.keys(grouped).sort().forEach(quote => {
            console.log(`${quote}: ${grouped[quote].length} pairs`);
          });

          // Generate TypeScript array
          const tsArray = `export const BINANCE_SYMBOLS = [\n  ${symbols.map(s => `'${s}'`).join(',\n  ')}\n];`;
          
          fs.writeFileSync('binance-symbols-complete.ts', tsArray);
          console.log('\nComplete symbol list written to binance-symbols-complete.ts');
          
          resolve(symbols);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Run the fetch
fetchBinanceSymbols()
  .then(symbols => {
    console.log(`\n✅ Successfully fetched ${symbols.length} trading pairs from Binance`);
    console.log('First 10 symbols:', symbols.slice(0, 10));
    console.log('Last 10 symbols:', symbols.slice(-10));
  })
  .catch(error => {
    console.error('❌ Failed to fetch symbols:', error);
  });
