document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const areaSlider = document.getElementById('area-slider');
    const sideASlider = document.getElementById('side-a-slider');
    const areaValue = document.getElementById('area-value');
    const sideAValue = document.getElementById('side-a-value');
    const sideBValue = document.getElementById('side-b-value');
    const rectangle = document.getElementById('rectangle');
    const rectangleContainer = document.querySelector('.rectangle-container');
    const sideALabel = document.querySelector('.side-a-label');
    const sideBLabel = document.querySelector('.side-b-label');

    // Initial values
    let area = parseInt(areaSlider.value);
    let sideA = parseInt(sideASlider.value);
    let sideB = area / sideA;

    // Maximum values
    const maxA = 50;
    const maxB = 50;

    // Update function
    function updateRectangle() {
        // Calculate side B based on area and side A
        sideB = area / sideA;
        
        // Round to 2 decimal places for display
        const sideBRounded = Math.round(sideB * 100) / 100;
        
        // Update text displays
        areaValue.textContent = area;
        sideAValue.textContent = sideA;
        sideBValue.textContent = sideBRounded;
        
        // Get container dimensions with some padding
        const containerWidth = rectangleContainer.clientWidth * 0.9;
        const containerHeight = rectangleContainer.clientHeight * 0.9;
        
        // Calculate proportional scaling to maintain aspect ratio
        // We need to find the maximum scale factor that keeps both dimensions within bounds
        const maxScaleForWidth = containerWidth / Math.max(sideA, maxA);
        const maxScaleForHeight = containerHeight / Math.max(sideB, maxB);
        
        // Use the smaller scale factor to ensure both dimensions fit
        const scale = Math.min(maxScaleForWidth, maxScaleForHeight);
        
        // Apply the same scale to both dimensions to maintain proportions
        const width = sideA * scale;
        const height = sideB * scale;
        
        // Apply dimensions to rectangle
        rectangle.style.width = `${Math.max(20, width)}px`; // Minimum 20px for visibility
        rectangle.style.height = `${Math.max(20, height)}px`; // Minimum 20px for visibility
        
        // Update labels
        sideALabel.textContent = `a = ${sideA}`;
        sideBLabel.textContent = `b = ${sideBRounded}`;
    }

    // Update side A slider max value based on area
    function updateSideASliderMax() {
        // Side A can't be larger than the area (since b must be at least 1)
        sideASlider.max = area;
        
        // If current side A is greater than the new max, adjust it
        if (sideA > area) {
            sideA = area;
            sideASlider.value = sideA;
        }
    }

    // Event listeners
    areaSlider.addEventListener('input', () => {
        area = parseInt(areaSlider.value);
        updateSideASliderMax();
        updateRectangle();
    });

    sideASlider.addEventListener('input', () => {
        sideA = parseInt(sideASlider.value);
        updateRectangle();
    });

    // Handle window resize
    window.addEventListener('resize', updateRectangle);

    // Initial setup
    updateRectangle();
}); 