/* eslint-disable */
(function initModelHandler(globalObject) {
  const REGISTRY = {
    downstream_age_gender_model: "artifact_downstream_age_gender_model.js",
    downstream_face_expression_model: "artifact_downstream_face_expression_model.js",
    downstream_face_landmark_68_tiny_model: "artifact_downstream_face_landmark_68_tiny_model.js",
    mobilenet_v2_35_128: "artifact_mobilenet_v2_35_128.js",
    mobilenet_v2_50_224: "artifact_mobilenet_v2_50_224.js",
    ssd_mobile_ssd_mobilenetv1_model: "artifact_ssd_mobile_ssd_mobilenetv1_model.js"
  }

  const loadPromises = {}
  let installedFetch = null

  function getCurrentScript() {
    if (document.currentScript) return document.currentScript
    const scripts = Array.from(document.getElementsByTagName("script"))
    return scripts.find((script) => script.src && script.src.includes("/model_handler.js")) || null
  }

  function ensureTrailingSlash(value) {
    const normalized = String(value || "").trim()
    if (!normalized) return normalized
    return normalized.endsWith("/") ? normalized : `${normalized}/`
  }

  function getBaseUrl() {
    const configuredBase = ensureTrailingSlash(globalObject.EXTERNAL_BASE)
    if (configuredBase) {
      return new URL(configuredBase, window.location.href).toString()
    }
    const script = getCurrentScript()
    if (!script || !script.src) {
      return new URL("./external/", window.location.href).toString()
    }
    return new URL("./", script.src).toString()
  }

  function normalizePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "")
  }

  function getBasename(value) {
    const normalized = normalizePath(value)
    const parts = normalized.split("/")
    return parts[parts.length - 1] || ""
  }

  function toCandidateKeys(input) {
    const raw = typeof input === "string" ? input : input && input.url ? input.url : String(input)
    const resolved = new URL(raw, window.location.href)
    const normalizedPath = normalizePath(resolved.pathname)
    const withoutPublicPrefix = normalizedPath.replace(/^public\/models\//, "")
    return Array.from(
      new Set([
        normalizedPath,
        withoutPublicPrefix,
        `public/models/${withoutPublicPrefix}`
      ])
    )
  }

  function normalizeKeywords(values) {
    if (!Array.isArray(values)) return []
    return values
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  }

  function normalizeKeywordMap(values) {
    const input = values && typeof values === "object" ? values : {}
    const normalized = {}
    for (const [artifactKey, keywords] of Object.entries(input)) {
      normalized[artifactKey] = normalizeKeywords(Array.isArray(keywords) ? keywords : [keywords])
    }
    return normalized
  }

  function toRequestUrl(input) {
    const raw = typeof input === "string" ? input : input && input.url ? input.url : String(input)
    return new URL(raw, window.location.href)
  }

  function shouldInterceptRequest(input, requestKeywords) {
    if (!requestKeywords.length) return true
    const normalized = toRequestUrl(input).href.toLowerCase()
    return requestKeywords.some((keyword) => normalized.includes(keyword))
  }

  function buildArtifactKeywords(artifactKey, artifact, customKeywordMap) {
    const merged = new Set()
    const push = (value) => {
      const normalized = String(value || "").trim().toLowerCase()
      if (normalized) merged.add(normalized)
    }

    push(artifactKey)
    push(artifact && artifact.sourceDir)
    push(artifact && artifact.manifestFile)
    push(getBasename(artifact && artifact.manifestFile))
    push(getBasename(artifact && artifact.sourceDir))
    push(REGISTRY[artifactKey])
    push(getBasename(REGISTRY[artifactKey]))

    const customKeywords = customKeywordMap[artifactKey] || []
    customKeywords.forEach(push)

    return Array.from(merged)
  }

  function filterArtifactsByKeyword(loadedArtifacts, input, customKeywordMap) {
    const requestUrl = toRequestUrl(input).href.toLowerCase()
    const entries = Object.entries(loadedArtifacts || {})
    const matchedEntries = entries.filter(([artifactKey, artifact]) => {
      const keywords = buildArtifactKeywords(artifactKey, artifact, customKeywordMap)
      return keywords.some((keyword) => requestUrl.includes(keyword))
    })
    return matchedEntries.length ? matchedEntries : entries
  }

  function base64ToArrayBuffer(base64Text) {
    const binaryText = atob(base64Text)
    const bytes = new Uint8Array(binaryText.length)
    for (let index = 0; index < binaryText.length; index += 1) {
      bytes[index] = binaryText.charCodeAt(index)
    }
    return bytes.buffer
  }

  function resolveAssetText(textByPath, candidateKeys, options = {}) {
    const allowBasenameFallback = options.allowBasenameFallback !== false
    const entries = Object.entries(textByPath || {})
    for (const candidate of candidateKeys) {
      const normalizedCandidate = normalizePath(candidate)
      for (const [key, value] of entries) {
        const normalizedKey = normalizePath(key)
        if (
          normalizedKey === normalizedCandidate ||
          normalizedCandidate.endsWith(`/${normalizedKey}`) ||
          normalizedKey.endsWith(`/${normalizedCandidate}`)
        ) {
          return value
        }
      }
    }
    if (!allowBasenameFallback) {
      return null
    }
    for (const candidate of candidateKeys) {
      const candidateBase = getBasename(candidate)
      if (!candidateBase) continue
      for (const [key, value] of entries) {
        const keyBase = getBasename(key)
        if (keyBase && candidateBase === keyBase) {
          return value
        }
      }
    }
    return null
  }

  function resolveAssetBinary(binaryBase64ByPath, candidateKeys, options = {}) {
    const allowBasenameFallback = options.allowBasenameFallback !== false
    const entries = Object.entries(binaryBase64ByPath || {})
    for (const candidate of candidateKeys) {
      const normalizedCandidate = normalizePath(candidate)
      for (const [key, base64] of entries) {
        const normalizedKey = normalizePath(key)
        if (
          normalizedKey === normalizedCandidate ||
          normalizedCandidate.endsWith(`/${normalizedKey}`) ||
          normalizedKey.endsWith(`/${normalizedCandidate}`)
        ) {
          return { key: normalizedKey, base64 }
        }
      }
    }
    if (!allowBasenameFallback) {
      return null
    }
    for (const candidate of candidateKeys) {
      const candidateBase = getBasename(candidate)
      if (!candidateBase) continue
      for (const [key, base64] of entries) {
        const keyBase = getBasename(key)
        if (keyBase && candidateBase === keyBase) {
          return { key: normalizePath(key), base64 }
        }
      }
    }
    return null
  }

  async function loadArtifactScript(key) {
    if (globalObject.MODEL_ARTIFACTS && globalObject.MODEL_ARTIFACTS[key]) {
      return globalObject.MODEL_ARTIFACTS[key]
    }

    if (!REGISTRY[key]) {
      throw new Error(`Unknown model artifact key: ${key}`)
    }

    if (!loadPromises[key]) {
      loadPromises[key] = new Promise((resolve, reject) => {
        const scriptElement = document.createElement("script")
        scriptElement.src = new URL(REGISTRY[key], getBaseUrl()).toString()
        scriptElement.onload = () => {
          const artifact = globalObject.MODEL_ARTIFACTS && globalObject.MODEL_ARTIFACTS[key]
          if (!artifact) {
            reject(new Error(`Artifact script loaded but key was not registered: ${key}`))
            return
          }
          resolve(artifact)
        }
        scriptElement.onerror = () => reject(new Error(`Failed to load model artifact script: ${REGISTRY[key]}`))
        document.head.appendChild(scriptElement)
      })
    }

    return loadPromises[key]
  }

  async function loadArtifacts(keys) {
    const list = Array.isArray(keys) ? keys : [keys]
    const artifacts = {}
    for (const key of list) {
      artifacts[key] = await loadArtifactScript(key)
    }
    return artifacts
  }

  function getLoadedArtifacts() {
    return { ...(globalObject.MODEL_ARTIFACTS || {}) }
  }

  function createPatchedFetch(originalFetch, options = {}) {
    const binaryCache = new Map()
    const requestKeywords = normalizeKeywords(options.requestKeywords)
    const customKeywordMap = normalizeKeywordMap(options.modelKeywordsByArtifact)
    return async function patchedFetch(input, init) {
      if (!shouldInterceptRequest(input, requestKeywords)) {
        return originalFetch(input, init)
      }

      const candidateKeys = toCandidateKeys(input)
      const loadedArtifacts = getLoadedArtifacts()
      const artifactEntries = filterArtifactsByKeyword(loadedArtifacts, input, customKeywordMap)

      const isAmbiguousArtifactMatch = artifactEntries.length > 1
      for (const [, artifact] of artifactEntries) {
        const text = resolveAssetText(artifact.textByPath, candidateKeys, {
          allowBasenameFallback: !isAmbiguousArtifactMatch
        })
        if (typeof text === "string") {
          return new Response(text, {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }
      }

      for (const [, artifact] of artifactEntries) {
        const binary = resolveAssetBinary(artifact.binaryBase64ByPath, candidateKeys, {
          allowBasenameFallback: !isAmbiguousArtifactMatch
        })
        if (binary) {
          if (!binaryCache.has(binary.key)) {
            binaryCache.set(binary.key, base64ToArrayBuffer(binary.base64))
          }
          return new Response(binaryCache.get(binary.key), {
            status: 200,
            headers: { "Content-Type": "application/octet-stream" }
          })
        }
      }

      return originalFetch(input, init)
    }
  }

  function patchFaceApiFetchSafely(faceapi, fetchImpl) {
    if (!faceapi || !faceapi.env || typeof faceapi.env.monkeyPatch !== "function") {
      return
    }

    const currentEnv = typeof faceapi.env.getEnv === "function" ? faceapi.env.getEnv() : {}
    const createCanvasElement =
      typeof currentEnv.createCanvasElement === "function"
        ? currentEnv.createCanvasElement
        : function fallbackCreateCanvasElement() {
            return document.createElement("canvas")
          }
    const createImageElement =
      typeof currentEnv.createImageElement === "function"
        ? currentEnv.createImageElement
        : function fallbackCreateImageElement() {
            return document.createElement("img")
          }

    faceapi.env.monkeyPatch({
      fetch: fetchImpl,
      Canvas: currentEnv.Canvas,
      Image: currentEnv.Image,
      ImageData: currentEnv.ImageData,
      Video: currentEnv.Video,
      createCanvasElement,
      createImageElement,
      readFile: currentEnv.readFile
    })
  }

  async function installFetchInterceptor(keys, options = {}) {
    await loadArtifacts(keys)
    if (installedFetch) {
      return installedFetch
    }

    const originalFetch = window.fetch.bind(window)
    installedFetch = createPatchedFetch(originalFetch, options)
    window.fetch = installedFetch

    patchFaceApiFetchSafely(options.faceapi, installedFetch)

    return installedFetch
  }

  globalObject.ModelHandler = {
    registry: { ...REGISTRY },
    loadArtifact: loadArtifactScript,
    loadArtifacts,
    getLoadedArtifacts,
    installFetchInterceptor
  }
})(typeof window !== "undefined" ? window : globalThis)
