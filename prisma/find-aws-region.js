const https = require('https');

const ipv6ToFind = '2a05:d018:8eb:2f00:ba29:8342:203:5c10';

function ip6ToBigInt(ip) {
  const parts = ip.split(':');
  let hex = '';
  for (let part of parts) {
    if (part === '') {
      const missing = 8 - parts.filter(p => p !== '').length;
      hex += '0000'.repeat(missing);
    } else {
      hex += part.padStart(4, '0');
    }
  }
  return BigInt('0x' + hex);
}

https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const target = ip6ToBigInt(ipv6ToFind);
      
      for (const prefix of data.ipv6_prefixes) {
        const [ip, maskStr] = prefix.ipv6_prefix.split('/');
        const mask = parseInt(maskStr, 10);
        const prefixBigInt = ip6ToBigInt(ip);
        
        // Check if prefix matches
        const shift = 128n - BigInt(mask);
        const prefixMasked = prefixBigInt >> shift;
        const targetMasked = target >> shift;
        
        if (prefixMasked === targetMasked) {
          console.log('Match found in AWS ranges:', prefix);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', e => console.error(e));
