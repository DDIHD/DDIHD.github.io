/**
 * Helpers for showing exported web apps inside the presentation, shared by the deck
 * (app slides) and by slides that embed an app as part of their body (lib/embed.js → embedApp).
 *
 *   <iframe class="title-anim" title="Animation"></iframe>
 *   import { embedApp } from '../lib/embed.js'
 *   embedApp(document.querySelector('.title-anim'), 'animate')
 *
 * The app must be listed in the slide's deck.config.js entry (`apps: ['animate']`) so the build
 * copies it to apps/<name>.html and loads its datasets.
 */
const LIB = new URL('./', import.meta.url)

/** Data globals that are handed to app iframes by reference (loaded once by index.html). */
export const SHARED_GLOBALS = ['candyData', 'butterflyData', 'pokemonData']

const isEmpty = (v) => v === undefined || v === null || (Array.isArray(v) && v.length === 0)

export function shareGlobals(from, to, names = SHARED_GLOBALS) {
  for (const name of names) {
    let value
    try { value = from[name] } catch { continue }
    if (!isEmpty(value) && isEmpty(to[name])) to[name] = value
  }
}

/** Presentation-only CSS overrides for the apps (lib/apps.css), e.g. hidden view navigators. */
export function injectAppStyles(doc) {
  const link = doc.createElement('link')
  link.rel = 'stylesheet'
  link.href = new URL('apps.css', LIB).href
  link.dataset.deck = 'app-overrides'
  doc.head.appendChild(link)
}

/** Paints the app's own white surfaces in `bg` (the deck's --slide-bg). */
export function matchBackground(doc, bg) {
  if (!bg) return
  const style = doc.createElement('style')
  style.dataset.deck = 'match-background'
  style.textContent = `* { --color-surface: ${bg} !important; }
    html, body, .app-container-shell, .app-stage { background: ${bg} !important; }`
  doc.head.appendChild(style)
}

/** Code libraries go into the app's own window (cross-realm `instanceof` checks, see GUIDELINES §15). */
export function injectScripts(doc, scripts, base = document.baseURI) {
  for (const src of scripts) {
    const script = doc.createElement('script')
    script.src = new URL(src, base).href
    script.async = false // keep the declared load order
    doc.head.appendChild(script)
  }
}

const isEditable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** The deck manifest of the surrounding deck (null when the slide is opened on its own). */
function deckManifest() {
  try {
    const node = window.parent.document.getElementById('deck-manifest')
    return node ? JSON.parse(node.textContent) : null
  } catch { return null }
}

/**
 * Loads apps/<name>.html into `frame` as part of a slide: shares the data globals, injects the
 * app's code libraries and lib/apps.css, matches the slide background and forwards keys to the
 * slide (so deck navigation keeps working when the app has focus).
 */
export async function embedApp(frame, name, { background = true } = {}) {
  const { ready } = await import('./gumdrop.js')
  await ready() // candyData is in this window before the app starts polling for it
  const manifest = deckManifest()
  const scripts = manifest?.embeds?.[name] || []
  const base = new URL('../', LIB).href // dist/presentation/
  frame.addEventListener('load', () => {
    const win = frame.contentWindow
    const doc = frame.contentDocument
    if (!win || !doc || win.location.href === 'about:blank') return
    shareGlobals(window, win)
    injectAppStyles(doc)
    if (background) matchBackground(doc, getComputedStyle(document.documentElement).getPropertyValue('--slide-bg').trim())
    injectScripts(doc, scripts, base)
    win.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || isEditable(event.target)) return
      window.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, bubbles: true }))
    })
  })
  frame.src = new URL(`apps/${name}.html`, base).href
}
