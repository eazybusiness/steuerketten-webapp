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
  
  rawData.forEach(item => {
    const marke = item.marke || 'Unbekannt';
    const markeVariants = [marke, ...getBrandVariants(marke)];
    
    // Bereinige modell-Name: entferne Marken-Präfix (VW Beetle → Beetle)
    let modell = item.modell || 'Unbekannt';
    markeVariants.forEach(variant => {
      modell = modell.replace(new RegExp(`^${escapeRegex(variant)}\\s*`, 'i'), '');
    });
    modell = modell.trim() || item.modell || 'Unbekannt';
    
    // Artikel laden (gilt für alle Generationen dieses Modells)
    const artikel = loadArticle(item.modell); // Original-Name für Artikel-Match
    if (artikel) artikelCount++;
    
    // Jede Generation bekommt eigene Seite
    (item.generationen || []).forEach((gen, index) => {
      let generation = gen.name || `Gen-${index + 1}`;
      
      // Entferne Marken-Präfixe aus Generation-Name
      markeVariants.forEach(variant => {
        generation = generation.replace(new RegExp(`^${escapeRegex(variant)}\\s*`, 'i'), '');
      });
      
      // Entferne Modell-Name aus Generation-Name (VW Golf 8 → 8, nicht "Golf Golf 8")
      if (modell && generation.toLowerCase().startsWith(modell.toLowerCase())) {
        generation = generation.slice(modell.length).trim();
      }
      
      // Entferne "Alle Modelle von ..." 
      generation = generation.replace(/^Alle Modelle von\s+\S+\s*/i, '');
      
      // Bereinige Datenmüll in Generation-Namen
      generation = generation
        .replace(/Zahnriemen oder Steuerkette.*$/i, '')  // Müll aus Quelldaten
        .replace(/BMW \d+er.*$/i, '')                    // Falsche Marken-Referenz
        .replace(/^-Benz\s*/i, '')                        // Rest von Mercedes-Benz
        .replace(/Nockenwellenantrieb.*$/i, '')           // Technischer Müll
        .replace(/Andere \S+ Modelle/i, '')               // Generische Gruppierung
        .replace(/-Motoren\s*-/i, '-')                    // Überflüssige Trenner
        .trim();
      
      generation = generation || `Gen-${index + 1}`;
      const slug = createSlug(`${marke}-${modell}-${generation}`);
      
      // Motoren aus dieser Generation extrahieren - NUR echte Daten
      const motoren = (gen.motoren || []).map(m => ({
        bezeichnung: m.motorisierung || 'Unbekannt',
        code: m.motorcode || '',
        leistung: m.leistung || '',
        bauzeit: m.bauzeit || '',
        steuertrieb: m.steuertrieb || 'Unbekannt',
        intervall: m.intervall || '',
      }));
      
      // Steuertrieb-Typ ermitteln
      const steuertriebe = [...new Set(motoren.map(m => m.steuertrieb))];
      const steuertrieb = steuertriebe.length === 1 
        ? steuertriebe[0] 
        : (steuertriebe.length > 1 ? 'Beides (je nach Motor)' : 'Unbekannt');
      
      // Basis-Datensatz - KEINE fake Daten
      const vehicle = {
        id: slug,
        marke,
        modell,
        slug,
        generation,
        steuertrieb,
        quelle: 'autosmotor.de',
        motoren,
        artikel: artikel, // null wenn kein Artikel vorhanden
        faq: [],
        meta: {
          letzteAktualisierung: new Date().toISOString().split('T')[0],
        }
      };
      
      // FAQ generieren (nach artikel-Zuweisung, damit echte Kosten genutzt werden)
      vehicle.faq = generateFAQ(vehicle);
      
      processed.push(vehicle);
    });
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
