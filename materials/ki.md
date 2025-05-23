---
layout: page
title: KI
description: "Grundlagen der Künstlichen Intelligenz durch eine datenbasierte Perspektive am Beispiel der Bilderkennung erlernen und vermitteln."
category: material
---

# Grundlagen der Künstliche Intelligenz
## Einstieg, Lehrkräftefortbildung und Materialien für den Unterricht

Mit dieser Fortbildung und Materialien-Sammlung möchten wir eine datenbasierte Perspektive auf die Grundlagen der Künstlichen Intelligenz schaffen, welche wir nicht nur für die Sekundarstufe 1 empfehlen möchten, sondern auch als allgemeinen, zugänglichen Einstieg in das Thema. 
 
**<u>Anmerkung: vorläufige Vorstellung des Entwicklungsstands der Fortbildung.</u>**

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


  
### Kurzbeschreibung

Viele Interaktionen mit und um Neuronale Netze herum geschehen durch Daten. Während die Algorithmen selbst, unabhängig von der Datengrundlage, auf bestimmte Eigenschaften ausgelegt sein können, wird deren Verhalten häuptsächlich durch die (Tranings-)Daten geprägt. Die datenbasierte Perspektive bietet durch konkrete und nahbare Alltagsbeispiele einen Zugang zu den Grundlagen der KI, welche häufig zu abstrakt oder komplex scheinen, jedoch für eine kritische Beurteilung oder eigene Anwendung unabdingbar sind. Am Beispiel der Bilderkennung und Data Literacy werden sie ersichtlich und sind transferierbar auf gewerbliche Anwendungen und große Sprachmodelle wie ChatGPT.

### Vorläufige Inhalte

- [Web-App zur Bild-/Objekterkennung](/webapps/object/index.html) als Einstieg in den Unterricht oder die Fortbildung, zum Experimentieren, Verhalten und Grenzen austesten. [Hier gibt es ein Arbeitsblatt dazu](https://heibox.uni-heidelberg.de/f/f21b516542704ab9a412/?dl=1). Anleitung zur Installation der Webseite als App und zur Offline-Nutzung folgen. Empfohlen auf Tablet, um die Kamera auf der Rückseite nutzen zu können. <u> Ladezeit beachten, kurz warten und ggf. Kamera-Erlaubnis erteilen </u>
- [Präsentation](https://heibox.uni-heidelberg.de/f/b036b6b969754421b57e/?dl=1) und [Arbeitsblatt](https://heibox.uni-heidelberg.de/f/b0c152db98ff4cf5bc67/?dl=1) zum Thema Lernen, Daten-Repräsentationen und Features. Hier kann in Gruppenarbeit im Anschluss eine KI-gesteuerte Katzenklappe entworfen werden, welche nur Hauskatzen hineinlassen soll, jedoch keine anderen Tiere.
- [Arbeitsblatt](https://heibox.uni-heidelberg.de/f/256b503272db402cbcdc/?dl=1) um mittels [Google Teachable Machine](https://teachablemachine.withgoogle.com/) Modelle zur Objekterkennung selbst zu trainieren. Schließt den Kreis zur erten Bilderkennungsaufgabe und soll zeigen, wie schnell gewisse Eigenschaften oder (Fehl-)Verhalten entstehen können.
- [Web-Anwendung mit Beispiel zum Training Neuronaler Netze]("/webapps/suessigkeiten/index.html" )
- **TEST:** [Emotionen klassifizieren](https://ddihd.github.io/webapps/emotions/index.html) oder [Alter und Geschlecht erkennen](https://ddihd.github.io/webapps/agegender/index.html). Hier können zusätzlich zur Datenlage auch gesellschaftliche Probleme bzgl. Moral, Nutzen und Technologievertrauen diskutiert werden.


### Kontakt 

[M.Sc. Jonas Braun](https://hse-heidelberg.de/ueber-die-hse/team-von-a-z/braun-jonas) 

[M.Sc.² Matthias Matzner](https://hse-heidelberg.de/ueber-die-hse/team-von-a-z/matzner-matthias) 

[Prof. Dr. Claudia Hildebrandt](https://www.hse-heidelberg.de/ueber-die-hse/team-von-a-z/hildebrandt-claudia) 
