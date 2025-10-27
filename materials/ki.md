---
layout: page
title: KI
description: "Grundlagen der Künstlichen Intelligenz durch eine datenbasierte Perspektive am Beispiel der Bilderkennung erlernen und vermitteln."
category: material
---


## Trainiere dein erstes Neuronales Netz!

![KI Bild]({{ site.baseurl }}/materials/ki.png)

 <div id="iframe-container" style="text-align:center;">
    <button onclick="openModal()" class="btn-glow">
      Training starten
    </button>
  </div>

  <!-- Modal container -->
  <div id="iframe-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgb(255,255,255); z-index:9999; align-items:center; justify-content:center;">
    <div style="position:relative; width:90%; height:90%;">
      <div id="modal-iframe-wrapper" style="width:100%; height:100%;"></div>
      <button onclick="closeModal()" class="close-btn">
        X
      </button>
    </div>
  </div>

  <script>
    const modalWrapper = document.getElementById("modal-iframe-wrapper");
    const modal = document.getElementById("iframe-modal");

    let iframe; // Declare iframe outside so we can reuse it

    function openModal() {
      // Create the iframe only when the modal is opened
      iframe = document.createElement("iframe");
      iframe.src = "/webapps/suessigkeiten/index.html";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "1px solid #ccc";

      modalWrapper.appendChild(iframe);
      modal.style.display = "flex";
    }

    function closeModal() {
      modal.style.display = "none";
      // Remove iframe from DOM to stop it from running in the background
      modalWrapper.innerHTML = "";
    }
  </script>


 <style>
    .btn-glow {
      position: relative;
      border-radius: 50px;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      transition: transform 0.3s ease;
      background: linear-gradient(45deg, rgb(211, 131, 248), rgb(64, 224, 208));
      background-size: 200% 200%;
      animation: gradientShift 3s ease infinite, pulse 2s infinite;
      box-shadow: 0 0 15px rgba(211, 131, 248, 0.4);
    }

    .btn-glow:hover {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(64, 224, 208, 0.6);
    }

    @keyframes gradientShift {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(211, 131, 248, 0.4);
      }
      50% {
        box-shadow: 0 0 15px 5px rgba(64, 224, 208, 0.6);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(211, 131, 248, 0.4);
      }
    }

    /* Close button styles */
    .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10000;
      border-radius: 50px;
      background: linear-gradient(45deg, rgb(211, 131, 248), rgb(64, 224, 208));
      background-size: 200% 200%;
      animation: gradientShift 3s ease infinite;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .close-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 10px rgba(64, 224, 208, 0.6);
    }
  </style>

