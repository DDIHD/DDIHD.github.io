class TmDataset extends BaseImageDataset {
  static instance = null

  static async getInstance({
    dataset,
    target = "class",
    strat = "class",
    train_test_split = 0.8
  } = {}) {
    if (!TmDataset.instance) {
      const instance = new TmDataset({ dataset, target, strat, train_test_split })
      await instance.init()
      TmDataset.instance = instance
    }
    return TmDataset.instance
  }

  static resetInstance() {
    TmDataset.instance = null
  }

  constructor({ dataset, target, strat, train_test_split }) {
    if (TmDataset.instance) {
      throw new Error("Use TmDataset.getInstance() to access the singleton instance.")
    }
    super({ original_dataset: dataset, target, strat, train_test_split })
  }

  resolveTargetIndex(target) {
    if (target === "class") {
      return 1
    }
    throw new Error("Unsupported target. Use 'class'.")
  }

  resolveStratIndex(strat) {
    if (strat === "class") {
      return 1
    }
    throw new Error("Unsupported strat. Use 'class'.")
  }

  getImageBase64(row) {
    return row?.[0]
  }

  getImageMimeType() {
    return "image/jpeg"
  }
}

window.TmDataset = TmDataset
