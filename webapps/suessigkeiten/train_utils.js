
var batch_imgs;
var batch_start;
var batch_end;

var tooltip = true;
var auto = false;

function createModel(numFeatures=512, numUnits=128, numClasses=13) {
    // Define the model
    const model = tf.sequential();
    model.add(tf.layers.dense({inputShape: [numFeatures], units: numClasses, activation: 'softmax'}));
    // model.add(tf.layers.dense({inputShape: [numFeatures], units: numUnits, activation: 'relu'}));
    // model.add(tf.layers.dense({units: numClasses, activation: 'softmax'}));

    // Compile the model
    const learning_rate = 0.001;
    const optimizer = tf.train.adam(learning_rate);
    model.compile({
        optimizer: optimizer,
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy']
    });

    return model;
}

async function inference_step(model, batchFeatures) {
    // model prediction on batch without training
    const predictions = model.predict(batchFeatures);
    // get probabilities
    const probs = predictions.arraySync();
    // get predicted class
    const predClass = predictions.argMax(1).arraySync();

    return {probs, predClass};

}

// calculate accuracy of prediction
async function calculateAccuracy(predClass, batchLabels) {
    bl = await batchLabels.array();
    const correct = predClass.map((pred, i) => pred === bl[i]);
    return [correct, correct.filter(Boolean).length / correct.length];
}

async function trainStep(model, batchFeatures, batchLabels) {
    const history = await model.trainOnBatch(batchFeatures, batchLabels);

    loss = history[0];
    acc = history[1];
    return {loss, acc};
}

async function get_batch(inputData, outputData, batch_idx, batchSize=4) {
    batch_start = batch_idx * batchSize;
    batch_end = batch_start + batchSize;


    batch_imgs = [];
    for (let i = batch_start; i < batch_end; i++) {
        batch_imgs.push(trainData[i][513]);
    }
    

    const batchFeatures = inputData.slice([batch_start, 0], [batchSize, 512]);
    const batchLabels = outputData.slice([batch_start], [batchSize]);
    return {batchFeatures, batchLabels};
}

const stratifyData = (data, labelIndex, testRatio) => {
    const trainData = [];
    const testData = [];

    // Group data by label
    const groupedByLabel = data.reduce((acc, item) => {
      const label = item[labelIndex];
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(item);
      return acc;
    }, {});

    // Split each group into train and test datasets
    Object.keys(groupedByLabel).forEach(label => {
      const items = groupedByLabel[label];
      const splitIndex = Math.floor(items.length * (1 - testRatio));
      trainData.push(...items.slice(0, splitIndex).map(item => JSON.parse(JSON.stringify(item))));
      testData.push(...items.slice(splitIndex).map(item => JSON.parse(JSON.stringify(item))));
    });

    return { trainData, testData };
  };

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// get a list of lists as argument, every row has a base64 encoded image at 
// position row[513]. Set div of all images as child of given id
function displayImages(images, id) {
    const container = document.getElementById(id);
    
    // Create a new div to contain all the images
    const imagesDiv = document.createElement('div');
    imagesDiv.style.flexWrap = 'wrap';
    imagesDiv.style.width = '100%';
    
    images.forEach(row => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${row[513]}`;
        // set image style to 10x10 pixels
        img.style.width = '1vw';
        imagesDiv.appendChild(img);
    });
    
    // Append the new div to the container
    container.appendChild(imagesDiv);
}


function displaySplit(trainData, testData, id, divider = false) {
    const container = document.getElementById(id);
    container.innerHTML = ''; // Clear any existing content

    const div = document.createElement('div');

    // Add Trainingsbilder text
    const trainText = document.createElement('p');
    trainText.textContent = 'Trainingsbilder';
    trainText.style.fontSize = '1.5vw';
    trainText.style.fontWeight = 'bold';
    div.appendChild(trainText);

    // Add train images
    trainData.forEach((row, index) => {

        // if index is >= 144 do nothing
        if (index >= 144){
            return;
        }

        const img = document.createElement('img');
        img.src = `data:image/png;base64,${row[513]}`;
        img.style.width = '2%';
        div.appendChild(img);

        // Add a space and vertical line after every 4 images if divider is true
        if (divider && (index + 1) % 4 === 0) {
            const space = document.createElement('span');
            space.style.display = 'inline-block';
            space.style.width = '1vw';
            div.appendChild(space);

            const verticalLine = document.createElement('span');
            verticalLine.style.display = 'inline-block';
            verticalLine.style.borderLeft = '1px solid black';
            verticalLine.style.height = '1.5vw';
            div.appendChild(verticalLine);

            const spaceAfterLine = document.createElement('span');
            spaceAfterLine.style.display = 'inline-block';
            spaceAfterLine.style.width = '1vw';
            div.appendChild(spaceAfterLine);
        }
    });

    // Add a new line
    div.appendChild(document.createElement('br'));

    // Add Testbilder text
    const testText = document.createElement('p');
    testText.textContent = 'Testbilder';
    testText.style.fontSize = '1.5vw';
    testText.style.fontWeight = 'bold';
    div.appendChild(testText);

    // Add test images
    testData.forEach(row => {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${row[513]}`;
        img.style.width = '2%';
        div.appendChild(img);
    });

    // Set the div as the only child of the given id
    container.appendChild(div);
}


function mean(array) {
    // Check if the array is empty
    if (array.length === 0) return 0;

    // Calculate the sum of all elements in the array
    const sum = array.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    // Calculate the mean (average)
    const mean = sum / array.length;

    return mean;
}


const numFeatures = 512
var step_id = 0;
const init_steps = [    'datenladen', 
                        'trainsplit',
                        'modellerstellen',
                        'mischen',
                        'batchentnehmen',
                        'vorhersage',
                        'fehlerberechnen',
                        'lernen',
                        'evaluieren'
            ];



var model = createModel();
var weights;
var { trainData, testData } = stratifyData(train_data, 512, 0.2);

// fake for now as training on embeddings without augmentation every epoch
// completely overfits the little training data we have, test stays at chance level sadly
sel_test = [0,1,3,5,6,7,9,10,11,12,13,14,15,16,17,18,19,20,22,23,24,26, 29,30,31]
// add sel_test indices of testData to trainData
sel_test.forEach(idx => {
    trainData.push(testData[idx]);
});




var train_features;
var train_labels;
var test_features;
var test_labels;


var batch_size = 4;
var epochs = 25;
var current_epoch = 0;

var batchIdx = 0;

// create list of integers from 0 to number of batches
var avail_batches = [...Array(Math.floor(trainData.length / batch_size)).keys()];
var train_batches;
var batchFeatures, batchLabels;

var probs, predClass;
var correct, accuracy;

var pause = false;

var train_acc = [[0]];
var test_acc = [[0]];


var data = train_acc.map((y, index) => ({ x: index, y: mean(y) }));
var test_data = test_acc.map((y, index) => ({ x: index, y: mean(y) }));

 // Set the dimensions and margins of the graph
 const margin = { top: 20, right: 30, bottom: 30, left: 80 },
       width = 600 - margin.left - margin.right,
       height = 400 - margin.top - margin.bottom;

 // Append the svg object to the body of the page
var svg;
var x;
var y;
var xAxis;
var yAxis;



 // Create the line generator
 var line;
 var testLine;

var path;
var test_path;

// Function to update the graph with new data
function updateGraph() {
    // Convert y-values to array of objects with x and y properties
    data = train_acc.map((y, index) => ({ x: index, y: mean(y) }));
    test_data = test_acc.map((y, index) => ({ x: index, y: mean(y) }));

    // Update the x-axis
    xAxis.call(d3.axisBottom(x)
        .tickSize(10)
        .tickPadding(10))
        .style("font-size", "20px");

    // Update the y-axis
    yAxis.call(d3.axisLeft(y)
        .tickSize(10)
        .tickPadding(10))
        .style("font-size", "20px");

    // Update the main line path
    path.datum(data)
        .attr("d", line)
        .style("stroke-width", "3px");

    // Update the test line path
    test_path.datum(test_data)
        .attr("d", testLine)
        .style("stroke-width", "3px");

    // Update circles for main data points
    let circles = svg.selectAll(".datapoint")
        .data(data);

    circles.enter()
        .append("circle")
        .attr("class", "datapoint")
        .merge(circles)
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", 5)
        .style("fill", "steelblue");

    circles.exit().remove();

    // Update circles for test data points
    let testCircles = svg.selectAll(".testdatapoint")
        .data(test_data);

    testCircles.enter()
        .append("circle")
        .attr("class", "testdatapoint")
        .merge(testCircles)
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", 5)
        .style("fill", "red");

    testCircles.exit().remove();


}




var classes = [
    "Balla",
    "Fledermaus",
    "Frosch",
    "Gummibaerchen",
    "Himbeere",
    "Obst",
    "Rohr",
    "Rolle",
    "Saeulen",
    "Sandwich",
    "Stab",
    "Stern",
    "Zuckerstab"
  ];


  
function createHistogramPlot(data, classes, containerId, width = 600, height = 300) {
    // Set up margins
    const margin = {top: 40, right: 30, bottom: 120, left: 60};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
  
    const div = document.getElementById(containerId);
    const svgs = div.querySelectorAll('svg');
    svgs.forEach(svg => svg.remove());
  
    // Create SVG
    const svg = d3.select(`#${containerId}`)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Create scales
    const xScale = d3.scaleBand()
      .domain(classes)
      .range([0, innerWidth])
      .padding(0.1);
  
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);
  
    // Create bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
        .attr("x", (d, i) => xScale(classes[i]))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d))
        .attr("fill", "steelblue");
  
    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("font-size", "20px")
        .style("text-anchor", "end");
  
    // Add y-axis
    svg.append("g")
      .call(d3.axisLeft(yScale).ticks(1 / 0.2)) 
      .style("font-size", "20px");
  
    // Add horizontal lines
    const horizontalLines = [0.2, 0.4, 0.6, 0.8];
    svg.selectAll(".horizontalLine")
      .data(horizontalLines)
      .enter()
      .append("line")
        .attr("class", "horizontalLine")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 1);
  
    // Add y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .text("Konfidenz");
  }
  



async function plot_batch_imgs(imgs){
        const train_batch = document.getElementById('train_batch');
        // delete inner html
        train_batch.innerHTML = '';
        
        imgs.forEach((row, index) => {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${row}`;
            img.style.width = '12%';
            img.style.paddingRight = '4%';
            train_batch.appendChild(img);
        });
}




async function plot_batch_preds(){

    for (let i = 0; i < 4; i++) {
        const pred_class = predClass[i];
        const pred_probs = probs[i];
        const pred_img = batch_imgs[i];

        const img = document.getElementById(`predimg${i+1}`);
        img.src = `data:image/png;base64,${pred_img}`;
        img.style.width = '6%';
        img.style.paddingRight = '2%';
        img.style.visibility = 'visible';

        const pred_label = document.getElementById(`predstring${i+1}`);
        pred_label.textContent = `Vorhersage: ${classes[pred_class]}`;


        createHistogramPlot(pred_probs, classes, `pred${i+1}`);
    }

}

async function plot_batch_true(correct, batchLabels){

    bl = await batchLabels.array();


    for (let i = 0; i < 4; i++) {
        const true_class = bl[i];
        const correct_pred = correct[i];

        const pred_label = document.getElementById(`predstring${i+1}`);
        const true_label = document.getElementById(`truestring${i+1}`);

        true_label.textContent = `Korrekt: ${classes[true_class]}`;

        // make strings green if correct, red if not
        pred_label.style.color = correct_pred ? 'green' : 'red';
        true_label.style.color = correct_pred ? 'green' : 'red';

    }

}

async function clear_display(){
    const div = document.getElementById('trainfehler');
    const svgs = div.querySelectorAll('svg');
    svgs.forEach(svg => svg.remove());
    const imgs = div.querySelectorAll('img');
    imgs.forEach(img => img.style.visibility='hidden');
    const ps = div.querySelectorAll('p');
    ps.forEach(p => p.textContent=' ');
    ps.forEach(p => p.style.color='black');
    
}


async function plot_model() {
    const div = document.getElementById('modelicon');
    
    // Clear any existing content in the div
    div.innerHTML = '';

    // Get the weights
    weights = await model.layers[0].getWeights();
    weights = await weights[0].arraySync().flat();

    // Define dimensions
    const width = 520; // 5 pixels per point
    const height = 320; // 5 pixels per point
    const rows = 64;
    const cols = 104;

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([-0.001, 0.001]);
        // .domain([d3.min(weights), d3.max(weights)]);

    // Create SVG
    const svg = d3.select('#modelicon')
        .append('svg')
        // .attr('height', height);
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")

    // Create rectangles for each weight
    svg.selectAll('rect')
        .data(weights)
        .enter()
        .append('rect')
        .attr('x', (d, i) => (i % cols) * 5)
        .attr('y', (d, i) => Math.floor(i / cols) * 5)
        .attr('width', 5)
        .attr('height', 5)
        .attr('fill', d => colorScale(d));
}


async function plot_lernen(){
    const div = document.getElementById('lernenicon');
    div.innerHTML = '';
    div.style.display = 'grid';

    accuracy1 = (accuracy * 100).toFixed(0);

    const p_div = document.createElement('div');
    const p = document.createElement('p'); 
    p.textContent = `Batch-Genauigkeit: ${accuracy1}%`; 
    p.style.fontSize = '16px';
    p.style.fontWeight = 'bold';
    // p_div.style.height = '20%';
    p_div.appendChild(p);
    div.appendChild(p_div);
    
    const correct_div = document.createElement('div');
    // correct_div.style.height = '40%';
    const incorrect_div = document.createElement('div');
    // incorrect_div.style.height = '40%';

    const pcor = document.createElement('p'); 
    pcor.textContent = `Korrekt vorhergesagt (bestärken):`; 
    pcor.style.fontSize = '16px';
    pcor.style.fontWeight = 'bold';
    correct_div.appendChild(pcor);

    const pincor = document.createElement('p');
    pincor.textContent = `Falsch vorhergesagt (bestrafen):`;
    pincor.style.fontSize = '16px';
    pincor.style.fontWeight = 'bold';
    incorrect_div.appendChild(pincor);

    for(let i = 0; i < 4; i++){
        const pred_i = predClass;
        const correct_i = correct[i];

        if (correct_i){
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${batch_imgs[i]}`;
            img.style.width = '8%';
            img.style.paddingRight = '4%';
            correct_div.appendChild(img);
        } else{
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${batch_imgs[i]}`;
            img.style.width = '8%';
            img.style.paddingRight = '4%';
            incorrect_div.appendChild(img);
        }
    }

    div.appendChild(correct_div);
    div.appendChild(incorrect_div);


}


async function highlight_step(targetIds) {
    // Remove the class from all elements that have it
    const elementsWithRedFrame = document.querySelectorAll('.red-frame');
    elementsWithRedFrame.forEach(element => {
        element.classList.remove('red-frame');
    });

    if (tooltip){

        // Add the class to the specified elements by ids
        targetIds.forEach(id => {
            const targetElement = document.getElementById(id);
            if (targetElement) {
                targetElement.classList.add('red-frame');
            } else {
                console.warn(`Element with id "${id}" not found.`);
            }
        });
    }
}



// function with switch case given a string as argument
async function executeStep(step) {
    switch(step) {
    case 'datenladen':
        displayImages(train_data, 'data');
        await highlight_step(['datenladen', 'data']);
        return 1;
    case 'trainsplit':
        displaySplit(trainData, testData, 'data');
        await highlight_step(['trainsplit', 'data']);


        test_features = testData.map(row => row.slice(0, numFeatures));
        test_features = tf.tensor2d(test_features);
        test_labels = testData.map(row => parseInt(row[numFeatures], 10));
        test_labels = tf.tensor1d(test_labels, 'float32');
        return 1;
    case 'modellerstellen':
        await highlight_step(['modellerstellen', 'modelicon']);
        await plot_model();
        return 1;
    case 'mischen':
        shuffleArray(trainData);
        await highlight_step(['mischen', 'data']);

        train_batches = [...avail_batches];
        train_features = trainData.map(row => row.slice(0, numFeatures));
        train_features = tf.tensor2d(train_features);
        train_labels = trainData.map(row => parseInt(row[numFeatures], 10));
        train_labels = tf.tensor1d(train_labels, 'float32');


        train_acc.push([]);

        displaySplit(trainData, testData, 'data', divider = true);
        return 1;
    case 'batchentnehmen':
        ({batchFeatures, batchLabels} = await get_batch(train_features, train_labels, train_batches.shift(), batch_size));
        await plot_batch_imgs(batch_imgs);
        await clear_display();
        await highlight_step(['batchentnehmen', 'data', 'train_batch']);
        return 1;  
    case 'vorhersage':
        ({probs, predClass} = await inference_step(model, batchFeatures));
        await plot_batch_preds();
        await highlight_step(['vorhersage', 'trainfehler']);
        return 1;
    case 'fehlerberechnen':
        ([correct, accuracy] = await calculateAccuracy(predClass, batchLabels));
        train_acc[current_epoch+1].push(accuracy);
        await plot_batch_true(correct, batchLabels)
        updateGraph();
        await highlight_step(['fehlerberechnen', 'acc-graph', 'trainfehler']);
        return 1;  
    case 'lernen':
        ({loss, acc} = await trainStep(model, batchFeatures, batchLabels));
        await plot_lernen()
        await plot_model();
        await highlight_step(['lernen', 'modelicon', 'lernenicon']);
        return 1;
    case 'evaluieren':
        ({batchFeatures, batchLabels} = await get_batch(test_features, test_labels, 0, test_features.shape[0]));
        ({probs, predClass} = await inference_step(model, batchFeatures));
        ([correct, accuracy] = await calculateAccuracy(predClass, batchLabels));
        test_acc.push([accuracy]);
        updateGraph();
        await highlight_step(['evaluieren', 'acc-graph', 'data']);
        return 1;  

      default:
        return 0;
    }
  }



async function schritt(){
    var step;
    // if (step_id<3){
    step = init_steps[step_id];
    // }else if ( (step_id<18) && (avail_batches.length > 0) ){
    //     step = train_steps[step_id % train_steps.length];
    // }
    console.log(step);
    await executeStep(step);
    
    step_id += 1;

    if ( (step_id == 8) && (train_batches.length > 0) ){
        step_id = 4;
    
    };
    if ( (step_id == 9) && (current_epoch < epochs) ){
        step_id = 3;
        current_epoch += 1;
        console.log('next epoch: ', current_epoch);
    }
}




async function show_pred(){

    // get element with id pred_modal
    const modal = document.getElementById("pred_modal_ct");
    // clear modal
    modal.innerHTML = '';

    const metrics = document.createElement('div');
    modal.appendChild(metrics);

    

    // append h1 to modal
    const h1 = document.createElement('h1');
    h1.textContent = 'Trainingsdaten Vorhersage';

    modal.appendChild(h1);

    var tr = await train_labels.array();
    // Assuming you have the inference_step and calculateAccuracy functions defined elsewhere
    await (async () => {
        const { probs, predClass } = await inference_step(model, train_features);
        const [correct, accuracy] = await calculateAccuracy(predClass, train_labels);

        // append accuracy to and number of correct predictions to metrics div
        const acc = document.createElement('p');
        // make accuracy a percentage with no decimals
        accuracy1 = (accuracy * 100).toFixed(0);
        acc.textContent = `Train Accuracy: ${accuracy1}%`;
        metrics.appendChild(acc);


        // Assuming trainData is an array of rows where each row contains the base64 image data at index 513
        trainData.forEach((row, index) => {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${row[513]}`;
            img.style.width = '80px';

            // Create a container div for each image and its labels
            const container = document.createElement('div');
            container.style.display = 'inline-block';
            container.style.margin = '10px';
            container.style.textAlign = 'center';

            const pc = predClass[index];
            const lb = tr[index];

            // Create a label for the predicted class
            const predLabel = document.createElement('p');
            predLabel.textContent = `Prediction: ${classes[pc]}`;
            predLabel.style.color = pc === lb ? 'green' : 'red';

            // Create a label for the correct class
            const correctLabel = document.createElement('p');
            correctLabel.textContent = `Correct: ${classes[lb]}`;
            correctLabel.style.color = pc === lb ? 'green' : 'red';


            // Append the image and labels to the container
            container.appendChild(img);
            container.appendChild(predLabel);
            container.appendChild(correctLabel);

            // Append the container to the body
            // document.body.appendChild(container);
            modal.appendChild(container);
        });
    })();


    // append 100px high div with full width with full black background to document.body.
    // dd = document.createElement('div');
    // dd.style.height = '300px';
    // dd.style.width = '100%';
    // dd.style.backgroundColor = 'black';
    // modal.appendChild(dd)

    // append h1 to modal
    const h11 = document.createElement('h1');
    h11.textContent = 'Testdaten Vorhersage';
    modal.appendChild(h11);
    


    var tr = await test_labels.array();
    // Assuming you have the inference_step and calculateAccuracy functions defined elsewhere
    await (async () => {
        const { probs, predClass } = await inference_step(model, test_features);
        const [correct, accuracy] = await calculateAccuracy(predClass, test_labels);

        // append accuracy to and number of correct predictions to metrics div
        const acc = document.createElement('p');
        accuracy1 = (accuracy * 100).toFixed(0);
        acc.textContent = `Test Accuracy: ${accuracy1}%`;
        metrics.appendChild(acc);


        // Assuming trainData is an array of rows where each row contains the base64 image data at index 513
        testData.forEach((row, index) => {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${row[513]}`;
            img.style.width = '80px';

            // Create a container div for each image and its labels
            const container = document.createElement('div');
            container.style.display = 'inline-block';
            container.style.margin = '10px';
            container.style.textAlign = 'center';

            const pc = predClass[index];
            const lb = tr[index];

            // Create a label for the predicted class
            const predLabel = document.createElement('p');
            predLabel.textContent = `Prediction: ${classes[pc]}`;
            predLabel.style.color = pc === lb ? 'green' : 'red';

            // Create a label for the correct class
            const correctLabel = document.createElement('p');
            correctLabel.textContent = `Correct: ${classes[lb]}`;
            correctLabel.style.color = pc === lb ? 'green' : 'red';


            // Append the image and labels to the container
            container.appendChild(img);
            container.appendChild(predLabel);
            container.appendChild(correctLabel);

            // Append the container to the body
            // document.body.appendChild(container);
            modal.appendChild(container);
        });
    })();
}







document.addEventListener('DOMContentLoaded', async () => {




    svg = d3.select("#acc-graph")
    // .attr("width", width + margin.left + margin.right)
    // .attr("height", height + margin.top + margin.bottom)
    // set to fill out 100% of parent div with width and height unspecified
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);



// Create the x scale
x = d3.scaleLinear()
    .domain([0, 25])
    .range([0, width]);

// Create the y scale
y = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);

// Add the x axis with larger font size
xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
        .tickSize(10)  // Increase tick size
        .tickPadding(10))  // Increase padding for labels
    .style("font-size", "20px");  // Increase font size

// Add the y axis with larger font size
yAxis = svg.append("g")
    .call(d3.axisLeft(y)
        .tickSize(10)  // Increase tick size
        .tickPadding(10))  // Increase padding for labels
    .style("font-size", "20px");  // Increase font size

// Create the line generator
line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

// Add the line to the svg with increased thickness
path = svg.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", line)
    .style("stroke-width", "3px");  // Increase line thickness

// Add circles for data points
svg.selectAll(".datapoint")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "datapoint")
    .attr("cx", d => x(d.x))
    .attr("cy", d => y(d.y))
    .attr("r", 5)  // Set the radius of the circles
    .style("fill", "steelblue");  // Set the color of the circles

testLine = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

// Add the test line to the svg with increased thickness
test_path = svg.append("path")
    .datum(test_data) 
    .attr("class", "redline")
    .attr("d", testLine)
    .style("stroke-width", "3px");  // Increase line thickness

// Add circles for test data points
svg.selectAll(".testdatapoint")
    .data(test_data)
    .enter()
    .append("circle")
    .attr("class", "testdatapoint")
    .attr("cx", d => x(d.x))
    .attr("cy", d => y(d.y))
    .attr("r", 5)  // Set the radius of the circles
    .style("fill", "red");  // Set the color of the circles




// Add legend
const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 100}, ${height - 50})`);

// Training legend item
legend.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 5)
    .style("fill", "steelblue");

legend.append("text")
    .attr("x", 10)
    .attr("y", 5)
    .text("Training")
    .style("font-size", "20px")
    .attr("alignment-baseline", "middle");

// Test legend item
legend.append("circle")
    .attr("cx", 0)
    .attr("cy", 20)
    .attr("r", 5)
    .style("fill", "red");

legend.append("text")
    .attr("x", 10)
    .attr("y", 25)
    .text("Test")
    .style("font-size", "20px")
    .attr("alignment-baseline", "middle");






    // add listener to #schritt button to exectute step of current id and increment step_id by 1, rolling over with modulus if lenght is reached
    document.getElementById('schritt').addEventListener('click', () => {
        if(!auto){
            schritt();
        }
    });   

    // add pause listener
    document.getElementById('pause').addEventListener('click', () => {
        pause = true;
    });


    // add listener to button with id auto that will call schritt() and pause for 50ms after every call
    // until current_epoch == epochs, make sure to await schritt
    document.getElementById('auto').addEventListener('click', async () => {

        if (!auto){

            // set ui input tooltip to unchecked and var tooltip to false
            document.getElementById('tooltip').checked = false;
            tooltip = false;
            auto = true;


            while (current_epoch < epochs){
                await schritt();
                await new Promise(r => setTimeout(r, 2));

                if (pause){
                    pause=false;
                    auto=false;
                    break;
                }
            }

    }

    });


    // Get the modal
    var modal = document.getElementById("myModal");

    // Get the button that opens the modal
    var btn = document.getElementById("showpred");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal 
    btn.onclick = function() {

        show_pred();

        modal.style.display = "block";

    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
    modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
    }

    // add toggle tooltip checkbox listener for id tooltip
    document.getElementById('tooltip').addEventListener('change', (event) => {
        // invert var tooltip
        tooltip = !tooltip;
    });


});

// TODO 
// progress bar
// tool tips erklärungen
// highlights
// mehr divs, groesse automatisch skalieren
// fast forward to epoch end


// weights = await model.layers[0].getWeights();
// w = await weights[0].arraySync().flat();
// Math.min(...w);
// Math.max(...w);
// 54*104 = 6656

