/**
 * Four interlocking jigsaw pieces (2×2) drawn with gumdrops, one candy colour per piece.
 * Piece order is clockwise: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left.
 * Each piece has one tab and one blank (pinwheel), separated by a one-cell gap.
 *
 *   const puzzle = await renderPuzzle(el, { pieces: [{ label, colors: ['violet'] }, …] })
 *   puzzle.highlight(2)     // emphasise piece 2, dim the others
 *   puzzle.highlight(null)  // all pieces normal
 */
import { ready, candyPool, picker, candyImg } from './gumdrop.js'

// Tab template: rows = depth into the neighbouring piece (row 0 lies in the gap), columns = along the edge.
const TAB = [
  '.###.',
  '.###.',
  '#####',
  '#####',
  '#####',
  '.###.'
]

/** owner[r][c] = piece index or -1. `size` = cells per piece edge (odd keeps tabs centred). */
export function puzzleMask(size = 13) {
  const n = size * 2 + 1
  const mid = size // the gap row / column
  const owner = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => {
    if (r === mid || c === mid) return -1
    if (r < mid) return c < mid ? 0 : 1
    return c < mid ? 3 : 2
  }))

  const half = (size - 1) / 2
  const centre = Math.floor(TAB[0].length / 2)
  // [tab owner, receiving piece, centre along the edge (row or col), axis, direction]
  const edges = [
    { from: 0, to: 1, along: half, vertical: true, dir: +1 },             // TL -> right into TR
    { from: 1, to: 2, along: mid + 1 + half, vertical: false, dir: +1 },  // TR -> down into BR
    { from: 2, to: 3, along: mid + 1 + half, vertical: true, dir: -1 },   // BR -> left into BL
    { from: 3, to: 0, along: half, vertical: false, dir: -1 }             // BL -> up into TL
  ]

  for (const edge of edges) {
    const tabCells = []
    TAB.forEach((bits, depth) => {
      for (let i = 0; i < bits.length; i++) {
        if (bits[i] !== '#') continue
        const a = edge.along + i - centre
        const d = mid + edge.dir * depth
        tabCells.push(edge.vertical ? [a, d] : [d, a])
      }
    })
    const isTab = new Set(tabCells.map(([r, c]) => `${r},${c}`))
    // 1-cell gap around the tab inside the receiving piece
    for (const [r, c] of tabCells) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc
        if (owner[rr]?.[cc] === edge.to && !isTab.has(`${rr},${cc}`)) owner[rr][cc] = -1
      }
    }
    for (const [r, c] of tabCells) owner[r][c] = edge.from
  }
  return owner
}

export async function renderPuzzle(host, { pieces, size = 13, onSelect = null } = {}) {
  await ready()
  const owner = puzzleMask(size)
  const n = owner.length
  const puzzle = document.createElement('div')
  puzzle.className = 'puzzle'
  puzzle.setAttribute('role', 'group')

  // Label area per piece: the inner part of its body, as 1-based grid lines.
  const near = [2, size]
  const far = [size + 3, n]
  const labelArea = [
    [near, near], [near, far], [far, far], [far, near]
  ]

  const layers = pieces.slice(0, 4).map((piece, index) => {
    const layer = document.createElement('div')
    layer.className = 'puzzle-piece gd-anim'
    layer.dataset.piece = String(index)
    layer.style.setProperty('--gd-cols', n)
    layer.style.setProperty('--gd-rows', n)
    // scale around the piece's own centre
    const [rows, cols] = labelArea[index]
    layer.style.transformOrigin = `${(((cols[0] + cols[1]) / 2 - 1) / n * 100).toFixed(1)}% ${(((rows[0] + rows[1]) / 2 - 1) / n * 100).toFixed(1)}%`

    const pick = picker(candyPool({ colors: piece.colors || null, classes: piece.classes || null }))
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (owner[r][c] === index) layer.appendChild(candyImg(pick(), r + 1, c + 1))
    }

    const label = document.createElement('div')
    label.className = 'puzzle-label'
    label.textContent = piece.label || ''
    label.style.gridArea = `${rows[0]} / ${cols[0]} / ${rows[1]} / ${cols[1]}`
    layer.appendChild(label)

    layer.setAttribute('aria-label', piece.label || `Piece ${index + 1}`)
    layer.addEventListener('click', () => onSelect?.(index))
    puzzle.appendChild(layer)
    return layer
  })

  host.replaceChildren(puzzle)
  return {
    element: puzzle,
    layers,
    highlight(index) {
      if (index === null || index === undefined || index < 0) delete puzzle.dataset.active
      else puzzle.dataset.active = String(index)
    }
  }
}
