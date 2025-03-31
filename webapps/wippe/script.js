document.addEventListener('DOMContentLoaded', function() {
    const seesaw = document.getElementById('seesaw');
    const leftTotalDisplay = document.getElementById('left-total');
    const rightTotalDisplay = document.getElementById('right-total');
    const weightOptions = document.querySelectorAll('.weight-option');
    const addWeightButtons = document.querySelectorAll('.add-weight');
    const positionRestrictionCheckbox = document.getElementById('position-restriction');
    const balanceIndicator = document.getElementById('balance-indicator');
    const acceptPointButton = document.getElementById('accept-point');
    
    // Initialize restrictPositions based on checkbox state
    let selectedWeightValue = 10; // Default selected weight
    let restrictPositions = !positionRestrictionCheckbox.checked; // Get initial state from checkbox
    
    // Set up position restriction toggle
    positionRestrictionCheckbox.addEventListener('change', function() {
        restrictPositions = !this.checked;
        updateButtonVisibility();
    });
    
    // Set up weight selection
    weightOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            weightOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            this.classList.add('selected');
            // Update selected weight value
            selectedWeightValue = parseInt(this.dataset.value);
        });
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
            });
            
            // Add the weight to the stack
            weightStack.appendChild(weightElement);
            
            // Update the seesaw balance
            updateSeesaw();
            
            // Update button visibility based on restriction
            updateButtonVisibility();
        });
    });
    
    function updateButtonVisibility() {
        if (!restrictPositions) {
            // Show all buttons if restriction is off
            addWeightButtons.forEach(button => {
                button.classList.remove('hidden');
            });
            return;
        }
        
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
        
        // Update balance indicator
        updateBalanceIndicator(isBalanced);
    }
    
    function updateBalanceIndicator(isBalanced) {
        // Remove both classes first
        balanceIndicator.classList.remove('balanced', 'unbalanced');
        
        if (isBalanced) {
            balanceIndicator.classList.add('balanced');
            acceptPointButton.classList.remove('hidden');
        } else {
            balanceIndicator.classList.add('unbalanced');
            acceptPointButton.classList.add('hidden');
        }
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
    
    // Initialize the observations panel with empty data
    updateObservationsPanel();
    
    // Show the observations panel initially
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
        
        // Check if this configuration already exists
        const isDuplicate = equilibriumPoints.some(point => {
            // Compare each position's weight
            for (let i = 0; i < 10; i++) {
                if (point[i] !== newConfig[i]) {
                    return false;
                }
            }
            return true;
        });
        
        // Only add if it's not a duplicate
        if (!isDuplicate) {
            // Add the new point to the collection
            equilibriumPoints.push(newConfig);
            
            // Show observations panel if hidden
            const wasHidden = observationsPanel.classList.contains('hidden');
            if (wasHidden) {
                observationsButton.click();
            }
            
            // Update the observations panel
            updateObservationsPanel();
            
            // If the panel was just revealed, we need to redraw the graph after the panel is visible
            if (wasHidden) {
                // Use setTimeout to ensure the panel is fully visible before redrawing
                setTimeout(() => {
                    const canvas = document.getElementById('equilibrium-graph');
                    if (canvas) {
                        // Resize canvas to match its container
                        canvas.width = canvas.parentElement.clientWidth;
                        canvas.height = 300;
                        drawGraph(canvas);
                    }
                }, 50);
            }
        } 
    });
    
    function updateObservationsPanel() {
        // Clear existing content
        const observationsContent = document.querySelector('.observations-content');
        observationsContent.innerHTML = '';
        
        // Create collapsible sections
        
        // 1. Table section
        const tableSection = createCollapsibleSection('Tabelle', true);
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
            // Create a map to collect all weights for each position
            const positionWeights = {};
            for (let i = 1; i <= 10; i++) {
                positionWeights[i] = [];
            }
            
            // Collect all weights from all observations
            equilibriumPoints.forEach(observation => {
                for (let i = 0; i < 10; i++) {
                    const position = i + 1;
                    if (observation[i] > 0) {
                        positionWeights[position].push(observation[i]);
                    }
                }
            });
            
            // Update weight cells with all collected values
            for (let position = 1; position <= 10; position++) {
                const weightCell = document.getElementById(`weight-cell-${position}`);
                if (positionWeights[position].length > 0) {
                    weightCell.textContent = positionWeights[position].join(', ');
                }
            }
        }
        
        // 2. Graph section
        const graphSection = createCollapsibleSection('Schaubild', true);
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
        
        // Draw graph (even if empty)
        drawGraph(canvas);
        
        // 3. Equation section
        const equationSection = createCollapsibleSection('Gleichung', true);
        observationsContent.appendChild(equationSection);
        
        // Add the left side equation display
        const equationDiv = document.createElement('div');
        equationDiv.className = 'left-side-equation';
        
        // Calculate the left side total
        const { leftTotal } = calculateTotals();
        
        // Create the equation text
        equationDiv.innerHTML = `<strong>A*G = ${leftTotal}</strong> `;
        
        // Add the equation to the content area of the equation section
        equationSection.querySelector('.section-content').appendChild(equationDiv);
    }
    
    function drawGraph(canvas) {
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
        
        // Find max weight for x-axis scale
        let maxWeight = 10; // Start with minimum of 10
        if (equilibriumPoints.length > 0) {
            equilibriumPoints.forEach(point => {
                point.forEach(weight => {
                    maxWeight = Math.max(maxWeight, weight);
                });
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
        for (let i = 1; i <= 10; i++) {
            const y = canvas.height - padding - ((i - 1) / 9) * graphHeight;
            
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
        
        // Only plot points if there are any
        if (equilibriumPoints.length > 0) {
            // Plot points
            equilibriumPoints.forEach(point => {
                for (let i = 0; i < 10; i++) {
                    const position = i + 1;
                    const weight = point[i];
                    
                    if (weight > 0) {
                        const x = padding + (weight / maxWeight) * graphWidth;
                        const y = canvas.height - padding - ((position - 1) / 9) * graphHeight;
                        
                        // Draw point
                        ctx.beginPath();
                        ctx.arc(x, y, 5, 0, Math.PI * 2);
                        ctx.fillStyle = '#e91e63';
                        ctx.fill();
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
        if (!isOpen) {
            content.style.display = 'none';
        }
        
        // Add click event to toggle visibility
        header.addEventListener('click', function() {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            
            // Update toggle icon
            const toggleIcon = header.querySelector('.toggle-icon');
            toggleIcon.textContent = isVisible ? '►' : '▼';
            
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
}); 