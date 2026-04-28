;(function () {
  "use strict"

  const EDGE_NORMALIZER = Math.sqrt(1020 * 1020 + 1020 * 1020)
  const TWO_PI = Math.PI * 2

  function toDataUrl(base64Image) {
    if (typeof base64Image !== "string" || base64Image.trim() === "") {
      throw new Error("base64 image string is required")
    }

    const trimmed = base64Image.trim()
    if (trimmed.startsWith("data:image/")) {
      return trimmed
    }

    // Default to jpeg to match current project usage in Sort.vue.
    return `data:image/jpeg;base64,${trimmed}`
  }

  function loadImageFromBase64(base64Image) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("could not decode base64 image"))
      img.src = toDataUrl(base64Image)
    })
  }

  async function getImageData(base64Image) {
    const img = await loadImageFromBase64(base64Image)
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      throw new Error("2D canvas context unavailable")
    }

    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }

  function getBorderBackgroundColor(rgba, width, height) {
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let count = 0

    for (let x = 0; x < width; x++) {
      const top = x * 4
      const bottom = ((height - 1) * width + x) * 4
      sumR += rgba[top]
      sumG += rgba[top + 1]
      sumB += rgba[top + 2]
      sumR += rgba[bottom]
      sumG += rgba[bottom + 1]
      sumB += rgba[bottom + 2]
      count += 2
    }

    for (let y = 1; y < height - 1; y++) {
      const left = (y * width) * 4
      const right = (y * width + (width - 1)) * 4
      sumR += rgba[left]
      sumG += rgba[left + 1]
      sumB += rgba[left + 2]
      sumR += rgba[right]
      sumG += rgba[right + 1]
      sumB += rgba[right + 2]
      count += 2
    }

    if (count === 0) return { r: 255, g: 255, b: 255 }
    return { r: sumR / count, g: sumG / count, b: sumB / count }
  }

  function getSaturation01(r, g, b) {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === 0) return 0
    return (max - min) / max
  }

  function buildObjectMask(imageData) {
    const { data, width, height } = imageData
    const bg = getBorderBackgroundColor(data, width, height)
    const mask = new Uint8Array(width * height)
    let objectCount = 0
    const bgLuma = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b

    for (let i = 0; i < width * height; i++) {
      const p = i * 4
      const r = data[p]
      const g = data[p + 1]
      const b = data[p + 2]
      const a = data[p + 3]

      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      const sat = getSaturation01(r, g, b)

      const dr = r - bg.r
      const dg = g - bg.g
      const db = b - bg.b
      const colorDistance = Math.sqrt(dr * dr + dg * dg + db * db)

      const isObject = a > 10 && (colorDistance > 25 || sat > 0.12 || luma < bgLuma - 15)
      if (isObject) {
        mask[i] = 1
        objectCount++
      }
    }

    // Fallback: if segmentation fails, use all visible pixels.
    if (objectCount === 0) {
      for (let i = 0; i < width * height; i++) {
        if (data[i * 4 + 3] > 10) {
          mask[i] = 1
          objectCount++
        }
      }
    }

    return { mask, objectCount }
  }

  function rgbToHue01(r, g, b) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const numerator = 0.5 * ((rn - gn) + (rn - bn))
    const denominator = Math.sqrt((rn - gn) * (rn - gn) + (rn - bn) * (gn - bn))

    if (denominator === 0) return 0

    const ratio = Math.max(-1, Math.min(1, numerator / denominator))
    let hue = Math.acos(ratio)
    if (bn > gn) hue = TWO_PI - hue
    return hue / TWO_PI
  }

  function rgbToYuv(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const u = -0.14713 * r - 0.28886 * g + 0.436 * b
    const v = 0.615 * r - 0.51499 * g - 0.10001 * b
    return { y, u, v }
  }

  function rgbToGray(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b
  }

  async function computeFarbe(base64Image) {
    const imageData = await getImageData(base64Image)
    const { data, width, height } = imageData
    const { mask, objectCount } = buildObjectMask(imageData)
    if (objectCount === 0) return 0

    // Circular mean for hue angles to avoid wrap-around artifacts.
    let sumSin = 0
    let sumCos = 0
    for (let i = 0; i < width * height; i++) {
      if (!mask[i]) continue
      const p = i * 4
      const hue01 = rgbToHue01(data[p], data[p + 1], data[p + 2])
      const angle = hue01 * TWO_PI
      sumSin += Math.sin(angle)
      sumCos += Math.cos(angle)
    }

    let meanAngle = Math.atan2(sumSin, sumCos)
    if (meanAngle < 0) meanAngle += TWO_PI
    return meanAngle / TWO_PI
  }

  async function computeFlaeche(base64Image) {
    const imageData = await getImageData(base64Image)
    const { objectCount } = buildObjectMask(imageData)
    return objectCount
  }

  async function computeKreis(base64Image) {
    const imageData = await getImageData(base64Image)
    const { width, height } = imageData
    const { mask, objectCount } = buildObjectMask(imageData)
    if (objectCount === 0) return 4 * Math.PI

    let boundaryPoints = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (!mask[idx]) continue

        const up = y > 0 ? mask[(y - 1) * width + x] : 0
        const down = y < height - 1 ? mask[(y + 1) * width + x] : 0
        const left = x > 0 ? mask[y * width + (x - 1)] : 0
        const right = x < width - 1 ? mask[y * width + (x + 1)] : 0

        if (!(up && down && left && right)) {
          boundaryPoints++
        }
      }
    }

    const value = (boundaryPoints * boundaryPoints) / objectCount
    return Math.max(4 * Math.PI, value)
  }

  async function computeKanten(base64Image) {
    const imageData = await getImageData(base64Image)
    const { data, width, height } = imageData
    const pixelCount = width * height
    if (pixelCount === 0) return 0

    const gray = new Float32Array(pixelCount)
    for (let i = 0; i < pixelCount; i++) {
      const p = i * 4
      gray[i] = rgbToGray(data[p], data[p + 1], data[p + 2])
    }

    let edgeSum = 0
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i00 = (y - 1) * width + (x - 1)
        const i01 = (y - 1) * width + x
        const i02 = (y - 1) * width + (x + 1)
        const i10 = y * width + (x - 1)
        const i12 = y * width + (x + 1)
        const i20 = (y + 1) * width + (x - 1)
        const i21 = (y + 1) * width + x
        const i22 = (y + 1) * width + (x + 1)

        const gx =
          -gray[i00] + gray[i02] +
          -2 * gray[i10] + 2 * gray[i12] +
          -gray[i20] + gray[i22]

        const gy =
          gray[i00] + 2 * gray[i01] + gray[i02] +
          -gray[i20] - 2 * gray[i21] - gray[i22]

        edgeSum += Math.sqrt(gx * gx + gy * gy)
      }
    }

    return (edgeSum / pixelCount) / EDGE_NORMALIZER
  }

  async function computeVarianz(base64Image) {
    const imageData = await getImageData(base64Image)
    const { data, width, height } = imageData
    const { mask, objectCount } = buildObjectMask(imageData)
    if (objectCount === 0) return 0

    let mean = 0
    for (let i = 0; i < width * height; i++) {
      if (!mask[i]) continue
      const p = i * 4
      mean += rgbToGray(data[p], data[p + 1], data[p + 2])
    }
    mean /= objectCount

    let variance = 0
    for (let i = 0; i < width * height; i++) {
      if (!mask[i]) continue
      const p = i * 4
      const g = rgbToGray(data[p], data[p + 1], data[p + 2])
      const d = g - mean
      variance += d * d
    }
    variance /= objectCount

    // Requested metric is standard deviation of grayscale intensities.
    return Math.sqrt(variance) / 255
  }

  async function computeEntropie(base64Image, bins = 32) {
    const imageData = await getImageData(base64Image)
    const { data, width, height } = imageData
    const { mask, objectCount } = buildObjectMask(imageData)
    if (objectCount === 0) return 0

    const safeBins = Math.max(4, Math.floor(bins))
    const hist = new Uint32Array(safeBins * safeBins)

    // U in ~[-111, 111], V in ~[-156, 156] for RGB in [0,255]
    const uMin = -112
    const uMax = 112
    const vMin = -157
    const vMax = 157

    for (let i = 0; i < width * height; i++) {
      if (!mask[i]) continue
      const p = i * 4
      const { u, v } = rgbToYuv(data[p], data[p + 1], data[p + 2])

      const uNorm = (u - uMin) / (uMax - uMin)
      const vNorm = (v - vMin) / (vMax - vMin)

      const ub = Math.max(0, Math.min(safeBins - 1, Math.floor(uNorm * safeBins)))
      const vb = Math.max(0, Math.min(safeBins - 1, Math.floor(vNorm * safeBins)))
      hist[ub * safeBins + vb]++
    }

    let entropy = 0
    for (let i = 0; i < hist.length; i++) {
      if (hist[i] === 0) continue
      const p = hist[i] / objectCount
      entropy -= p * Math.log2(p)
    }

    // Normalize to [0,1] by max entropy of the 2D histogram.
    const maxEntropy = Math.log2(safeBins * safeBins)
    return maxEntropy > 0 ? entropy / maxEntropy : 0
  }

  async function computeHelligkeit(base64Image) {
    const imageData = await getImageData(base64Image)
    const { data, width, height } = imageData
    const { mask, objectCount } = buildObjectMask(imageData)
    if (objectCount === 0) return 0

    let sum = 0
    for (let i = 0; i < width * height; i++) {
      if (!mask[i]) continue
      const p = i * 4
      sum += rgbToGray(data[p], data[p + 1], data[p + 2])
    }

    return (sum / objectCount) / 255
  }

  async function computeAllFeatures(base64Image) {
    const [
      farbe,
      flaeche,
      kreis,
      kanten,
      varianz,
      entropie,
      helligkeit
    ] = await Promise.all([
      computeFarbe(base64Image),
      computeFlaeche(base64Image),
      computeKreis(base64Image),
      computeKanten(base64Image),
      computeVarianz(base64Image),
      computeEntropie(base64Image),
      computeHelligkeit(base64Image)
    ])

    return { farbe, flaeche, kreis, kanten, varianz, entropie, helligkeit }
  }

  const api = {
    computeFarbe,
    computeFlaeche,
    computeKreis,
    computeKanten,
    computeVarianz,
    computeEntropie,
    computeHelligkeit,
    computeAllFeatures
  }

  window.mlutils = api
  window.computeFarbe = computeFarbe
  window.computeFlaeche = computeFlaeche
  window.computeKreis = computeKreis
  window.computeKanten = computeKanten
  window.computeVarianz = computeVarianz
  window.computeEntropie = computeEntropie
  window.computeHelligkeit = computeHelligkeit
  window.computeAllFeatures = computeAllFeatures
})()
