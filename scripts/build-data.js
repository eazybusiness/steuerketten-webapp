/**
 * Datenverarbeitung: JSON-Quelle → Prozessierte Daten
 * 
 * Liest die ohAuto JSON-Daten, validiert, anreichert,
 * und schreibt optimierte Daten für den Build.
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
  processed: join(ROOT, 'data', 'processed', 'vehicles.json'),
  processedDir: join(ROOT, 'data', 'processed'),
};

// Standard-Wechselkosten (aus Recherche April 2026)
// Quellen: Retromotion, MyHammer, Autobild
const KOSTEN_DEFAULT = {
  'Zahnriemen': { min: 400, max: 900 },      // Kleinwagen €300-600, Mittelklasse €500-900
  'Steuerkette': { min: 600, max: 1500 },    // Kleinwagen €550-900, Mittelklasse €650-1.300, Oberklasse €1.500+
};

// Modell-spezifische Kosten (aufwändigere Motoren)
const KOSTEN_MODELL = {
  // VW Golf GTI/R - Steuerkette aufwendiger
  'VW Golf 7 GTI': { steuerkette: { min: 800, max: 1500 } },
  'VW Golf 7 R': { steuerkette: { min: 900, max: 1800 } },
  'VW Golf 6 GTI': { steuerkette: { min: 800, max: 1500 } },
  
  // Golf 6 1.4 TSI Twincharger - sehr aufwendig
  'VW Golf 6': { steuerkette: { min: 1200, max: 2000 } },
  
  // BMW - teuer
  'BMW 3': { steuerkette: { min: 1300, max: 2000 } },
  'BMW 1': { steuerkette: { min: 1000, max: 1600 } },
  
  // Audi - teuer
  'Audi A4': { steuerkette: { min: 900, max: 1800 } },
  'Audi A6': { steuerkette: { min: 1500, max: 2500 } },
  
  // Mercedes - teuer
  'Mercedes C': { steuerkette: { min: 1150, max: 1800 } },
  
  // Ford Focus EcoBoost Zahnriemen in Öl - spezialisierte Werkstätten nötig
  'Ford Focus': { 
    zahnriemen: { min: 600, max: 900 },
    steuerkette: { min: 900, max: 1300 }
  },
  
  // Opel Astra - normal
  'Opel Astra': { steuerkette: { min: 700, max: 1100 } },
};

// Risiko-Bewertungen (aus Recherche April 2026)
// Quellen: CarWiki, Retromotion, Autobild, Repareo
const RISIKO_BEWERTUNGEN = {
  // VW Golf 7 - reguläre Motoren haben Zahnriemen (gering Risiko)
  // GTI/R haben Steuerkette (mittel Risiko)
  'VW Golf 7 GTI': {
    'CHHA': ['Kettengeräusch bei Sport-Fahrweise', 'EA888 Gen3 zuverlässiger als Gen2'],
    'CHHB': ['Kettengeräusch bei Sport-Fahrweise', 'Bei Übermäßiger Beanspruchung prüfen'],
    'DLBA': ['Performance-Modell', 'Regelmäßige Ölqualität wichtig'],
  },
  'VW Golf 7 R': {
    'CJXC': ['Höhere Last als GTI', 'EA888 Gen3 stabil'],
    'DNUE': ['Facelift-Motor', 'Zuverlässig bei Wartung'],
  },
  
  // VW Golf 6 - 1.4 TSI Twincharger problematisch
  'VW Golf 6': {
    '1.4 TSI Twincharger': ['HOCH: Kettengeräusch ab 80.000km', 'Kompressor+Turbo = hohe Last', 'Kosten €1.200-2.000'],
    'CAXA': ['Steuerkette', 'Mittel: Kettengeräusch bekannt'],
    'GTI': ['Mittel: Kettengeräusch ab 100.000km', 'CCZB Motor'],
  },
  
  // Opel Astra J - 1.4 Turbo problematisch
  'Opel Astra J': {
    '1.4 Turbo': ['Mittel: Kette dehnt sich', 'Steuerzeiten verstellen sich'],
  },
  
  // Ford Focus 3 - 1.0 EcoBoost KRITISCH
  'Ford Focus': {
    '1.0 EcoBoost': ['HOCH: Zahnriemen in Öl', 'Motorschäden bekannt', 'Ford Kulanz bis 7J/100tkm', 'Ab 2018 besser'],
    '1.6 Ti-VCT': ['Steuerkette', 'Zuverlässig'],
  },
  
  // BMW 3er - N20/N26 Kettenspanner
  'BMW 3': {
    'N20': ['Mittel: Kettenspanner-Probleme bekannt', 'Bei Geräusch sofort reagieren'],
    'N26': ['Mittel: Kettenspanner-Probleme bekannt'],
  },
};

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
 * Generiert FAQ-Entries für ein Fahrzeug
 */
function generateFAQ(vehicle) {
  const { marke, modell, generation, steuertrieb } = vehicle;
  const fullName = `${marke} ${modell} ${generation || ''}`.trim();
  
  const faq = [
    {
      frage: `Hat der ${fullName} eine Steuerkette oder einen Zahnriemen?`,
      antwort: `Der ${fullName} hat ${steuertrieb === 'Beides' 
        ? 'je nach Motorvariante Steuerkette oder Zahnriemen. Siehe Tabelle für Details.'
        : `eine ${steuertrieb}.`}`,
      schemaType: 'FAQPage'
    },
    {
      frage: `Was kostet der Wechsel beim ${fullName}?`,
      antwort: `Die Kosten für einen ${steuertrieb}-Wechsel beim ${fullName} liegen je nach Motor und Region zwischen ${KOSTEN_DEFAULT[steuertrieb]?.min || 400}€ und ${KOSTEN_DEFAULT[steuertrieb]?.max || 1500}€.`,
      schemaType: 'FAQPage'
    }
  ];
  
  if (steuertrieb === 'Zahnriemen' || steuertrieb === 'Beides') {
    faq.push({
      frage: `Wann muss der Zahnriemen beim ${fullName} gewechselt werden?`,
      antwort: `In der Regel alle 120.000-180.000 km oder alle 5-8 Jahre. Die genauen Intervallangaben finden Sie in der Tabelle der Motorvarianten oder in der Betriebsanleitung.`,
      schemaType: 'HowTo'
    });
  }
  
  return faq;
}

/**
 * Ermittelt Risiko-Level aus Risiko-Texten
 */
function getRisikoLevel(risikoPunkte) {
  if (!risikoPunkte || risikoPunkte.length === 0) return 'gering';
  
  const risikoText = risikoPunkte.join(' ').toLowerCase();
  if (risikoText.includes('hoch')) return 'hoch';
  if (risikoText.includes('kettengeräusch') || risikoText.includes('probleme') || risikoText.includes('dehnt')) return 'mittel';
  return 'gering';
}

/**
 * Anreichert Motordaten mit Kosten und Risiken
 */
function enrichMotors(motors, modellKey) {
  // Finde modell-spezifische Kosten
  const modellKosten = KOSTEN_MODELL[modellKey];
  
  return motors.map(motor => {
    const steuertrieb = motor.steuertrieb || 'Unbekannt';
    const risikoPunkte = RISIKO_BEWERTUNGEN[modellKey]?.[motor.code] || 
                        RISIKO_BEWERTUNGEN[modellKey]?.[motor.bezeichnung] || 
                        [];
    
    // Kosten: erst modell-spezifisch, dann default
    let kostenMin, kostenMax;
    if (modellKosten && modellKosten[steuertrieb.toLowerCase()]) {
      kostenMin = modellKosten[steuertrieb.toLowerCase()].min;
      kostenMax = modellKosten[steuertrieb.toLowerCase()].max;
    } else {
      kostenMin = KOSTEN_DEFAULT[steuertrieb]?.min || null;
      kostenMax = KOSTEN_DEFAULT[steuertrieb]?.max || null;
    }
    
    return {
      ...motor,
      wechselKostenMin: motor.wechselKostenMin || kostenMin,
      wechselKostenMax: motor.wechselKostenMax || kostenMax,
      risikoPunkte: risikoPunkte,
      risikoLevel: getRisikoLevel(risikoPunkte),
    };
  });
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
  
  // Daten verarbeiten
  const processed = rawData.map(item => {
    const marke = item.marke || 'Unbekannt';
    const modell = item.modell || 'Unbekannt';
    const generation = item.generationen?.[0]?.name?.replace(marke, '').trim() || '';
    
    // Basis-Datensatz
    const vehicle = {
      id: createSlug(`${marke}-${modell}-${generation}`),
      marke,
      modell,
      slug: createSlug(`${marke}-${modell}-${generation}`),
      generation,
      baujahre: item.baujahre || null,
      steuertrieb: item.steuertrieb || 'Unbekannt',
      quelle: item.quelle || 'autosmotor.de',
      motoren: item.motoren ? enrichMotors(item.motoren, `${marke} ${modell} ${generation}`) : [],
      faq: generateFAQ({ marke, modell, generation, steuertrieb: item.steuertrieb }),
      meta: {
        risikoBewertung: item.steuertrieb === 'Steuerkette' ? 'Mittel' : 'Gering',
        beliebtheit: Math.floor(Math.random() * 10) + 1, // TODO: echte Daten
        letzteAktualisierung: new Date().toISOString().split('T')[0],
      }
    };
    
    return vehicle;
  });
  
  // Statistiken
  const stats = {
    gesamt: processed.length,
    marken: [...new Set(processed.map(v => v.marke))].length,
    mitSteuerkette: processed.filter(v => v.steuertrieb === 'Steuerkette').length,
    mitZahnriemen: processed.filter(v => v.steuertrieb === 'Zahnriemen').length,
    beides: processed.filter(v => v.steuertrieb === 'Beides').length,
    ohneMotoren: processed.filter(v => v.motoren.length === 0).length,
  };
  
  // Schreiben
  writeFileSync(PATHS.processed, JSON.stringify(processed, null, 2));
  
  // Statistik-Datei
  writeFileSync(
    join(PATHS.processedDir, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );
  
  console.log('\n✅ Verarbeitung abgeschlossen!');
  console.log('\n📈 Statistiken:');
  console.log(`   • ${stats.gesamt} Fahrzeuge`);
  console.log(`   • ${stats.marken} Marken`);
  console.log(`   • ${stats.mitSteuerkette} mit Steuerkette`);
  console.log(`   • ${stats.mitZahnriemen} mit Zahnriemen`);
  console.log(`   • ${stats.beides} mit Beidem (je nach Motor)`);
  console.log(`   • ${stats.ohneMotoren} ohne Motor-Details (nachpflegen)`);
  
  console.log(`\n💾 Ausgabe: ${PATHS.processed}`);
}

buildData().catch(console.error);
