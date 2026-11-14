/**
 * Deck runtime: shows one slide (an iframe) at a time inside the 4:3 stage.
 *
 * - The manifest (generated from deck.config.js) is inlined as <script id="deck-manifest">.
 * - Data globals (candyData, …) are loaded ONCE by index.html and handed to every iframe by
 *   reference. Code libraries an app needs (tf.min.js, ImageTrainer.js, …) are injected into
 *   that app's own iframe (same URL, so the browser cache serves them): TensorFlow and friends
 *   do `instanceof` checks that fail across windows.
 * - Neighbouring slides are preloaded, distant ones unloaded (unless `keepAlive`).
 *
 * Keys: → ↓ PageDown Space N = next · ← ↑ PageUp P = previous · Home / End
 *       F = fullscreen · B or . = blank screen · <number> Enter = go to slide
 */
import { shareGlobals, injectScripts, injectAppStyles, matchBackground } from '../lib/embed.js'

const manifest = JSON.parse(document.getElementById('deck-manifest').textContent)
const slides = manifest.slides
const stage = document.getElementById('deck-stage')
const body = document.body
const PRELOAD = manifest.preload ?? 1

const frames = new Map() // slide index -> iframe
const windows = new Map() // slide window -> slide index (for slides that registered themselves)
let current = -1
let entered = -1 // slide whose enter() has run for the current visit
let lastDirection = 1
let digitBuffer = ''

// ------------------------------------------------------------------ slide <-> deck handshake

window.__deckHost = {
  /** Called by lib/slide.js once window.__deck exists. */
  register(win) {
    for (const [index, frame] of frames) {
      if (frame.contentWindow === win) {
        windows.set(win, index)
        if (index === current) enterSlide(index)
      }
    }
  }
}

const slideApi = (index) => {
  try { return frames.get(index)?.contentWindow?.__deck || null } catch { return null }
}

function enterSlide(index) {
  const api = slideApi(index)
  if (!api?.enter || entered === index) return
  entered = index
  api.enter({ index: index + 1, total: slides.length, direction: lastDirection })
}

// ------------------------------------------------------------------ iframe lifecycle

function createFrame(index) {
  const slide = slides[index]
  const frame = document.createElement('iframe')
  frame.className = 'deck-frame'
  frame.title = slide.title || `Slide ${index + 1}`
  frame.setAttribute('allow', 'fullscreen; camera; microphone')
  frame.dataset.index = String(index)
  frame.addEventListener('load', () => {
    const win = frame.contentWindow
    if (!win || win.location.href === 'about:blank') return
    const doc = frame.contentDocument
    shareGlobals(window, win, manifest.shared)
    if (slide.app) injectAppStyles(doc) // lib/apps.css: presentation-only overrides for the apps
    if (slide.matchBackground) {
      matchBackground(doc, getComputedStyle(document.documentElement).getPropertyValue('--slide-bg').trim())
    }
    injectScripts(doc, slide.scripts || [])
    win.addEventListener('keydown', (event) => onKey(event, true))
    frame.dataset.loaded = ''
    if (index === current) enterSlide(index)
  })
  frame.src = slide.src
  stage.insertBefore(frame, stage.querySelector('.deck-blank'))
  frames.set(index, frame)
  return frame
}

function syncFrames() {
  for (let i = 0; i < slides.length; i++) {
    // lazy slides (e.g. apps that start the camera on load) only live while they are on screen
    const wanted = slides[i].lazy ? i === current : Math.abs(i - current) <= PRELOAD || slides[i].keepAlive
    if (wanted && !frames.has(i)) createFrame(i)
    if (!wanted && frames.has(i)) {
      const frame = frames.get(i)
      for (const [win, idx] of windows) if (idx === i) windows.delete(win)
      frame.src = 'about:blank'
      frame.remove()
      frames.delete(i)
    }
  }
}

// ------------------------------------------------------------------ navigation

function show(index, direction = 1) {
  index = Math.max(0, Math.min(slides.length - 1, index))
  if (index === current) return
  const previous = current
  lastDirection = direction
  current = index

  if (previous >= 0) slideApi(previous)?.leave?.()
  entered = -1
  // Keyboard focus may sit inside the outgoing iframe; take it back so the deck keeps receiving keys.
  if (document.activeElement instanceof HTMLIFrameElement) document.activeElement.blur()
  window.focus()

  syncFrames()
  for (const [i, frame] of frames) {
    const active = i === current
    frame.classList.toggle('is-active', active)
    frame.inert = !active
  }
  if (frames.get(current)?.dataset.loaded !== undefined) enterSlide(current)

  updateNav()
  history.replaceState(null, '', `#${current + 1}`)
  document.title = `${manifest.title} · ${current + 1}/${slides.length}`
}

function next() {
  if (slideApi(current)?.next?.()) return updateNav()
  show(current + 1, 1)
}

function prev() {
  if (slideApi(current)?.prev?.()) return updateNav()
  show(current - 1, -1)
}

function toggleFullscreen() {
  const root = document.documentElement
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document)
  } else {
    (root.requestFullscreen || root.webkitRequestFullscreen).call(root)
  }
}

const isEditable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

function onKey(event, fromFrame = false) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (fromFrame && (event.defaultPrevented || isEditable(event.target))) return
  const key = event.key
  // Inside a slide/app, Space and Enter belong to the focused control (buttons etc.).
  if (fromFrame && (key === ' ' || key === 'Enter')) return

  let handled = true
  if (/^[0-9]$/.test(key)) digitBuffer += key
  else if (key === 'Enter' && digitBuffer) {
    show(Number(digitBuffer) - 1, Number(digitBuffer) - 1 >= current ? 1 : -1)
    digitBuffer = ''
  } else {
    digitBuffer = ''
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'n', 'Enter'].includes(key)) next()
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'p'].includes(key)) prev()
    else if (key === 'Home') show(0, -1)
    else if (key === 'End') show(slides.length - 1, 1)
    else if (key === 'f' || key === 'F') toggleFullscreen()
    else if (key === 'b' || key === 'B' || key === '.') body.classList.toggle('is-blank')
    else if (key === 'Escape') body.classList.remove('is-blank')
    else handled = false
  }
  if (handled) event.preventDefault()
}

function indexFromHash() {
  const n = parseInt(location.hash.replace(/^#\/?/, ''), 10)
  return Number.isFinite(n) ? n - 1 : 0
}

/** Disable the arrow buttons at the very start / end (in-slide steps count as "not at the end"). */
function updateNav() {
  let step = 0, steps = false
  try {
    const root = frames.get(current)?.contentDocument?.documentElement
    step = Number(root?.dataset.step || 0)
    steps = root?.dataset.step !== undefined
  } catch { /* not loaded yet */ }
  document.querySelector('[data-deck-nav="prev"]').disabled = current <= 0 && step <= 0
  document.querySelector('[data-deck-nav="next"]').disabled = current >= slides.length - 1 && !steps
}

function start() {
  body.classList.add('is-ready')
  document.querySelectorAll('[data-deck-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.deckNav === 'next') next()
      else prev()
      button.blur() // keep Space / Enter for the deck, not for the button
    })
  })
  window.addEventListener('keydown', (event) => onKey(event))
  window.addEventListener('hashchange', () => {
    const target = indexFromHash()
    if (target !== current) show(target, target > current ? 1 : -1)
  })
  show(indexFromHash(), 1)
}

// The data scripts are deferred and candyData.js aggregates on `load`: wait for it.
if (document.readyState === 'complete') start()
else window.addEventListener('load', start, { once: true })
