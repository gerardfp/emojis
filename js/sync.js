/**
 * Unicode Live Sync Engine
 * Fetches the official emoji list on page load from:
 * https://unicode.org/emoji/charts/full-emoji-list.html
 * 
 * Includes CORS proxy rotation, fallback to emoji-test.txt,
 * and graceful fallback to bundled data/emojis.json if network is offline.
 */

import { parseUnicodeHtml, parseUnicodeTxt } from './parser.js';

export const UNICODE_OFFICIAL_URL = 'https://unicode.org/emoji/charts/full-emoji-list.html';
export const UNICODE_TXT_URL = 'https://unicode.org/Public/emoji/latest/emoji-test.txt';
export const LOCAL_BACKUP_URL = './data/emojis.json';

const PROXY_LIST = [
  {
    name: 'CORSProxy.io',
    buildUrl: (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    timeout: 15000
  },
  {
    name: 'AllOrigins',
    buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    timeout: 20000
  },
  {
    name: 'CodeTabs',
    buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
    timeout: 20000
  }
];

export class EmojiSyncManager {
  constructor(onStatusChange = () => {}) {
    this.onStatusChange = onStatusChange;
    this.activeSource = null;
    this.lastSyncTime = localStorage.getItem('emoji_last_sync_time') || null;
  }

  notify(status, details = {}) {
    this.onStatusChange({
      status,
      timestamp: new Date(),
      ...details
    });
  }

  /**
   * Fetches with an abort timeout
   */
  async fetchWithTimeout(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml,text/plain,*/*' }
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.text();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Loads emojis:
   * 1. Try fetching full-emoji-list.html live from unicode.org (via proxies)
   * 2. Try fetching emoji-test.txt from unicode.org
   * 3. Fallback to local snapshot in data/emojis.json
   */
  async loadLatestEmojis() {
    this.notify('syncing', {
      message: 'Conectando con unicode.org para obtener la lista oficial...',
      source: UNICODE_OFFICIAL_URL
    });

    // 1. Try direct fetch first (if user is using an environment allowing it)
    try {
      this.notify('syncing', { message: 'Intentando conexión directa a unicode.org...' });
      const html = await this.fetchWithTimeout(UNICODE_OFFICIAL_URL, 6000);
      const parsed = parseUnicodeHtml(html);
      if (parsed && parsed.length > 500) {
        this.saveSyncSuccess('Direct Unicode.org HTML', parsed.length);
        return {
          emojis: parsed,
          source: 'Unicode.org Directo',
          url: UNICODE_OFFICIAL_URL,
          isLive: true
        };
      }
    } catch {
      // Direct CORS blocked as standard, continue to proxy pool
    }

    // 2. Try CORS proxies for full-emoji-list.html
    for (const proxy of PROXY_LIST) {
      try {
        const proxyUrl = proxy.buildUrl(UNICODE_OFFICIAL_URL);
        this.notify('syncing', {
          message: `Descargando lista oficial mediante ${proxy.name}...`,
          proxy: proxy.name
        });

        const html = await this.fetchWithTimeout(proxyUrl, proxy.timeout);
        this.notify('syncing', { message: 'Procesando emojis oficiales de Unicode...' });

        const parsed = parseUnicodeHtml(html);
        if (parsed && parsed.length > 500) {
          this.saveSyncSuccess(`${proxy.name} (HTML oficial)`, parsed.length);
          return {
            emojis: parsed,
            source: `Unicode.org oficial (vía ${proxy.name})`,
            url: UNICODE_OFFICIAL_URL,
            isLive: true
          };
        }
      } catch (err) {
        console.warn(`Proxy ${proxy.name} falló para full-emoji-list.html:`, err.message);
      }
    }

    // 3. Try fetching emoji-test.txt (lightweight 650KB) via CORS proxy
    for (const proxy of PROXY_LIST.slice(0, 2)) {
      try {
        const proxyUrl = proxy.buildUrl(UNICODE_TXT_URL);
        this.notify('syncing', {
          message: `Probando fuente alternativa oficial Unicode (${proxy.name})...`
        });

        const txt = await this.fetchWithTimeout(proxyUrl, 12000);
        const parsed = parseUnicodeTxt(txt);
        if (parsed && parsed.length > 500) {
          this.saveSyncSuccess(`${proxy.name} (TXT UTS #51 oficial)`, parsed.length);
          return {
            emojis: parsed,
            source: `Unicode.org oficial UTS#51 (vía ${proxy.name})`,
            url: UNICODE_TXT_URL,
            isLive: true
          };
        }
      } catch (err) {
        console.warn(`Proxy ${proxy.name} falló para emoji-test.txt:`, err.message);
      }
    }

    // 4. Fallback: local snapshot (data/emojis.json)
    this.notify('syncing', { message: 'Cargando copia local verificada...' });
    try {
      const response = await fetch(LOCAL_BACKUP_URL);
      if (response.ok) {
        const json = await response.json();
        this.activeSource = 'Copia local oficial';
        this.notify('cached', {
          message: 'Mostrando base de datos oficial verificada (sin conexión a proxies)',
          count: json.count,
          version: json.version,
          updatedAt: json.updatedAt
        });
        return {
          emojis: json.emojis,
          source: 'Copia oficial verificada (Local)',
          url: LOCAL_BACKUP_URL,
          isLive: false,
          version: json.version
        };
      }
    } catch (err) {
      console.error('Error cargando backup local:', err);
    }

    throw new Error('No se pudo obtener la lista de emojis ni la copia de seguridad.');
  }

  saveSyncSuccess(source, count) {
    this.activeSource = source;
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem('emoji_last_sync_time', this.lastSyncTime);
    localStorage.setItem('emoji_last_sync_source', source);
    localStorage.setItem('emoji_last_count', count.toString());

    this.notify('success', {
      message: `¡Actualizado! ${count.toLocaleString()} emojis cargados desde Unicode.org`,
      source,
      count,
      lastSyncTime: this.lastSyncTime
    });
  }
}
