/**
 * pad_to_size.js
 * Usage: node pad_to_size.js <input> <output> <size>
 * Example: node pad_to_size.js index.html index_30mb.html 30M
 *
 * Size suffixes: K, M, G  (interpreted as powers of 1024)
 * Produces exactly target bytes by inserting a padded HTML comment before </body> if found,
 * otherwise appends the comment at the end.
 */

const fs = require('fs');
const path = require('path');

function parseSize(s) {
  if (!s) return null;
  s = String(s).trim();
  if (s.length === 0) return null;
  const last = s[s.length - 1].toUpperCase();
  let mul = 1;
  let num = s;
  if (last === 'K' || last === 'M' || last === 'G') {
    num = s.slice(0, -1);
    if (last === 'K') mul = 1024;
    if (last === 'M') mul = 1024 * 1024;
    if (last === 'G') mul = 1024 * 1024 * 1024;
  }
  const n = Number(num);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.floor(n * mul));
}

function padFile(inputPath, outputPath, targetBytes) {
  if (!fs.existsSync(inputPath)) {
    console.error('Fichier source introuvable:', inputPath);
    process.exit(2);
  }

  const inputBuffer = fs.readFileSync(inputPath);
  const curSize = inputBuffer.length;
  if (curSize >= targetBytes) {
    fs.copyFileSync(inputPath, outputPath);
    console.log(`Fichier original (${curSize} bytes) >= cible (${targetBytes}). Copié sans padding.`);
    return;
  }

  const padSize = targetBytes - curSize;
  console.log(`Taille courante : ${curSize} bytes. Padding nécessaire : ${padSize} bytes.`);

  const headerBuf = Buffer.from('<!-- PADDING START (do not remove) -->\n', 'utf8');
  const footerBuf = Buffer.from('\n<!-- PADDING END -->\n', 'utf8');
  const overhead = headerBuf.length + footerBuf.length;

  if (padSize <= overhead) {
    // Not enough room for header+footer: append spaces to reach exact size
    const filler = Buffer.alloc(padSize, 0x20); // spaces
    const out = Buffer.concat([inputBuffer, filler]);
    fs.writeFileSync(outputPath, out);
    console.log('Padding minimal appliqué en fin de fichier.');
    return;
  }

  const innerPadSize = padSize - overhead;
  const filler = Buffer.alloc(innerPadSize, 0x20); // spaces

  // Find last </body> index (case-insensitive) in the string form
  let inputStr;
  try { inputStr = inputBuffer.toString('utf8'); } catch (e) { inputStr = null; }

  let insertIndex = -1;
  if (inputStr !== null) {
    insertIndex = inputStr.toLowerCase().lastIndexOf('</body>');
  }

  if (insertIndex >= 0) {
    // Insert before </body>
    const before = Buffer.from(inputStr.slice(0, insertIndex), 'utf8');
    const after = Buffer.from(inputStr.slice(insertIndex), 'utf8'); // includes </body>...
    const outBuf = Buffer.concat([before, headerBuf, filler, footerBuf, after]);
    fs.writeFileSync(outputPath, outBuf);
    const finalSize = fs.statSync(outputPath).size;
    if (finalSize !== targetBytes) {
      console.warn(`Attention : taille finale ${finalSize} != cible ${targetBytes}.`);
    } else {
      console.log(`Fichier écrit (${finalSize} bytes). Padding inséré avant </body>.`);
    }
  } else {
    // append at the end
    const outBuf = Buffer.concat([inputBuffer, headerBuf, filler, footerBuf]);
    fs.writeFileSync(outputPath, outBuf);
    const finalSize = fs.statSync(outputPath).size;
    if (finalSize !== targetBytes) {
      console.warn(`Attention : taille finale ${finalSize} != cible ${targetBytes}.`);
    } else {
      console.log(`Fichier écrit (${finalSize} bytes). Padding ajouté en fin de fichier.`);
    }
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node pad_to_size.js <input> <output> <size>');
    console.log('Example: node pad_to_size.js index.html index_30mb.html 30M');
    process.exit(1);
  }
  const [inputPath, outputPath, sizeStr] = args;
  const target = parseSize(sizeStr);
  if (target === null) {
    console.error('Taille invalide:', sizeStr);
    process.exit(1);
  }
  padFile(inputPath, outputPath, target);
}