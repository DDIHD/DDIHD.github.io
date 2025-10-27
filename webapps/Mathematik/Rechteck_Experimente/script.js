document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let currentExperiment = 'area'; // 'area', 'perimeter', or 'au'
    let a = 10, b = 10, F = 100, U = 40;
    let isSlider2Locked = true; // Start with slider2 locked

    // --- DOM ELEMENTS ---
    const buttons = {
        area: document.getElementById('exp-area'),
        perimeter: document.getElementById('exp-perimeter'),
        au: document.getElementById('exp-au'),
        ua: document.getElementById('exp-ua'),
    };

    const sliders = {
        s1: {
            container: document.getElementById('slider1-container'),
            label: document.getElementById('slider1-label'),
            value: document.getElementById('slider1-value'),
            input: document.getElementById('slider1'),
        },
        s2: {
            container: document.getElementById('slider2-container'),
            label: document.getElementById('slider2-label'),
            value: document.getElementById('slider2-value'),
            input: document.getElementById('slider2'),
        },
    };

    const lockButton = document.getElementById('lock-slider2');

    const outputs = {
        o1: {
            container: document.getElementById('output1-container'),
            label: document.getElementById('output1-label'),
            value: document.getElementById('output1-value'),
        },
        o2: {
            container: document.getElementById('output2-container'),
            label: document.getElementById('output2-label'),
            value: document.getElementById('output2-value'),
        },
    };

    const rectangle = document.getElementById('rectangle');
    const rectangleContainer = document.querySelector('.rectangle-container');
    const sideALabel = document.querySelector('.side-a-label');
    const sideBLabel = document.querySelector('.side-b-label');

    const graphModal = document.getElementById('graph-modal');
    const showGraphBtn = document.getElementById('show-graph-btn');
    const closeButton = document.querySelector('.close-button');
    const solutionGraphCanvas = document.getElementById('solution-graph');
    let solutionChart;

    const colorMap = {
        'color-a': 'var(--side-a-color)',
        'color-b': 'var(--side-b-color)',
        'color-area': 'var(--area-color)',
        'color-perimeter': 'var(--perimeter-color)'
    };

    // --- CONFIGURATION ---
    const expConfig = {
        area: {
            sliders: {
                s1: { label: 'a', value: () => a, min: 1, max: 50, color: 'color-a' },
                s2: { label: 'b', value: () => b, min: 1, max: 50, color: 'color-b' }
            },
            outputs: {
                o1: { label: 'A', value: () => F.toFixed(0), color: 'color-area' }
            }
        },
        perimeter: {
            sliders: {
                s1: { label: 'a', value: () => a, min: 1, max: 50, color: 'color-a' },
                s2: { label: 'b', value: () => b, min: 1, max: 50, color: 'color-b' }
            },
            outputs: {
                o1: { label: 'u', value: () => U.toFixed(0), color: 'color-perimeter' }
            }
        },
        au: {
            sliders: {
                s1: { label: 'a', value: () => a, min: 1, max: 50, color: 'color-a' },
                s2: { label: 'u', value: () => U, min: 3, max: 200, color: 'color-perimeter' }
            },
            outputs: {
                o1: { label: 'A', value: () => F.toFixed(0), color: 'color-area' }
            }
        },
        ua: {
            sliders: {
                s1: { label: 'a', value: () => a, min: 1, max: 50, color: 'color-a' },
                s2: { label: 'A', value: () => F, min: 1, max: 2500, color: 'color-area' }
            },
            outputs: {
                o1: { label: 'u', value: () => U.toFixed(0), color: 'color-perimeter' }
            }
        }
    };

    // --- LOGIC ---
    function calculate() {
        switch (currentExperiment) {
            case 'area':
                a = sliders.s1.input.valueAsNumber;
                b = sliders.s2.input.valueAsNumber;
                F = a * b;
                break;
            case 'perimeter':
                a = sliders.s1.input.valueAsNumber;
                b = sliders.s2.input.valueAsNumber;
                U = 2 * (a + b);
                break;
            case 'au':
                a = sliders.s1.input.valueAsNumber;
                U = sliders.s2.input.valueAsNumber;
                if (U <= 2 * a) {
                    U = 2 * a + 2;
                    sliders.s2.input.value = U;
                }
                b = U / 2 - a;
                F = a * b;
                break;
            case 'ua':
                a = sliders.s1.input.valueAsNumber;
                F = sliders.s2.input.valueAsNumber;
                b = F / a;
                U = 2 * (a + b);
                break;
        }
    }

    function updateUI() {
        const config = expConfig[currentExperiment];
        
        // Sliders
        sliders.s1.label.textContent = config.sliders.s1.label;
        sliders.s1.value.textContent = config.sliders.s1.value();
        sliders.s1.label.parentElement.className = config.sliders.s1.color;

        sliders.s2.label.textContent = config.sliders.s2.label;
        sliders.s2.value.textContent = config.sliders.s2.value();
        sliders.s2.label.parentElement.className = config.sliders.s2.color;

        // Update slider progress for custom track styling
        const s1_percent = ((sliders.s1.input.valueAsNumber - sliders.s1.input.min) / (sliders.s1.input.max - sliders.s1.input.min)) * 100;
        sliders.s1.input.style.setProperty('--progress-percent', `${s1_percent}%`);

        const s2_percent = ((sliders.s2.input.valueAsNumber - sliders.s2.input.min) / (sliders.s2.input.max - sliders.s2.input.min)) * 100;
        sliders.s2.input.style.setProperty('--progress-percent', `${s2_percent}%`);

        // Outputs
        outputs.o1.container.classList.toggle('hidden', !config.outputs.o1);
        if(config.outputs.o1) {
            outputs.o1.label.textContent = config.outputs.o1.label;
            outputs.o1.value.textContent = config.outputs.o1.value();
            outputs.o1.label.parentElement.className = config.outputs.o1.color;
        }

        outputs.o2.container.classList.toggle('hidden', !config.outputs.o2);
        if(config.outputs.o2) {
            outputs.o2.label.textContent = config.outputs.o2.label;
            outputs.o2.value.textContent = config.outputs.o2.value();
            outputs.o2.label.parentElement.className = config.outputs.o2.color;
        }

        // Rectangle
        drawRectangle(a, b);
    }
    
    function drawRectangle(rectA, rectB) {
        const containerWidth = rectangleContainer.clientWidth * 0.9;
        const containerHeight = rectangleContainer.clientHeight * 0.9;
        
        // Calculate proportional scaling to maintain aspect ratio
        // We need to find the maximum scale factor that keeps both dimensions within bounds
        const maxScaleForWidth = containerWidth / Math.max(rectA, 50);
        const maxScaleForHeight = containerHeight / Math.max(rectB, 50);
        
        // Use the smaller scale factor to ensure both dimensions fit
        const scale = Math.min(maxScaleForWidth, maxScaleForHeight);
        
        // Apply the same scale to both dimensions to maintain proportions
        const width = rectA * scale;
        const height = rectB * scale;
        
        rectangle.style.width = `${Math.max(20, width)}px`; // Minimum 20px for visibility
        rectangle.style.height = `${Math.max(20, height)}px`; // Minimum 20px for visibility
        
        sideALabel.textContent = `a = ${rectA}`;
        sideBLabel.textContent = `b = ${rectB.toFixed(2)}`;
    }
    
    function setupExperiment(exp) {
        currentExperiment = exp;
        
        // Update button styles
        Object.values(buttons).forEach(btn => btn.classList.remove('active'));
        buttons[exp].classList.add('active');

        const config = expConfig[currentExperiment];

        // Configure sliders
        sliders.s1.input.min = config.sliders.s1.min;
        sliders.s1.input.max = config.sliders.s1.max;
        sliders.s1.input.value = config.sliders.s1.value();

        sliders.s2.input.min = config.sliders.s2.min;
        sliders.s2.input.max = config.sliders.s2.max;
        sliders.s2.input.value = config.sliders.s2.value();
        
        // Set the 'color' property which is used by the custom slider CSS ('currentColor')
        sliders.s1.input.style.color = colorMap[config.sliders.s1.color];
        sliders.s2.input.style.color = colorMap[config.sliders.s2.color];

        calculate();
        updateUI();
    }
    
    function updateSlider2State() {
        sliders.s2.input.disabled = isSlider2Locked;
        lockButton.classList.toggle('locked', isSlider2Locked);
    }

    // --- EVENT LISTENERS ---
    buttons.area.addEventListener('click', () => setupExperiment('area'));
    buttons.perimeter.addEventListener('click', () => setupExperiment('perimeter'));
    buttons.au.addEventListener('click', () => setupExperiment('au'));
    buttons.ua.addEventListener('click', () => setupExperiment('ua'));

    lockButton.addEventListener('click', () => {
        isSlider2Locked = !isSlider2Locked;
        updateSlider2State();
    });

    sliders.s1.input.addEventListener('input', () => {
        calculate();
        updateUI();
    });
    sliders.s2.input.addEventListener('input', () => {
        calculate();
        updateUI();
    });
    
    window.addEventListener('resize', () => {
        drawRectangle(a,b);
    });

    showGraphBtn.addEventListener('click', () => {
        drawSolutionGraph();
        graphModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        graphModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == graphModal) {
            graphModal.style.display = 'none';
        }
    });

    // --- GRAPHING ---
    function drawSolutionGraph() {
        if (solutionChart) {
            solutionChart.destroy();
        }

        const config = expConfig[currentExperiment];
        const s1Config = config.sliders.s1;

        const data = [];
        
        const s1_max = s1Config.max;
        const s1_step = s1_max / 100; // 100 data points

        let s2_val;
        if (isSlider2Locked) {
             s2_val = sliders.s2.input.valueAsNumber;
        } else {
            switch (currentExperiment) {
                case 'area':
                case 'perimeter':
                     s2_val = b; break;
                case 'au':
                     s2_val = U; break;
                case 'ua':
                     s2_val = F; break;
            }
        }


        let formula, xLabel, yLabel, graphLabel, color;

        switch (currentExperiment) {
            case 'area':
                formula = (a_val) => s2_val * a_val;
                xLabel = 'a';
                yLabel = 'A';
                graphLabel = 'A(a) = b * a';
                color = colorMap['color-area'];
                break;
            case 'perimeter':
                formula = (a_val) => 2 * a_val + 2 * s2_val;
                xLabel = 'a';
                yLabel = 'u';
                graphLabel = 'u(a) = 2a + 2b';
                color = colorMap['color-perimeter'];
                break;
            case 'au':
                // A(a) = a * (u/2 - a)
                formula = (a_val) => a_val * (s2_val / 2 - a_val);
                xLabel = 'a';
                yLabel = 'A';
                graphLabel = 'A(a) = a(u/2 - a)';
                color = colorMap['color-area'];
                break;
            case 'ua':
                // u(a) = 2a + 2A/a
                formula = (a_val) => 2 * a_val + 2 * s2_val / a_val;
                xLabel = 'a';
                yLabel = 'u';
                graphLabel = 'u(a) = 2a + 2A/a';
                color = colorMap['color-perimeter'];
                break;
        }

        if (currentExperiment === 'au') {
            const endPoint = s2_val / 2;
            const x_values = [];
            const normalStep = Math.max(0.1, endPoint / 75.0);
            const fineStep = 0.05;

            // Points before the detailed section
            for (let x = 0; x < Math.min(19, endPoint); x += normalStep) {
                x_values.push(x);
            }

            // Detailed points between 19 and 20
            for (let x = 19; x < Math.min(20, endPoint); x += fineStep) {
                x_values.push(x);
            }
            
            // Points after the detailed section
            for (let x = 20; x < endPoint; x += normalStep) {
                x_values.push(x);
            }

            x_values.push(endPoint); // Ensure the graph reaches the end

            // Create unique, sorted data points
            const unique_x = [...new Set(x_values)].sort((a, b) => a - b);
            unique_x.forEach(x => {
                const y = formula(x);
                if (isFinite(y)) {
                    data.push({ x, y });
                }
            });
        } else {
            const s1_step = s1_max / 100;
            for (let i = 0; i <= s1_max; i += s1_step) {
                let x = i;
                if (currentExperiment === 'ua' && x === 0) {
                    continue; // Avoid division by zero
                }
                data.push({x: x, y: formula(x)});
            }
        }


        solutionChart = new Chart(solutionGraphCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: graphLabel,
                    data: data,
                    borderColor: color,
                    backgroundColor: color,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0 // This will remove the dots
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        type: 'linear',
                        min: 0, // Enforce starting at 0
                        title: {
                            display: true,
                            text: xLabel
                        }
                    },
                    y: {
                        type: 'linear',
                        min: 0, // Enforce starting at 0
                        title: {
                            display: true,
                            text: yLabel
                        }
                    }
                }
            }
        });

    }

    // --- INITIALIZATION ---
    setupExperiment('area');
    updateSlider2State(); // Initialize the lock state
}); 