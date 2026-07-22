class ButterflyDataset extends BaseImageDataset {
  static instance = null

  static async getInstance({
    dataset,
    target = "class",
    strat = "class",
    train_test_split = 0.8
  } = {}) {
    if (!ButterflyDataset.instance) {
      const instance = new ButterflyDataset({ dataset, target, strat, train_test_split })
      await instance.init()
      ButterflyDataset.instance = instance
    }
    return ButterflyDataset.instance
  }

  static resetInstance() {
    ButterflyDataset.instance = null
  }

  constructor({ dataset, target, strat, train_test_split }) {
    if (ButterflyDataset.instance) {
      throw new Error("Use ButterflyDataset.getInstance() to access the singleton instance.")
    }
    super({ original_dataset: dataset, target, strat, train_test_split })
  }

  async init() {
    this.selectedIndices = this.buildIndexSelection()
    if (this.strat === "new") {
      this.buildFamilyClassSplit()
    } else {
      this.applySplit()
    }
    this.buildTargetTensor()
    this.finalizeInitialization()
  }

  buildFamilyClassSplit() {
    const familyIndex = this.resolveTargetIndex("family")
    const classIndex = this.resolveTargetIndex("class")
    const familyMap = new Map()

    this.selectedIndices.forEach((rowIndex) => {
      const row = this.original_dataset[rowIndex]
      const familyValue = String(row?.[familyIndex] ?? "")
      const classValue = String(row?.[classIndex] ?? "")
      if (!familyMap.has(familyValue)) {
        familyMap.set(familyValue, new Map())
      }
      const classMap = familyMap.get(familyValue)
      if (!classMap.has(classValue)) {
        classMap.set(classValue, [])
      }
      classMap.get(classValue).push(rowIndex)
    })

    this.trainIndices = []
    this.testIndices = []

    familyMap.forEach((classMap) => {
      const classNames = Array.from(classMap.keys())
      this.shuffleArray(classNames)
      const testClassCount = Math.max(
        1,
        Math.floor(classNames.length * (1 - this.train_test_split))
      )
      const testClasses = new Set(classNames.slice(0, testClassCount))

      classMap.forEach((indices, className) => {
        if (testClasses.has(className)) {
          this.testIndices.push(...indices)
        } else {
          this.trainIndices.push(...indices)
        }
      })
    })
  }

  resolveTargetIndex(target) {
    switch (target) {
      case "class":
        return 0
      case "family":
        return 2
      default:
        throw new Error("Unsupported target. Use 'class' or 'family'.")
    }
  }

  resolveStratIndex(strat) {
    switch (strat) {
      case "class":
        return 0
      case "family":
        return 2
      default:
        throw new Error("Unsupported strat. Use 'class' or 'family'.")
    }
  }

  getImageBase64(row) {
    return row?.[1]
  }

  getImageMimeType() {
    return "image/jpeg"
  }
}

window.ButterflyDataset = ButterflyDataset
