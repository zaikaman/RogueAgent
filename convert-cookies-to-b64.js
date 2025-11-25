// convert-cookies-to-b64.js
const fs = require('fs');
const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8')); // cookies.json = array you pasted
const obj = cookies.reduce((acc, c) => {
  acc[c.name] = c.value;
  return acc;
}, {});
const json = JSON.stringify(obj);
const b64 = Buffer.from(json, 'utf8').toString('base64');
console.log(b64);