import { networkInterfaces } from 'os';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function getLocalIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // Also filter for common local IP ranges
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const apiUrl = `http://${localIp}:8787`;

console.log(`📡 Detected Local IP: ${localIp}`);
console.log(`🔗 Syncing VITE_API_URL to: ${apiUrl}`);

const filesToSync = [
  '.env',
  'apps/web/.env'
];

filesToSync.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(/VITE_API_URL=http:\/\/[0-9.]+:8787/g, `VITE_API_URL=${apiUrl}`);
    
    if (content !== updatedContent) {
      writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`ℹ️ ${file} is already up to date`);
    }
  }
});
