// Site-Konfiguration
export const SITE_CONFIG = {
  // Domain (wird für Migration geändert)
  url: import.meta.env.SITE_URL || 'https://steuerkette.hiplus.de',
  
  // Branding
  name: 'Steuerkette-Check',
  titleTemplate: '%s – Steuerkette oder Zahnriemen?',
  description: 'Finde sofort heraus: Steuerkette oder Zahnriemen? Mit Wechselkosten, Risiko-Analyse und Ankauf-Preisen.',
  
  // ohAuto-Integration
  ohauto: {
    enabled: true,
    url: 'https://ohauto.de',
    ctaText: 'Auto verkaufen?',
    ctaSubtext: 'Faire Preise, kostenlose Abholung',
  },
  
  // SEO
  defaultOgImage: '/images/og-default.jpg',
  twitterHandle: '@steuerketten',
  
  // Features
  features: {
    search: true,
    faqSchema: true,
    priceCalculator: true,
    motorschadenCTA: true,
  },
};

// Daten-Konfiguration
export const DATA_CONFIG = {
  // Pfade zu JSON-Daten
  vehiclesPath: './data/processed/vehicles.json',
  rawVehiclesPath: './data/raw/vehicles.json',
  
  // Daten-Anreicherung
  enrichWith: {
    wechselkosten: true,
    risikoAnalyse: true,
    ankaufPreise: true,
  },
};

// URL-Muster
export const URL_PATTERNS = {
  home: '/',
  markeIndex: '/marke/',
  marke: '/marke/:marke/',
  modell: '/marke/:marke/:modell/',
  search: '/suche/',
};

// Slug-Mapping (für URL-Normalisierung)
export const SLUG_MAPPING: Record<string, string> = {
  'vw': 'vw',
  'volkswagen': 'vw',
  'opel': 'opel',
  'ford': 'ford',
  'bmw': 'bmw',
  'mercedes': 'mercedes-benz',
  'mercedes-benz': 'mercedes-benz',
  'audi': 'audi',
  'golf 7': 'golf-7',
  'golf vii': 'golf-7',
  'astra j': 'astra-j',
};
