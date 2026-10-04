/**
 * Main Application Logic
 * Emoji Hub - Official Unicode Emoji Grid with Clipboard Copy & Live Sync
 */

import { EmojiSyncManager, UNICODE_OFFICIAL_URL } from './sync.js';

// Category metadata with icons & Spanish descriptions
const CATEGORY_META = {
  'Smileys & Emotion': { icon: '😀', label: 'Emoticonos y Emociones' },
  'People & Body': { icon: '🧑', label: 'Personas y Cuerpo' },
  'Animals & Nature': { icon: '🌿', label: 'Animales y Naturaleza' },
  'Food & Drink': { icon: '🍔', label: 'Comida y Bebida' },
  'Travel & Places': { icon: '✈️', label: 'Viajes y Lugares' },
  'Activities': { icon: '⚽', label: 'Actividades y Deportes' },
  'Objects': { icon: '💡', label: 'Objetos' },
  'Symbols': { icon: '🔣', label: 'Símbolos' },
  'Flags': { icon: '🚩', label: 'Banderas' },
  'Component': { icon: '🧩', label: 'Componentes' }
};

class EmojiApp {
  constructor() {
    this.emojis = [];
    this.groupedByCategory = {};
    this.recents = this.loadStorage('emoji_recents', []);
    this.favorites = new Set(this.loadStorage('emoji_favorites', []));
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.density = localStorage.getItem('emoji_density') || 'compact';
    this.soundEnabled = localStorage.getItem('emoji_sound') !== 'false';
    this.theme = localStorage.getItem('emoji_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    this.audioCtx = null;
    this.syncManager = new EmojiSyncManager((status) => this.handleSyncStatus(status));

    this.initElements();
    this.applyTheme();
    this.applyDensity();
    this.setupEventListeners();
    this.setupAudio();

    // Start loading: first render fast from local cache if available, then sync live
    this.bootstrapData();
  }

  loadStorage(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  saveStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  initElements() {
    this.searchBox = document.getElementById('search-input');
    this.clearSearchBtn = document.getElementById('clear-search');
    this.resultsCountEl = document.getElementById('results-count');
    this.categoryNav = document.getElementById('category-nav');
    this.gridContainer = document.getElementById('grid-container');
    this.recentsContainer = document.getElementById('recents-container');
    this.recentsSection = document.getElementById('recents-section');
    this.favoritesContainer = document.getElementById('favorites-container');
    this.favoritesSection = document.getElementById('favorites-section');
    this.themeToggleBtn = document.getElementById('theme-toggle');
    this.densitySelector = document.getElementById('density-selector');
    this.soundToggleBtn = document.getElementById('sound-toggle');
    this.syncStatusPill = document.getElementById('sync-status-pill');
    this.syncModal = document.getElementById('sync-modal');
    this.closeModalBtn = document.getElementById('close-modal-btn');
    this.manualSyncBtn = document.getElementById('manual-sync-btn');
    this.toastEl = document.getElementById('toast');
    this.contextMenu = document.getElementById('context-menu');
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    if (this.themeToggleBtn) {
      this.themeToggleBtn.innerHTML = this.theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>` 
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      this.themeToggleBtn.title = this.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('emoji_theme', this.theme);
    this.applyTheme();
  }

  applyDensity() {
    document.documentElement.setAttribute('data-density', this.density);
    if (this.densitySelector) {
      this.densitySelector.value = this.density;
    }
  }

  setupAudio() {
    // Lazy AudioContext on first interaction
    const initAudio = () => {
      if (!this.audioCtx && window.AudioContext) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('click', initAudio, { once: true });
  }

  playCopySound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch {
      // Audio autoplay restrictions or unsupported
    }
  }

  async bootstrapData() {
    // 1. Immediately load local cache if exists so UI is never waiting
    try {
      const cached = localStorage.getItem('emoji_cached_data');
      if (cached) {
        const data = JSON.parse(cached);
        this.setEmojis(data);
      } else {
        // Fetch local JSON file immediately
        const res = await fetch('./data/emojis.json');
        if (res.ok) {
          const json = await res.json();
          this.setEmojis(json.emojis);
        }
      }
    } catch (e) {
      console.warn('Error cargando inicial:', e);
    }

    // 2. Fetch official live list from unicode.org (as requested: "cada vez que se abra")
    this.refreshFromUnicode();
  }

  async refreshFromUnicode() {
    try {
      const result = await this.syncManager.loadLatestEmojis();
      if (result && result.emojis && result.emojis.length > 0) {
        this.setEmojis(result.emojis);
        // Cache parsed emojis in localStorage for instant rendering on next page open
        try {
          localStorage.setItem('emoji_cached_data', JSON.stringify(result.emojis));
        } catch {
          // Exceeds quota, fine to skip
        }
      }
    } catch (err) {
      console.error('Error sincronizando con Unicode:', err);
      this.handleSyncStatus({
        status: 'error',
        message: 'No se pudo conectar con Unicode.org en vivo. Usando versión almacenada.',
        details: err.message
      });
    }
  }

  setEmojis(emojis) {
    this.emojis = emojis;
    this.groupEmojis();
    this.renderCategoryNav();
    this.renderRecents();
    this.renderFavorites();
    this.renderGrid();
    this.updateStats();
  }

  groupEmojis() {
    this.groupedByCategory = {};
    for (const item of this.emojis) {
      const cat = item.cat || 'Otros';
      if (!this.groupedByCategory[cat]) {
        this.groupedByCategory[cat] = [];
      }
      this.groupedByCategory[cat].push(item);
    }
  }

  updateStats() {
    if (!this.resultsCountEl) return;
    const total = this.emojis.length;
    if (this.searchQuery) {
      const visible = this.getFilteredEmojis().length;
      this.resultsCountEl.textContent = `${visible.toLocaleString()} de ${total.toLocaleString()} emojis encontrados`;
    } else {
      this.resultsCountEl.textContent = `${total.toLocaleString()} emojis listos para copiar`;
    }
  }

  renderCategoryNav() {
    if (!this.categoryNav) return;

    let html = `
      <button class="nav-pill ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        <span class="nav-icon">✨</span>
        <span class="nav-text">Todos</span>
        <span class="nav-badge">${this.emojis.length}</span>
      </button>
    `;

    if (this.recents.length > 0) {
      html += `
        <a href="#section-recents" class="nav-pill" data-cat="recents">
          <span class="nav-icon">🕒</span>
          <span class="nav-text">Recientes</span>
          <span class="nav-badge">${this.recents.length}</span>
        </a>
      `;
    }

    if (this.favorites.size > 0) {
      html += `
        <a href="#section-favorites" class="nav-pill" data-cat="favorites">
          <span class="nav-icon">⭐</span>
          <span class="nav-text">Favoritos</span>
          <span class="nav-badge">${this.favorites.size}</span>
        </a>
      `;
    }

    const categories = Object.keys(this.groupedByCategory);
    for (const cat of categories) {
      const meta = CATEGORY_META[cat] || { icon: '📁', label: cat };
      const count = this.groupedByCategory[cat].length;
      const slug = this.slugify(cat);
      html += `
        <a href="#category-${slug}" class="nav-pill ${this.activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
          <span class="nav-icon">${meta.icon}</span>
          <span class="nav-text">${cat}</span>
          <span class="nav-badge">${count}</span>
        </a>
      `;
    }

    this.categoryNav.innerHTML = html;
  }

  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  getFilteredEmojis() {
    if (!this.searchQuery) return this.emojis;
    const q = this.searchQuery.toLowerCase().trim();
    return this.emojis.filter(item => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.e.includes(q) ||
        (item.c && item.c.toLowerCase().includes(q)) ||
        (item.cat && item.cat.toLowerCase().includes(q)) ||
        (item.sub && item.sub.toLowerCase().includes(q))
      );
    });
  }

  renderGrid() {
    if (!this.gridContainer) return;

    if (this.searchQuery) {
      // Flat filtered results view
      const filtered = this.getFilteredEmojis();
      if (filtered.length === 0) {
        this.gridContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No se encontraron emojis</h3>
            <p>Prueba con otro término en inglés o español (ej: "smile", "heart", "fire", "cat")</p>
          </div>
        `;
        return;
      }

      let html = `
        <section class="category-section search-results-section">
          <div class="category-header">
            <h2 class="category-title">
              <span class="cat-icon">🔎</span> Resultados de búsqueda
              <span class="cat-count">${filtered.length}</span>
            </h2>
          </div>
          <div class="emoji-grid">
            ${filtered.map(item => this.createEmojiButton(item)).join('')}
          </div>
        </section>
      `;
      this.gridContainer.innerHTML = html;
      return;
    }

    // Categorized layout
    const categories = Object.keys(this.groupedByCategory);
    let html = '';

    for (const cat of categories) {
      const items = this.groupedByCategory[cat];
      const meta = CATEGORY_META[cat] || { icon: '📁', label: cat };
      const slug = this.slugify(cat);

      // Group by subcategory
      const subcategories = {};
      for (const item of items) {
        const sub = item.sub || 'general';
        if (!subcategories[sub]) subcategories[sub] = [];
        subcategories[sub].push(item);
      }

      html += `
        <section id="category-${slug}" class="category-section" data-category="${cat}">
          <div class="category-header">
            <h2 class="category-title">
              <span class="cat-icon">${meta.icon}</span>
              <span class="cat-name">${cat}</span>
              <span class="cat-count">${items.length}</span>
            </h2>
          </div>
          
          <div class="subcategories-container">
            ${Object.entries(subcategories).map(([subName, subItems]) => `
              <div class="subcategory-block">
                <div class="subcategory-title">${subName}</div>
                <div class="emoji-grid">
                  ${subItems.map(item => this.createEmojiButton(item)).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }

    this.gridContainer.innerHTML = html;
  }

  createEmojiButton(item) {
    const isFav = this.favorites.has(item.e);
    return `
      <button class="emoji-btn" 
              data-emoji="${item.e}" 
              data-name="${this.escapeHtml(item.name)}" 
              data-code="${item.c || ''}"
              data-cat="${item.cat || ''}"
              aria-label="${this.escapeHtml(item.name)}"
              title="${item.e} ${item.name} (${item.c}) — Clic para copiar">
        <span class="emoji-char">${item.e}</span>
        ${isFav ? '<span class="fav-badge">★</span>' : ''}
      </button>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderRecents() {
    if (!this.recentsSection || !this.recentsContainer) return;
    if (this.recents.length === 0) {
      this.recentsSection.style.display = 'none';
      return;
    }

    this.recentsSection.style.display = 'block';
    this.recentsContainer.innerHTML = this.recents.map(emojiChar => {
      const match = this.emojis.find(x => x.e === emojiChar);
      const name = match ? match.name : emojiChar;
      const code = match ? match.c : '';
      return `
        <button class="emoji-btn" 
                data-emoji="${emojiChar}" 
                data-name="${this.escapeHtml(name)}" 
                data-code="${code}"
                aria-label="${this.escapeHtml(name)}"
                title="${emojiChar} ${name} — Clic para copiar">
          <span class="emoji-char">${emojiChar}</span>
        </button>
      `;
    }).join('');
  }

  renderFavorites() {
    if (!this.favoritesSection || !this.favoritesContainer) return;
    if (this.favorites.size === 0) {
      this.favoritesSection.style.display = 'none';
      return;
    }

    this.favoritesSection.style.display = 'block';
    const favArray = Array.from(this.favorites);
    this.favoritesContainer.innerHTML = favArray.map(emojiChar => {
      const match = this.emojis.find(x => x.e === emojiChar);
      const name = match ? match.name : emojiChar;
      const code = match ? match.c : '';
      return `
        <button class="emoji-btn" 
                data-emoji="${emojiChar}" 
                data-name="${this.escapeHtml(name)}" 
                data-code="${code}"
                aria-label="${this.escapeHtml(name)}"
                title="${emojiChar} ${name} — Clic para copiar">
          <span class="emoji-char">${emojiChar}</span>
          <span class="fav-badge">★</span>
        </button>
      `;
    }).join('');
  }

  async copyEmoji(emoji, name = '', btnElement = null) {
    let success = false;

    // Try modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(emoji);
        success = true;
      } catch {
        // Fallback below
      }
    }

    // Fallback execCommand
    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = emoji;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand('copy');
        textarea.remove();
      } catch (err) {
        console.error('Error al copiar:', err);
      }
    }

    if (success) {
      this.playCopySound();

      // Button animation
      if (btnElement) {
        btnElement.classList.add('copied');
        setTimeout(() => btnElement.classList.remove('copied'), 600);
      }

      // Add to recents
      this.addToRecents(emoji);

      // Show toast
      this.showToast(`¡Copiado al portapapeles! ${emoji} <small>${name}</small>`);
    } else {
      this.showToast('No se pudo copiar automáticamente. Por favor selecciónalo manualmente.', true);
    }
  }

  addToRecents(emojiChar) {
    this.recents = [emojiChar, ...this.recents.filter(e => e !== emojiChar)].slice(0, 30);
    this.saveStorage('emoji_recents', this.recents);
    this.renderRecents();
    this.renderCategoryNav();
  }

  toggleFavorite(emojiChar) {
    if (this.favorites.has(emojiChar)) {
      this.favorites.delete(emojiChar);
      this.showToast(`Quitado de favoritos: ${emojiChar}`);
    } else {
      this.favorites.add(emojiChar);
      this.showToast(`Añadido a favoritos: ${emojiChar}`);
    }
    this.saveStorage('emoji_favorites', Array.from(this.favorites));
    this.renderFavorites();
    this.renderCategoryNav();
    this.renderGrid();
  }

  showToast(message, isError = false) {
    if (!this.toastEl) return;
    this.toastEl.innerHTML = message;
    this.toastEl.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.className = 'toast';
    }, 2200);
  }

  handleSyncStatus({ status, message, count, source, details }) {
    if (!this.syncStatusPill) return;

    if (status === 'syncing') {
      this.syncStatusPill.className = 'sync-pill syncing';
      this.syncStatusPill.innerHTML = `
        <span class="sync-spinner"></span>
        <span class="sync-label">${message || 'Sincronizando con Unicode.org...'}</span>
      `;
    } else if (status === 'success') {
      this.syncStatusPill.className = 'sync-pill success';
      this.syncStatusPill.innerHTML = `
        <span class="sync-dot live"></span>
        <span class="sync-label">Oficial al día (${count || this.emojis.length})</span>
      `;
      this.syncStatusPill.title = `Sincronizado desde: ${source}\nHaz clic para ver detalles`;
      this.updateModalInfo({ status: 'Sincronizado en vivo', count, source, lastSync: new Date().toLocaleString() });
    } else if (status === 'cached') {
      this.syncStatusPill.className = 'sync-pill cached';
      this.syncStatusPill.innerHTML = `
        <span class="sync-dot cached"></span>
        <span class="sync-label">Caché oficial (${count || this.emojis.length})</span>
      `;
      this.syncStatusPill.title = 'Mostrando copia local verificada de Unicode. Haz clic para más información.';
      this.updateModalInfo({ status: 'Copia local verificada', count, source: 'Base de datos oficial integrada' });
    } else if (status === 'error') {
      this.syncStatusPill.className = 'sync-pill error';
      this.syncStatusPill.innerHTML = `
        <span class="sync-dot error"></span>
        <span class="sync-label">Modo sin conexión</span>
      `;
      this.updateModalInfo({ status: 'Error de red en vivo', details });
    }
  }

  updateModalInfo(info) {
    const modalBody = document.getElementById('sync-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="modal-info-row">
        <strong>URL oficial Unicode:</strong>
        <a href="${UNICODE_OFFICIAL_URL}" target="_blank" rel="noopener noreferrer">${UNICODE_OFFICIAL_URL}</a>
      </div>
      <div class="modal-info-row">
        <strong>Estado actual:</strong>
        <span>${info.status || 'Conectado'}</span>
      </div>
      <div class="modal-info-row">
        <strong>Fuente activa:</strong>
        <span>${info.source || 'Unicode.org'}</span>
      </div>
      <div class="modal-info-row">
        <strong>Total de emojis:</strong>
        <span>${(info.count || this.emojis.length).toLocaleString()} emojis</span>
      </div>
      <div class="modal-info-row">
        <strong>Última comprobación:</strong>
        <span>${info.lastSync || new Date().toLocaleString()}</span>
      </div>
      <p class="modal-desc">
        La aplicación consulta la lista oficial de Unicode cada vez que se abre la página en tu navegador, garantizando que siempre tengas los nuevos emojis añadidos.
      </p>
    `;
  }

  setupEventListeners() {
    // Search input
    if (this.searchBox) {
      this.searchBox.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (this.clearSearchBtn) {
          this.clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        }
        this.renderGrid();
        this.updateStats();
      });

      // Shortcut '/' to search
      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== this.searchBox) {
          e.preventDefault();
          this.searchBox.focus();
        }
        if (e.key === 'Escape' && document.activeElement === this.searchBox) {
          this.searchBox.value = '';
          this.searchQuery = '';
          this.clearSearchBtn.style.display = 'none';
          this.searchBox.blur();
          this.renderGrid();
          this.updateStats();
        }
      });
    }

    if (this.clearSearchBtn) {
      this.clearSearchBtn.addEventListener('click', () => {
        this.searchBox.value = '';
        this.searchQuery = '';
        this.clearSearchBtn.style.display = 'none';
        this.searchBox.focus();
        this.renderGrid();
        this.updateStats();
      });
    }

    // Grid clicks (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.emoji-btn');
      if (btn) {
        const emoji = btn.getAttribute('data-emoji');
        const name = btn.getAttribute('data-name');
        if (emoji) {
          this.copyEmoji(emoji, name, btn);
        }
      }
    });

    // Right-click context menu
    document.addEventListener('contextmenu', (e) => {
      const btn = e.target.closest('.emoji-btn');
      if (btn) {
        e.preventDefault();
        this.showContextMenu(e, btn);
      } else {
        this.hideContextMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) {
        this.hideContextMenu();
      }
    });

    // Theme toggle
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Density selector
    if (this.densitySelector) {
      this.densitySelector.addEventListener('change', (e) => {
        this.density = e.target.value;
        localStorage.setItem('emoji_density', this.density);
        this.applyDensity();
      });
    }

    // Sound toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('emoji_sound', this.soundEnabled.toString());
        this.soundToggleBtn.classList.toggle('muted', !this.soundEnabled);
        this.showToast(this.soundEnabled ? 'Sonido activado' : 'Sonido silenciado');
      });
    }

    // Sync modal triggers
    if (this.syncStatusPill) {
      this.syncStatusPill.addEventListener('click', () => {
        if (this.syncModal) this.syncModal.classList.add('open');
      });
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => {
        if (this.syncModal) this.syncModal.classList.remove('open');
      });
    }

    if (this.syncModal) {
      this.syncModal.addEventListener('click', (e) => {
        if (e.target === this.syncModal) this.syncModal.classList.remove('open');
      });
    }

    if (this.manualSyncBtn) {
      this.manualSyncBtn.addEventListener('click', () => {
        if (this.syncModal) this.syncModal.classList.remove('open');
        this.refreshFromUnicode();
      });
    }
  }

  showContextMenu(e, btn) {
    if (!this.contextMenu) return;
    const emoji = btn.getAttribute('data-emoji');
    const name = btn.getAttribute('data-name');
    const code = btn.getAttribute('data-code');
    const isFav = this.favorites.has(emoji);

    const htmlEntity = `&#x${[...emoji].map(c => c.codePointAt(0).toString(16)).join(';&#x')};`;

    this.contextMenu.innerHTML = `
      <div class="context-header">
        <span class="context-emoji">${emoji}</span>
        <span class="context-title">${name}</span>
      </div>
      <div class="context-divider"></div>
      <button class="context-item" data-action="copy-emoji">
        <span class="context-icon">📋</span> Copiar Emoji (${emoji})
      </button>
      <button class="context-item" data-action="copy-code">
        <span class="context-icon">🏷️</span> Copiar Código (${code || 'Unicode'})
      </button>
      <button class="context-item" data-action="copy-html">
        <span class="context-icon">💻</span> Copiar Entidad HTML (${htmlEntity})
      </button>
      <button class="context-item" data-action="copy-name">
        <span class="context-icon">🔤</span> Copiar Nombre en inglés
      </button>
      <div class="context-divider"></div>
      <button class="context-item" data-action="toggle-fav">
        <span class="context-icon">${isFav ? '★' : '☆'}</span> ${isFav ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
      </button>
    `;

    // Position context menu
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 260);
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add('visible');

    // Attach menu actions
    this.contextMenu.querySelectorAll('.context-item').forEach(item => {
      item.onclick = async () => {
        const action = item.getAttribute('data-action');
        if (action === 'copy-emoji') {
          await this.copyEmoji(emoji, name);
        } else if (action === 'copy-code') {
          await navigator.clipboard.writeText(code);
          this.showToast(`Código copiado: ${code}`);
        } else if (action === 'copy-html') {
          await navigator.clipboard.writeText(htmlEntity);
          this.showToast(`HTML copiado: ${htmlEntity}`);
        } else if (action === 'copy-name') {
          await navigator.clipboard.writeText(name);
          this.showToast(`Nombre copiado: ${name}`);
        } else if (action === 'toggle-fav') {
          this.toggleFavorite(emoji);
        }
        this.hideContextMenu();
      };
    });
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.classList.remove('visible');
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EmojiApp();
});
