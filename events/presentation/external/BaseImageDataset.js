class BaseImageDataset {
  constructor({ original_dataset, target, strat = null, train_test_split = 0.8 } = {}) {
    if (!Array.isArray(original_dataset)) {
      throw new Error("original_dataset must be an array.")
    }
    this.original_dataset = original_dataset
    this.dataset = original_dataset
    this.target = target
    this.strat = strat
    this.train_test_split = typeof train_test_split === "number" ? train_test_split : 0.8

    this.selectedIndices = []
    this.inputIndices = []
    this.indexToPosition = new Map()
    this.trainIndices = []
    this.testIndices = []
    this.x = null
    this.y = null
    this.targetIndexToValue = new Map()
    this.targetValueToIndex = new Map()
    this.isInitialized = false
    this.currentStage = "created"

    this.counter = 0
  }

  bumpCounter() {
    this.counter += 1
  }

  async init() {
    this.selectedIndices = this.buildIndexSelection()
    this.applySplit()
    this.buildTargetTensor()
    this.finalizeInitialization()
  }

  finalizeInitialization() {
    this.dataset = this.selectedIndices.map((rowIndex) => this.original_dataset[rowIndex])
    this.isInitialized = true
    this.currentStage = "initialized"
    this.bumpCounter()
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init()
    }
    return this
  }

  async prepareForTraining() {
    await this.ensureInitialized()
    this.currentStage = "ready_for_training"
    this.bumpCounter()
    return this
  }

  getSummary() {
    return {
      selected: this.selectedIndices.length,
      train: this.trainIndices.length,
      test: this.testIndices.length,
      classes: this.targetValueToIndex.size,
      target: this.target,
      strat: this.strat
    }
  }

  buildIndexSelection() {
    return Array.from({ length: this.original_dataset.length }, (_, index) => index)
  }

  applySplit() {
    if (this.strat === "train") {
      this.trainIndices = [...this.selectedIndices]
      this.testIndices = [...this.selectedIndices]
      return
    }
    if (this.strat == null) {
      this.randomSplit()
      return
    }
    this.stratifiedSplit(this.strat)
  }

  randomSplit() {
    const indices = this.selectedIndices.slice()
    this.shuffleArray(indices)
    const testCount = this.ensureTestCount(indices.length)
    this.testIndices = indices.slice(0, testCount)
    this.trainIndices = indices.slice(testCount)
  }

  stratifiedSplit(strat) {
    const stratIndex = this.resolveStratIndex(strat)
    const groups = new Map()

    this.selectedIndices.forEach((rowIndex) => {
      const value = this.original_dataset[rowIndex]?.[stratIndex]
      const key = String(value)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(rowIndex)
    })

    this.trainIndices = []
    this.testIndices = []

    groups.forEach((indices) => {
      this.shuffleArray(indices)
      const testCount = this.ensureTestCount(indices.length)
      const testSubset = indices.slice(0, testCount)
      const trainSubset = indices.slice(testCount)
      this.testIndices.push(...testSubset)
      this.trainIndices.push(...trainSubset)
    })
  }

  ensureTestCount(total) {
    if (total <= 1) {
      return total
    }
    const testCount = Math.floor(total * (1 - this.train_test_split))
    return Math.max(testCount, 1)
  }

  buildTargetTensor() {
    const targetIndex = this.resolveTargetIndex(this.target)
    this.inputIndices = this.selectedIndices.slice()
    this.indexToPosition = this.buildIndexToPosition(this.inputIndices)

    const values = this.inputIndices.map((rowIndex) => {
      return this.original_dataset[rowIndex]?.[targetIndex]
    })
    const uniqueValues = Array.from(new Set(values.map((value) => String(value))))

    this.targetValueToIndex = new Map(
      uniqueValues.map((value, index) => [value, index])
    )
    this.targetIndexToValue = new Map(
      uniqueValues.map((value, index) => [index, value])
    )

    const oneHotRows = values.map((value) => {
      const normalized = String(value)
      const classIndex = this.targetValueToIndex.get(normalized)
      const row = new Array(uniqueValues.length).fill(0)
      row[classIndex] = 1
      return row
    })

    if (this.y && typeof this.y.dispose === "function") {
      this.y.dispose()
    }
    this.y = tf.tensor2d(oneHotRows)
    this.bumpCounter()
  }

  getLabelForIndex(datasetIndex, targetName = this.target, fallbackMap = new Map()) {
    if (!Number.isInteger(datasetIndex) || datasetIndex < 0) {
      return "-"
    }
    const row = this.original_dataset?.[datasetIndex]
    if (!row) {
      return "-"
    }
    try {
      const targetIndex = this.resolveTargetIndex(targetName)
      const value = row[targetIndex]
      return value == null ? "-" : String(value)
    } catch {
      const mapped = fallbackMap.get(datasetIndex)
      return mapped == null ? "-" : String(mapped)
    }
  }

  getPositions(indices) {
    return indices
      .map((index) => this.indexToPosition.get(index))
      .filter((position) => position !== undefined)
  }

  getClassHistogram({ scope = "all", strat = null } = {}) {
    const columnName = strat || this.target
    const columnIndex = this.resolveHistogramIndex(columnName)
    const scopeIndices = this.getScopeIndices(scope)
    const groups = new Map()

    scopeIndices.forEach((rowIndex) => {
      const value = this.original_dataset[rowIndex]?.[columnIndex]
      const key = String(value)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(rowIndex)
    })

    this.bumpCounter()
    return {
      names: Array.from(groups.keys()),
      indices: Array.from(groups.values())
    }
  }

  getScopeIndices(scope) {
    switch (scope) {
      case "train":
        return this.trainIndices
      case "test":
        return this.testIndices
      case "all":
      default:
        return this.selectedIndices
    }
  }

  async loadInputTensors({ aug = false, size = 224, normalize = null } = {}) {
    const divisor = normalize?.divisor ?? 127.5
    const offset = normalize?.offset ?? 1
    const imageTensors = []
    const indices = this.selectedIndices

    if (this.x && typeof this.x.dispose === "function") {
      this.x.dispose()
      this.x = null
    }

    for (const rowIndex of indices) {
      const base64 = this.getImageBase64(this.original_dataset[rowIndex])
      if (!base64) {
        continue
      }
      const img = await this.loadImageFromBase64(base64, this.getImageMimeType())
      const processed = tf.tidy(() => {
        const pixels = tf.browser.fromPixels(img)
        const resized = pixels.shape[0] === size && pixels.shape[1] === size
          ? pixels
          : tf.image.resizeBilinear(pixels, [size, size], true)
        let output = resized.toFloat().div(divisor).sub(offset)
        if (aug) {
          output = this.augmentImage(output)
        }
        return output
      })
      imageTensors.push(processed)
    }

    if (!imageTensors.length) {
      throw new Error("No input tensors were created.")
    }

    this.inputIndices = indices.slice()
    this.indexToPosition = this.buildIndexToPosition(this.inputIndices)
    this.x = tf.stack(imageTensors)
    imageTensors.forEach((tensor) => tensor.dispose())
    this.bumpCounter()
    return this.x
  }

  async tensorToBase64(tensor, { mimeType = "image/png" } = {}) {
    const shape = tensor.shape || []
    const imageTensor = shape.length === 4 ? tensor.squeeze([0]) : tensor
    const [height, width] = imageTensor.shape
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    await tf.browser.toPixels(imageTensor, canvas)
    const dataUrl = canvas.toDataURL(mimeType)
    return dataUrl.replace(/^data:image\/\w+;base64,/, "")
  }

  async inputIndexToBase64(position, options = {}) {
    if (!this.x) {
      throw new Error("Input tensor stack is not loaded.")
    }
    const tensor = tf.tidy(() => this.x.slice([position, 0, 0, 0], [1, -1, -1, -1]))
    const base64 = await this.tensorToBase64(tensor, options)
    tensor.dispose()
    this.bumpCounter()
    return base64
  }

  augmentImage(inputTensor) {
    return tf.tidy(() => {
      let output = inputTensor
      if (Math.random() < 0.5) {
        output = tf.image.flipLeftRight(output)
      }
      const rotate = tf.image && typeof tf.image.rotateWithOffset === "function"
        ? tf.image.rotateWithOffset
        : tf.image && typeof tf.image.rotate === "function"
          ? tf.image.rotate
          : null
      if (rotate) {
        const radians = this.randomInRange(-Math.PI / 18, Math.PI / 18)
        output = rotate(output, radians)
      }
      if (tf.image && typeof tf.image.adjustBrightness === "function") {
        const brightnessDelta = this.randomInRange(-0.1, 0.1)
        output = tf.image.adjustBrightness(output, brightnessDelta)
      }
      if (tf.image && typeof tf.image.adjustContrast === "function") {
        const contrastFactor = this.randomInRange(0.8, 1.2)
        output = tf.image.adjustContrast(output, contrastFactor)
      }
      if (tf.image && typeof tf.image.adjustSaturation === "function") {
        const saturationFactor = this.randomInRange(0.8, 1.2)
        output = tf.image.adjustSaturation(output, saturationFactor)
      }
      return output
    })
  }

  randomInRange(min, max) {
    return min + Math.random() * (max - min)
  }

  buildIndexToPosition(indices) {
    const map = new Map()
    indices.forEach((datasetIndex, position) => {
      map.set(datasetIndex, position)
    })
    return map
  }

  shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = items[i]
      items[i] = items[j]
      items[j] = temp
    }
  }

  loadImageFromBase64(base64, mimeType) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load base64 image."))
      img.src = `data:${mimeType};base64,${base64}`
    })
  }

  resolveTargetIndex() {
    throw new Error("resolveTargetIndex must be implemented by subclasses.")
  }

  resolveStratIndex() {
    throw new Error("resolveStratIndex must be implemented by subclasses.")
  }

  resolveHistogramIndex(name) {
    try {
      return this.resolveStratIndex(name)
    } catch (error) {
      return this.resolveTargetIndex(name)
    }
  }

  getImageBase64() {
    throw new Error("getImageBase64 must be implemented by subclasses.")
  }

  getImageMimeType() {
    return "image/png"
  }
}

window.BaseImageDataset = BaseImageDataset
