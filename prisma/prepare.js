const fs = require('fs');
const path = require('path');

function prepare() {
  const envPath = path.join(__dirname, '../.env');
  let databaseUrl = process.env.DATABASE_URL;

  // If not in env, try to read from .env file
  if (!databaseUrl && fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) continue;
        const parts = trimmed.split('=');
        if (parts[0].trim() === 'DATABASE_URL') {
          // Join the rest back in case the value contains "="
          const val = parts.slice(1).join('=').trim();
          // Strip quotes if present
          databaseUrl = val.replace(/^["']|["']$/g, '');
          break;
        }
      }
    } catch (e) {
      console.warn('Warning: Could not read .env file:', e.message);
    }
  }

  if (!databaseUrl) {
    console.log('No DATABASE_URL found. Defaulting to sqlite provider.');
    databaseUrl = 'file:./dev.db';
  }

  const isSqlite = databaseUrl.startsWith('file:') || databaseUrl.startsWith('sqlite:');
  const targetProvider = isSqlite ? 'sqlite' : 'postgresql';

  const schemaPath = path.join(__dirname, 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error('Error: schema.prisma not found at:', schemaPath);
    process.exit(1);
  }

  let schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Replace provider = "something" with targetProvider
  const providerRegex = /provider\s*=\s*["']([^"']+)["']/;
  const match = schemaContent.match(providerRegex);

  if (match) {
    const currentProvider = match[1];
    if (currentProvider !== targetProvider) {
      // Check if it's the provider in datasource db block
      // We can do a more specific replace to make sure we edit the provider inside datasource db { ... }
      const datasourceRegex = /(datasource\s+db\s*\{[^]*?provider\s*=\s*["'])([^"']+)((?:"'|[^}])*?\})/g;
      
      let updated = false;
      const newContent = schemaContent.replace(datasourceRegex, (m, p1, p2, p3) => {
        if (p2 !== targetProvider) {
          updated = true;
          return `${p1}${targetProvider}${p3}`;
        }
        return m;
      });

      if (updated) {
        fs.writeFileSync(schemaPath, newContent, 'utf8');
        console.log(`Successfully updated database provider in schema.prisma to "${targetProvider}"`);
      } else {
        console.log(`schema.prisma provider is already "${targetProvider}"`);
      }
    } else {
      console.log(`schema.prisma provider is already "${targetProvider}"`);
    }
  } else {
    console.warn('Warning: Could not find datasource provider in schema.prisma');
  }
}

prepare();
