/* eslint-disable */
/**
 * Inference worker: runs MobileNet + the trained head on its own thread with its own WebGL
 * context (OffscreenCanvas). The host main thread only grabs webcam frames and forwards them,
 * so a generated game (which shares the host's main thread) can no longer starve the model.
 *
 * Classic worker (importScripts) so the existing tf.min.js and model artifacts can be reused.
 *
 * Messages host -> worker
 *   { type: 'load', id, featureExtractorKey, head: { modelTopology, weightSpecs, weightData } }
 *   { type: 'frame', id, bitmap: ImageBitmap }                       (transferred)
 *   { type: 'frame', id, pixels: ArrayBuffer, width, height }         (RGBA fallback, transferred)
 *
 * Messages worker -> host
 *   { type: 'backend', backend }                    once tf is initialised
 *   { type: 'loaded', id, ms }                      the model is ready for frames
 *   { type: 'result', id, probabilities: Float32Array, ms }
 *   { type: 'error', id, message, fatal }
 */
importScripts('./tf.min.js')

var featureExtractor = null
var head = null
var config = null
var backendPromise = null

var CONFIGS = {
  'mobilenet_v2/35_128': { key: 'mobilenet_v2/35_128', size: 128, divisor: 127.5, offset: 1, type: 'graph', artifact: 'mobilenet_v2_35_128' },
  'mobilenet_v2/50_224': { key: 'mobilenet_v2/50_224', size: 224, divisor: 127, offset: 1, type: 'layers', artifact: 'mobilenet_v2_50_224' }
}

function post(msg, transfer) {
  try { self.postMessage(msg, transfer || []) } catch (e) { self.postMessage({ type: 'error', message: String(e && e.message || e) }) }
}

function base64ToBytes(base64) {
  var bin = atob(base64)
  var out = new Uint8Array(bin.length)
  for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function basename(path) {
  var parts = String(path || '').replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || ''
}

/** tf.io.ModelArtifacts from an embedded artifact bundle (model.json + base64 shards). */
function artifactsFromBundle(bundle) {
  var textByPath = bundle.textByPath || {}
  var binaries = bundle.binaryBase64ByPath || {}
  var manifestText = null
  Object.keys(textByPath).forEach(function (k) { if (basename(k) === 'model.json') manifestText = textByPath[k] })
  if (!manifestText) throw new Error('model.json fehlt im Artefakt.')
  var json = JSON.parse(manifestText)
  var specs = []
  var chunks = []
  var total = 0
  ;(json.weightsManifest || []).forEach(function (group) {
    ;(group.weights || []).forEach(function (w) { specs.push(w) })
    ;(group.paths || []).forEach(function (p) {
      var wanted = basename(p)
      var key = Object.keys(binaries).filter(function (k) { return basename(k) === wanted })[0]
      if (!key) throw new Error('Gewichtsdatei fehlt: ' + p)
      var bytes = base64ToBytes(binaries[key])
      chunks.push(bytes)
      total += bytes.length
    })
  })
  var weightData = new Uint8Array(total)
  var offset = 0
  chunks.forEach(function (c) { weightData.set(c, offset); offset += c.length })
  return {
    modelTopology: json.modelTopology,
    weightSpecs: specs,
    weightData: weightData.buffer,
    format: json.format,
    generatedBy: json.generatedBy,
    convertedBy: json.convertedBy,
    signature: json.signature,
    userDefinedMetadata: json.userDefinedMetadata,
    modelInitializer: json.modelInitializer,
    trainingConfig: json.trainingConfig
  }
}

async function ensureBackend() {
  if (!backendPromise) {
    backendPromise = (async function () {
      var ok = false
      try { ok = await tf.setBackend('webgl') } catch (e) { ok = false }
      await tf.ready()
      var backend = tf.getBackend()
      post({ type: 'backend', backend: backend, webgl: ok && backend === 'webgl' })
      if (!(ok && backend === 'webgl')) throw new Error('WebGL im Worker nicht verfügbar (Backend: ' + backend + ').')
    })()
  }
  return backendPromise
}

async function loadFeatureExtractor(cfg) {
  if (featureExtractor && config && config.key === cfg.key) return featureExtractor
  if (!self.MODEL_ARTIFACTS || !self.MODEL_ARTIFACTS[cfg.artifact]) {
    importScripts('./artifact_' + cfg.artifact + '.js')
  }
  var bundle = self.MODEL_ARTIFACTS && self.MODEL_ARTIFACTS[cfg.artifact]
  if (!bundle) throw new Error('Modellartefakt nicht gefunden: ' + cfg.artifact)
  var artifacts = artifactsFromBundle(bundle)
  var fe
  if (cfg.type === 'graph') {
    fe = await tf.loadGraphModel(tf.io.fromMemory(artifacts))
  } else {
    // Mirrors ImageTrainer.loadFeatureExtractor: truncate at out_relu, then global average pooling.
    var mobilenet = await tf.loadLayersModel(tf.io.fromMemory(artifacts))
    var layer = mobilenet.getLayer('out_relu')
    var truncated = tf.model({ inputs: mobilenet.inputs, outputs: layer.output })
    fe = tf.sequential()
    fe.add(truncated)
    fe.add(tf.layers.globalAveragePooling2d({}))
  }
  if (featureExtractor && featureExtractor !== fe) { try { featureExtractor.dispose() } catch (e) {} }
  featureExtractor = fe
  return fe
}

function runFeatureExtractor(inputs) {
  if (config.type === 'layers') return featureExtractor.predict(inputs)
  var out = featureExtractor.execute(inputs)
  if (Array.isArray(out)) {
    for (var i = 1; i < out.length; i += 1) { try { out[i].dispose() } catch (e) {} }
    return out[0]
  }
  return out
}

function predictTensor(pixels) {
  var scores = tf.tidy(function () {
    var img = pixels
    if (img.shape[0] !== config.size || img.shape[1] !== config.size) {
      img = tf.image.resizeBilinear(img, [config.size, config.size], true)
    }
    var normalized = img.toFloat().div(config.divisor).sub(config.offset).expandDims(0)
    var embedding = runFeatureExtractor(normalized)
    var out = head.predict(embedding)
    if (Array.isArray(out)) {
      for (var i = 1; i < out.length; i += 1) { try { out[i].dispose() } catch (e) {} }
      return out[0]
    }
    return out
  })
  return scores
}

async function handleLoad(msg) {
  var started = performance.now()
  await ensureBackend()
  var cfg = CONFIGS[msg.featureExtractorKey] || CONFIGS['mobilenet_v2/50_224']
  var fe = await loadFeatureExtractor(cfg)
  config = cfg
  featureExtractor = fe
  var h = msg.head
  var newHead = await tf.loadLayersModel(tf.io.fromMemory(h.modelTopology, h.weightSpecs, h.weightData))
  if (head && head !== newHead) { try { head.dispose() } catch (e) {} }
  head = newHead
  // Warm up: compiles the shader programs so the first real frame is not slow.
  var warm = tf.zeros([cfg.size, cfg.size, 3], 'int32')
  var scores = predictTensor(warm)
  await scores.data()
  scores.dispose()
  warm.dispose()
  post({ type: 'loaded', id: msg.id, ms: Math.round(performance.now() - started) })
}

async function handleFrame(msg) {
  if (!head || !featureExtractor || !config) {
    if (msg.bitmap && msg.bitmap.close) msg.bitmap.close()
    post({ type: 'error', id: msg.id, message: 'Modell im Worker noch nicht geladen.' })
    return
  }
  var started = performance.now()
  var pixels = null
  try {
    if (msg.bitmap) {
      pixels = tf.browser.fromPixels(msg.bitmap, 3)
    } else if (msg.pixels) {
      var rgba = tf.tensor3d(new Uint8Array(msg.pixels), [msg.height, msg.width, 4], 'int32')
      pixels = rgba.slice([0, 0, 0], [msg.height, msg.width, 3])
      rgba.dispose()
    } else {
      throw new Error('Frame ohne Bilddaten.')
    }
    var scores = predictTensor(pixels)
    var values = await scores.data()
    scores.dispose()
    var probabilities = new Float32Array(values)
    post({ type: 'result', id: msg.id, probabilities: probabilities, ms: Math.round(performance.now() - started) }, [probabilities.buffer])
  } finally {
    if (pixels) pixels.dispose()
    if (msg.bitmap && msg.bitmap.close) { try { msg.bitmap.close() } catch (e) {} }
  }
}

self.onmessage = function (ev) {
  var msg = ev.data || {}
  var job = null
  if (msg.type === 'load') job = handleLoad(msg)
  else if (msg.type === 'frame') job = handleFrame(msg)
  else return
  job.catch(function (e) {
    post({ type: 'error', id: msg.id, message: String(e && e.message || e), fatal: msg.type === 'load' })
  })
}
