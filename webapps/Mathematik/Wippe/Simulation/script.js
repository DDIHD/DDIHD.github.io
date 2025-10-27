document.addEventListener('DOMContentLoaded', function() {
    const seesaw = document.getElementById('seesaw');
    const leftTotalDisplay = document.getElementById('left-total');
    const rightTotalDisplay = document.getElementById('right-total');
    const weightOptions = document.querySelectorAll('.weight-option');
    const addWeightButtons = document.querySelectorAll('.add-weight');
    const balanceIndicator = document.getElementById('balance-indicator');
    const acceptPointButton = document.getElementById('accept-point');
    const pointer = document.getElementById('balance-pointer');
    const customWeightInput = document.getElementById('custom-weight-input');
    const customWeightBtn = document.getElementById('custom-weight-btn');
    const showGraphBtn = document.getElementById('show-graph-btn');
    const showSolutionBtn = document.getElementById('show-solution-btn');
    
    let selectedWeightValue = 10; // Default selected weight
    let lastCustomValue = 20; // Store the last custom value
    
    // Set up weight selection
    weightOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Skip if this is the custom weight button
            if (this.id === 'custom-weight-btn') return;
            
            // Remove selected class from all options and custom input
            weightOptions.forEach(opt => opt.classList.remove('selected'));
            customWeightInput.classList.remove('selected');
            
            // Add selected class to clicked option
            this.classList.add('selected');
            // Update selected weight value
            selectedWeightValue = parseInt(this.dataset.value);
            
            // Don't clear the custom weight input value - just visually hide it with placeholder
            customWeightInput.placeholder = "#";
        });
    });
    
    // Set up custom weight button
    customWeightBtn.addEventListener('click', function() {
        // If no value is entered but there's a last value, restore it to the input
        if (customWeightInput.value === "") {
            customWeightInput.value = lastCustomValue.toString();
        }
        
        const customValue = parseInt(customWeightInput.value);
        
        // Validate custom weight value
        if (isNaN(customValue) || customValue <= 0 || !Number.isInteger(customValue)) {
            alert('Bitte gib eine gültige, positive ganze Zahl ein.');
            return;
        }
        
        // Store the last custom value
        lastCustomValue = customValue;
        
        // Remove selected class from all options
        weightOptions.forEach(opt => opt.classList.remove('selected'));
        
        // Update selected weight value to custom value
        selectedWeightValue = customValue;
        
        // Add selected class to custom button and input
        this.classList.add('selected');
        customWeightInput.classList.add('selected');
        
        // Set the input value to the custom value (don't just use placeholder)
        customWeightInput.value = customValue.toString();
    });
    
    // Add keyboard handling for custom weight input
    customWeightInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            customWeightBtn.click();
        }
    });
    
    // Add focus handling for custom weight input
    customWeightInput.addEventListener('focus', function() {
        // Select the entire content when focused
        this.select();
        
        // Deselect all weight options when focusing the custom input
        weightOptions.forEach(opt => opt.classList.remove('selected'));
        
        // Select the custom weight button
        customWeightBtn.classList.add('selected');
        
        // If there's a valid value, update the selected weight
        const value = parseInt(this.value);
        if (!isNaN(value) && value > 0) {
            selectedWeightValue = value;
        }
    });
    
    // Add input handler for custom weight
    customWeightInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (!isNaN(value) && value > 0) {
            selectedWeightValue = value;
            lastCustomValue = value;
        }
    });
    
    // Add weight button handlers
    addWeightButtons.forEach(button => {
        button.addEventListener('click', function() {
            const position = this.closest('.position');
            const side = position.dataset.side;
            const positionValue = parseInt(position.dataset.position);
            const weightStack = position.querySelector('.weight-stack');
            
            // Create a new weight element
            const weightElement = document.createElement('div');
            weightElement.className = 'weight';
            weightElement.textContent = selectedWeightValue;
            weightElement.dataset.value = selectedWeightValue;
            
            // Add click event to remove weight when clicked
            weightElement.addEventListener('click', function() {
                this.remove();
                updateSeesaw();
                updateButtonVisibility();
                updateEquationDisplay();
                
                // Reset observations only when left side changes
                if (side === 'left') {
                    equilibriumPoints = [];
                    updateObservationsPanel();
                }
            });
            
            // Add the weight to the stack
            weightStack.appendChild(weightElement);
            
            // Update the seesaw balance
            updateSeesaw();
            
            // Update button visibility based on restriction
            updateButtonVisibility();
            
            // Update equation display
            updateEquationDisplay();
            
            // Reset observations only when left side changes
            if (side === 'left') {
                equilibriumPoints = [];
                updateObservationsPanel();
            }
        });
    });
    
    function updateButtonVisibility() {
        
        // Check left side
        const leftPositionsWithWeights = document.querySelectorAll('.position[data-side="left"] .weight-stack .weight');
        const hasLeftWeights = leftPositionsWithWeights.length > 0;
        
        // Check right side
        const rightPositionsWithWeights = document.querySelectorAll('.position[data-side="right"] .weight-stack .weight');
        const hasRightWeights = rightPositionsWithWeights.length > 0;
        
        // Handle left side buttons
        document.querySelectorAll('.position[data-side="left"] .add-weight').forEach(button => {
            const position = button.closest('.position');
            const hasWeightsInThisPosition = position.querySelector('.weight-stack .weight') !== null;
            
            if (hasLeftWeights && !hasWeightsInThisPosition) {
                button.classList.add('hidden');
            } else {
                button.classList.remove('hidden');
            }
        });
        
        // Handle right side buttons
        document.querySelectorAll('.position[data-side="right"] .add-weight').forEach(button => {
            const position = button.closest('.position');
            const hasWeightsInThisPosition = position.querySelector('.weight-stack .weight') !== null;
            
            if (hasRightWeights && !hasWeightsInThisPosition) {
                button.classList.add('hidden');
            } else {
                button.classList.remove('hidden');
            }
        });
    }
    
    function updateSeesaw() {
        const { leftTotal, rightTotal } = calculateTotals();
        
        // Update totals display if needed
        if (leftTotalDisplay) leftTotalDisplay.textContent = leftTotal;
        if (rightTotalDisplay) rightTotalDisplay.textContent = rightTotal;
        
        // Calculate the tilt angle (max ±20 degrees)
        const maxAngle = 20;
        let tiltAngle = 0;
        
        // Check if balanced
        const isBalanced = leftTotal === rightTotal;
        
        if (!isBalanced) {
            const difference = rightTotal - leftTotal;
            const totalWeight = leftTotal + rightTotal;
            
            // Calculate a proportional angle with reduced sensitivity
            if (totalWeight > 0) {
                // Reduced sensitivity by dividing by a larger factor
                tiltAngle = Math.min(maxAngle, Math.max(-maxAngle, difference / (totalWeight / 5) * 2));
            }
        }
        
        // Apply the rotation to the seesaw
        seesaw.style.transform = `rotate(${tiltAngle}deg)`;
        
        // Determine pointer rotation based on tilt direction
        // When tiltAngle is zero, pointer points up (0 deg)
        // When tiltAngle is negative (tipped left), pointer points left (-90 deg)
        // When tiltAngle is positive (tipped right), pointer points right (90 deg)
        
        let pointerAngle;
        if (tiltAngle < 0) {
            // Scale is tipped left, rotate left (up to 90 degrees)
            // Map from [0 to -maxAngle] to [0 to -90]
            pointerAngle = (tiltAngle / maxAngle) * 90;
        } else if (tiltAngle > 0) {
            // Scale is tipped right, rotate right (up to 90 degrees)
            // Map from [0 to maxAngle] to [0 to 90]
            pointerAngle = (tiltAngle / maxAngle) * 90;
        } else {
            // Scale is balanced, point straight up
            pointerAngle = 0;
        }
        
        pointer.style.transform = `rotate(${pointerAngle}deg)`;
        
    }
    
    
    function calculateTotals() {
        let leftTotal = 0;
        let rightTotal = 0;
        
        // Calculate left side total
        document.querySelectorAll('.position[data-side="left"]').forEach(position => {
            const positionValue = parseInt(position.dataset.position);
            const weights = position.querySelectorAll('.weight');
            
            weights.forEach(weight => {
                const weightValue = parseInt(weight.dataset.value);
                leftTotal += positionValue * weightValue;
            });
        });
        
        // Calculate right side total
        document.querySelectorAll('.position[data-side="right"]').forEach(position => {
            const positionValue = parseInt(position.dataset.position);
            const weights = position.querySelectorAll('.weight');
            
            weights.forEach(weight => {
                const weightValue = parseInt(weight.dataset.value);
                rightTotal += positionValue * weightValue;
            });
        });
        
        return { leftTotal, rightTotal };
    }
    
    // Add default weights to left position 9
    function addDefaultWeights() {
        // Find position 9 on the left side
        const leftPosition9 = document.querySelector('.position[data-side="left"][data-position="9"]');
        const weightStack = leftPosition9.querySelector('.weight-stack');
        
        // Create and add four weights of 10
        for (let i = 0; i < 4; i++) {
            const weight10 = document.createElement('div');
            weight10.className = 'weight';
            weight10.textContent = '10';
            weight10.dataset.value = '10';
            
            // Add click event to remove weight when clicked
            weight10.addEventListener('click', function() {
                this.remove();
                updateSeesaw();
                updateButtonVisibility();
                updateEquationDisplay();
                // Reset observations when left side changes
                equilibriumPoints = [];
                updateObservationsPanel();
            });
            
            // Add the weight to the stack
            weightStack.appendChild(weight10);
        }
    }
    
    // Add default weights and initialize the seesaw
    addDefaultWeights();
    updateSeesaw();
    updateButtonVisibility();
    
    // Add observations panel toggle functionality
    const observationsButton = document.getElementById('observations-button');
    const observationsPanel = document.getElementById('observations-panel');
    const seesawContainer = document.querySelector('.seesaw-container');
    
    // Add data structure to store equilibrium points
    let equilibriumPoints = [];
    
    // Add data structure to track section states
    let sectionStates = {
        'Tabelle': false,
        'Schaubild': false,
        'Gleichung': false
    };
    
    // Define a fixed set of colors for positions
    const positionColors = [
        '#e91e63', // Pink (position 1)
        '#9c27b0', // Purple (position 2)
        '#3f51b5', // Indigo (position 3)
        '#009688', // Teal (position 4)
        '#4caf50', // Green (position 5)
        '#ff9800', // Orange (position 6)
        '#795548', // Brown (position 7)
        '#607d8b', // Blue Gray (position 8)
        '#2196F3', // Blue (position 9)
        '#f44336'  // Red (position 10)
    ];
    
    // Add variable to track if theoretical curve should be shown
    let showTheoreticalCurve = false;
    
    // Migrate any existing data to the new format
    function migrateEquilibriumPoints() {
        if (equilibriumPoints.length > 0) {
            equilibriumPoints = equilibriumPoints.map((point, index) => {
                // If already in new format, return as is
                if (point.type && point.values) {
                    return point;
                }
                
                // Otherwise, convert to new format
                return {
                    values: point,
                    type: 'observation'
                };
            });
        }
    }
    
    // Call migration immediately
    migrateEquilibriumPoints();
    
    // Initialize the observations panel with empty data
    updateObservationsPanel();
    
    // Show the observations panel initially
    observationsPanel.classList.remove('hidden');
    seesawContainer.classList.add('with-observations');
    observationsButton.textContent = 'Beobachtungen ausblenden';
    
    observationsButton.addEventListener('click', function() {
        observationsPanel.classList.toggle('hidden');
        seesawContainer.classList.toggle('with-observations');
        
        // Update button text based on panel visibility
        if (observationsPanel.classList.contains('hidden')) {
            observationsButton.textContent = 'Beobachtungen';
        } else {
            observationsButton.textContent = 'Beobachtungen ausblenden';
        }
    });
    
    
    // Handle accept point button click
    acceptPointButton.addEventListener('click', function() {
        // Get right side weights configuration
        const rightSideConfig = [];
        
        // Initialize array with zeros for all positions
        for (let i = 1; i <= 10; i++) {
            rightSideConfig[i] = 0;
        }
        
        // Collect weights from right side
        document.querySelectorAll('.position[data-side="right"]').forEach(position => {
            const positionValue = parseInt(position.dataset.position);
            const weights = position.querySelectorAll('.weight');
            
            weights.forEach(weight => {
                const weightValue = parseInt(weight.dataset.value);
                rightSideConfig[positionValue] += weightValue;
            });
        });
        
        // Remove the 0th element (we don't use it)
        const newConfig = rightSideConfig.slice(1);
        
        // Check if any position has a non-zero value
        const hasNonZeroValue = newConfig.some(value => value > 0);
        
        if (!hasNonZeroValue) {
            alert("Bitte füge zuerst Gewichte auf der rechten Seite hinzu.");
            return;
        }
        
        // Find positions with values in the new configuration
        const positionsWithValues = [];
        newConfig.forEach((value, index) => {
            if (value > 0) {
                positionsWithValues.push(index);
            }
        });
        
        // Create an observation object
        const observation = {
            values: Array(10).fill(0),
            type: 'observation'
        };
        
        // Add each position's value to the observation
        for (let position of positionsWithValues) {
            observation.values[position] = newConfig[position];
            
            // Remove any existing points at this position (observations or solutions)
            equilibriumPoints = equilibriumPoints.filter(point => {
                // If the point has no value at this position, keep it
                return point.values[position] === 0;
            });
        }
        
        // Add the observation to equilibrium points
        equilibriumPoints.push(observation);
        
        // Show observations panel if hidden
        const wasHidden = observationsPanel.classList.contains('hidden');
        if (wasHidden) {
            observationsButton.click();
        }
        
        // Update the observations panel and equation display
        updateObservationsPanel();
        updateEquationDisplay();
        
        // If the panel was just revealed, redraw the graph
        if (wasHidden) {
            setTimeout(() => {
                const canvas = document.getElementById('equilibrium-graph');
                if (canvas) {
                    canvas.width = canvas.parentElement.clientWidth;
                    canvas.height = 300;
                    drawGraph(canvas, showTheoreticalCurve);
                }
            }, 50);
        }
    });
    
    function updateObservationsPanel() {
        // Store current section states before updating
        const currentStates = {};
        document.querySelectorAll('.collapsible-section').forEach(section => {
            const title = section.querySelector('.section-title').textContent;
            const content = section.querySelector('.section-content');
            currentStates[title] = content.style.display !== 'none';
        });

        // Clear existing content
        const observationsContent = document.querySelector('.observations-content');
        observationsContent.innerHTML = '';
        
        // Create collapsible sections - use stored states
        const tableSection = createCollapsibleSection('Tabelle', currentStates['Tabelle'] || sectionStates['Tabelle']);
        observationsContent.appendChild(tableSection);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'observations-table';
        
        // Create weight row (first row)
        const weightRow = document.createElement('tr');
        const weightHeader = document.createElement('th');
        weightHeader.textContent = 'Gewicht (in Gramm)';
        weightRow.appendChild(weightHeader);
        
        // Create position row (second row)
        const positionRow = document.createElement('tr');
        const positionHeader = document.createElement('th');
        positionHeader.textContent = 'Abstandsposition';
        positionRow.appendChild(positionHeader);
        
        // Add position cells (1-10) to the position row
        for (let i = 1; i <= 10; i++) {
            const positionCell = document.createElement('td');
            positionCell.textContent = i;
            positionRow.appendChild(positionCell);
            
            // Add empty weight cells to the weight row
            const weightCell = document.createElement('td');
            weightCell.id = `weight-cell-${i}`;
            weightRow.appendChild(weightCell);
        }
        
        // Add rows to table
        table.appendChild(weightRow);
        table.appendChild(positionRow);
        
        // Add table to the content area of the table section
        tableSection.querySelector('.section-content').appendChild(table);
        
        // Update weight cells with ALL observation data
        if (equilibriumPoints.length > 0) {
            // Create a map to collect all weights for each position, grouped by type
            const positionWeights = {};
            for (let i = 1; i <= 10; i++) {
                positionWeights[i] = [];
            }
            
            // Collect all weights from all observations
            equilibriumPoints.forEach(point => {
                const pointValues = point.values || point; // Handle old format data
                const pointType = point.type || 'observation'; // Default to observation for old data
                
                for (let i = 0; i < 10; i++) {
                    const position = i + 1;
                    if (pointValues[i] > 0) {
                        positionWeights[position].push({
                            value: pointValues[i],
                            type: pointType
                        });
                    }
                }
            });
            
            // Update weight cells with all collected values
            for (let position = 1; position <= 10; position++) {
                const weightCell = document.getElementById(`weight-cell-${position}`);
                if (positionWeights[position].length > 0) {
                    // Clear the cell first
                    weightCell.innerHTML = '';
                    
                    // Add each value with appropriate styling
                    positionWeights[position].forEach((item, index) => {
                        const valueSpan = document.createElement('span');
                        valueSpan.textContent = item.value;
                        
                        // Set color based on type - use position's fixed color for observations
                        if (item.type === 'solution') {
                            valueSpan.style.color = 'black';
                            valueSpan.style.fontWeight = 'bold';
                        } else {
                            valueSpan.style.color = positionColors[position - 1];
                        }
                        
                        // Add to cell
                        weightCell.appendChild(valueSpan);
                        
                        // Add comma if not the last item
                        if (index < positionWeights[position].length - 1) {
                            weightCell.appendChild(document.createTextNode(', '));
                        }
                    });
                }
            }
            
            // Also color the position row according to positions
            for (let position = 1; position <= 10; position++) {
                const positionCell = positionRow.children[position]; // +1 for the header cell
                
                // Find if there are any observations (not solutions) at this position
                const observations = positionWeights[position].filter(item => item.type === 'observation');
                
                if (observations.length > 0) {
                    // Color the position cell with the fixed position color
                    positionCell.style.color = positionColors[position - 1];
                }
            }
        }
        
        // 2. Graph section - use stored state
        const graphSection = createCollapsibleSection('Schaubild', currentStates['Schaubild'] || sectionStates['Schaubild']);
        observationsContent.appendChild(graphSection);
        
        // Create graph container
        const graphContainer = document.createElement('div');
        graphContainer.className = 'graph-container';
        
        // Create graph canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'equilibrium-graph';
        graphContainer.appendChild(canvas);
        
        // Add graph to the content area of the graph section
        graphSection.querySelector('.section-content').appendChild(graphContainer);
        
        // Draw graph (even if empty), persist theoretical curve state
        drawGraph(canvas, showTheoreticalCurve);
        
        // 3. Equation section - use stored state
        const equationSection = createCollapsibleSection('Gleichung', currentStates['Gleichung'] || sectionStates['Gleichung']);
        observationsContent.appendChild(equationSection);
        
        // Add the left side equation display
        const equationDiv = document.createElement('div');
        equationDiv.className = 'left-side-equation';
        
        // Add the equation to the content area of the equation section
        equationSection.querySelector('.section-content').appendChild(equationDiv);
        
        // Update the equation display with detailed breakdown
        updateEquationDisplay();

        // Update stored states after creating new sections
        document.querySelectorAll('.collapsible-section').forEach(section => {
            const title = section.querySelector('.section-title').textContent;
            const content = section.querySelector('.section-content');
            sectionStates[title] = content.style.display !== 'none';
        });
    }
    
    function drawGraph(canvas, showTheoreticalCurve = false) {
        // Set canvas size
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 300;
        
        const ctx = canvas.getContext('2d');
        const padding = 40;
        const graphWidth = canvas.width - (padding * 2);
        const graphHeight = canvas.height - (padding * 2);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Get left side total for theoretical curve
        const { leftTotal } = calculateTotals();
        
        // Find max weight for x-axis scale
        let maxWeight = Math.max(10, leftTotal); // Start with minimum of 10 or leftTotal
        if (equilibriumPoints.length > 0) {
            equilibriumPoints.forEach(point => {
                const pointValues = point.values || point; // Handle old format data
                for (let i = 0; i < 10; i++) {
                    if (pointValues[i] > 0) {
                        maxWeight = Math.max(maxWeight, pointValues[i]);
                    }
                }
            });
            
            // Add 10% padding to max weight
            maxWeight = Math.ceil(maxWeight * 1.1);
        }
        
        // Draw x-axis labels (weights)
        const xStep = Math.ceil(maxWeight / 5);
        for (let i = 0; i <= maxWeight; i += xStep) {
            const x = padding + (i / maxWeight) * graphWidth;
            
            // Draw tick
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - padding);
            ctx.lineTo(x, canvas.height - padding + 5);
            ctx.stroke();
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(i.toString(), x, canvas.height - padding + 20);
        }
        
        // Draw y-axis labels (positions)
        for (let i = 0; i <= 10; i++) {
            const y = canvas.height - padding - (i / 10) * graphHeight;
            
            // Draw tick
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding - 5, y);
            ctx.stroke();
            
            // Draw label
            ctx.fillStyle = '#333';
            ctx.textAlign = 'right';
            ctx.fillText(i.toString(), padding - 10, y + 5);
        }
        
        // Draw theoretical curve if requested and leftTotal > 0
        if (showTheoreticalCurve && leftTotal > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]); // Dashed line for theoretical curve
            
            // Draw curve from weight = 1 to weight = leftTotal
            const startX = padding + (1 / maxWeight) * graphWidth;
            const endX = padding + (leftTotal / maxWeight) * graphWidth;
            
            // Draw the curve point by point
            for (let x = startX; x <= endX; x += 1) {
                const weight = ((x - padding) / graphWidth) * maxWeight;
                const position = leftTotal / weight;
                const y = canvas.height - padding - (position / 10) * graphHeight;
                
                if (x === startX) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
            ctx.setLineDash([]); // Reset line style
            
            // Add equation annotation to the graph (slightly to the top right of the curve)
            // Calculate a good position for the equation text
            const midWeight = Math.min(leftTotal * 0.5, maxWeight * 0.7);
            const midPosition = leftTotal / midWeight;
            const equationX = padding + (midWeight / maxWeight) * graphWidth + 20;
            const equationY = canvas.height - padding - (midPosition / 10) * graphHeight - 20;
            
            // Draw the equation text
            ctx.fillStyle = '#666';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`P = ${leftTotal}/G`, equationX, equationY);
        }
        
        // Only plot points if there are any
        if (equilibriumPoints.length > 0) {
            // Plot points
            equilibriumPoints.forEach(point => {
                const pointValues = point.values || point; // Handle old format data
                const pointType = point.type || 'observation'; // Default to observation for old data
                
                for (let i = 0; i < 10; i++) {
                    const position = i + 1;
                    const weight = pointValues[i];
                    
                    if (weight > 0) {
                        const x = padding + (weight / maxWeight) * graphWidth;
                        const y = canvas.height - padding - (position / 10) * graphHeight;
                        
                        // Use fixed position color for observations, black for solutions
                        const pointColor = pointType === 'solution' ? 'black' : positionColors[i];
                        
                        // Draw X instead of circle
                        const size = 5;
                        ctx.beginPath();
                        ctx.strokeStyle = pointColor;
                        ctx.lineWidth = 2;
                        // First line of X
                        ctx.moveTo(x - size, y - size);
                        ctx.lineTo(x + size, y + size);
                        // Second line of X
                        ctx.moveTo(x + size, y - size);
                        ctx.lineTo(x - size, y + size);
                        ctx.stroke();
                    }
                }
            });
        }
        
        // Add axis titles
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Gewicht (in Gramm)', canvas.width / 2, canvas.height - 10);
        
        ctx.save();
        ctx.translate(15, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Position', 0, 0);
        ctx.restore();
    }
    
    // Helper function to create collapsible sections
    function createCollapsibleSection(title, isOpen = false) {
        const section = document.createElement('div');
        section.className = 'collapsible-section';
        
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <span class="section-title">${title}</span>
            <span class="toggle-icon">${isOpen ? '▼' : '►'}</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'section-content';
        content.style.display = isOpen ? 'block' : 'none'; // Use isOpen parameter
        
        // Add click event to toggle visibility
        header.addEventListener('click', function() {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            
            // Update toggle icon
            const toggleIcon = header.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '►' : '▼';
            
            // Update stored state
            sectionStates[title] = !isVisible;
            
            // If opening the graph section, redraw the graph to ensure proper sizing
            if (!isVisible && title === 'Schaubild') {
                setTimeout(() => {
                    const canvas = document.getElementById('equilibrium-graph');
                    if (canvas) {
                        canvas.width = canvas.parentElement.clientWidth;
                        canvas.height = 300;
                        drawGraph(canvas);
                    }
                }, 50);
            }
        });
        
        section.appendChild(header);
        section.appendChild(content);
        
        return section;
    }
    
    function updateEquationDisplay() {
        const equationDiv = document.querySelector('.left-side-equation');
        if (!equationDiv) return;

        // Get the current state
        const { leftTotal } = calculateTotals();
        const lastPoint = equilibriumPoints[equilibriumPoints.length - 1];
        
        // Clear the equation div
        equationDiv.innerHTML = '';

        // If we have a last point and it's an observation, show its specific calculation
        if (lastPoint && lastPoint.type === 'observation') {
            // Find the position and weight of the last point
            for (let i = 0; i < lastPoint.values.length; i++) {
                if (lastPoint.values[i] > 0) {
                    const position = i + 1;
                    const weight = lastPoint.values[i];
                    const result = position * weight;
                    equationDiv.innerHTML = `<strong>${position} * ${weight} = ${result}</strong>`;
                    return;
                }
            }
        } 
        // If we have solutions present, show the general formula
        else if (equilibriumPoints.some(point => point.type === 'solution')) {
            equationDiv.innerHTML = `<strong>P * G = ${leftTotal}</strong>`;
            return;
        }

        // If no specific case matches, leave the equation empty (already cleared above)
    }
    
    // Add event handlers for the new buttons
    showGraphBtn.addEventListener('click', function() {
        // Get the left side total
        const { leftTotal } = calculateTotals();
        
        if (leftTotal === 0) {
            alert('Bitte füge zuerst Gewichte auf der linken Seite hinzu.');
            return;
        }
        
        // Set the flag to show theoretical curve
        showTheoreticalCurve = true;
        
        // Redraw the graph with the theoretical curve
        const canvas = document.getElementById('equilibrium-graph');
        if (canvas) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 300;
            drawGraph(canvas, true); // Pass true to show theoretical curve
        }
    });
    
    showSolutionBtn.addEventListener('click', function() {
        calculateWholeSolutions();
        updateEquationDisplay();
    });
    
    // Function to calculate whole number solutions for positions 1-10
    function calculateWholeSolutions() {
        // Get the left side total using calculateTotals
        const { leftTotal } = calculateTotals();
        
        if (leftTotal === 0) {
            alert('Bitte füge zuerst Gewichte auf der linken Seite hinzu.');
            return;
        }
        
        // Create an array to store solutions
        const solutions = [];
        
        // Calculate solutions for each position (1-10)
        for (let position = 1; position <= 10; position++) {
            // Calculate what weight would balance at this position
            // leftTotal = position * weight
            // weight = leftTotal / position
            const weight = leftTotal / position;
            
            // Only add whole number solutions
            if (weight > 0 && Number.isInteger(weight)) {
                solutions.push({
                    position: position,
                    weight: weight
                });
            }
        }
        
        if (solutions.length === 0) {
            alert('Keine ganzzahligen Lösungen gefunden!');
            return;
        }
        
        // Clear all existing points - "Lösung anzeigen" should replace everything
        equilibriumPoints = [];
        
        // Create solution points for each valid solution
        solutions.forEach(solution => {
            const position = solution.position - 1; // Convert to 0-indexed
            
            // Create a new solution point
            const solutionPoint = {
                values: Array(10).fill(0),
                type: 'solution'
            };
            
            // Set the value at the position
            solutionPoint.values[position] = solution.weight;
            
            // Add the solution point
            equilibriumPoints.push(solutionPoint);
        });
        
        // Show observations panel if hidden
        const wasHidden = observationsPanel.classList.contains('hidden');
        if (wasHidden) {
            observationsButton.click();
        }
        
        // Update the observations panel
        updateObservationsPanel();
        
        // If the panel was just revealed, redraw the graph
        if (wasHidden) {
            setTimeout(() => {
                const canvas = document.getElementById('equilibrium-graph');
                if (canvas) {
                    canvas.width = canvas.parentElement.clientWidth;
                    canvas.height = 300;
                    drawGraph(canvas, showTheoreticalCurve);
                }
            }, 50);
        }
    }
}); 