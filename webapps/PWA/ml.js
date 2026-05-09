/* ============================================================================
 * Age & Gender Detection - pure TensorFlow.js implementation
 *
 * Re-implements the inference pipeline that face-api.js exposed via
 *   faceapi.detectAllFaces(input).withAgeAndGender()
 *
 * Two networks are used:
 *   - SSD MobileNet V1 face detector (returns bounding boxes + scores)
 *   - AgeGenderNet, a TinyXception backbone with two FC heads
 *
 * The implementation purposefully mirrors the math of face-api so the
 * resulting predictions are numerically equivalent. Layer choices and
 * pre-/post-processing have been derived from the face-api source.
 * ==========================================================================*/

(function (global) {
  'use strict';

  // -- Configuration --------------------------------------------------------

  const MODELS_BASE_URI = 'models';

  // SSD face detector
  const SSD_INPUT_SIZE = 512;
  const SSD_NUM_ANCHORS = 5118;
  const SSD_PIXEL_SCALE = 0.007843137718737125; // 1 / 127.5
  const SSD_PIXEL_BIAS = 1;
  const SSD_MIN_CONFIDENCE = 0.5;
  const SSD_MAX_RESULTS = 100;
  const SSD_IOU_THRESHOLD = 0.5;

  // AgeGenderNet
  const AGE_INPUT_SIZE = 112;
  const AGE_MEAN_RGB = [122.782, 117.001, 104.298];
  const AGE_DIVISOR = 256;
  const AGE_NUM_MAIN_BLOCKS = 2;

  // Batch-norm epsilon used by MobileNet V1 (matches face-api).
  const BN_EPSILON = 0.0010000000474974513;

  // ------------------------------------------------------------------------
  //  Weight loading
  // ------------------------------------------------------------------------

  async function loadWeightMap(modelName) {
    const manifestUri = `${MODELS_BASE_URI}/${modelName}-weights_manifest.json`;
    const manifest = await fetch(manifestUri).then((r) => r.json());
    return tf.io.loadWeights(manifest, MODELS_BASE_URI);
  }

  // ------------------------------------------------------------------------
  //  Generic primitives
  // ------------------------------------------------------------------------

  function getMediaDims(input) {
    if (input instanceof HTMLVideoElement) {
      return { width: input.videoWidth, height: input.videoHeight };
    }
    if (input instanceof HTMLImageElement) {
      return { width: input.naturalWidth, height: input.naturalHeight };
    }
    return { width: input.width, height: input.height };
  }

  // Resize+pad an image into a square canvas, mimicking face-api's
  // imageToSquare(input, size, centerImage). When centerImage is false the
  // image sits in the top-left corner; otherwise it is centered.
  function imageToSquareCanvas(input, size, centerImage) {
    const dims = getMediaDims(input);
    const scale = size / Math.max(dims.height, dims.width);
    const targetW = scale * dims.width;
    const targetH = scale * dims.height;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const offset = Math.abs(targetW - targetH) / 2;
    const dx = centerImage && targetW < targetH ? offset : 0;
    const dy = centerImage && targetH < targetW ? offset : 0;
    ctx.drawImage(input, dx, dy, targetW, targetH);
    return canvas;
  }

  // Extract a face crop from the original media into its own canvas.
  function cropFace(input, box) {
    const dims = getMediaDims(input);
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.max(1, Math.min(dims.width - x, Math.floor(box.width)));
    const h = Math.max(1, Math.min(dims.height - y, Math.floor(box.height)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(input, x, y, w, h, 0, 0, w, h);
    return canvas;
  }

  // ------------------------------------------------------------------------
  //  SSD MobileNet V1 - parameter extraction
  // ------------------------------------------------------------------------

  function extractSsdParams(weightMap) {
    const get = (k) => {
      const t = weightMap[k];
      if (!t) throw new Error(`SSD weight not found: ${k}`);
      return t;
    };

    function pointwiseConv(prefix, idx) {
      return {
        filters: get(`${prefix}/Conv2d_${idx}_pointwise/weights`),
        batch_norm_offset: get(
          `${prefix}/Conv2d_${idx}_pointwise/convolution_bn_offset`
        ),
      };
    }

    function depthwiseConvPair(idx) {
      const dwPrefix = `MobilenetV1/Conv2d_${idx}_depthwise`;
      return {
        depthwise_conv: {
          filters: get(`${dwPrefix}/depthwise_weights`),
          batch_norm_scale: get(`${dwPrefix}/BatchNorm/gamma`),
          batch_norm_offset: get(`${dwPrefix}/BatchNorm/beta`),
          batch_norm_mean: get(`${dwPrefix}/BatchNorm/moving_mean`),
          batch_norm_variance: get(`${dwPrefix}/BatchNorm/moving_variance`),
        },
        pointwise_conv: pointwiseConv('MobilenetV1', idx),
      };
    }

    function convParams(prefix) {
      return {
        filters: get(`${prefix}/weights`),
        bias: get(`${prefix}/biases`),
      };
    }

    function boxPredictor(idx) {
      return {
        box_encoding_predictor: convParams(
          `Prediction/BoxPredictor_${idx}/BoxEncodingPredictor`
        ),
        class_predictor: convParams(
          `Prediction/BoxPredictor_${idx}/ClassPredictor`
        ),
      };
    }

    const mobilenetv1 = { conv_0: pointwiseConv('MobilenetV1', 0) };
    for (let i = 1; i <= 13; i++) {
      mobilenetv1[`conv_${i}`] = depthwiseConvPair(i);
    }

    const prediction_layer = {};
    for (let i = 0; i <= 7; i++) {
      prediction_layer[`conv_${i}`] = pointwiseConv('Prediction', i);
    }
    for (let i = 0; i <= 5; i++) {
      prediction_layer[`box_predictor_${i}`] = boxPredictor(i);
    }

    const extra_dim = get('Output/extra_dim'); // shape [1, 5118, 4]

    return {
      mobilenetv1,
      prediction_layer,
      output_layer: { extra_dim },
    };
  }

  // ------------------------------------------------------------------------
  //  SSD MobileNet V1 - forward pass
  // ------------------------------------------------------------------------

  // 1x1 / 3x3 conv with pre-multiplied batch-norm offset and ReLU6.
  function bnOffsetConvLayer(x, params, strides) {
    const out = tf.add(
      tf.conv2d(x, params.filters, strides, 'same'),
      params.batch_norm_offset
    );
    return tf.clipByValue(out, 0, 6);
  }

  // Depthwise convolution with full batch-norm and ReLU6.
  function depthwiseBnLayer(x, params, strides) {
    let out = tf.depthwiseConv2d(x, params.filters, strides, 'same');
    out = tf.batchNorm(
      out,
      params.batch_norm_mean,
      params.batch_norm_variance,
      params.batch_norm_offset,
      params.batch_norm_scale,
      BN_EPSILON
    );
    return tf.clipByValue(out, 0, 6);
  }

  function getStridesForLayerIdx(idx) {
    return idx === 2 || idx === 4 || idx === 6 || idx === 12
      ? [2, 2]
      : [1, 1];
  }

  function mobileNetV1Forward(x, params) {
    let out = bnOffsetConvLayer(x, params.conv_0, [2, 2]);
    let conv11 = null;
    for (let i = 1; i <= 13; i++) {
      const layer = params[`conv_${i}`];
      out = depthwiseBnLayer(
        out,
        layer.depthwise_conv,
        getStridesForLayerIdx(i)
      );
      out = bnOffsetConvLayer(out, layer.pointwise_conv, [1, 1]);
      if (i === 11) conv11 = out;
    }
    return { out, conv11 };
  }

  // Plain conv (no BN, optional ReLU). Used by box / class predictors.
  function plainConvLayer(x, params) {
    return tf.add(tf.conv2d(x, params.filters, [1, 1], 'same'), params.bias);
  }

  function boxPredictionLayer(x, params) {
    const batchSize = x.shape[0];
    const boxEncoding = tf.reshape(
      plainConvLayer(x, params.box_encoding_predictor),
      [batchSize, -1, 1, 4]
    );
    const classPrediction = tf.reshape(
      plainConvLayer(x, params.class_predictor),
      [batchSize, -1, 3]
    );
    return { boxEncoding, classPrediction };
  }

  function predictionLayer(x, conv11, params) {
    const conv0 = bnOffsetConvLayer(x, params.conv_0, [1, 1]);
    const conv1 = bnOffsetConvLayer(conv0, params.conv_1, [2, 2]);
    const conv2 = bnOffsetConvLayer(conv1, params.conv_2, [1, 1]);
    const conv3 = bnOffsetConvLayer(conv2, params.conv_3, [2, 2]);
    const conv4 = bnOffsetConvLayer(conv3, params.conv_4, [1, 1]);
    const conv5 = bnOffsetConvLayer(conv4, params.conv_5, [2, 2]);
    const conv6 = bnOffsetConvLayer(conv5, params.conv_6, [1, 1]);
    const conv7 = bnOffsetConvLayer(conv6, params.conv_7, [2, 2]);

    const featureMaps = [conv11, x, conv1, conv3, conv5, conv7];
    const boxEncodings = [];
    const classPredictions = [];
    featureMaps.forEach((fm, idx) => {
      const r = boxPredictionLayer(fm, params[`box_predictor_${idx}`]);
      boxEncodings.push(r.boxEncoding);
      classPredictions.push(r.classPrediction);
    });
    return {
      boxPredictions: tf.concat(boxEncodings, 1),
      classPredictions: tf.concat(classPredictions, 1),
    };
  }

  // Decode SSD anchor encodings using the format from the TF Object
  // Detection API (variances of [10, 10, 5, 5]).
  function decodeBoxes(anchors, encodings) {
    const aT = tf.unstack(tf.transpose(anchors, [1, 0])); // [4, N]
    const sizeY = tf.sub(aT[2], aT[0]);
    const sizeX = tf.sub(aT[3], aT[1]);
    const cy = tf.add(aT[0], tf.div(sizeY, tf.scalar(2)));
    const cx = tf.add(aT[1], tf.div(sizeX, tf.scalar(2)));

    const eT = tf.unstack(tf.transpose(encodings, [1, 0])); // [4, N]
    const halfH = tf.div(
      tf.mul(tf.exp(tf.div(eT[2], tf.scalar(5))), sizeY),
      tf.scalar(2)
    );
    const newCy = tf.add(tf.mul(tf.div(eT[0], tf.scalar(10)), sizeY), cy);
    const halfW = tf.div(
      tf.mul(tf.exp(tf.div(eT[3], tf.scalar(5))), sizeX),
      tf.scalar(2)
    );
    const newCx = tf.add(tf.mul(tf.div(eT[1], tf.scalar(10)), sizeX), cx);

    const stacked = tf.stack([
      tf.sub(newCy, halfH),
      tf.sub(newCx, halfW),
      tf.add(newCy, halfH),
      tf.add(newCx, halfW),
    ]);
    return tf.transpose(stacked, [1, 0]);
  }

  function outputLayer(boxPredictions, classPredictions, params) {
    const batchSize = boxPredictions.shape[0];

    const tiledAnchors = tf.tile(params.extra_dim, [batchSize, 1, 1]);
    let boxes = decodeBoxes(
      tf.reshape(tiledAnchors, [-1, 4]),
      tf.reshape(boxPredictions, [-1, 4])
    );
    boxes = tf.reshape(boxes, [batchSize, boxes.shape[0] / batchSize, 4]);

    // [batch, N, 3] -> drop background class -> sigmoid the two remaining
    // class logits independently.
    //
    // We keep both foreground channels here. Different exported checkpoints
    // can have different channel semantics, so we pick the plausible one in
    // detectFaces() based on resulting geometry.
    const fgScores = tf.sigmoid(
      tf.slice(classPredictions, [0, 0, 1], [-1, -1, -1])
    );
    const scores = tf.reshape(fgScores, [batchSize, fgScores.shape[1], 2]);

    return {
      boxes: tf.unstack(boxes),
      scores: tf.unstack(scores),
    };
  }

  // Full SSD forward, kept inside a single tidy.
  function ssdForward(inputBatch, params) {
    return tf.tidy(() => {
      const x = tf.sub(
        tf.mul(inputBatch, tf.scalar(SSD_PIXEL_SCALE)),
        tf.scalar(SSD_PIXEL_BIAS)
      );
      const features = mobileNetV1Forward(x, params.mobilenetv1);
      const preds = predictionLayer(
        features.out,
        features.conv11,
        params.prediction_layer
      );
      return outputLayer(
        preds.boxPredictions,
        preds.classPredictions,
        params.output_layer
      );
    });
  }

  // ------------------------------------------------------------------------
  //  SSD MobileNet V1 - face detection (high-level)
  // ------------------------------------------------------------------------

  // Custom non-max suppression that mimics face-api's behavior: it
  // soft-zeros suppressed scores instead of removing them outright.
  function nonMaxSuppression(boxesData, scores, maxOutput, iouThr, scoreThr) {
    const numBoxes = scores.length;
    const outputSize = Math.min(maxOutput, numBoxes);

    const candidates = [];
    for (let i = 0; i < numBoxes; i++) {
      if (scores[i] > scoreThr) candidates.push({ score: scores[i], idx: i });
    }
    candidates.sort((a, b) => b.score - a.score);

    function iou(i, j) {
      const a = boxesData[i];
      const b = boxesData[j];
      const ay1 = Math.min(a[0], a[2]);
      const ax1 = Math.min(a[1], a[3]);
      const ay2 = Math.max(a[0], a[2]);
      const ax2 = Math.max(a[1], a[3]);
      const by1 = Math.min(b[0], b[2]);
      const bx1 = Math.min(b[1], b[3]);
      const by2 = Math.max(b[0], b[2]);
      const bx2 = Math.max(b[1], b[3]);
      const areaA = (ay2 - ay1) * (ax2 - ax1);
      const areaB = (by2 - by1) * (bx2 - bx1);
      if (areaA <= 0 || areaB <= 0) return 0;
      const iy1 = Math.max(ay1, by1);
      const ix1 = Math.max(ax1, bx1);
      const iy2 = Math.min(ay2, by2);
      const ix2 = Math.min(ax2, bx2);
      const inter = Math.max(iy2 - iy1, 0) * Math.max(ix2 - ix1, 0);
      return inter / (areaA + areaB - inter);
    }

    const selected = [];
    for (const c of candidates) {
      if (selected.length >= outputSize) break;
      const original = c.score;
      for (let j = selected.length - 1; j >= 0; j--) {
        const ov = iou(c.idx, selected[j]);
        if (ov === 0) continue;
        if (ov > iouThr) c.score = 0;
        if (c.score <= scoreThr) break;
      }
      if (original === c.score) selected.push(c.idx);
    }
    return selected;
  }

  // Convert a media element to the SSD's expected [1, 512, 512, 3] tensor,
  // remembering how the image was scaled so we can un-pad the boxes later.
  function mediaToSsdInput(input) {
    const dims = getMediaDims(input);
    const scale = SSD_INPUT_SIZE / Math.max(dims.height, dims.width);
    const newW = scale * dims.width;
    const newH = scale * dims.height;

    const canvas =
      mediaToSsdInput._canvas ||
      (mediaToSsdInput._canvas = document.createElement('canvas'));
    canvas.width = SSD_INPUT_SIZE;
    canvas.height = SSD_INPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(input, 0, 0, newW, newH);

    const tensor = tf.tidy(() =>
      tf.browser.fromPixels(canvas).toFloat().expandDims(0)
    );
    return {
      tensor,
      reshapedDims: { width: newW, height: newH },
      originalDims: dims,
    };
  }

  async function detectFaces(input, ssdParams) {
    const { tensor, reshapedDims, originalDims } = mediaToSsdInput(input);
    const { boxes: bs, scores: ss } = ssdForward(tensor, ssdParams);
    tensor.dispose();

    const boxesT = bs[0];
    const scoresT = ss[0];
    for (let i = 1; i < bs.length; i++) {
      bs[i].dispose();
      ss[i].dispose();
    }

    const scoresByAnchor = await scoresT.array();
    const boxesData = await boxesT.array();
    boxesT.dispose();
    scoresT.dispose();

    if (ml.debug) {
      const channels = [0, 1].map((c) => scoresByAnchor.map((row) => row[c]));
      channels.forEach((scoresData, c) => {
        const sorted = scoresData.slice().sort((a, b) => b - a);
        const above = scoresData.filter((s) => s > SSD_MIN_CONFIDENCE).length;
        console.log(
          `[ml] ch${c}: n=${scoresData.length}, >thr=${above}, ` +
            `top5=[${sorted
              .slice(0, 5)
              .map((s) => s.toFixed(3))
              .join(', ')}], ` +
            `min=${sorted[sorted.length - 1].toFixed(3)}, ` +
            `median=${sorted[Math.floor(sorted.length / 2)].toFixed(3)}`
        );
      });
    }

    const scoresCh0 = scoresByAnchor.map((row) => row[0]);
    const scoresCh1 = scoresByAnchor.map((row) => row[1]);

    const indices0 = nonMaxSuppression(
      boxesData,
      scoresCh0,
      SSD_MAX_RESULTS,
      SSD_IOU_THRESHOLD,
      SSD_MIN_CONFIDENCE
    );
    const indices1 = nonMaxSuppression(
      boxesData,
      scoresCh1,
      SSD_MAX_RESULTS,
      SSD_IOU_THRESHOLD,
      SSD_MIN_CONFIDENCE
    );

    // Boxes are normalized in the padded 512x512 square; un-pad to original.
    const padX = SSD_INPUT_SIZE / reshapedDims.width;
    const padY = SSD_INPUT_SIZE / reshapedDims.height;

    function mapResults(indices, scoresData) {
      return indices.map((idx) => {
        const top = Math.max(0, boxesData[idx][0]) * padY;
        const bottom = Math.min(1, boxesData[idx][2]) * padY;
        const left = Math.max(0, boxesData[idx][1]) * padX;
        const right = Math.min(1, boxesData[idx][3]) * padX;
        return {
          score: scoresData[idx],
          box: {
            x: left * originalDims.width,
            y: top * originalDims.height,
            width: (right - left) * originalDims.width,
            height: (bottom - top) * originalDims.height,
          },
          imageDims: originalDims,
        };
      });
    }

    const dets0 = mapResults(indices0, scoresCh0);
    const dets1 = mapResults(indices1, scoresCh1);

    function maxNormArea(dets) {
      if (!dets.length) return 0;
      const imgArea = originalDims.width * originalDims.height;
      return dets.reduce((m, d) => {
        const area = (d.box.width * d.box.height) / imgArea;
        return area > m ? area : m;
      }, 0);
    }

    // Choose the channel whose detections look more face-like (larger best box).
    // If tied, prefer fewer detections.
    const a0 = maxNormArea(dets0);
    const a1 = maxNormArea(dets1);
    let selected = dets0;
    if (a1 > a0 + 0.01) {
      selected = dets1;
    } else if (Math.abs(a1 - a0) <= 0.01 && dets1.length < dets0.length) {
      selected = dets1;
    }

    // Guardrail: if a pathological channel still returns a flood, keep only
    // the largest plausible region so overlays remain usable.
    if (selected.length > 10) {
      selected = selected
        .slice()
        .sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)
        .slice(0, 1);
    }

    if (ml.debug) {
      console.log(
        `[ml] selected channel results: ch0=${dets0.length}, ch1=${dets1.length}, chosen=${selected.length}, area0=${a0.toFixed(
          3
        )}, area1=${a1.toFixed(3)}`
      );
    }

    return selected;
  }

  // ------------------------------------------------------------------------
  //  AgeGenderNet - parameter extraction
  // ------------------------------------------------------------------------

  function extractAgeGenderParams(weightMap, numMainBlocks) {
    const get = (k) => {
      const t = weightMap[k];
      if (!t) throw new Error(`AgeGender weight not found: ${k}`);
      return t;
    };

    function convParams(prefix) {
      return { filters: get(`${prefix}/filters`), bias: get(`${prefix}/bias`) };
    }
    function separableParams(prefix) {
      return {
        depthwise_filter: get(`${prefix}/depthwise_filter`),
        pointwise_filter: get(`${prefix}/pointwise_filter`),
        bias: get(`${prefix}/bias`),
      };
    }
    function reductionBlockParams(prefix) {
      return {
        separable_conv0: separableParams(`${prefix}/separable_conv0`),
        separable_conv1: separableParams(`${prefix}/separable_conv1`),
        expansion_conv: convParams(`${prefix}/expansion_conv`),
      };
    }
    function mainBlockParams(prefix) {
      return {
        separable_conv0: separableParams(`${prefix}/separable_conv0`),
        separable_conv1: separableParams(`${prefix}/separable_conv1`),
        separable_conv2: separableParams(`${prefix}/separable_conv2`),
      };
    }
    function fcParams(prefix) {
      return {
        weights: get(`${prefix}/weights`),
        bias: get(`${prefix}/bias`),
      };
    }

    const middle_flow = {};
    for (let i = 0; i < numMainBlocks; i++) {
      middle_flow[`main_block_${i}`] = mainBlockParams(
        `middle_flow/main_block_${i}`
      );
    }

    return {
      feature_extractor: {
        entry_flow: {
          conv_in: convParams('entry_flow/conv_in'),
          reduction_block_0: reductionBlockParams(
            'entry_flow/reduction_block_0'
          ),
          reduction_block_1: reductionBlockParams(
            'entry_flow/reduction_block_1'
          ),
        },
        middle_flow,
        exit_flow: {
          reduction_block: reductionBlockParams('exit_flow/reduction_block'),
          separable_conv: separableParams('exit_flow/separable_conv'),
        },
      },
      classifier: {
        fc: {
          age: fcParams('fc/age'),
          gender: fcParams('fc/gender'),
        },
      },
    };
  }

  // ------------------------------------------------------------------------
  //  AgeGenderNet - forward pass (TinyXception backbone)
  // ------------------------------------------------------------------------

  function xceptionConv(x, params, stride) {
    return tf.add(tf.conv2d(x, params.filters, stride, 'same'), params.bias);
  }

  function depthwiseSeparableConv(x, params, stride) {
    const out = tf.separableConv2d(
      x,
      params.depthwise_filter,
      params.pointwise_filter,
      stride,
      'same'
    );
    return tf.add(out, params.bias);
  }

  function reductionBlock(x, params, isActivateInput) {
    let out = isActivateInput ? tf.relu(x) : x;
    out = depthwiseSeparableConv(out, params.separable_conv0, [1, 1]);
    out = depthwiseSeparableConv(tf.relu(out), params.separable_conv1, [1, 1]);
    out = tf.maxPool(out, [3, 3], [2, 2], 'same');
    out = tf.add(out, xceptionConv(x, params.expansion_conv, [2, 2]));
    return out;
  }

  function mainBlock(x, params) {
    let out = depthwiseSeparableConv(tf.relu(x), params.separable_conv0, [1, 1]);
    out = depthwiseSeparableConv(tf.relu(out), params.separable_conv1, [1, 1]);
    out = depthwiseSeparableConv(tf.relu(out), params.separable_conv2, [1, 1]);
    return tf.add(out, x);
  }

  function tinyXceptionForward(input, params, numMainBlocks) {
    const meanRgb = tf.tensor1d(AGE_MEAN_RGB);
    const normalized = tf.div(tf.sub(input, meanRgb), tf.scalar(AGE_DIVISOR));
    let out = tf.relu(xceptionConv(normalized, params.entry_flow.conv_in, [2, 2]));
    out = reductionBlock(out, params.entry_flow.reduction_block_0, false);
    out = reductionBlock(out, params.entry_flow.reduction_block_1, true);
    for (let i = 0; i < numMainBlocks; i++) {
      out = mainBlock(out, params.middle_flow[`main_block_${i}`]);
    }
    out = reductionBlock(out, params.exit_flow.reduction_block, true);
    out = tf.relu(
      depthwiseSeparableConv(out, params.exit_flow.separable_conv, [1, 1])
    );
    return out;
  }

  function ageGenderClassify(features, params) {
    const pooled = tf
      .avgPool(features, [7, 7], [2, 2], 'valid')
      .as2D(features.shape[0], -1);
    const age = tf
      .add(tf.matMul(pooled, params.fc.age.weights), params.fc.age.bias)
      .as1D();
    const genderLogits = tf.add(
      tf.matMul(pooled, params.fc.gender.weights),
      params.fc.gender.bias
    );
    const gender = tf.softmax(genderLogits);
    return { age, gender };
  }

  // Run AgeGenderNet on a single face crop (HTMLCanvasElement / Image / Video).
  async function predictAgeAndGender(faceMedia, ageGenderParams) {
    const square = imageToSquareCanvas(faceMedia, AGE_INPUT_SIZE, true);

    const { age, gender } = tf.tidy(() => {
      const tensor = tf.browser.fromPixels(square).toFloat().expandDims(0);
      const features = tinyXceptionForward(
        tensor,
        ageGenderParams.feature_extractor,
        AGE_NUM_MAIN_BLOCKS
      );
      return ageGenderClassify(features, ageGenderParams.classifier);
    });

    const ageVal = (await age.data())[0];
    const genderProbs = await gender.data();
    age.dispose();
    gender.dispose();

    const maleProb = genderProbs[0];
    const isMale = maleProb > 0.5;
    return {
      age: ageVal,
      gender: isMale ? 'male' : 'female',
      genderProbability: isMale ? maleProb : 1 - maleProb,
    };
  }

  // Differentiable preprocessing for arbitrary face image tensors [1, h, w, 3].
  // This mirrors center-pad-to-square + resize(112) used for AgeGenderNet input.
  function preprocessFaceTensorForAgeGender(imageTensor4d) {
    return tf.tidy(() => {
      const h = imageTensor4d.shape[1];
      const w = imageTensor4d.shape[2];
      let x = imageTensor4d;
      if (h !== w) {
        const dimDiff = Math.abs(h - w);
        const padBefore = Math.floor(dimDiff / 2);
        const padAfter = dimDiff - padBefore;
        const paddings =
          h > w
            ? [[0, 0], [0, 0], [padBefore, padAfter], [0, 0]]
            : [[0, 0], [padBefore, padAfter], [0, 0], [0, 0]];
        x = tf.pad(x, paddings);
      }
      if (x.shape[1] !== AGE_INPUT_SIZE || x.shape[2] !== AGE_INPUT_SIZE) {
        x = tf.image.resizeBilinear(x, [AGE_INPUT_SIZE, AGE_INPUT_SIZE]);
      }
      return x;
    });
  }

  // ------------------------------------------------------------------------
  //  Top-level model wrapper
  // ------------------------------------------------------------------------

  const ml = {
    ssdParams: null,
    ageGenderParams: null,
    isLoaded: false,
    debug: false,

    async loadModels() {
      if (this.isLoaded) return;
      const [ssdMap, ageMap] = await Promise.all([
        loadWeightMap('ssd_mobilenetv1_model'),
        loadWeightMap('age_gender_model'),
      ]);
      this.ssdParams = extractSsdParams(ssdMap);
      this.ageGenderParams = extractAgeGenderParams(
        ageMap,
        AGE_NUM_MAIN_BLOCKS
      );
      this.isLoaded = true;
    },

    toAgeGenderInputCanvas(input) {
      return imageToSquareCanvas(input, AGE_INPUT_SIZE, true);
    },

    createAgeGenderInputTensor(input) {
      const square = this.toAgeGenderInputCanvas(input);
      return tf.tidy(() =>
        tf.browser.fromPixels(square).toFloat().expandDims(0)
      );
    },

    async predictAgeGenderFromTensor(inputTensor) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const { age, gender } = tf.tidy(() => {
        const features = tinyXceptionForward(
          inputTensor,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        return ageGenderClassify(features, this.ageGenderParams.classifier);
      });

      const ageVal = (await age.data())[0];
      const genderProbs = await gender.data();
      age.dispose();
      gender.dispose();

      const maleProb = genderProbs[0];
      const isMale = maleProb > 0.5;
      return {
        age: ageVal,
        gender: isMale ? 'male' : 'female',
        genderProbability: isMale ? maleProb : 1 - maleProb,
        maleProbability: maleProb,
      };
    },

    async predictAgeGenderFromImageTensor(imageTensor4d) {
      const ageInput = preprocessFaceTensorForAgeGender(imageTensor4d);
      const out = await this.predictAgeGenderFromTensor(ageInput);
      ageInput.dispose();
      return out;
    },

    async computeAgeGenderTargetGradient(inputTensor, targetAge, targetGender) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const targetMale = targetGender === 'male' ? 1 : 0;

      const gradFn = tf.grads((x) => {
        const features = tinyXceptionForward(
          x,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        const { age, gender } = ageGenderClassify(
          features,
          this.ageGenderParams.classifier
        );

        const agePred = age.squeeze();
        const maleProb = tf.clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);

        const ageLoss = tf
          .square(tf.sub(agePred, tf.scalar(targetAge)))
          .div(tf.scalar(10000));
        const genderLoss = tf.neg(
          tf.add(
            tf.mul(tf.scalar(targetMale), tf.log(maleProb)),
            tf.mul(tf.scalar(1 - targetMale), tf.log(tf.sub(tf.scalar(1), maleProb)))
          )
        );
        return tf.add(ageLoss, genderLoss);
      });

      const [gradient] = gradFn([inputTensor]);

      const lossTensor = tf.tidy(() => {
        const features = tinyXceptionForward(
          inputTensor,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        const { age, gender } = ageGenderClassify(
          features,
          this.ageGenderParams.classifier
        );
        const agePred = age.squeeze();
        const maleProb = tf.clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);
        const ageLoss = tf
          .square(tf.sub(agePred, tf.scalar(targetAge)))
          .div(tf.scalar(10000));
        const genderLoss = tf.neg(
          tf.add(
            tf.mul(tf.scalar(targetMale), tf.log(maleProb)),
            tf.mul(tf.scalar(1 - targetMale), tf.log(tf.sub(tf.scalar(1), maleProb)))
          )
        );
        return tf.add(ageLoss, genderLoss);
      });

      const loss = (await lossTensor.data())[0];
      lossTensor.dispose();

      const prediction = await this.predictAgeGenderFromTensor(inputTensor);
      return { gradient, loss, prediction };
    },

    async computeAgeGenderTargetGradientForImageTensor(
      imageTensor4d,
      targetAge,
      targetGender
    ) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const targetMale = targetGender === 'male' ? 1 : 0;

      const gradFn = tf.grads((x) => {
        const ageInput = preprocessFaceTensorForAgeGender(x);
        const features = tinyXceptionForward(
          ageInput,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        const { age, gender } = ageGenderClassify(
          features,
          this.ageGenderParams.classifier
        );
        const agePred = age.squeeze();
        const maleProb = tf
          .clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);
        const ageLoss = tf
          .square(tf.sub(agePred, tf.scalar(targetAge)))
          .div(tf.scalar(10000));
        const genderLoss = tf.neg(
          tf.add(
            tf.mul(tf.scalar(targetMale), tf.log(maleProb)),
            tf.mul(
              tf.scalar(1 - targetMale),
              tf.log(tf.sub(tf.scalar(1), maleProb))
            )
          )
        );
        return tf.add(ageLoss, genderLoss);
      });

      const [gradient] = gradFn([imageTensor4d]);

      const lossTensor = tf.tidy(() => {
        const ageInput = preprocessFaceTensorForAgeGender(imageTensor4d);
        const features = tinyXceptionForward(
          ageInput,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        const { age, gender } = ageGenderClassify(
          features,
          this.ageGenderParams.classifier
        );
        const agePred = age.squeeze();
        const maleProb = tf
          .clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);
        const ageLoss = tf
          .square(tf.sub(agePred, tf.scalar(targetAge)))
          .div(tf.scalar(10000));
        const genderLoss = tf.neg(
          tf.add(
            tf.mul(tf.scalar(targetMale), tf.log(maleProb)),
            tf.mul(
              tf.scalar(1 - targetMale),
              tf.log(tf.sub(tf.scalar(1), maleProb))
            )
          )
        );
        return tf.add(ageLoss, genderLoss);
      });

      const loss = (await lossTensor.data())[0];
      lossTensor.dispose();

      const prediction = await this.predictAgeGenderFromImageTensor(imageTensor4d);
      return { gradient, loss, prediction };
    },

    async computeGenderTargetGradientForImageTensor(imageTensor4d, targetGender) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const targetMale = targetGender === 'male';

      const gradFn = tf.grads((x) => {
        return tf.tidy(() => {
          const ageInput = preprocessFaceTensorForAgeGender(x);
          const features = tinyXceptionForward(
            ageInput,
            this.ageGenderParams.feature_extractor,
            AGE_NUM_MAIN_BLOCKS
          );
          const { gender } = ageGenderClassify(
            features,
            this.ageGenderParams.classifier
          );
          const maleProb = tf
            .clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);
          const targetProb = targetMale ? maleProb : tf.sub(tf.scalar(1), maleProb);
          // Targeted objective: maximize p(targetGender) <=> minimize -log(p_target)
          return tf.neg(tf.log(targetProb));
        });
      });

      const [gradient] = gradFn([imageTensor4d]);

      const lossTensor = tf.tidy(() => {
        const ageInput = preprocessFaceTensorForAgeGender(imageTensor4d);
        const features = tinyXceptionForward(
          ageInput,
          this.ageGenderParams.feature_extractor,
          AGE_NUM_MAIN_BLOCKS
        );
        const { gender } = ageGenderClassify(
          features,
          this.ageGenderParams.classifier
        );
        const maleProb = tf
          .clipByValue(gender.slice([0, 0], [1, 1]).squeeze(), 1e-6, 1 - 1e-6);
        const targetProb = targetMale ? maleProb : tf.sub(tf.scalar(1), maleProb);
        return tf.neg(tf.log(targetProb));
      });

      const loss = (await lossTensor.data())[0];
      lossTensor.dispose();

      const prediction = await this.predictAgeGenderFromImageTensor(imageTensor4d);
      return { gradient, loss, prediction };
    },

    async runGenderTargetedAttackForImageTensor(
      imageTensor4d,
      targetGender,
      options
    ) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const {
        mode = 'multi',
        epsilon = 4,
        steps = 8,
        alpha = null,
      } = options || {};

      if (mode !== 'single' && mode !== 'multi') {
        throw new Error(`Unknown attack mode: ${mode}`);
      }

      const base = imageTensor4d.clone();
      let adv = imageTensor4d.clone();
      let lastGradient = null;
      let lastLoss = 0;

      try {
        if (mode === 'single') {
          const { gradient, loss } =
            await this.computeGenderTargetGradientForImageTensor(
              adv,
              targetGender
            );
          lastGradient = gradient;
          lastLoss = loss;
          const nextAdv = tf.tidy(() => {
            const signedGrad = tf.sign(lastGradient);
            return tf.clipByValue(
              tf.sub(adv, tf.mul(signedGrad, tf.scalar(epsilon))),
              0,
              255
            );
          });
          adv.dispose();
          adv = nextAdv;
        } else {
          const stepSize = alpha == null ? epsilon / Math.max(steps, 1) : alpha;
          const iterSteps = Math.max(1, Math.floor(steps));
          for (let i = 0; i < iterSteps; i++) {
            const { gradient, loss } =
              await this.computeGenderTargetGradientForImageTensor(
                adv,
                targetGender
              );
            if (lastGradient) {
              lastGradient.dispose();
            }
            lastGradient = gradient;
            lastLoss = loss;

            const nextAdv = tf.tidy(() => {
              const signedGrad = tf.sign(lastGradient);
              const stepped = tf.sub(adv, tf.mul(signedGrad, tf.scalar(stepSize)));
              // L_inf projection around original image.
              const lower = tf.sub(base, tf.scalar(epsilon));
              const upper = tf.add(base, tf.scalar(epsilon));
              const projected = tf.minimum(tf.maximum(stepped, lower), upper);
              return tf.clipByValue(projected, 0, 255);
            });
            adv.dispose();
            adv = nextAdv;
          }
        }

        const prediction = await this.predictAgeGenderFromImageTensor(adv);
        return {
          perturbed: adv,
          gradient: lastGradient,
          loss: lastLoss,
          prediction,
        };
      } catch (err) {
        adv.dispose();
        if (lastGradient) {
          lastGradient.dispose();
        }
        throw err;
      } finally {
        base.dispose();
      }
    },

    async detectFacesOnly(input) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      return detectFaces(input, this.ssdParams);
    },

    // Returns: [{ score, box: {x,y,width,height}, imageDims, age, gender,
    //            genderProbability }]
    async detect(input) {
      if (!this.isLoaded) throw new Error('Models not loaded yet.');
      const detections = await detectFaces(input, this.ssdParams);
      const enriched = [];
      for (const det of detections) {
        const faceCanvas = cropFace(input, det.box);
        const ag = await predictAgeAndGender(faceCanvas, this.ageGenderParams);
        enriched.push(Object.assign({}, det, ag));
      }
      return enriched;
    },
  };

  // ------------------------------------------------------------------------
  //  Drawing helper
  // ------------------------------------------------------------------------

  function drawDetections(canvas, detections) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detections.length) return;

    const ref = detections[0].imageDims;
    const scaleX = canvas.width / ref.width;
    const scaleY = canvas.height / ref.height;

    ctx.font = '14px Arial';
    ctx.textBaseline = 'top';

    for (const det of detections) {
      const x = det.box.x * scaleX;
      const y = det.box.y * scaleY;
      const w = det.box.width * scaleX;
      const h = det.box.height * scaleY;

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0a84ff';
      ctx.strokeRect(x, y, w, h);

      const lines = [
        `${Math.round(det.age)} years`,
        `${det.gender} (${Math.round(det.genderProbability * 100)}%)`,
      ];
      const lineH = 18;
      const padding = 4;
      const labelH = lineH * lines.length + padding * 2;
      const labelW =
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;
      let labelY = y - labelH;
      if (labelY < 0) labelY = y + h;

      ctx.fillStyle = '#0a84ff';
      ctx.fillRect(x, labelY, labelW, labelH);
      ctx.fillStyle = 'white';
      lines.forEach((line, i) => {
        ctx.fillText(line, x + padding, labelY + padding + i * lineH);
      });
    }
  }

  // ------------------------------------------------------------------------
  //  Public interface
  // ------------------------------------------------------------------------

  global.ml = ml;
  global.drawDetections = drawDetections;
})(window);
