/**
 * Gumdrop lettering: text (and arbitrary masks) drawn with candy images from `candyData`,
 * the same look as src/components/Animate.vue, but as plain ES module for presentation slides.
 *
 * Markup API (rendered by renderGumdrops(), which slide.js calls for you):
 *   <h1 data-gumdrop>Agenda</h1>                         headline (size from the tag)
 *   <h2 data-gumdrop data-gd-size="h2">Sub</h2>           explicit size: h1 | h2 | h3 | fill
 *   <p  data-gumdrop data-gd-align="center">Hi</p>        left (default) | center | right
 *   <li data-gumdrop data-gd-bullet>Design</li>           prepends one big candy as bullet
 *   <h2 data-gumdrop data-gd-colors="violet,green">…      only candies with exactly these colours
 *   <h2 data-gumdrop data-gd-classes="Himbeere">…         only these candy classes
 *   <h2 data-gumdrop data-gd-halo="off">…                 no soft halo behind the letters
 *   Line breaks: <br>. The original text stays available as aria-label.
 *
 * Sizing is fully relative: one cell = --gd-cell (container units of the slide); the grid is
 * capped at 100 % of its parent, so long words shrink instead of overflowing.
 */
import { GLYPHS, GLYPH_ROWS, normalizeText } from './glyphs.js'

const DATA_FILES = ['candy12.js', 'candy3.js', 'candyOOD.js']
const nonEmpty = (value) => Array.isArray(value) && value.length > 0

let dataPromise = null

const loadScript = (src) => new Promise((resolve, reject) => {
  const script = document.createElement('script')
  script.src = src
  script.async = false
  script.onload = resolve
  script.onerror = () => reject(new Error(`Could not load ${src}`))
  document.head.appendChild(script)
})

/**
 * Resolves with candyData. Inside the deck it is handed over by the parent page (no copy);
 * a slide opened on its own loads ../external/candy*.js itself.
 */
export function ready() {
  if (dataPromise) return dataPromise
  dataPromise = (async () => {
    if (nonEmpty(window.candyData)) return window.candyData
    try {
      if (window.parent !== window && nonEmpty(window.parent.candyData)) {
        window.candyData = window.parent.candyData
        return window.candyData
      }
    } catch { /* cross-origin parent: fall through */ }
    const base = new URL('../external/', import.meta.url)
    for (const file of DATA_FILES) await loadScript(new URL(file, base).href)
    // The data files declare top-level `const`s, reachable from global (indirect) eval only.
    window.candyData = (0, eval)('[].concat(candy12, candy3, candyOOD)')
    return window.candyData
  })()
  return dataPromise
}

// ---------------------------------------------------------------- candy images

const MIME = { iVBOR: 'image/png', '/9j/4': 'image/jpeg', UklGR: 'image/webp', R0lGO: 'image/gif' }
const urlCache = new Map()

/** Object URL for candyData row `index` (decoded once per page, shared by every <img>). */
export function candyUrl(index) {
  if (urlCache.has(index)) return urlCache.get(index)
  const base64 = window.candyData[index][9]
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: MIME[base64.slice(0, 5)] || 'image/png' }))
  urlCache.set(index, url)
  return url
}

const splitList = (value) => (value ? String(value).split(',').map((s) => s.trim()).filter(Boolean) : null)

/**
 * Row indices of candyData matching the filter.
 *   colors : ['violet', 'red+white']  exact colour combination (dataset index 1 joined with '+')
 *   classes: ['Himbeere']             class label (dataset index 2)
 * Falls back to all candies when nothing matches.
 */
export function candyPool({ colors = null, classes = null } = {}) {
  const data = window.candyData || []
  const all = data.map((_, i) => i)
  const pool = all.filter((i) => {
    const row = data[i]
    if (colors && !colors.includes(row[1].join('+'))) return false
    if (classes && !classes.includes(row[2])) return false
    return true
  })
  if (!pool.length && (colors || classes)) console.warn('[gumdrop] no candy matches', { colors, classes })
  return pool.length ? pool : all
}

/** Random picker over a pool that avoids repeating the same candy twice in a row. */
export function picker(pool) {
  let last = -1
  return () => {
    let index = pool[Math.floor(Math.random() * pool.length)]
    if (pool.length > 1 && index === last) index = pool[(pool.indexOf(index) + 1) % pool.length]
    last = index
    return index
  }
}

/** One candy <img> placed on grid lines (1-based, CSS grid-area order). */
export function candyImg(index, row, col, rowSpan = 1, colSpan = 1) {
  const img = document.createElement('img')
  img.className = 'gd-candy'
  img.src = candyUrl(index)
  img.alt = ''
  img.draggable = false
  img.decoding = 'async'
  img.style.gridArea = `${row} / ${col} / span ${rowSpan} / span ${colSpan}`
  img.dataset.candy = String(index)
  return img
}

// ---------------------------------------------------------------- layout

const BULLET_COLS = 4 // 3 columns candy + 1 gap

/**
 * Lays out text lines on a cell grid.
 * Returns { rows, cols, cells: [{ r, c }] (0-based), bullet: { r, c, span } | null }.
 */
export function layoutText(lines, { align = 'left', bullet = false, letterGap = 1, lineGap = 1 } = {}) {
  const indent = bullet ? BULLET_COLS : 0
  const laidOut = lines.map((line) => {
    const glyphs = normalizeText(line).split('').map((ch) => GLYPHS[ch])
    const width = glyphs.reduce((sum, g, i) => sum + g[0].length + (i ? letterGap : 0), 0)
    return { glyphs, width }
  })
  const textCols = Math.max(1, ...laidOut.map((l) => l.width))
  const cols = indent + textCols
  const rows = lines.length * GLYPH_ROWS + (lines.length - 1) * lineGap
  const cells = []
  laidOut.forEach(({ glyphs, width }, lineIndex) => {
    const top = lineIndex * (GLYPH_ROWS + lineGap)
    const free = textCols - width
    let x = indent + (align === 'center' ? Math.floor(free / 2) : align === 'right' ? free : 0)
    glyphs.forEach((glyph) => {
      glyph.forEach((rowBits, r) => {
        for (let c = 0; c < rowBits.length; c++) if (rowBits[c] === '#') cells.push({ r: top + r, c: x + c })
      })
      x += glyph[0].length + letterGap
    })
  })
  return { rows, cols, cells, bullet: bullet ? { r: 1, c: 0, span: 3 } : null }
}

/** Empty gumdrop grid of the given size (cells are added as explicitly placed grid items). */
export function createGrid(rows, cols, className = '') {
  const grid = document.createElement('div')
  grid.className = `gd-grid gd-anim ${className}`.trim()
  grid.setAttribute('aria-hidden', 'true')
  grid.style.setProperty('--gd-cols', cols)
  grid.style.setProperty('--gd-rows', rows)
  return grid
}

/**
 * Soft, organic band behind the letters: one round blob per lit cell (slightly larger than the
 * cell, so neighbours merge) in a layer that is blurred as a whole. It follows the letter
 * shapes instead of drawing a box. Colour / size / blur: --gd-halo-* in lib/theme.css.
 */
export function createHalo({ rows, cols, cells, bullet }) {
  const halo = document.createElement('div')
  halo.className = 'gd-halo'
  const blob = (r, c, span = 1) => {
    const dot = document.createElement('i')
    dot.style.gridArea = `${r + 1} / ${c + 1} / span ${span} / span ${span}`
    halo.appendChild(dot)
  }
  if (bullet) blob(bullet.r, bullet.c, bullet.span)
  cells.forEach(({ r, c }) => blob(r, c))
  return halo
}

/** Text lines of an element: <br> separates lines, whitespace is collapsed. */
function linesOf(el) {
  const lines = ['']
  el.childNodes.forEach((node) => {
    if (node.nodeName === 'BR') lines.push('')
    else lines[lines.length - 1] += node.textContent
  })
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/**
 * Renders `text` (string with '\n' or array of lines) into `el` as gumdrops.
 * Options: align, bullet, colors, classes.
 */
export async function gumdropText(el, text, opts = {}) {
  await ready()
  const lines = Array.isArray(text) ? text : String(text).split('\n')
  const layout = layoutText(lines, opts)
  const pick = picker(candyPool(opts))
  const grid = createGrid(layout.rows, layout.cols)
  if (opts.halo !== false) grid.appendChild(createHalo(layout))
  if (layout.bullet) {
    const { r, c, span } = layout.bullet
    grid.appendChild(candyImg(pick(), r + 1, c + 1, span, span))
  }
  for (const { r, c } of layout.cells) grid.appendChild(candyImg(pick(), r + 1, c + 1))
  el.classList.add('gd-host')
  el.setAttribute('aria-label', lines.join(' '))
  el.replaceChildren(grid)
  return grid
}

/** Renders every [data-gumdrop] element below `root` (once). */
export async function renderGumdrops(root = document) {
  await ready()
  const hosts = [...root.querySelectorAll('[data-gumdrop]:not(.gd-host)')]
  await Promise.all(hosts.map((el) => {
    const size = el.dataset.gdSize || ({ H1: 'h1', H2: 'h2' }[el.tagName] || 'h3')
    el.dataset.gdSize = size
    return gumdropText(el, linesOf(el), {
      align: el.dataset.gdAlign || 'left',
      bullet: el.hasAttribute('data-gd-bullet'),
      halo: el.dataset.gdHalo !== 'off',
      colors: splitList(el.dataset.gdColors),
      classes: splitList(el.dataset.gdClasses)
    })
  }))
}

/**
 * Candy bullets: every <ul> below `root` (except gumdrop lists and <ul data-bullets="plain">)
 * gets the class cb-list and one random candy per <li> as --cb-candy (drawn by slide.css).
 */
export async function renderCandyBullets(root = document) {
  await ready()
  const pick = picker(candyPool())
  root.querySelectorAll('ul:not(.gd-list):not(.cb-list):not([data-bullets="plain"])').forEach((ul) => {
    ul.classList.add('cb-list')
    for (const li of ul.children) li.style.setProperty('--cb-candy', `url("${candyUrl(pick())}")`)
  })
}

// ---------------------------------------------------------------- fly-in animation

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Puts every candy below `root` off-screen (no transition), ready for playGumdrops(). */
export function hideGumdrops(root = document) {
  if (reducedMotion()) return
  const candies = [...root.querySelectorAll('.gd-anim .gd-candy')]
  candies.forEach((img) => {
    const angle = Math.random() * 2 * Math.PI
    // Relative to the slide container: 140cqmax from anywhere is always outside the 4:3 frame.
    img.style.setProperty('--gd-dx', `calc(${Math.cos(angle).toFixed(3)} * 140cqmax)`)
    img.style.setProperty('--gd-dy', `calc(${Math.sin(angle).toFixed(3)} * 140cqmax)`)
  })
  root.querySelectorAll('.gd-anim').forEach((el) => {
    el.classList.remove('gd-in')
    el.classList.add('gd-out')
  })
}

/** Flies every candy below `root` in from a random direction, staggered over ~1 s (like Animate.vue). */
export function playGumdrops(root = document, { duration = 1, spread = 1 } = {}) {
  if (reducedMotion()) return
  hideGumdrops(root)
  const candies = [...root.querySelectorAll('.gd-anim .gd-candy')]
  const order = candies.map((_, i) => i).sort(() => Math.random() - 0.5)
  order.forEach((candyIndex, rank) => {
    candies[candyIndex].style.setProperty('--gd-delay', `${((rank / candies.length) * spread).toFixed(3)}s`)
    candies[candyIndex].style.setProperty('--gd-duration', `${duration}s`)
  })
  void document.body.offsetWidth // commit the off-screen state before transitioning back
  requestAnimationFrame(() => {
    root.querySelectorAll('.gd-anim').forEach((el) => {
      el.classList.remove('gd-out')
      el.classList.add('gd-in')
    })
  })
}
