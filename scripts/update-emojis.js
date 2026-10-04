#!/usr/bin/env node

/**
 * Script para descargar y actualizar el archivo data/emojis.json
 * directamente desde https://unicode.org/emoji/charts/full-emoji-list.html
 * 
 * Uso: node scripts/update-emojis.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://unicode.org/emoji/charts/full-emoji-list.html';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'emojis.json');

console.log(`[1/3] Conectando con ${URL}...`);

https.get(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Error HTTP: ${res.statusCode}`);
    process.exit(1);
  }

  let chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const html = Buffer.concat(chunks).toString('utf-8');
    console.log(`[2/3] Descargados ${(html.length / (1024 * 1024)).toFixed(2)} MB. Procesando HTML oficial...`);

    const emojis = [];
    let currentCategory = 'Smileys & Emotion';
    let currentSubcategory = 'face-smiling';

    function decodeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
    }

    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    while ((match = trRegex.exec(html)) !== null) {
      const row = match[1];

      if (row.includes("class='bighead'") || row.includes('class="bighead"')) {
        const catMatch = /<th[^>]*class=['"][^'"]*bighead[^'"]*['"][^>]*><a[^>]*>([\s\S]*?)<\/a>/i.exec(row);
        if (catMatch) {
          currentCategory = decodeHtml(catMatch[1].replace(/<[^>]+>/g, '')).trim();
        }
      } else if (row.includes("class='mediumhead'") || row.includes('class="mediumhead"')) {
        const subcatMatch = /<th[^>]*class=['"][^'"]*mediumhead[^'"]*['"][^>]*><a[^>]*>([\s\S]*?)<\/a>/i.exec(row);
        if (subcatMatch) {
          currentSubcategory = decodeHtml(subcatMatch[1].replace(/<[^>]+>/g, '')).trim();
        }
      } else if (row.includes("class='chars'") || row.includes('class="chars"')) {
        const charMatch = /<td class=['"]chars['"]>([\s\S]*?)<\/td>/i.exec(row);
        const nameMatch = /<td class=['"]name['"]>([\s\S]*?)<\/td>/i.exec(row);
        const codeMatch = /<td class=['"]code['"]>([\s\S]*?)<\/td>/i.exec(row);
        const numMatch = /<td class=['"]rchars['"]>([\s\S]*?)<\/td>/i.exec(row);

        if (charMatch && nameMatch) {
          const emoji = decodeHtml(charMatch[1].replace(/<[^>]+>/g, '')).trim();
          const name = decodeHtml(nameMatch[1].replace(/<[^>]+>/g, '')).trim();
          const code = codeMatch ? decodeHtml(codeMatch[1].replace(/<[^>]+>/g, '')).trim() : '';
          const num = numMatch ? parseInt(numMatch[1].replace(/<[^>]+>/g, '').trim(), 10) : null;

          if (emoji && name) {
            emojis.push({
              n: num,
              c: code,
              e: emoji,
              name: name,
              cat: currentCategory,
              sub: currentSubcategory
            });
          }
        }
      }
    }

    console.log(`[3/3] Emojis extraídos con éxito: ${emojis.length}`);

    const outputData = {
      version: 'Unicode 16.0 / Latest',
      updatedAt: new Date().toISOString(),
      source: URL,
      count: emojis.length,
      emojis: emojis
    };

    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`¡Archivo guardado en ${OUTPUT_FILE} con éxito!`);
  });
}).on('error', (err) => {
  console.error('Error al descargar:', err.message);
  process.exit(1);
});
