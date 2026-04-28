(function () {
  "use strict";

  function getAppContainer() {
    return document.querySelector("[data-v-app]");
  }

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

  function isPresentationModeActive(container) {
    if (!container) return false;
    return isElementFullscreen(container) || container.classList.contains("fs-active");
  }

  function emitPresentationModeChange(container) {
    document.dispatchEvent(
      new CustomEvent("presentationmodechange", {
        detail: { active: isPresentationModeActive(container) },
      })
    );
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
      } else {
        requestFullscreen(container);
      }
    } else {
      const isActive = container.classList.contains("fs-active");
      if (isActive) {
        removeFallbackFullscreen(container);
        if (button) setButtonState(button, false);
      } else {
        applyFallbackFullscreen(container);
        if (button) setButtonState(button, true);
      }
      emitPresentationModeChange(container);
    }
  }

  function setPresentationMode(active) {
    const container = getAppContainer();
    if (!container) return Promise.resolve(false);

    const isActive = isPresentationModeActive(container);
    if (active === isActive) {
      emitPresentationModeChange(container);
      return Promise.resolve(true);
    }

    if (isFullscreenEnabled()) {
      if (active) {
        return Promise.resolve(requestFullscreen(container));
      }
      return Promise.resolve(exitFullscreen());
    }

    if (active) {
      applyFallbackFullscreen(container);
    } else {
      removeFallbackFullscreen(container);
    }
    emitPresentationModeChange(container);
    return Promise.resolve(true);
  }

  window.setPresentationMode = setPresentationMode;
  window.isPresentationModeActive = function () {
    return isPresentationModeActive(getAppContainer());
  };

  function createFullscreenButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-fs-auto-button", "1");
    button.setAttribute("aria-label", "Enter fullscreen");
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.zIndex = "10000";
    button.style.width = "36px";
    button.style.height = "36px";
    button.style.border = "1px solid rgba(0, 0, 0, 0.2)";
    button.style.borderRadius = "6px";
    button.style.background = "rgba(255, 255, 255, 0.9)";
    button.style.color = "#222";
    button.style.cursor = "pointer";
    button.style.fontSize = "18px";
    button.style.lineHeight = "1";
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    return button;
  }

  function attachButton(container) {
    if (!container || container.querySelector("[data-fs-auto-button='1']")) {
      return false;
    }
    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const button = createFullscreenButton();
    setButtonState(button, isPresentationModeActive(container));

    button.addEventListener("click", (e) => {
      e.preventDefault();
      toggleFullscreenFor(container, button);
    });

    container.appendChild(button);

    document.addEventListener("fullscreenchange", () => {
      const active = isPresentationModeActive(container);
      setButtonState(button, active);
      emitPresentationModeChange(container);
    });
    return true;
  }

  function tryAttachToApp() {
    const container = document.querySelector("[data-v-app]");
    return attachButton(container);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (tryAttachToApp()) return;

    const observer = new MutationObserver(() => {
      if (tryAttachToApp()) {
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-v-app"],
    });

    // Safety timeout: stop observing if a page has no Vue app.
    window.setTimeout(() => observer.disconnect(), 10000);
  });
})();
