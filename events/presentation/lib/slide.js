/**
 * Slide runtime. Every slide page does:
 *
 *   <script type="module">
 *     import { initSlide } from '../lib/slide.js'
 *     const slide = initSlide()                // initSlide({ animate: true }) = candies fly in on enter
 *     slide.steps(4, (step) => { … })   // optional: in-slide steps consumed before the deck advances
 *     slide.onEnter((info) => { … })    // optional: info = { index, total, direction }
 *   </script>
 *
 * Talks to the deck (index.html) through `window.__deck`, which the deck calls when the slide
 * becomes visible / hidden and before it changes slides (next/prev may be consumed by steps).
 * The slide announces itself with `parent.__deckHost.register(window)` once __deck exists.
 * Opened on its own (no deck around it), the slide enters itself and handles arrow keys.
 */
import { renderGumdrops, renderCandyBullets, hideGumdrops, playGumdrops } from './gumdrop.js'

const isInDeck = (() => {
  try { return window.parent !== window && Boolean(window.parent.__deckHost) } catch { return false }
})()

export function initSlide({ animate = false } = {}) {
  const enterHandlers = []
  const leaveHandlers = []
  let active = false
  let rendered = false
  let stepper = null

  const ready = Promise.all([renderGumdrops(), renderCandyBullets()]).then(() => {
    rendered = true
    if (!animate) return
    if (active) playGumdrops()
    else hideGumdrops()
  })

  const setStep = (step) => {
    stepper.step = Math.max(0, Math.min(stepper.count, step))
    document.documentElement.dataset.step = String(stepper.step)
    stepper.render(stepper.step)
  }

  const enter = (info = {}) => {
    active = true
    document.querySelectorAll('[data-slide-number]').forEach((el) => {
      el.textContent = info.index ? `${info.index} / ${info.total}` : ''
    })
    if (stepper) setStep(info.direction < 0 ? stepper.count : 0)
    if (rendered && animate) playGumdrops()
    enterHandlers.forEach((fn) => fn(info))
  }

  const leave = () => {
    active = false
    leaveHandlers.forEach((fn) => fn())
  }

  window.__deck = {
    enter,
    leave,
    next: () => (stepper && stepper.step < stepper.count ? (setStep(stepper.step + 1), true) : false),
    prev: () => (stepper && stepper.step > 0 ? (setStep(stepper.step - 1), true) : false)
  }

  if (isInDeck) {
    // The deck calls enter() right away if this slide is already the visible one.
    window.parent.__deckHost.register(window)
  } else {
    document.documentElement.dataset.standalone = ''
    const start = () => enter({ direction: 1 })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
    else start()
    window.addEventListener('keydown', (event) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) window.__deck.next()
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) window.__deck.prev()
    })
  }

  return {
    ready,
    isActive: () => active,
    onEnter: (fn) => enterHandlers.push(fn),
    onLeave: (fn) => leaveHandlers.push(fn),
    /** Declares `count` steps (state 0 = nothing revealed). render(step) is called on every change. */
    steps(count, render) {
      stepper = { count, render, step: 0 }
      setStep(0)
      return { go: setStep, get step() { return stepper.step } }
    },
    replay: () => playGumdrops()
  }
}
