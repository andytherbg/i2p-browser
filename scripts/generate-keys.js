const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

const keyPair = nacl.sign.keyPair();

const publicKeyBase64 = Buffer.from(keyPair.publicKey).toString('base64');
const secretKeyBase64 = Buffer.from(keyPair.secretKey).toString('base64');

const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

fs.writeFileSync(
  path.join(keysDir, 'public.key'),
  publicKeyBase64
);

fs.writeFileSync(
  path.join(keysDir, 'secret.key'),
  secretKeyBase64
);

console.log('Ed25519 key pair generated successfully!');
console.log('Public key:', publicKeyBase64);
console.log('\nIMPORTANT: Keep secret.key safe and never commit it to version control!');
console.log('Add keys/ directory to .gitignore');
