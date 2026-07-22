class ImageTrainer {
  static instance = null

  static async getInstance() {
    if (!ImageTrainer.instance) {
      ImageTrainer.instance = new ImageTrainer()
    }
    return ImageTrainer.instance
  }

  static resetInstance() {
    ImageTrainer.instance = null
  }

  constructor() {
    if (ImageTrainer.instance) {
      throw new Error("Use ImageTrainer.getInstance() to access the singleton instance.")
    }
    this.counter = 0
    this.history = null
    this.results = []
    this.defaultConfig = {
      model: "mobilenet_v2/50_224",
      batch_size: 8,
      learning_rate: 0.005,
      augmentation: false,
      epochs: 5
    }
    this.stepDefinitions = [
      { id: "data_load", label: "Daten laden", phase: "setup" },
      { id: "train_test_split", label: "Train/Test Split", phase: "setup" },
      { id: "model_create", label: "Modell erstellen", phase: "setup" },
      { id: "epoch_start_shuffle", label: "Epoch starten + mischen", phase: "train" },
      { id: "batch_load", label: "Batch laden", phase: "train" },
      { id: "batch_predict", label: "Vorhersage", phase: "train" },
      { id: "batch_metrics", label: "Fehler berechnen", phase: "train" },
      { id: "batch_train", label: "Lernen", phase: "train" },
      { id: "epoch_evaluate", label: "Evaluieren", phase: "eval" },
      { id: "epoch_finalize", label: "Epoch abschließen", phase: "eval" },
      { id: "run_finalize", label: "Training abschließen", phase: "finalize" }
    ]
    this.stepMap = new Map(this.stepDefinitions.map((step, index) => [step.id, { ...step, index }]))
    this.modelArtifactsReady = false
    this.resetRunState()
  }

  bumpCounter() {
    this.counter += 1
  }

  resetRunState() {
    this.datasetInstance = null
    this.config = { ...this.defaultConfig }
    this.currentStepId = null
    this.currentStepIndex = -1
    this.currentEpoch = 0
    this.currentBatchStart = 0
    this.currentBatchIndices = []
    this.currentBatchPositions = []
    this.currentBatchXs = null
    this.currentBatchYs = null
    this.currentBatchImages = []
    this.currentEpochBatchAcc = []
    this.trainOrderIndices = []
    this.trainOrderPositions = []
    this.trainIndices = []
    this.testIndices = []
    this.trainPositions = []
    this.testPositions = []
    this.trainLossSum = 0
    this.trainAccSum = 0
    this.trainBatches = 0
    this.pendingEpochMetrics = null
    this.batchProbabilities = []
    this.batchPredictedClassIndices = []
    this.batchPredictedClassLabels = []
    this.batchTrueClassIndices = []
    this.batchTrueClassLabels = []
    this.batchCorrect = []
    this.batchAccuracy = 0
    this.evalProbabilities = []
    this.evalPredictedClassIndices = []
    this.evalTrueClassIndices = []
    this.lastStepOutput = null
    this.stepLog = []
    this.isAutoRunning = false
    this.isComplete = false
    this.featureExtractor = null
    this.head = null
  }

  getStepDefinitions() {
    return this.stepDefinitions.map((step) => ({ ...step }))
  }

  getRunState() {
    return {
      currentStepId: this.currentStepId,
      currentStepIndex: this.currentStepIndex,
      currentEpoch: this.currentEpoch,
      currentBatchStart: this.currentBatchStart,
      isAutoRunning: this.isAutoRunning,
      isComplete: this.isComplete,
      lastStepOutput: this.lastStepOutput,
      stepLog: this.stepLog,
      history: this.history,
      results: this.results
    }
  }

  async initializeRun({
    datasetInstance,
    model = this.defaultConfig.model,
    batch_size = this.defaultConfig.batch_size,
    learning_rate = this.defaultConfig.learning_rate,
    augmentation = this.defaultConfig.augmentation,
    epochs = this.defaultConfig.epochs
  } = {}) {
    if (!window.tf) {
      throw new Error("TensorFlow.js is not available on window.tf.")
    }
    if (!datasetInstance) {
      throw new Error("Missing dataset instance.")
    }

    await this.disposeRunArtifacts()
    this.resetRunState()
    this.datasetInstance = datasetInstance
    this.config = {
      model,
      batch_size,
      learning_rate,
      augmentation,
      epochs
    }
    this.history = {
      loss: [],
      acc: [],
      val_loss: [],
      val_acc: []
    }
    this.results = []
    this.setCurrentStep("data_load")
    this.bumpCounter()
    return this.getRunState()
  }

  setCurrentStep(stepId) {
    const step = this.stepMap.get(stepId)
    if (!step) {
      throw new Error(`Unknown step id: ${stepId}`)
    }
    this.currentStepId = stepId
    this.currentStepIndex = step.index
  }

  async nextStep() {
    if (!this.currentStepId || this.isComplete) {
      return { done: true, stepId: null, output: null }
    }
    const step = this.stepMap.get(this.currentStepId)
    if (!step) {
      throw new Error(`Unknown step id: ${this.currentStepId}`)
    }

    const logEntry = {
      stepId: step.id,
      label: step.label,
      status: "running",
      startedAt: Date.now(),
      finishedAt: null,
      summary: null
    }
    this.stepLog.push(logEntry)

    try {
      const output = await this.executeStepHandler(step.id)
      this.lastStepOutput = output
      logEntry.status = "success"
      logEntry.finishedAt = Date.now()
      logEntry.summary = output
      this.advanceAfterStep(step.id)
      this.bumpCounter()
      return { done: this.isComplete, stepId: step.id, output }
    } catch (error) {
      logEntry.status = "error"
      logEntry.finishedAt = Date.now()
      logEntry.summary = { message: error.message }
      this.bumpCounter()
      throw error
    }
  }

  async runAuto({ delayMs = 50 } = {}) {
    this.isAutoRunning = true
    this.bumpCounter()
    while (this.isAutoRunning && !this.isComplete) {
      await this.nextStep()
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    this.isAutoRunning = false
    this.bumpCounter()
    return this.getRunState()
  }

  stopAuto() {
    this.isAutoRunning = false
    this.bumpCounter()
  }

  async train({
    datasetInstance,
    model = this.defaultConfig.model,
    batch_size = this.defaultConfig.batch_size,
    learning_rate = this.defaultConfig.learning_rate,
    augmentation = this.defaultConfig.augmentation,
    epochs = this.defaultConfig.epochs
  } = {}) {
    await this.initializeRun({
      datasetInstance,
      model,
      batch_size,
      learning_rate,
      augmentation,
      epochs
    })
    while (!this.isComplete) {
      await this.nextStep()
    }
    return { history: this.history, results: this.results }
  }

  advanceAfterStep(stepId) {
    switch (stepId) {
      case "data_load":
        this.setCurrentStep("train_test_split")
        return
      case "train_test_split":
        this.setCurrentStep("model_create")
        return
      case "model_create":
        this.setCurrentStep("epoch_start_shuffle")
        return
      case "epoch_start_shuffle":
        this.setCurrentStep(this.trainOrderPositions.length > 0 ? "batch_load" : "epoch_evaluate")
        return
      case "batch_load":
        this.setCurrentStep("batch_predict")
        return
      case "batch_predict":
        this.setCurrentStep("batch_metrics")
        return
      case "batch_metrics":
        this.setCurrentStep("batch_train")
        return
      case "batch_train":
        this.setCurrentStep(
          this.currentBatchStart < this.trainOrderPositions.length
            ? "batch_load"
            : "epoch_evaluate"
        )
        return
      case "epoch_evaluate":
        this.setCurrentStep("epoch_finalize")
        return
      case "epoch_finalize":
        if (this.currentEpoch >= this.config.epochs) {
          this.setCurrentStep("run_finalize")
        } else {
          this.setCurrentStep("epoch_start_shuffle")
        }
        return
      case "run_finalize":
        this.currentStepId = null
        this.currentStepIndex = -1
        this.isComplete = true
        return
      default:
        throw new Error(`Unsupported step transition for ${stepId}`)
    }
  }

  async executeStepHandler(stepId) {
    switch (stepId) {
      case "data_load":
        return this.stepDataLoad()
      case "train_test_split":
        return this.stepTrainTestSplit()
      case "model_create":
        return this.stepModelCreate()
      case "epoch_start_shuffle":
        return this.stepEpochStartShuffle()
      case "batch_load":
        return this.stepBatchLoad()
      case "batch_predict":
        return this.stepBatchPredict()
      case "batch_metrics":
        return this.stepBatchMetrics()
      case "batch_train":
        return this.stepBatchTrain()
      case "epoch_evaluate":
        return this.stepEpochEvaluate()
      case "epoch_finalize":
        return this.stepEpochFinalize()
      case "run_finalize":
        return this.stepRunFinalize()
      default:
        throw new Error(`Unsupported step: ${stepId}`)
    }
  }

  async stepDataLoad() {
    if (typeof this.datasetInstance.prepareForTraining === "function") {
      await this.datasetInstance.prepareForTraining()
    } else if (typeof this.datasetInstance.ensureInitialized === "function") {
      await this.datasetInstance.ensureInitialized()
    } else if (!this.datasetInstance.y && typeof this.datasetInstance.init === "function") {
      await this.datasetInstance.init()
    }
    const summary = typeof this.datasetInstance.getSummary === "function"
      ? this.datasetInstance.getSummary()
      : {
          selected: this.datasetInstance.selectedIndices?.length ?? 0,
          train: this.datasetInstance.trainIndices?.length ?? 0,
          test: this.datasetInstance.testIndices?.length ?? 0,
          classes: this.datasetInstance.targetValueToIndex?.size ?? 0
        }
    return summary
  }

  async stepTrainTestSplit() {
    this.trainIndices = Array.isArray(this.datasetInstance.trainIndices)
      ? [...this.datasetInstance.trainIndices]
      : []
    this.testIndices = Array.isArray(this.datasetInstance.testIndices)
      ? [...this.datasetInstance.testIndices]
      : []
    if (!this.trainIndices.length || !this.testIndices.length) {
      throw new Error("Missing train or test indices.")
    }
    this.trainPositions = this.datasetInstance.getPositions(this.trainIndices)
    this.testPositions = this.datasetInstance.getPositions(this.testIndices)
    if (!this.trainPositions.length || !this.testPositions.length) {
      throw new Error("Missing train or test positions after mapping.")
    }
    return {
      trainCount: this.trainIndices.length,
      testCount: this.testIndices.length
    }
  }

  async stepModelCreate() {
    const numClasses = this.getNumClasses(this.datasetInstance)
    const modelConfig = this.getModelConfig(this.config.model)
    this.modelConfig = modelConfig
    this.featureExtractor = await this.loadFeatureExtractor(modelConfig)
    this.featureExtractor.trainable = false
    this.head = this.buildHead(numClasses)
    this.head.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"]
    })
    return {
      model: this.config.model,
      numClasses,
      learningRate: this.config.learning_rate
    }
  }

  async stepEpochStartShuffle() {
    this.trainOrderIndices = this.trainIndices.slice()
    this.trainOrderPositions = this.trainPositions.slice()
    this.shufflePairs(this.trainOrderIndices, this.trainOrderPositions)
    this.currentBatchStart = 0
    this.trainLossSum = 0
    this.trainAccSum = 0
    this.trainBatches = 0
    this.currentEpochBatchAcc = []
    return {
      epoch: this.currentEpoch + 1,
      trainBatches: Math.ceil(this.trainOrderPositions.length / this.config.batch_size)
    }
  }

  async stepBatchLoad() {
    const start = this.currentBatchStart
    const end = Math.min(start + this.config.batch_size, this.trainOrderPositions.length)
    this.currentBatchIndices = this.trainOrderIndices.slice(start, end)
    this.currentBatchPositions = this.trainOrderPositions.slice(start, end)
    if (!this.currentBatchIndices.length) {
      throw new Error("No batch indices available for batch_load.")
    }
    this.currentBatchXs = await this.buildBatchEmbeddings({
      datasetInstance: this.datasetInstance,
      featureExtractor: this.featureExtractor,
      modelConfig: this.modelConfig,
      indices: this.currentBatchIndices,
      augmentation: this.config.augmentation
    })
    this.currentBatchYs = this.gatherLabels(this.datasetInstance.y, this.currentBatchPositions)
    this.currentBatchImages = this.currentBatchIndices.map((index) =>
      this.datasetInstance.getImageBase64(this.datasetInstance.original_dataset?.[index])
    )
    return {
      epoch: this.currentEpoch + 1,
      batchStart: start,
      batchSize: this.currentBatchIndices.length
    }
  }

  async stepBatchPredict() {
    if (!this.currentBatchXs) {
      throw new Error("batch_predict requires loaded batch tensors.")
    }
    const predScores = this.head.predict(this.currentBatchXs)
    const predictionScores = Array.isArray(predScores) ? predScores[0] : predScores
    const predIndexTensor = predictionScores.argMax(1)
    this.batchProbabilities = await predictionScores.array()
    this.batchPredictedClassIndices = await predIndexTensor.array()
    const labelMap = this.datasetInstance.targetIndexToValue || new Map()
    this.batchPredictedClassLabels = this.batchPredictedClassIndices.map((idx) => {
      return labelMap.get(idx) ?? String(idx)
    })
    predictionScores.dispose()
    predIndexTensor.dispose()
    return {
      probs: this.batchProbabilities,
      predClass: this.batchPredictedClassIndices,
      predLabels: this.batchPredictedClassLabels
    }
  }

  async stepBatchMetrics() {
    if (!this.currentBatchYs) {
      throw new Error("batch_metrics requires loaded batch labels.")
    }
    const trueIndexTensor = this.currentBatchYs.argMax(1)
    this.batchTrueClassIndices = await trueIndexTensor.array()
    trueIndexTensor.dispose()
    const labelMap = this.datasetInstance.targetIndexToValue || new Map()
    this.batchTrueClassLabels = this.batchTrueClassIndices.map((idx) => {
      return labelMap.get(idx) ?? String(idx)
    })
    this.batchCorrect = this.batchPredictedClassIndices.map(
      (pred, i) => pred === this.batchTrueClassIndices[i]
    )
    this.batchAccuracy = this.batchCorrect.filter(Boolean).length / Math.max(this.batchCorrect.length, 1)
    this.currentEpochBatchAcc.push(this.batchAccuracy)
    return {
      accuracy: this.batchAccuracy,
      correct: this.batchCorrect.filter(Boolean).length,
      total: this.batchCorrect.length
    }
  }

  async stepBatchTrain() {
    if (!this.currentBatchXs || !this.currentBatchYs) {
      throw new Error("batch_train requires loaded batch tensors.")
    }
    const batchResult = await this.head.trainOnBatch(this.currentBatchXs, this.currentBatchYs)
    const batchArray = Array.isArray(batchResult) ? batchResult : [batchResult]
    const batchValues = await Promise.all(batchArray.map(this.readMetricValue))
    const loss = batchValues[0] ?? 0
    const acc = batchValues[1] ?? 0
    batchArray.forEach(this.disposeMetric)

    this.currentBatchXs.dispose()
    this.currentBatchYs.dispose()
    this.currentBatchXs = null
    this.currentBatchYs = null

    this.trainLossSum += loss
    this.trainAccSum += acc
    this.trainBatches += 1
    this.currentBatchStart += this.config.batch_size
    return {
      loss,
      acc,
      batchDone: this.trainBatches,
      batchesTotal: Math.ceil(this.trainOrderPositions.length / this.config.batch_size)
    }
  }

  async stepEpochEvaluate() {
    let valLossSum = 0
    let valAccSum = 0
    let valBatches = 0
    const evalProbabilities = []
    const evalPredIndices = []
    const evalTrueIndices = []

    for (let i = 0; i < this.testPositions.length; i += this.config.batch_size) {
      const batchPositions = this.testPositions.slice(i, i + this.config.batch_size)
      const batchIndices = this.testIndices.slice(i, i + this.config.batch_size)
      const xs = await this.buildBatchEmbeddings({
        datasetInstance: this.datasetInstance,
        featureExtractor: this.featureExtractor,
        modelConfig: this.modelConfig,
        indices: batchIndices,
        augmentation: false
      })
      const ys = this.gatherLabels(this.datasetInstance.y, batchPositions)

      const evalResult = this.head.evaluate(xs, ys)
      const evalArray = Array.isArray(evalResult) ? evalResult : [evalResult]
      const evalValues = await Promise.all(evalArray.map(this.readMetricValue))
      valLossSum += evalValues[0] ?? 0
      valAccSum += evalValues[1] ?? 0
      valBatches += 1
      evalArray.forEach(this.disposeMetric)

      const predScores = this.head.predict(xs)
      const predictionScores = Array.isArray(predScores) ? predScores[0] : predScores
      const predIndexTensor = predictionScores.argMax(1)
      const trueIndexTensor = ys.argMax(1)
      evalProbabilities.push(...(await predictionScores.array()))
      evalPredIndices.push(...(await predIndexTensor.array()))
      evalTrueIndices.push(...(await trueIndexTensor.array()))
      predictionScores.dispose()
      predIndexTensor.dispose()
      trueIndexTensor.dispose()
      xs.dispose()
      ys.dispose()
    }

    this.evalProbabilities = evalProbabilities
    this.evalPredictedClassIndices = evalPredIndices
    this.evalTrueClassIndices = evalTrueIndices
    this.pendingEpochMetrics = {
      epoch: this.currentEpoch + 1,
      trainLoss: this.trainLossSum / Math.max(this.trainBatches, 1),
      trainAcc: this.trainAccSum / Math.max(this.trainBatches, 1),
      valLoss: valLossSum / Math.max(valBatches, 1),
      valAcc: valAccSum / Math.max(valBatches, 1)
    }
    return { ...this.pendingEpochMetrics }
  }

  async stepEpochFinalize() {
    if (!this.pendingEpochMetrics) {
      throw new Error("epoch_finalize requires pending epoch metrics.")
    }
    this.history.loss.push(this.pendingEpochMetrics.trainLoss)
    this.history.acc.push(this.pendingEpochMetrics.trainAcc)
    this.history.val_loss.push(this.pendingEpochMetrics.valLoss)
    this.history.val_acc.push(this.pendingEpochMetrics.valAcc)
    this.currentEpoch += 1
    const summary = {
      epochCompleted: this.currentEpoch,
      loss: this.pendingEpochMetrics.trainLoss,
      acc: this.pendingEpochMetrics.trainAcc,
      val_loss: this.pendingEpochMetrics.valLoss,
      val_acc: this.pendingEpochMetrics.valAcc
    }
    this.pendingEpochMetrics = null
    return summary
  }

  async stepRunFinalize() {
    const labelMap = this.datasetInstance.targetIndexToValue || new Map()
    this.results = this.testIndices.map((datasetIndex, i) => {
      const trueIndex = this.evalTrueClassIndices[i]
      const predIndex = this.evalPredictedClassIndices[i]
      return {
        index: datasetIndex,
        trueLabel: labelMap.get(trueIndex) ?? String(trueIndex),
        predictedLabel: labelMap.get(predIndex) ?? String(predIndex)
      }
    })
    return {
      epochs: this.currentEpoch,
      results: this.results.length
    }
  }

  async disposeRunArtifacts() {
    if (this.currentBatchXs && typeof this.currentBatchXs.dispose === "function") {
      this.currentBatchXs.dispose()
    }
    if (this.currentBatchYs && typeof this.currentBatchYs.dispose === "function") {
      this.currentBatchYs.dispose()
    }
    if (this.head && typeof this.head.dispose === "function") {
      this.head.dispose()
    }
    if (this.featureExtractor && typeof this.featureExtractor.dispose === "function") {
      this.featureExtractor.dispose()
    }
    this.currentBatchXs = null
    this.currentBatchYs = null
    this.head = null
    this.featureExtractor = null
  }

  runFeatureExtractor(featureExtractor, inputs, config) {
    if (config?.type === "layers" && typeof featureExtractor.predict === "function") {
      return featureExtractor.predict(inputs)
    }
    if (typeof featureExtractor.execute === "function") {
      const output = featureExtractor.execute(inputs)
      if (Array.isArray(output)) {
        const first = output[0]
        output.forEach((tensor, index) => {
          if (index !== 0 && tensor?.dispose) tensor.dispose()
        })
        return first
      }
      return output
    }
    if (typeof featureExtractor.predict === "function") {
      return featureExtractor.predict(inputs)
    }
    throw new Error("Unsupported feature extractor.")
  }

  getModelConfig(model) {
    switch (model) {
      case "mobilenet_v2/35_128":
        return {
          key: "mobilenet_v2/35_128",
          size: 128,
          divisor: 127.5,
          offset: 1,
          type: "graph"
        }
      case "mobilenet_v2/50_224":
        return {
          key: "mobilenet_v2/50_224",
          size: 224,
          divisor: 127,
          offset: 1,
          type: "layers"
        }
      default:
        throw new Error("Unsupported model. Use mobilenet_v2/35_128 or mobilenet_v2/50_224.")
    }
  }

  async loadFeatureExtractor(config) {
    await this.ensureMobileNetArtifactsReady()

    if (config.type === "graph") {
      const modelUrl = "https://model-artifacts.local/mobilenet_v2/35_128/model.json"
      return tf.loadGraphModel(modelUrl)
    }
    if (config.type === "layers") {
      const checkpointUrl = "https://model-artifacts.local/mobilenet_v2/50_224/model.json"
      const trainingLayer = "out_relu"
      const mobilenet = await tf.loadLayersModel(checkpointUrl)
      const layer = mobilenet.getLayer(trainingLayer)
      const truncatedModel = tf.model({ inputs: mobilenet.inputs, outputs: layer.output })
      const model = tf.sequential()
      model.add(truncatedModel)
      model.add(tf.layers.globalAveragePooling2d({}))
      return model
    }
    throw new Error("Unsupported feature extractor type.")
  }

  async ensureMobileNetArtifactsReady() {
    if (this.modelArtifactsReady) {
      return
    }
    if (!window.ModelHandler || typeof window.ModelHandler.installFetchInterceptor !== "function") {
      throw new Error("ModelHandler is required to load MobileNet artifacts. Include /external/model_handler.js before ImageTrainer.")
    }

    await window.ModelHandler.installFetchInterceptor(
      ["mobilenet_v2_35_128", "mobilenet_v2_50_224"],
      {
        requestKeywords: ["mobilenet_v2/35_128", "mobilenet_v2/50_224"],
        modelKeywordsByArtifact: {
          mobilenet_v2_35_128: ["mobilenet_v2/35_128", "035-128-feature-vector"],
          mobilenet_v2_50_224: ["mobilenet_v2/50_224", "050-224-classification"]
        }
      }
    )

    this.modelArtifactsReady = true
  }

  buildHead(numClasses) {
    const head = tf.sequential()
    head.add(tf.layers.dense({ units: numClasses, activation: "softmax", inputShape: [1280] }))
    return head
  }

  getNumClasses(datasetInstance) {
    if (datasetInstance?.y?.shape?.[1]) {
      return datasetInstance.y.shape[1]
    }
    if (datasetInstance?.targetValueToIndex?.size) {
      return datasetInstance.targetValueToIndex.size
    }
    throw new Error("Unable to determine number of classes from dataset instance.")
  }

  gatherLabels(yTensor, positions) {
    const positionsTensor = tf.tensor1d(positions, "int32")
    const labels = tf.gather(yTensor, positionsTensor)
    positionsTensor.dispose()
    return labels
  }

  async readMetricValue(metric) {
    if (metric == null) {
      return null
    }
    if (typeof metric === "number") {
      return metric
    }
    if (typeof metric.data === "function") {
      const data = await metric.data()
      return data[0]
    }
    if (typeof metric.dataSync === "function") {
      const data = metric.dataSync()
      return data[0]
    }
    return Number(metric)
  }

  disposeMetric(metric) {
    if (metric && typeof metric.dispose === "function") {
      metric.dispose()
    }
  }

  shufflePairs(indices, positions) {
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
  }

  async buildBatchEmbeddings({
    datasetInstance,
    featureExtractor,
    modelConfig,
    indices,
    augmentation
  }) {
    const inputs = []
    for (const index of indices) {
      const row = datasetInstance.original_dataset?.[index]
      const base64 = datasetInstance.getImageBase64(row)
      if (!base64) {
        continue
      }
      const img = await this.loadImageFromBase64(base64, datasetInstance.getImageMimeType())
      const processed = tf.tidy(() => {
        const pixels = tf.browser.fromPixels(img)
        const resized = pixels.shape[0] === modelConfig.size && pixels.shape[1] === modelConfig.size
          ? pixels
          : tf.image.resizeBilinear(pixels, [modelConfig.size, modelConfig.size], true)
        let output = resized.toFloat().div(modelConfig.divisor).sub(modelConfig.offset)
        if (augmentation) {
          output = this.augmentImage(output)
        }
        return output.expandDims(0)
      })
      inputs.push(processed)
    }

    if (!inputs.length) {
      throw new Error("No inputs created for batch.")
    }

    const batch = tf.concat(inputs, 0)
    inputs.forEach((tensor) => tensor.dispose())
    const embedding = this.runFeatureExtractor(featureExtractor, batch, modelConfig)
    batch.dispose()
    return embedding
  }

  loadImageFromBase64(base64, mimeType) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load base64 image."))
      img.src = `data:${mimeType};base64,${base64}`
    })
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
}

window.ImageTrainer = ImageTrainer
