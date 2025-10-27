document.addEventListener('DOMContentLoaded', function() {
    const seesaw = document.getElementById('seesaw');
    const leftTotalDisplay = document.getElementById('left-total');
    const rightTotalDisplay = document.getElementById('right-total');
    const weightOptions = document.querySelectorAll('.weight-option');
    const addWeightButtons = document.querySelectorAll('.add-weight');
    const balanceIndicator = document.getElementById('balance-indicator');

    const pointer = document.getElementById('balance-pointer');
    
    let selectedWeightValue = 10; // Default selected weight
    
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
        
        // Only plot points if there are any
        if (equilibriumPoints.length > 0) {
            // Plot points
            equilibriumPoints.forEach(point => {
                for (let i = 0; i < 10; i++) {
                    const position = i + 1;
                    const weight = point[i];
                    
                    if (weight > 0) {
                        const x = padding + (weight / maxWeight) * graphWidth;
                        const y = canvas.height - padding - (position / 10) * graphHeight;
                        
                        // Draw X instead of circle
                        const size = 5;
                        ctx.beginPath();
                        ctx.strokeStyle = '#e91e63';
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
    
    function updateEquationDisplay() {
        const equationDiv = document.querySelector('.left-side-equation');
        if (equationDiv) {
            const { leftTotal } = calculateTotals();
            equationDiv.innerHTML = `<strong>A*G = ${leftTotal}</strong> `;
        }
    }
}); 