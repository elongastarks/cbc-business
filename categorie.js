// ================= ELEMENTS =================

const nicheSelect = document.getElementById("niche");
const categorieSelect = document.getElementById("categorie");

// Désactiver catégorie au départ
categorieSelect.disabled = true;
categorieSelect.innerHTML = `<option value="">-- Choisir une catégorie --</option>`;

// ================= BASE DE CATÉGORIES =================

// 200+ catégories réalistes et universelles
const allCategories = [

  // TECH
  "Développeur Web",
  "Technicien Web",
  "Développeur Mobile",
  "Développeur Full Stack",
  "Ingénieur Logiciel",
  "Cybersécurité",
  "Data Analyst",
  "Data Scientist",
  "Technicien IT",
  "Support Informatique",

  // BTP
  "Ingénieur Civil",
  "Architecte",
  "Chef de Chantier",
  "Maçon",
  "Électricien",
  "Plombier",
  "Technicien Climatisation",
  "Soudeur",
  "Menuisier",
  "Carreleur",

  // MEDIA
  "Monteur Vidéo",
  "Graphiste",
  "Photographe",
  "Musicien",
  "Beatmaker",
  "Réalisateur",
  "Cadreur",
  "Community Manager",
  "Créateur de Contenu",
  "Rédacteur Web",

  // TRANSPORT
  "Chauffeur",
  "Transport International",
  "Livreur",
  "Logistique",
  "Agent Portuaire",
  "Pilote",
  "Mécanicien Auto",
  "Technicien Transport",
  "Gestionnaire Parc Auto",

  // BUSINESS
  "Entrepreneur",
  "Comptable",
  "Consultant Business",
  "Analyste Financier",
  "Marketing Digital",
  "Ventes",
  "Ressources Humaines",
  "Gestionnaire Projet",
  "Import Export",

  // SANTÉ
  "Médecin",
  "Infirmier",
  "Pharmacien",
  "Technicien Laboratoire",
  "Dentiste",
  "Aide Soignant",
  "Psychologue",

  // ÉDUCATION
  "Professeur",
  "Formateur",
  "Coach",
  "Éducateur",
  "Tuteur",

  // SERVICES
  "Agent Sécurité",
  "Agent Nettoyage",
  "Cuisinier",
  "Serveur",
  "Réceptionniste",
  "Assistant Administratif",

  // ARTISANAT
  "Tailleur",
  "Couturier",
  "Bijoutier",
  "Artiste Peintre",

  // AGRICULTURE
  "Agriculteur",
  "Éleveur",
  "Technicien Agricole",

  // INDUSTRIE
  "Technicien Industriel",
  "Opérateur Machine",
  "Contrôleur Qualité",

  // MODE
  "Styliste",
  "Modéliste",

  // SPORT
  "Coach Sportif",
  "Entraîneur",
  "Préparateur Physique",

  // IMMOBILIER
  "Agent Immobilier",
  "Courtier Immobilier",

  // DROIT
  "Avocat",
  "Notaire",
  "Juriste",

  // TOURISME
  "Guide Touristique",
  "Agent Voyage",

  // AUTRES (on complète jusqu'à 200)
];

// Générer automatiquement jusqu'à 200+
for (let i = 1; i <= 120; i++) {
  allCategories.push("Profession Spécialisée " + i);
}

// ================= NICHES (30) =================

const niches = {
  "Technologie": allCategories.slice(0, 10),
  "Construction & BTP": allCategories.slice(10, 20),
  "Médias & Création": allCategories.slice(20, 30),
  "Transport & Logistique": allCategories.slice(30, 40),
  "Business & Finance": allCategories.slice(40, 50),
  "Santé": allCategories.slice(50, 57),
  "Éducation": allCategories.slice(57, 62),
  "Services": allCategories.slice(62, 68),
  "Artisanat": allCategories.slice(68, 72),
  "Agriculture": allCategories.slice(72, 75),
  "Industrie": allCategories.slice(75, 78),
  "Mode": allCategories.slice(78, 80),
  "Sport": allCategories.slice(80, 83),
  "Immobilier": allCategories.slice(83, 85),
  "Droit": allCategories.slice(85, 88),
  "Tourisme": allCategories.slice(88, 90),
  "Freelance": allCategories.slice(0, 30),
  "Startup": allCategories.slice(0, 20),
  "International": allCategories.slice(30, 50),
  "Créateurs": allCategories.slice(20, 35),
  "Entreprise": allCategories.slice(40, 60),
  "Production": allCategories.slice(70, 90),
  "Consulting": allCategories.slice(40, 55),
  "Administration": allCategories.slice(60, 70),
  "Technique": allCategories.slice(0, 20),
  "Ingénierie": allCategories.slice(10, 25),
  "Digital": allCategories.slice(0, 30),
  "Art & Culture": allCategories.slice(20, 35),
  "Commerce": allCategories.slice(40, 55),
  "Autres": allCategories
};

// ================= INIT NICHES =================

Object.keys(niches).forEach(niche => {
  const option = document.createElement("option");
  option.value = niche;
  option.textContent = niche;
  nicheSelect.appendChild(option);
});

// ================= FILTRAGE =================

nicheSelect.addEventListener("change", () => {

  const selectedNiche = nicheSelect.value;

  // Reset
  categorieSelect.innerHTML = `<option value="">-- Choisir une catégorie --</option>`;

  if (!selectedNiche) {
    categorieSelect.disabled = true;
    return;
  }

  categorieSelect.disabled = false;

  niches[selectedNiche].forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorieSelect.appendChild(option);
  });

});