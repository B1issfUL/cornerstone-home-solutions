import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const forbidden = /tel:\s*\+?[\d(]|maps\.googleapis\.com|places\.googleapis\.com|formspree\.io|google\.maps\.importLibrary/i;
const phone = /(?<![\w])(?:\+1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]+\d{3}[\s.-]+\d{4}(?![\w])/;
const files = (await readdir('dist', {recursive:true})).filter(file => /\.(html|js|css|svg|xml|json|txt)$/i.test(file));
assert.ok(files.includes('index.html') && files.some(file => file.endsWith('.js')));
for (const file of files) {
  const content = await readFile(join('dist',file),'utf8');
  assert.ok(!forbidden.test(content) && !phone.test(content), `Forbidden public phone or provider reference: ${file}`);
}
console.log(`Scanned ${files.length} public build files for phone and disabled provider references.`);
