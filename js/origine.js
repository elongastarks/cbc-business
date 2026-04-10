import { RDC_LOCATIONS } from "./rdcLocations.js";

document.addEventListener("DOMContentLoaded", () => {

  const provinceSelect = document.getElementById("province");
  const villeSelect = document.getElementById("ville");

  // 🔒 Sécurité : éviter crash si élément absent
  if (!provinceSelect || !villeSelect) return;

  // --- RESET VILLES ---
  function resetVilles() {
    villeSelect.innerHTML = `<option value="">Choisir une ville</option>`;
    villeSelect.disabled = true;
  }

  // --- LOAD PROVINCES ---
  function loadProvinces() {
    provinceSelect.innerHTML = `<option value="">Choisir une province</option>`;

    Object.keys(RDC_LOCATIONS)
      .sort((a, b) => a.localeCompare(b))
      .forEach(province => {
        const option = document.createElement("option");
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
      });
  }

  // --- LOAD VILLES ---
  function loadVilles(province) {
    resetVilles();

    const villes = RDC_LOCATIONS[province];
    if (!villes) return;

    villes
      .sort((a, b) => a.localeCompare(b))
      .forEach(ville => {
        const option = document.createElement("option");
        option.value = ville;
        option.textContent = ville;
        villeSelect.appendChild(option);
      });

    villeSelect.disabled = false;
  }

  // --- EVENTS ---
  provinceSelect.addEventListener("change", () => {
    const selectedProvince = provinceSelect.value;

    if (!selectedProvince) {
      resetVilles();
      return;
    }

    loadVilles(selectedProvince);
  });

  // --- INIT ---
  loadProvinces();
  resetVilles();
});