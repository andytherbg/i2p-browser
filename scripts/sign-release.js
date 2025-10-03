const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const secretKeyPath = process.env.SECRET_KEY_PATH || path.join(__dirname, '../keys/secret.key');

if (!fs.existsSync(secretKeyPath)) {
  console.error('Error: Secret key not found at', secretKeyPath);
  console.error('Set SECRET_KEY_PATH environment variable or run generate-keys.js first');
  process.exit(1);
}

const secretKeyBase64 = fs.readFileSync(secretKeyPath, 'utf8').trim();
const secretKey = Buffer.from(secretKeyBase64, 'base64');

const releaseDir = process.argv[2] || path.join(__dirname, '../release');

if (!fs.existsSync(releaseDir)) {
  console.error('Error: Release directory not found:', releaseDir);
  process.exit(1);
}

function findReleaseFiles(dir) {
  let files = [];
  
  function walk(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.exe') || item.endsWith('.dmg') || 
                 item.endsWith('.AppImage') || item.endsWith('.deb') || item.endsWith('.zip')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

const manifestData = {
  version: require('../package.json').version,
  files: {},
  timestamp: new Date().toISOString()
};

const files = findReleaseFiles(releaseDir);

console.log(`Signing ${files.length} release files...\n`);

files.forEach(filePath => {
  const file = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);
  
  const hash = crypto.createHash('sha256').update(fileData).digest('hex');
  console.log(`${file}: SHA256 ${hash}`);
  
  const signature = nacl.sign.detached(fileData, secretKey);
  const signatureBase64 = Buffer.from(signature).toString('base64');
  
  fs.writeFileSync(filePath + '.sig', signatureBase64);
  console.log(`  Signature: ${file}.sig`);
  
  manifestData.files[file] = {
    sha256: hash,
    signature: signatureBase64,
    size: fileData.length
  };
});

const manifestPath = path.join(releaseDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));

const manifestSignature = nacl.sign.detached(
  Buffer.from(JSON.stringify(manifestData)),
  secretKey
);
fs.writeFileSync(
  path.join(releaseDir, 'manifest.json.sig'),
  Buffer.from(manifestSignature).toString('base64')
);

console.log('\nSigning complete!');
console.log('Manifest created:', manifestPath);
console.log('\nFiles ready for distribution:');
files.forEach(filePath => {
  const file = path.basename(filePath);
  console.log(`  - ${file}`);
  console.log(`  - ${file}.sig`);
});
console.log('  - manifest.json');
console.log('  - manifest.json.sig');
