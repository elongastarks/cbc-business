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
    provinceSelect.innerHTML = "";

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
    const previousSelected = new Set(selectedVilles);

    villeSelect.innerHTML = "";

    const villes = new Set();

    Array.from(selectedProvinces).forEach(p => {
      (RDC_LOCATIONS[p] || []).forEach(v => villes.add(v));
    });

    Array.from(villes).sort().forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;

      // 🔥 RESTORE sélection si encore valide
      if (previousSelected.has(v)) {
        opt.selected = true;
      }

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
     EVENTS PROVINCES (MULTI REAL)
  ========================= */
  provinceSelect.addEventListener("change", () => {

    selectedProvinces.clear();

    Array.from(provinceSelect.selectedOptions).forEach(opt => {
      selectedProvinces.add(opt.value);
    });

    cleanInvalidVilles();
    renderVilles();
  });

  /* =========================
     EVENTS VILLES (MULTI REAL)
  ========================= */
  villeSelect.addEventListener("change", () => {

    selectedVilles.clear();

    Array.from(villeSelect.selectedOptions).forEach(opt => {
      const value = opt.value;

      if (
        selectedProvinces.size > 0 &&
        !isVilleValidForProvince(value, Array.from(selectedProvinces))
      ) return;

      selectedVilles.add(value);
    });
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
