const selfsigned = require('selfsigned');
const fs = require('fs');

const attrs = [{ name: 'commonName', value: '192.168.68.119' }];
const pems = selfsigned.generate(attrs, { days: 365 });

async function saveCerts() {
    const data = await pems; // Handle if it's a promise
    console.log('Generated data keys:', Object.keys(data));

    fs.writeFileSync('key.pem', data.private);
    fs.writeFileSync('cert.pem', data.cert);
    console.log('SSL Certificates generated successfully: key.pem, cert.pem');
}

saveCerts().catch(err => console.error(err));
