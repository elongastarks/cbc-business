import { RDC_LOCATIONS } from "./rdcLocations.js";

document.addEventListener("DOMContentLoaded", () => {

  const provinceSelect = document.getElementById("province");
  const villeSelect = document.getElementById("ville");

  /* =========================
     STATE AREA
  ========================= */
  const selectedProvinces = new Set();
  const selectedVilles = new Set();

  const provinces = Object.keys(RDC_LOCATIONS).sort();

  /* =========================
     INIT
  ========================= */
  function init() {
    renderProvinces();
    renderVilles();
  }

  /* =========================
     PROVINCES
  ========================= */
  function renderProvinces() {
    provinceSelect.innerHTML = `<option value="">-- Provinces (multi) --</option>`;

    provinces.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      provinceSelect.appendChild(opt);
    });
  }

  /* =========================
     VILLES
  ========================= */
  function renderVilles() {
    villeSelect.innerHTML = `<option value="">-- Villes (optionnel) --</option>`;

    const villes = new Set();

    Array.from(selectedProvinces).forEach(p => {
      (RDC_LOCATIONS[p] || []).forEach(v => villes.add(v));
    });

    Array.from(villes).sort().forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      villeSelect.appendChild(opt);
    });
  }

  /* =========================
     VALIDATION LOGIQUE
  ========================= */
  function isVilleValidForProvince(ville, provincesArray) {
    return provincesArray.some(p =>
      (RDC_LOCATIONS[p] || []).includes(ville)
    );
  }

  function cleanInvalidVilles() {
    const validVilles = new Set();

    selectedVilles.forEach(v => {
      if (isVilleValidForProvince(v, Array.from(selectedProvinces))) {
        validVilles.add(v);
      }
    });

    selectedVilles.clear();
    validVilles.forEach(v => selectedVilles.add(v));
  }

  /* =========================
     TOGGLE SAFE
  ========================= */
  function toggleSelection(set, value) {
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
  }

  /* =========================
     EVENTS PROVINCES
  ========================= */
  provinceSelect.addEventListener("change", () => {

    const value = provinceSelect.value;

    if (!value) return;

    toggleSelection(selectedProvinces, value);

    /* 🔥 IMPORTANT : recalcul cohérence */
    cleanInvalidVilles();

    renderVilles();

    provinceSelect.value = "";
  });

  /* =========================
     EVENTS VILLES
  ========================= */
  villeSelect.addEventListener("change", () => {

    const value = villeSelect.value;

    if (!value) return;

    /* 🔥 VALIDATION AVANT AJOUT */
    if (selectedProvinces.size > 0 &&
        !isVilleValidForProvince(value, Array.from(selectedProvinces))) {
      
      alert("Cette ville ne correspond pas aux provinces sélectionnées.");
      villeSelect.value = "";
      return;
    }

    toggleSelection(selectedVilles, value);

    villeSelect.value = "";
  });

  /* =========================
     EXPORT AREA CLEAN
  ========================= */
  window.getTargetingData = function () {
    return {
      provinces: Array.from(selectedProvinces),
      villes: Array.from(selectedVilles)
    };
  };

  /* =========================
     INIT
  ========================= */
  init();
});