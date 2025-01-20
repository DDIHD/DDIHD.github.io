var classes = {0: 'background',
  1: 'person',
  2: 'bicycle',
  3: 'car',
  4: 'motorcycle',
  5: 'airplane',
  6: 'bus',
  7: 'train',
  8: 'truck',
  9: 'boat',
  10: 'traffic light',
  11: 'fire hydrant',
  12: 'stop sign',
  13: 'parking meter',
  14: 'bench',
  15: 'bird',
  16: 'cat',
  17: 'dog',
  18: 'horse',
  19: 'sheep',
  20: 'cow',
  21: 'elephant',
  22: 'bear',
  23: 'zebra',
  24: 'giraffe',
  25: 'backpack',
  26: 'umbrella',
  27: 'handbag',
  28: 'tie',
  29: 'suitcase',
  30: 'frisbee',
  31: 'skis',
  32: 'snowboard',
  33: 'sports ball',
  34: 'kite',
  35: 'baseball bat',
  36: 'baseball glove',
  37: 'skateboard',
  38: 'surfboard',
  39: 'tennis racket',
  40: 'bottle',
  41: 'wine glass',
  42: 'cup',
  43: 'fork',
  44: 'knife',
  45: 'spoon',
  46: 'bowl',
  47: 'banana',
  48: 'apple',
  49: 'sandwich',
  50: 'orange',
  51: 'broccoli',
  52: 'carrot',
  53: 'hot dog',
  54: 'pizza',
  55: 'donut',
  56: 'cake',
  57: 'chair',
  58: 'couch',
  59: 'potted plant',
  60: 'bed',
  61: 'dining table',
  62: 'toilet',
  63: 'tv',
  64: 'laptop',
  65: 'mouse',
  66: 'remote',
  67: 'keyboard',
  68: 'cell phone',
  69: 'microwave',
  70: 'oven',
  71: 'toaster',
  72: 'sink',
  73: 'refrigerator',
  74: 'book',
  75: 'clock',
  76: 'vase',
  77: 'scissors',
  78: 'teddy bear',
  79: 'hair drier',
  80: 'toothbrush'}


  var classes_de = {
    0: "Hintergrund",
    1: "Person",
    2: "Fahrrad",
    3: "Auto",
    4: "Motorrad",
    5: "Flugzeug",
    6: "Bus",
    7: "Zug",
    8: "LKW",
    9: "Boot",
    10: "Ampel",
    11: "Feuerhydrant",
    12: "Stoppschild",
    13: "Parkuhr",
    14: "Bank",
    15: "Vogel",
    16: "Katze",
    17: "Hund",
    18: "Pferd",
    19: "Schaf",
    20: "Kuh",
    21: "Elefant",
    22: "Bär",
    23: "Zebra",
    24: "Giraffe",
    25: "Rucksack",
    26: "Regenschirm",
    27: "Handtasche",
    28: "Krawatte",
    29: "Koffer",
    30: "Frisbee",
    31: "Ski",
    32: "Snowboard",
    33: "Sportball",
    34: "Drachen",
    35: "Baseballschläger",
    36: "Baseballhandschuh",
    37: "Skateboard",
    38: "Surfbrett",
    39: "Tennisschläger",
    40: "Flasche",
    41: "Weinglas",
    42: "Tasse",
    43: "Gabel",
    44: "Besteck",
    45: "Löffel",
    46: "Schüssel",
    47: "Banane",
    48: "Apfel",
    49: "Sandwich",
    50: "Orange",
    51: "Brokkoli",
    52: "Karotte",
    53: "Hotdog",
    54: "Pizza",
    55: "Donut",
    56: "Kuchen",
    57: "Stuhl",
    58: "Sofa",
    59: "Topfpflanze",
    60: "Bett",
    61: "Esstisch",
    62: "Toilette",
    63: "Fernseher",
    64: "Laptop",
    65: "Maus",
    66: "Fernbedienung",
    67: "Tastatur",
    68: "Handy",
    69: "Mikrowelle",
    70: "Ofen",
    71: "Toaster",
    72: "Spüle",
    73: "Kühlschrank",
    74: "Buch",
    75: "Uhr",
    76: "Vase",
    77: "Schere",
    78: "Teddybär",
    79: "Haartrockner",
    80: "Zahnbürste"
  }
  


const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const confidenceSlider = document.getElementById('confidenceSlider');
const confidenceValue = document.getElementById('confidenceValue');

// Hide slider container by default
document.querySelector('.slider-container').style.display = 'none';


// Add pink square button
const pinkSquare = document.createElement('div');
pinkSquare.style = `
  position: fixed;
  top: 10px;
  left: 10px;
  width: 40px;
  height: 40px;
  background-color: rgba(211, 131, 248, 0.8);
  cursor: pointer;
  z-index: 1000;
`;

// Create classes button (hidden by default)
const classesButton = document.createElement('div');
classesButton.style = `
  position: fixed;
  top: 60px;
  left: 10px;
  width: 40px;
  height: 40px;
  background-color: rgba(211, 131, 248, 0.8);
  cursor: pointer;
  z-index: 1000;
  display: none;
`;

// Create classes modal
const classesModal = document.createElement('div');
classesModal.style = `
  display: none;
  position: fixed;
  top: 60px;
  left: 60px;
  padding: 20px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  z-index: 1001;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  max-height: 80vh;
  overflow-y: auto;
`;

// Add class names to classes modal
const classesList = Object.values(classes_de).slice(1).map(className => 
  `<div style="padding: 5px 0;">${className}</div>`
).join('');

classesModal.innerHTML = `
  <div style="position: relative;">
    <span style="position: absolute; top: -15px; left: -15px; cursor: pointer; font-weight: bold;">×</span>
    ${classesList}
  </div>
`;

// Create input modal
const modal = document.createElement('div');
modal.style = `
  display: none;
  position: fixed;
  top: 60px;
  left: 10px;
  padding: 20px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  z-index: 1001;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

modal.innerHTML = `
  <div style="position: relative;">
    <span style="position: absolute; top: -15px; right: -15px; cursor: pointer; font-weight: bold;">×</span>
    <input type="text" style="margin-right: 5px;">
    <button>Speichern</button>
  </div>
`;

// Add elements to DOM
liveView.appendChild(pinkSquare);
liveView.appendChild(classesButton);
liveView.appendChild(modal);
liveView.appendChild(classesModal);

// Event listeners for input modal
pinkSquare.addEventListener('click', (e) => {
  e.stopPropagation();
  modal.style.display = 'block';
});

// Event listener for classes button
classesButton.addEventListener('click', (e) => {
  e.stopPropagation();
  classesModal.style.display = 'block';
});

// Handle form submission
modal.querySelector('button').addEventListener('click', () => {
  const input = modal.querySelector('input').value.toLowerCase();
  if (input === 'slider') {
    document.querySelector('.slider-container').style.display = 'block';
  } else if (input === 'klassen') {
    classesButton.style.display = 'block';
  }
  modal.style.display = 'none';
  modal.querySelector('input').value = '';
});

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  if (!modal.contains(e.target) && e.target !== pinkSquare) {
    modal.style.display = 'none';
  }
  if (!classesModal.contains(e.target) && e.target !== classesButton) {
    classesModal.style.display = 'none';
  }
});

// Close button handlers
modal.querySelector('span').addEventListener('click', () => {
  modal.style.display = 'none';
});

classesModal.querySelector('span').addEventListener('click', () => {
  classesModal.style.display = 'none';
});

// Store the resulting model in the global scope of our app.
var model = undefined;
var children = [];

// Check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}






// Enable the live webcam view and start classification.
function enableCam() {
  // Only continue if the COCO-SSD has finished loading.
  if (!model) {
    return;
  }

  // getUsermedia parameters to force video but not audio.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.
cocoSsd.load({modelUrl:"model/model.json"}).then(function (loadedModel) {
  model = loadedModel;
  // Show demo section now model is ready to use.
  demosSection.classList.remove('invisible');
  enableCam();
});

confidenceSlider.addEventListener('input', function() {
  confidenceValue.textContent = this.value + '%';
});

function predictWebcam() {
  model.detect(video).then(function (predictions) {
    // Remove any highlighting we did previous frame.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Get video position and dimensions
    const videoRect = video.getBoundingClientRect();
    const confidenceThreshold = confidenceSlider.value / 100;

    for (let n = 0; n < predictions.length; n++) {
      if (predictions[n].score > confidenceThreshold) {
        const p = document.createElement('p');
        const en_string = predictions[n].class;
        const string_key = Object.keys(classes).find(key => classes[key] === en_string);
        const de_string = string_key ? classes_de[string_key] : en_string;
        
        // Calculate scaled positions based on video's actual display size
        const scaleX = videoRect.width / video.videoWidth;
        const scaleY = videoRect.height / video.videoHeight;
        
        const x = videoRect.left + predictions[n].bbox[0] * scaleX;
        const y = videoRect.top + predictions[n].bbox[1] * scaleY;
        const width = predictions[n].bbox[2] * scaleX;
        const height = predictions[n].bbox[3] * scaleY;

        p.innerText = de_string + ' - Sicherheit: '
            + Math.round(parseFloat(predictions[n].score) * 100)
            + '%';
        p.style = `
          margin-left: ${x}px;
          margin-top: ${y}px;
          width: ${width - 10}px;
          top: 0;
          left: 0;
          position: fixed;
          font-size: 20px;
        `;

        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.style = `
          left: ${x}px;
          top: ${y}px;
          width: ${width}px;
          height: ${height}px;
          position: fixed;
        `;

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }

    window.requestAnimationFrame(predictWebcam);
  });
}




