# ✨ Emoji Hub — Unicode Emojis Oficiales

Una aplicación web moderna, rápida y responsiva diseñada para desplegarse fácilmente en **GitHub Pages**. Extrae la lista oficial de emojis de Unicode ([Unicode Full Emoji List](https://unicode.org/emoji/charts/full-emoji-list.html)), los organiza en **rejillas compactas** por categoría y subcategoría, y permite **copiarlos al portapapeles con un solo clic**.

---

## 🚀 Características Principales

- 🔄 **Sincronización en vivo cada vez que se abre la página**:
  - Al abrirse en el navegador, la aplicación se conecta a la fuente oficial `https://unicode.org/emoji/charts/full-emoji-list.html` para comprobar y cargar los últimos emojis añadidos.
  - Cuenta con un sistema multi-proxy CORS de alta velocidad y fallback a la especificación oficial UTS #51 y a una copia local verificada para garantizar funcionamiento ininterrumpido incluso sin conexión.
- 📋 **Copiar al portapapeles con un clic**:
  - Haz clic en cualquier emoji para copiarlo instantáneamente.
  - Notificación visual (Toast) elegante y microanimación en la celda pulsada.
  - Efecto de sonido sutil opcional (generado con Web Audio API, sin dependencias externas).
  - Clic derecho o pulsación larga para copiar código Unicode (`U+1F600`), entidad HTML (`&#x1F600;`), nombre CLDR o añadir a favoritos.
- 📐 **Rejillas compactas y personalizables**:
  - Selector de densidad: **Compacto** (máximo aprovechamiento del espacio), **Normal** y **Grande**.
  - Organizados por las 10 categorías oficiales de Unicode (Smileys & Emotion, People & Body, Animals & Nature, Food & Drink, Travel & Places, Activities, Objects, Symbols, Flags, Component).
  - Subcategorías organizadas con etiquetas claras.
- 🔍 **Búsqueda instantánea en tiempo real**:
  - Filtra por nombre, categoría, subcategoría o código Unicode.
  - Atajo de teclado: presiona `/` en cualquier momento para ir a la barra de búsqueda.
- 🕒 **Historial y Favoritos**:
  - Barra de emojis copiados recientemente persistida en `localStorage`.
  - Sección de favoritos para guardar tus emojis más usados.
- 🌓 **Modo Oscuro / Claro**:
  - Detecta automáticamente el tema del sistema y permite alternarlo con un botón.
- ⚡ **Rendimiento ultra optimizado**:
  - Utiliza `content-visibility: auto` para diferir el renderizado de categorías fuera de pantalla, cargando en milisegundos y con consumo mínimo de memoria.

---

## 🌐 Cómo desplegar en GitHub Pages

Esta aplicación es 100% estática (HTML, CSS y JavaScript moderno), por lo que funciona directamente en GitHub Pages sin necesidad de compilación previa ni servidores.

### Método 1: Despliegue directo desde la rama (Más rápido, 1 minuto)

1. Sube este repositorio a GitHub:
   ```bash
   git add .
   git commit -m "feat: emoji hub initial release"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```
2. En GitHub, entra en tu repositorio y ve a **Settings** (Configuración) &rarr; **Pages** (en el menú lateral izquierdo).
3. En la sección **Build and deployment**:
   - **Source**: selecciona `Deploy from a branch`.
   - **Branch**: selecciona `main` y la carpeta `/(root)`.
   - Haz clic en **Save** (Guardar).
4. En 1-2 minutos tu página estará disponible en:
   `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

### Método 2: Despliegue con GitHub Actions (Automático)

El proyecto ya incluye el flujo configurado en `.github/workflows/deploy.yml`. Si prefieres usar Actions:
1. En **Settings** &rarr; **Pages**, en **Source** selecciona `GitHub Actions`.
2. Cada vez que hagas `git push` a la rama `main`, GitHub Pages se actualizará automáticamente.

---

## 💻 Ejecución en local

Puedes probar la aplicación en tu máquina local usando cualquier servidor estático:

### Con Python:
```bash
python3 -m http.server 8080
```
Abre en tu navegador: [http://localhost:8080](http://localhost:8080)

### Con Node.js (npx):
```bash
npx serve .
```

---

## 🔄 Actualización manual del snapshot de respaldo

Si deseas refrescar la copia local `data/emojis.json` directamente desde tu terminal:
```bash
node scripts/update-emojis.js
```

---

## 📁 Estructura del Proyecto

```
emojis/
├── index.html                  # Página principal
├── css/
│   └── styles.css              # Estilos, rejillas compactas y temas
├── js/
│   ├── app.js                  # Lógica de la app, búsqueda y portapapeles
│   ├── parser.js               # Parser oficial para HTML y TXT de Unicode
│   └── sync.js                 # Motor de sincronización en vivo con unicode.org
├── data/
│   └── emojis.json             # Respaldo inicial verificado de Unicode 16.0
├── scripts/
│   └── update-emojis.js        # Script de actualización por consola
├── .github/
│   └── workflows/
│       └── deploy.yml          # Flujo de despliegue para GitHub Actions
└── README.md                   # Documentación completa
```

---

## 📜 Licencia
Datos de emojis propiedad de Unicode®, Inc. ([Términos de uso de Unicode](https://www.unicode.org/terms_of_use.html)).
Código fuente disponible bajo la licencia MIT.
