/**
 * Datenverarbeitung: JSON-Quelle → Prozessierte Daten
 * 
 * Liest die ohAuto JSON-Daten, validiert,
 * und schreibt optimierte Daten für den Build.
 * 
 * KEINE fake Daten! Nur was wir wirklich haben:
 * - Motorbezeichnung, Leistung, Bauzeit, Motorcode, Steuertrieb, Intervall
 * - Artikel-Content für Top-Modelle (ohAuto-Recherche)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Pfade
const PATHS = {
  raw: join(ROOT, 'data', 'raw', 'vehicles.json'),
  articles: join(ROOT, 'data', 'articles'),
  processed: join(ROOT, 'data', 'processed', 'vehicles.json'),
  processedDir: join(ROOT, 'data', 'processed'),
};

// Artikel-Zuordnung: modell → artikel-slug
// Die Artikel liegen als Markdown in data/articles/
const ARTICLE_MAP = {
  'VW Golf': 'vw-golf-steuerkette-oder-zahnriemen',
  'VW Passat': 'vw-passat-steuerkette-oder-zahnriemen',
  'VW Polo': 'vw-polo-steuerkette-oder-zahnriemen',
  'Opel Astra': 'opel-astra-steuerkette-oder-zahnriemen',
  'Ford Focus': 'ford-focus-steuerkette-oder-zahnriemen',
};

/**
 * Extrahiert das echte Modell aus der Motorbezeichnung.
 * Die Quelldaten haben falsche modell-Zuordnungen, aber die Motorbezeichnung
 * ist korrekt: "VW Bora 1.4" → "Bora", "VW Golf 1.4 TSI" → "Golf"
 */
function extractModellFromMotor(motorBezeichnung, marke, markeVariants) {
  if (!motorBezeichnung || motorBezeichnung === 'Unbekannt') return 'Unbekannt';
  
  // Fremdmarken-Motoren herausfiltern (z.B. BMW-Motoren unter Mercedes)
  const fremdMarken = ['BMW', 'Audi', 'VW', 'Volkswagen', 'Opel', 'Ford', 'Peugeot', 'Renault', 'Fiat', 'Toyota'];
  const isFremdMotor = fremdMarken.some(fm => {
    if (fm === marke) return false; // Eigene Marke ist OK
    return motorBezeichnung.toLowerCase().startsWith(fm.toLowerCase() + ' ');
  });
  if (isFremdMotor) return null; // Ignoriere fremde Motoren
  
  // Bekannte Modelle mit Mustern
  const knownModels = {
    'VW': ['Golf', 'Polo', 'Passat', 'Tiguan', 'Touareg', 'Touran', 'Caddy', 
           'Sharan', 'Bora', 'Beetle', 'Fox', 'Lupo', 'up!', 'Scirocco', 'Eos',
           'CC', 'Arteon', 'T-Roc', 'T-Cross', 'Taigo', 'ID.3', 'ID.4', 'ID.5',
           'Transporter', 'Crafter', 'Amarok', 'T5', 'T6'],
    'Audi': ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8',
             'TT', 'R8', 'e-tron'],
    'BMW': ['1er', '2er', '3er', '4er', '5er', '6er', '7er', '8er', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
            'i3', 'i4', 'iX', 'M2', 'M3', 'M4', 'M5', 'Z4'],
    'Mercedes': ['A-Klasse', 'B-Klasse', 'C-Klasse', 'E-Klasse', 'S-Klasse', 
                 'CLA', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'SLK', 'SL', 'V-Klasse'],
    'Opel': ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Crossland', 'Grandland', 
             'Zafira', 'Meriva', 'Kadett', 'Vectra', 'Signum', 'Combo', 'Movano', 'Adam'],
    'Ford': ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Puma', 'EcoSport', 'Edge', 
             'S-Max', 'C-Max', 'Galaxy', 'Tourneo', 'Transit', 'Ranger', 'Ka'],
    'Skoda': ['Octavia', 'Fabia', 'Superb', 'Kodiaq', 'Karoq', 'Kamiq', 'Rapid', 
              'Roomster', 'Yeti', 'Enyaq', 'Citigo'],
    'Seat': ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Altea', 'Toledo', 
             'Mii', 'Alhambra', 'Cordoba'],
    'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic', 'Laguna', 
                'Twingo', 'Koleos', 'Espace', 'Talisman', 'Modus', 'Fluence'],
    'Peugeot': ['208', '308', '508', '2008', '3008', '5008', '108', '206', '207', '307', '407', '607', 'Partner'],
    'Fiat': ['500', 'Panda', 'Punto', 'Tipo', '500X', '500L', 'Ducato', 'Doblo', 
             'Bravo', 'Stilo', 'Idea', 'Qubo', 'Talento', 'Fullback'],
    'Toyota': ['Yaris', 'Corolla', 'Auris', 'Avensis', 'RAV4', 'C-HR', 'Camry', 
               'Prius', 'Aygo', 'Supra', 'Land Cruiser', 'Hilux'],
    'Nissan': ['Qashqai', 'Juke', 'X-Trail', 'Micra', 'Note', 'Leaf', 'Navara', 
               'Pathfinder', '370Z', 'GT-R'],
    'Hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Kona', 'Santa Fe', 'Ioniq', 
                'Accent', 'Elantra', 'Sonata'],
    'Kia': ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Stonic', 'Niro', 
            'ProCeed', 'EV6', 'Soul'],
    'Mazda': ['2', '3', '6', 'CX-3', 'CX-5', 'CX-30', 'CX-9', 'MX-5', 'MX-30'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'Fit', 'Type R'],
    'Volvo': ['V40', 'V50', 'V60', 'V70', 'V90', 'XC40', 'XC60', 'XC70', 'XC90', 
              'S40', 'S60', 'S80', 'S90', 'C30', 'C70'],
    'Subaru': ['Impreza', 'Outback', 'Forester', 'XV', 'WRX', 'BRZ', 'Levorg', 'Legacy'],
    'Suzuki': ['Swift', 'Vitara', 'S-Cross', 'Ignis', 'Baleno', 'Jimny', 'Alto', 'Celerio'],
    'Mini': ['ONE', 'Cooper', 'Cooper S', 'Cooper D', 'JCW'],
    'Smart': ['ForTwo', 'ForFour', 'Roadster'],
    'Citroen': ['C1', 'C2', 'C3', 'C4', 'C5', 'C3 Aircross', 'C5 Aircross', 'Berlingo', 'DS3', 'DS4', 'DS5'],
    'Saab': ['9-3', '9-5', '9-7X'],
  };
  
  // Spezielle Muster für Marken mit Klassennamen statt Modellnamen
  // Mercedes: "C 180" → C-Klasse, "E 200" → E-Klasse, "A 160" → A-Klasse
  const mercedesKlassePattern = /^Mercedes[- ]?(Benz)?\s+([A-E])\s/i;
  if (marke === 'Mercedes') {
    const klasseMatch = motorBezeichnung.match(mercedesKlassePattern);
    if (klasseMatch) {
      return `${klasseMatch[2]}-Klasse`;
    }
    // "Mercedes GLA 200" → GLA
    const suvMatch = motorBezeichnung.match(/^Mercedes[- ]?(Benz)?\s+(GL[A-S]|SLK?|V-Klasse)\s/i);
    if (suvMatch) return suvMatch[2];
  }
  
  const models = knownModels[marke] || [];
  
  // Prüfe ob ein bekanntes Modell in der Bezeichnung vorkommt
  // Normalisiere Akzente für Matching: Mégane → Megane
  const normalizedBezeichnung = motorBezeichnung
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const model of models) {
    const pattern = new RegExp(`(?:^|\\s)${escapeRegex(model)}(?:\\s|$|\\d)`, 'i');
    if (pattern.test(normalizedBezeichnung) || pattern.test(motorBezeichnung)) {
      return model;
    }
  }
  
  // Fallback: Erstes Wort nach Marken-Präfix entfernen → Rest ist Modell
  let cleaned = motorBezeichnung;
  markeVariants.forEach(variant => {
    cleaned = cleaned.replace(new RegExp(`^${escapeRegex(variant)}\\s*`, 'i'), '');
  });
  
  // Extrahiere Modellname (unterstützt auch é, è, à etc.)
  const match = cleaned.match(/^([A-Za-z0-9äöüßéèàâêîôûëïüÿÄÖÜÉÈÀÂÊÎÔÛËÏÜŸ-]+(?:\s+[A-Z0-9éè][a-z0-9éè]*)?)/);
  return match ? match[1] : motorBezeichnung.split(' ')[1] || 'Unbekannt';
}

/**
 * Marken-Varianten (VW → Volkswagen, BMW → Bayerische Motoren Werke, etc.)
 */
function getBrandVariants(marke) {
  const variants = {
    'VW': ['Volkswagen'],
    'Volkswagen': ['VW'],
    'BMW': ['Bayerische Motoren Werke'],
    'Mercedes': ['Mercedes-Benz'],
    'Mercedes-Benz': ['Mercedes'],
    'Opel': ['Adam Opel'],
    'Audi': ['AUDI AG'],
    'Ford': ['Ford-Werke'],
    'Peugeot': ['Peugeot S.A.'],
    'Renault': ['Renault S.A.'],
    'Fiat': ['Fiat S.p.A.'],
    'Skoda': ['Škoda', 'Skoda Auto'],
    'Seat': ['SEAT', 'Seat S.A.'],
    'Volvo': ['Volvo Car'],
    'Toyota': ['Toyota Motor'],
    'Nissan': ['Nissan Motor'],
    'Suzuki': ['Suzuki Motor'],
    'Subaru': ['Subaru Corporation'],
    'Hyundai': ['Hyundai Motor'],
    'Kia': ['Kia Motors'],
    'Mazda': ['Mazda Motor'],
    'Honda': ['Honda Motor'],
    'Citroen': ['Citroën', 'Automobiles Citroen'],
  };
  return variants[marke] || [];
}

/**
 * Escaped Sonderzeichen für Regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Erzeugt URL-freundlichen Slug
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Lädt Artikel-Markdown, falls vorhanden
 */
function loadArticle(modell) {
  const artikelSlug = ARTICLE_MAP[modell];
  if (!artikelSlug) return null;
  
  const filePath = join(PATHS.articles, `${artikelSlug}.md`);
  if (!existsSync(filePath)) return null;
  
  const content = readFileSync(filePath, 'utf-8');
  // Entferne den ohAuto CTA-Abschnitt (wird separat durch AnkaufCTA ersetzt)
  const cleaned = content
    .replace(/##\s*(VW|Opel|Ford)[^\n]*verkaufen\?[\s\S]*$/, '')
    .trim();
  
  return {
    slug: artikelSlug,
    markdown: cleaned,
    quelle: 'ohAuto.de Recherche',
  };
}

/**
 * Generiert FAQ nur aus echten Daten (keine fake Kosten)
 */
function generateFAQ(vehicle) {
  const { marke, modell, generation, steuertrieb, motoren } = vehicle;
  const fullName = `${marke} ${modell} ${generation || ''}`.trim();
  
  const faq = [
    {
      frage: `Hat der ${fullName} eine Steuerkette oder einen Zahnriemen?`,
      antwort: steuertrieb === 'Beides (je nach Motor)'
        ? `Der ${fullName} hat je nach Motorvariante Steuerkette oder Zahnriemen. Siehe die Tabelle oben für Details zu jedem Motor.`
        : `Der ${fullName} hat einen ${steuertrieb}.`,
      schemaType: 'FAQPage'
    }
  ];
  
  // Echte FAQ nur wenn wir einen Artikel haben
  if (vehicle.artikel) {
    // Extrahiere "Was kostet" aus dem Artikel falls vorhanden
    const kostenMatch = vehicle.artikel.markdown.match(/##\s*Was kostet[^\n]*\n\n([\s\S]*?)(?=\n##|$)/);
    if (kostenMatch) {
      faq.push({
        frage: `Was kostet der Zahnriemenwechsel beim ${fullName}?`,
        antwort: kostenMatch[1].trim(),
        schemaType: 'FAQPage'
      });
    }
  }
  
  if (steuertrieb === 'Zahnriemen' || steuertrieb === 'Beides (je nach Motor)') {
    // Intervall aus Motor-Tabelle extrahieren
    const intervallMotoren = motoren.filter(m => m.steuertrieb === 'Zahnriemen' && m.intervall);
    if (intervallMotoren.length > 0) {
      const intervalle = [...new Set(intervallMotoren.map(m => m.intervall))].join(', ');
      faq.push({
        frage: `Wann muss der Zahnriemen beim ${fullName} gewechselt werden?`,
        antwort: `Laut Herstellerangaben: ${intervalle}. Prüfe auch deine Betriebsanleitung für das genaue Intervall deines Motors.`,
        schemaType: 'HowTo'
      });
    }
  }
  
  return faq;
}

/**
 * Hauptverarbeitung
 */
async function buildData() {
  console.log('🔧 Starte Datenverarbeitung...\n');
  
  // Verzeichnis erstellen
  if (!existsSync(PATHS.processedDir)) {
    mkdirSync(PATHS.processedDir, { recursive: true });
  }
  
  // Rohdaten laden
  let rawData;
  try {
    const rawContent = readFileSync(PATHS.raw, 'utf-8');
    rawData = JSON.parse(rawContent);
  } catch (e) {
    console.error('❌ Fehler beim Laden der Rohdaten:', e.message);
    process.exit(1);
  }
  
  console.log(`📊 ${rawData.length} Fahrzeuge in Rohdaten gefunden`);
  
  // Daten verarbeiten - erzeuge Seite pro Generation mit allen Motorvarianten
  const processed = [];
  let artikelCount = 0;
  
  // Phase 1: Alle Motoren sammeln und nach ECHTEM Modell gruppieren
  // Die Quelldaten haben falsche modell-Zuordnungen (z.B. VW Beetle enthält Bora-Motoren)
  // Lösung: Modell aus der Motorbezeichnung ableiten
  
  const motorPool = []; // { marke, echtesModell, generation, motor }
  
  rawData.forEach(item => {
    const marke = item.marke || 'Unbekannt';
    const markeVariants = [marke, ...getBrandVariants(marke)];
    
    (item.generationen || []).forEach((gen) => {
      (gen.motoren || []).forEach(m => {
        const motorBezeichnung = m.motorisierung || '';
        
        // Echtes Modell aus Motorbezeichnung extrahieren
        // z.B. "VW Bora 1.4" → "Bora", "VW Golf 1.4 TSI" → "Golf"
        // Gibt null zurück bei Fremdmarken-Motoren (z.B. BMW-Motor unter Mercedes)
        let echtesModell = extractModellFromMotor(motorBezeichnung, marke, markeVariants);
        
        // Fremdmarken-Motoren überspringen
        if (!echtesModell) return;
        
        // Generische Namen überspringen
        if (['Modell', 'Unbekannt', 'Nockenwellenantrieb'].includes(echtesModell)) return;
        
        motorPool.push({
          marke,
          echtesModell,
          generationName: gen.name || '',
          motor: {
            bezeichnung: motorBezeichnung || 'Unbekannt',
            code: m.motorcode || '',
            leistung: m.leistung || '',
            bauzeit: m.bauzeit || '',
            steuertrieb: m.steuertrieb || 'Unbekannt',
            intervall: m.intervall || '',
          }
        });
      });
    });
  });
  
  // Phase 2: Nach (marke, echtesModell) gruppieren → eine Seite pro Modell
  const modelGroups = {};
  motorPool.forEach(item => {
    const key = `${item.marke}||${item.echtesModell}`;
    if (!modelGroups[key]) {
      modelGroups[key] = {
        marke: item.marke,
        modell: item.echtesModell,
        motoren: [],
      };
    }
    modelGroups[key].motoren.push(item.motor);
  });
  
  // Phase 3: Für jede Modellgruppe einen Datensatz erzeugen
  Object.values(modelGroups).forEach(group => {
    const { marke, modell, motoren } = group;
    const slug = createSlug(`${marke}-${modell}`);
    
    // Steuertrieb-Typ ermitteln
    const steuertriebe = [...new Set(motoren.map(m => m.steuertrieb))];
    const steuertrieb = steuertriebe.length === 1 
      ? steuertriebe[0] 
      : (steuertriebe.length > 1 ? 'Beides (je nach Motor)' : 'Unbekannt');
    
    // Artikel laden
    const artikel = loadArticle(`VW ${modell}`) || loadArticle(modell) || loadArticle(`${marke} ${modell}`);
    if (artikel) artikelCount++;
    
    const vehicle = {
      id: slug,
      marke,
      modell,
      slug,
      generation: '',  // Eine Seite pro Modell, nicht pro Generation
      steuertrieb,
      quelle: 'autosmotor.de',
      motoren,
      artikel,
      faq: [],
      meta: {
        letzteAktualisierung: new Date().toISOString().split('T')[0],
      }
    };
    
    vehicle.faq = generateFAQ(vehicle);
    processed.push(vehicle);
  });
  
  // Statistiken
  const totalMotoren = processed.reduce((sum, v) => sum + v.motoren.length, 0);
  const stats = {
    gesamt: processed.length,
    marken: [...new Set(processed.map(v => v.marke))].length,
    motorenTotal: totalMotoren,
    mitSteuerkette: processed.filter(v => v.steuertrieb === 'Steuerkette').length,
    mitZahnriemen: processed.filter(v => v.steuertrieb === 'Zahnriemen').length,
    beides: processed.filter(v => v.steuertrieb === 'Beides (je nach Motor)').length,
    ohneMotoren: processed.filter(v => v.motoren.length === 0).length,
    mitArtikel: processed.filter(v => v.artikel !== null).length,
  };
  
  // Schreiben
  writeFileSync(PATHS.processed, JSON.stringify(processed, null, 2));
  writeFileSync(
    join(PATHS.processedDir, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );
  
  console.log('\n✅ Verarbeitung abgeschlossen!');
  console.log('\n📈 Statistiken:');
  console.log(`   • ${stats.gesamt} Generationen-Seiten`);
  console.log(`   • ${stats.motorenTotal} Motorvarianten`);
  console.log(`   • ${stats.marken} Marken`);
  console.log(`   • ${stats.mitSteuerkette} mit Steuerkette`);
  console.log(`   • ${stats.mitZahnriemen} mit Zahnriemen`);
  console.log(`   • ${stats.beides} mit Beidem (je nach Motor)`);
  console.log(`   • ${stats.mitArtikel} mit Experten-Artikel`);
  console.log(`   • ${stats.ohneMotoren} ohne Motor-Details`);
  
  console.log(`\n💾 Ausgabe: ${PATHS.processed}`);
}

buildData().catch(console.error);
