const https = require('https');

https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      for (const prefix of data.ipv6_prefixes) {
        if (prefix.ipv6_prefix.startsWith('2a05:d018:')) {
          console.log(prefix);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', e => console.error(e));
