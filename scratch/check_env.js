const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
console.log('Env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('Env lines count:', envContent.split('\n').length);
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
    console.log(`Key loaded: ${key}, value length: ${val.length}, prefix: ${val.substring(0, 15)}`);
  });
}

console.log('Final DATABASE_URL prefix:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'undefined');
console.log('Final DIRECT_URL prefix:', process.env.DIRECT_URL ? process.env.DIRECT_URL.substring(0, 20) : 'undefined');
