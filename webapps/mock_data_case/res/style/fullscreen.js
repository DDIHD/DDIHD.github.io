(function () {
  "use strict";

  function isFullscreenEnabled() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
  }

  function requestFullscreen(element) {
    if (element.requestFullscreen) return element.requestFullscreen();
    if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
    if (element.mozRequestFullScreen) return element.mozRequestFullScreen();
    if (element.msRequestFullscreen) return element.msRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  }

  function isElementFullscreen(element) {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    return fsEl === element;
  }

  function applyFallbackFullscreen(element) {
    element.classList.add("fs-active");
    document.body.classList.add("fs-lock");
    element.dataset.fsFallback = "1";
  }

  function removeFallbackFullscreen(element) {
    element.classList.remove("fs-active");
    document.body.classList.remove("fs-lock");
    delete element.dataset.fsFallback;
  }

  function setButtonState(button, active) {
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.title = active ? "Exit fullscreen" : "Enter fullscreen";
    button.textContent = active ? "⤢" : "⛶";
  }

  function toggleFullscreenFor(container, button) {
    if (isFullscreenEnabled()) {
      if (isElementFullscreen(container)) {
        exitFullscreen();
        // state change handled via fullscreenchange listener
      } else {
        requestFullscreen(container);
      }
    } else {
      // Fallback: CSS-based fullscreen
      const isActive = container.classList.contains("fs-active");
      if (isActive) {
        removeFallbackFullscreen(container);
        setButtonState(button, false);
      } else {
        applyFallbackFullscreen(container);
        setButtonState(button, true);
      }
    }
  }

  function initializeFullscreenButton(button) {
    const container = button.closest(".card") || button.closest("[data-fs-container]") || document.body;
    setButtonState(button, isElementFullscreen(container) || container.classList.contains("fs-active"));

    button.addEventListener("click", (e) => {
      e.preventDefault();
      toggleFullscreenFor(container, button);
    });

    return { button, container };
  }

  function createFullscreenButton() {
    const button = document.createElement("button");
    button.className = "fs-toggle";
    button.setAttribute("aria-label", "Toggle fullscreen");
    button.textContent = "⛶";
    return button;
  }

  function detectAndSetupWebapps() {
    // Find webapp containers - look for specific webapp IDs or containers
    // Exclude body/html to only target embedded content
    const webappSelectors = [
      "[id$='-app']:not(body):not(html)",  // Elements with IDs ending in '-app'
      "iframe[src*='webapp']",              // Iframes containing webapps
      ".webapp-container",                  // Custom webapp container class
      "[data-webapp]"                       // Elements explicitly marked as webapps
    ];

    const webappContainers = [];
    
    webappSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        // Skip body and html elements
        if (element.tagName === 'BODY' || element.tagName === 'HTML') {
          return;
        }
        
        // Skip if already processed
        if (element.hasAttribute("data-fs-container") || element.querySelector(".fs-toggle")) {
          return;
        }
        
        // Add the data attribute
        element.setAttribute("data-fs-container", "");
        
        // Make sure container is positioned
        if (window.getComputedStyle(element).position === "static") {
          element.style.position = "relative";
        }
        
        // Create and inject fullscreen button
        const button = createFullscreenButton();
        element.appendChild(button);
        
        webappContainers.push({ element, button });
      });
    });

    return webappContainers;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Setup existing fullscreen buttons
    const existingButtons = Array.from(document.querySelectorAll(".fs-toggle"));
    const buttonContainerPairs = existingButtons.map(initializeFullscreenButton);

    // Detect and setup webapps
    const webappPairs = detectAndSetupWebapps();
    webappPairs.forEach(({ button }) => {
      const pair = initializeFullscreenButton(button);
      buttonContainerPairs.push(pair);
    });

    // Global fullscreen change listener
    document.addEventListener("fullscreenchange", () => {
      buttonContainerPairs.forEach(({ button, container }) => {
        const active = isElementFullscreen(container) || container.classList.contains("fs-active");
        setButtonState(button, active);
      });
    });

    // Watch for dynamically added webapps (MutationObserver)
    const observer = new MutationObserver((mutations) => {
      let needsSetup = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName !== 'BODY' && node.tagName !== 'HTML') { // Element node, not body/html
            // Check if the added node or its children match webapp selectors
            if (node.matches && node.matches("[id$='-app'], .webapp-container, [data-webapp]")) {
              needsSetup = true;
            } else if (node.querySelector) {
              if (node.querySelector("[id$='-app'], .webapp-container, [data-webapp]")) {
                needsSetup = true;
              }
            }
          }
        });
      });
      
      if (needsSetup) {
        const newPairs = detectAndSetupWebapps();
        newPairs.forEach(({ button }) => {
          const pair = initializeFullscreenButton(button);
          buttonContainerPairs.push(pair);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();