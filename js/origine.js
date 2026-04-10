document.addEventListener("DOMContentLoaded", () => {

  const provinceSelect = document.getElementById("province");
  const villeSelect = document.getElementById("ville");

  // --- DATA RDC (VERSION ÉTENDUE MAIS STRUCTURÉE) ---
  const data = {
    "Kinshasa": ["Kinshasa", "Gombe", "Ngaliema", "Limete", "Matete", "Masina"],
    
    "Haut-Katanga": ["Lubumbashi", "Likasi", "Kasumbalesa", "Kipushi"],
    
    "Lualaba": ["Kolwezi", "Dilolo"],
    
    "Nord-Kivu": ["Goma", "Butembo", "Beni", "Oicha", "Kasindi"],
    
    "Sud-Kivu": ["Bukavu", "Uvira", "Kalehe", "Walungu"],
    
    "Ituri": ["Bunia", "Mahagi", "Aru"],
    
    "Tshopo": ["Kisangani", "Banalia"],
    
    "Kongo-Central": ["Matadi", "Boma", "Moanda", "Mbanza-Ngungu"],
    
    "Kasaï": ["Tshikapa", "Ilebo"],
    
    "Kasaï-Central": ["Kananga", "Demba"],
    
    "Kasaï-Oriental": ["Mbuji-Mayi"],
    
    "Kwango": ["Kenge"],
    
    "Kwilu": ["Bandundu"],
    
    "Mai-Ndombe": ["Inongo"],
    
    "Maniema": ["Kindu"],
    
    "Mongala": ["Lisala"],
    
    "Nord-Ubangi": ["Gbadolite"],
    
    "Sud-Ubangi": ["Gemena"],
    
    "Sankuru": ["Lusambo"],
    
    "Tanganyika": ["Kalemie"],
    
    "Tshuapa": ["Boende"],
    
    "Haut-Lomami": ["Kamina"],
    
    "Haut-Uele": ["Isiro"],
    
    "Bas-Uele": ["Buta"]
  };

  // --- RESET ---
  function resetVilles() {
    villeSelect.innerHTML = `<option value="">Choisir une ville</option>`;
  }

  // --- LOAD PROVINCES ---
  function loadProvinces() {
    provinceSelect.innerHTML = `<option value="">Choisir une province</option>`;

    Object.keys(data)
      .sort()
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

    if (!data[province]) return;

    data[province]
      .sort()
      .forEach(ville => {
        const option = document.createElement("option");
        option.value = ville;
        option.textContent = ville;
        villeSelect.appendChild(option);
      });
  }

  // --- EVENTS ---
  provinceSelect.addEventListener("change", () => {
    loadVilles(provinceSelect.value);
  });

  // --- INIT ---
  loadProvinces();
});