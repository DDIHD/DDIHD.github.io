---
layout: page
title: KI
description: "Künstliche Intelligenz im Realschulunterricht kann Schülern helfen, ein grundlegendes Verständnis für moderne Technologien zu entwickeln und sie auf zukünftige Herausforderungen in der digitalen Welt vorzubereiten."
category: material
---

# Künstliche Intelligenz im Unterricht
## Fortbildung für Realschullehrkräfte

Diese Fortbildung richtet sich an Lehrkräfte aller Fachrichtungen, die KI-Technologien sinnvoll in ihren Unterricht integrieren möchten.

### Kurzbeschreibung
In dieser praxisorientierten Fortbildung lernen Sie die Grundlagen der Künstlichen Intelligenz kennen und erarbeiten konkrete Unterrichtskonzepte für Ihren Fachunterricht. Der Fokus liegt auf der verantwortungsvollen und didaktisch sinnvollen Integration von KI-Tools in den Realschulunterricht.


<iframe width="560" height="315" src="https://www.youtube.com/embed/7xTGNNLPyMI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>



[HIER GEHTS ZUR OBJEKTERKENNUNG](/webapps/object/index.html)

[download](https://heibox.uni-heidelberg.de/d/5df2f810f0234c5a9a20/)





### Lernziele
- Grundlegendes Verständnis von KI-Technologien und deren Funktionsweise
- Kenntnis aktueller KI-Tools und deren Einsatzmöglichkeiten im Unterricht
- Entwicklung von Unterrichtskonzepten unter Berücksichtigung des Bildungsplans
- Reflexion über Chancen und Risiken von KI im Bildungskontext
- Förderung der Medienkompetenz bei Schülerinnen und Schülern

### Modulare Kursstruktur

#### Modul 1: Grundlagen der KI
- Was ist Künstliche Intelligenz?
- Arten von KI-Systemen
- Aktuelle Entwicklungen und Anwendungen
- Ethische Aspekte und Datenschutz

#### Modul 2: KI-Tools im Unterricht
- Überblick über verfügbare Bildungs-KI-Tools
- Praktische Übungen mit ausgewählten Anwendungen
- Didaktische Integration in den Fachunterricht
- Beispielhafte Unterrichtsszenarien

#### Modul 3: Unterrichtsplanung und -gestaltung
- Entwicklung eigener Unterrichtseinheiten
- Differenzierungsmöglichkeiten
- Leistungsbeurteilung und Evaluation
- Rechtliche Rahmenbedingungen

### Organisatorisches
**Umfang:** 3 Präsenztage (je 6 Stunden) + Online-Selbstlernphase  
**Zielgruppe:** Realschullehrkräfte aller Fachrichtungen  
**Voraussetzungen:** Grundlegende PC-Kenntnisse  
**Teilnehmerzahl:** max. 15 Personen

### Methoden
- Inputvorträge
- Praktische Übungen
- Gruppenarbeit
- Erfahrungsaustausch
- Online-Lernmaterialien
- Individuelle Projektarbeit

### Materialien
Die Teilnehmenden erhalten:
- Digitale Handreichungen
- Zugang zur Online-Lernplattform
- Beispiel-Unterrichtsentwürfe
- Checklisten für den KI-Einsatz
- Weiterführende Literaturempfehlungen

### Anmeldung und Kontakt
Weitere Informationen und Anmeldung unter:  
E-Mail: ki-fortbildung@schule-bw.de  
Tel.: 0711-XXXXXXX


<div id="iframe-container" style="text-align:center;">
  <div id="iframe-wrapper" style="display:inline-block;">
    <iframe 
      id="my-iframe" 
      src="/webapps/suessigkeiten/index.html" 
      width="600" 
      height="400" 
      style="border:1px solid #ccc;">
    </iframe>
  </div>
  <br />
  <button onclick="expandIframe()">Enlarge</button>
</div>

<!-- Modal container -->
<div id="iframe-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgb(255,255,255,255); z-index:9999; align-items:center; justify-content:center;">
  <div style="position:relative; width:90%; height:90%;">
    <div id="modal-iframe-wrapper" style="width:100%; height:100%;"></div>
    <button onclick="shrinkIframe()" style="position:absolute; top:10px; right:10px; z-index:10000;">Close</button>
  </div>
</div>


<script>
  const iframe = document.getElementById("my-iframe");
  const iframeWrapper = document.getElementById("iframe-wrapper");
  const modalWrapper = document.getElementById("modal-iframe-wrapper");
  const modal = document.getElementById("iframe-modal");

  function expandIframe() {
    modalWrapper.appendChild(iframe);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    modal.style.display = "flex";
  }

  function shrinkIframe() {
    iframeWrapper.appendChild(iframe);
    iframe.style.width = "600px";
    iframe.style.height = "400px";
    modal.style.display = "none";
  }
</script>



