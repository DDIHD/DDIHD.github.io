class ColoradoDataset extends BaseImageDataset {
  static instance = null

  static async getInstance({
    dataset,
    bag = "haribo",
    target = "class",
    strat = null,
    train_test_split = 0.8
  } = {}) {
    if (!ColoradoDataset.instance) {
      const instance = new ColoradoDataset({ dataset, bag, target, strat, train_test_split })
      await instance.init()
      ColoradoDataset.instance = instance
    }
    return ColoradoDataset.instance
  }

  static resetInstance() {
    ColoradoDataset.instance = null
  }

  constructor({ dataset, bag, target, strat, train_test_split }) {
    if (ColoradoDataset.instance) {
      throw new Error("Use ColoradoDataset.getInstance() to access the singleton instance.")
    }
    super({ original_dataset: dataset, target, strat, train_test_split })
    this.bag = bag
  }

  async init() {
    this.selectedIndices = this.buildBagSelection()
    if (this.bag === "OOD") {
      this.buildOodSplit()
    } else {
      this.applySplit()
    }
    this.buildTargetTensor()
    this.finalizeInitialization()
  }

  normalizeBagValue(value) {
    return String(value ?? "").trim().toLowerCase()
  }

  buildBagSelection() {
    const allowedBags = new Set(["1", "2", "3"])
    const allowedBags12 = new Set(["1", "2"])
    const oodBags = new Set(["ood", "nimm1", "katjes1"])
    const selected = []

    this.original_dataset.forEach((row, index) => {
      const bagValue = this.normalizeBagValue(row?.[7])
      if (this.bag === "OOD") {
        if (allowedBags.has(bagValue) || oodBags.has(bagValue)) {
          selected.push(index)
        }
        return
      }
      if (this.bag === "haribo12") {
        if (allowedBags12.has(bagValue)) {
          selected.push(index)
        }
        return
      }
      if (this.bag !== "haribo") {
        throw new Error("Only bag='haribo', bag='haribo12', or bag='OOD' is supported for now.")
      }
      if (allowedBags.has(bagValue)) {
        selected.push(index)
      }
    })

    return selected
  }

  buildOodSplit() {
    const allowedBags = new Set(["1", "2", "3"])
    const oodBags = new Set(["ood", "nimm1", "katjes1"])
    this.trainIndices = []
    this.testIndices = []

    this.selectedIndices.forEach((rowIndex) => {
      const bagValue = this.normalizeBagValue(this.original_dataset[rowIndex]?.[7])
      if (oodBags.has(bagValue)) {
        this.testIndices.push(rowIndex)
      } else if (allowedBags.has(bagValue)) {
        this.trainIndices.push(rowIndex)
      }
    })
  }

  resolveTargetIndex(target) {
    switch (target) {
      case "class":
        return 2
      case "liquorice":
        return 3
      case "gummi":
        return 4
      case "sugar":
        return 5
      case "foam":
        return 6
      case "des":
      case "designation":
        return 8
      default:
        throw new Error("Unsupported target. Use 'class', 'liquorice', 'gummi', 'sugar', 'foam', or 'designation'.")
    }
  }

  resolveStratIndex(strat) {
    switch (strat) {
      case "class":
        return 2
      case "des":
      case "designation":
        return 8
      default:
        throw new Error("Unsupported strat. Use 'class' or 'des'.")
    }
  }

  getImageBase64(row) {
    return row?.[9]
  }

  getImageMimeType() {
    return "image/png"
  }
}

window.ColoradoDataset = ColoradoDataset