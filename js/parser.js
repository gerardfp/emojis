/**
 * Unicode Emoji List Parser
 * Parses official data from unicode.org:
 * 1. full-emoji-list.html (HTML table format)
 * 2. emoji-test.txt (machine-readable UTS #51 format)
 */

export function decodeHtmlEntities(str) {
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

/**
 * Parses full-emoji-list.html from https://unicode.org/emoji/charts/full-emoji-list.html
 * Extracts emoji character, CLDR name, code point, category, and subcategory.
 */
export function parseUnicodeHtml(html) {
  const emojis = [];
  let currentCategory = 'Smileys & Emotion';
  let currentSubcategory = 'face-smiling';

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = trRegex.exec(html)) !== null) {
    const row = match[1];

    // Detect category header (class 'bighead')
    if (row.includes("class='bighead'") || row.includes('class="bighead"')) {
      const catMatch = /<th[^>]*class=['"][^'"]*bighead[^'"]*['"][^>]*><a[^>]*>([\s\S]*?)<\/a>/i.exec(row);
      if (catMatch) {
        currentCategory = decodeHtmlEntities(catMatch[1].replace(/<[^>]+>/g, '')).trim();
      }
      continue;
    }

    // Detect subcategory header (class 'mediumhead')
    if (row.includes("class='mediumhead'") || row.includes('class="mediumhead"')) {
      const subcatMatch = /<th[^>]*class=['"][^'"]*mediumhead[^'"]*['"][^>]*><a[^>]*>([\s\S]*?)<\/a>/i.exec(row);
      if (subcatMatch) {
        currentSubcategory = decodeHtmlEntities(subcatMatch[1].replace(/<[^>]+>/g, '')).trim();
      }
      continue;
    }

    // Detect emoji data row (class 'chars')
    if (row.includes("class='chars'") || row.includes('class="chars"')) {
      const charMatch = /<td class=['"]chars['"]>([\s\S]*?)<\/td>/i.exec(row);
      const nameMatch = /<td class=['"]name['"]>([\s\S]*?)<\/td>/i.exec(row);
      const codeMatch = /<td class=['"]code['"]>([\s\S]*?)<\/td>/i.exec(row);
      const numMatch = /<td class=['"]rchars['"]>([\s\S]*?)<\/td>/i.exec(row);

      if (charMatch && nameMatch) {
        const emoji = decodeHtmlEntities(charMatch[1].replace(/<[^>]+>/g, '')).trim();
        const name = decodeHtmlEntities(nameMatch[1].replace(/<[^>]+>/g, '')).trim();
        const code = codeMatch ? decodeHtmlEntities(codeMatch[1].replace(/<[^>]+>/g, '')).trim() : '';
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

  return emojis;
}

/**
 * Fallback parser for emoji-test.txt from https://unicode.org/Public/emoji/latest/emoji-test.txt
 */
export function parseUnicodeTxt(text) {
  const emojis = [];
  let currentGroup = 'Smileys & Emotion';
  let currentSubgroup = 'face-smiling';
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# group:')) {
      currentGroup = trimmed.substring(8).trim();
      continue;
    }
    if (trimmed.startsWith('# subgroup:')) {
      currentSubgroup = trimmed.substring(11).trim();
      continue;
    }
    if (trimmed.startsWith('#')) continue;

    const parts = trimmed.split('#');
    if (parts.length >= 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();

      const leftParts = left.split(';');
      const codeHex = leftParts[0].trim();
      const status = leftParts[1] ? leftParts[1].trim() : '';

      if (status === 'fully-qualified' || status === 'component') {
        const rightMatch = /^(\S+)\s+(?:E\d+\.\d+\s+)?(.*)$/.exec(right);
        if (rightMatch) {
          const emoji = rightMatch[1];
          const name = rightMatch[2];
          emojis.push({
            c: 'U+' + codeHex.replace(/\s+/g, ' U+'),
            e: emoji,
            name: name,
            cat: currentGroup,
            sub: currentSubgroup
          });
        }
      }
    }
  }

  return emojis;
}
