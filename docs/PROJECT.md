# Steuerketten-Webapp — Projektplanung

## Überblick

**Ziel:** Programmatic-SEO-Webapp für Steuerkette/Zahnriemen-Informationen
**Entwicklungsdomain:** `steuerkette.hiplus.de`
**Produktivdomain:** `steuerkette.ohauto.de` (nach Migration)
**Datenquelle:** JSON-Datenbank aus ohAuto-Projekt

---

## Tech Stack

| Komponente | Technologie | Begründung |
|------------|-------------|------------|
| **Framework** | Astro 5.x | Static Site Generator, SEO-optimiert, schnell |
| **Styling** | Tailwind CSS | Utility-first, schnelle Entwicklung |
| **Daten** | JSON (local) + optional CMS | Einfach, versionierbar, migration-safe |
| **Search** | Pagefind (client-side) | Kein Backend nötig, schnell |
| **Schema.org** | Astro-Integration | JSON-LD für FAQ, HowTo, Vehicle |
| **Hosting** | Netlify / Vercel | Kostenlos, schnelles CDN, atomic deploys |
| **Analytics** | Plausible (optional) | DSGVO-konform, lightweight |

---

## Architektur

```
├── data/
│   ├── raw/                  # Originale JSON-Daten
│   ├── processed/            # Aufbereitete Daten für Build
│   └── schemas/              # JSON-Schema-Definitionen
├── src/
│   ├── components/
│   │   ├── ui/               # Reusable UI (Button, Card, Table)
│   │   ├── vehicle/          # Fahrzeug-spezifisch (MotorTable, GenerationTabs)
│   │   └── seo/              # Schema.org, Meta, OpenGraph
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── VehicleLayout.astro
│   │   └── PageLayout.astro
│   ├── pages/
│   │   ├── index.astro       # Startseite mit Suche
│   │   ├── marke/
│   │   │   └── [marke].astro   # Marken-Übersicht
│   │   └── [marke]/
│   │       └── [modell].astro  # Modell-Detailseite
│   ├── content/
│   │   ├── config.ts         # Site-Konfiguration (Domain, Branding)
│   │   ├── i18n/             # Textbausteine (de)
│   │   └── templates/        # Content-Templates für Seiten
│   └── utils/
│       ├── dataLoader.ts   # JSON → Astro-Collection
│       ├── seoHelpers.ts   # Schema.org Generatoren
│       ├── formatters.ts   # PS, kW, € Formatierung
│       └── validators.ts   # Daten-Validierung
├── public/
│   ├── images/
│   │   ├── marke-logos/    # Automarken-Logos
│   │   └── icons/            # UI-Icons
│   └── fonts/
├── scripts/
│   ├── build-data.js       # JSON-Processing Pipeline
│   ├── generate-faq.js     # FAQ-Schema aus Daten generieren
│   └── validate-data.js    # Daten-Qualitätscheck
└── tests/
    ├── data-validation.test.js
    └── seo-structure.test.js
```

---

## URL-Struktur (SEO-optimiert)

```
# Startseite
/

# Marken-Übersicht
/marke/

# Einzelne Marke (alle Modelle)
/marke/vw/
/marke/opel/

# Modell-Detailseite (Ziel-Keyword)
/marke/vw/golf-7/
/marke/opel/astra-j/

# Alternative URL-Varianten (Redirects auf Haupt-URL)
/vw-golf-7/ → /marke/vw/golf-7/
```

---

## Daten-Fluss

```
JSON-Quelle
    ↓
scripts/build-data.js
    ├── Daten validieren (schemas/)
    ├── Motorvarianten anreichern
    ├── FAQ-Entries generieren
    ├── Slugs normalisieren (vw-golf-7)
    └── → data/processed/vehicles.json
    ↓
Astro getStaticPaths()
    ├── [marke].astro → alle Marken-Seiten
    └── [modell].astro → alle Modell-Seiten
    ↓
Static HTML Output
    ├── Schema.org JSON-LD
    ├── Meta-Tags, OpenGraph
    ├── Sitemap.xml
    └── Pagefind-Index
```

---

## Seiten-Templates

### 1. Startseite (/)
- Hero-Suche (Marke/Modell)
- Beliebte Modelle (Top 10)
- Alle Marken (A-Z Grid)
- "Wie funktioniert Steuerkette?" (Educational)
- CTA: "Auto mit Motorschaden verkaufen"

### 2. Marken-Seite (/marke/vw/)
- H1: "VW – Steuerkette oder Zahnriemen?"
- Marke-Intro
- Modell-Grid (mit Generationen)
- FAQ: "Welche VW-Modelle haben Steuerkette?"

### 3. Modell-Seite (/marke/vw/golf-7/)
- **Hero:** Sofort-Antwort (Steuerkette/Zahnriemen/Both)
- **Quick Info:** Baujahre, Generation
- **Motor-Tabelle:**
  | Motor | Hubraum | PS | Steuertrieb | Risiko |
- **Wechselkosten-Box:** Schätzung pro Motor
- **Risiko-Analyse:** Bekannte Probleme
- **FAQ-Schema:** 5-7 Fragen
- **CTA:** "Golf 7 verkaufen?" + Preis-Range
- **Interne Links:** Andere Golf-Generationen, VW-Modelle

---

## Migrationsszenario (hiplus.de → ohauto.de)

| Phase | Aktion | URLs |
|-------|--------|------|
| **Dev** | Entwicklung auf `steuerkette.hiplus.de` | steuerkette.hiplus.de/marke/vw/golf-7/ |
| **Staging** | Deploy zu `staging.ohauto.de` (Test) | staging.ohauto.de/marke/vw/golf-7/ |
| **Prod** | Final: `steuerkette.ohauto.de` | steuerkette.ohauto.de/marke/vw/golf-7/ |
| **Redirect** | hiplus.de → 301 zu ohauto.de | steuerkette.hiplus.de/* → steuerkette.ohauto.de/* |

**Konfiguration:**
- Alle URLs sind relativ
- Domain in `src/content/config.ts`
- Build-Skript liest `SITE_URL` aus Env

---

## SEO-Features (built-in)

- ✅ Schema.org: Vehicle, FAQPage, HowTo
- ✅ Sitemap.xml (auto-generiert)
- ✅ robots.txt
- ✅ OpenGraph / Twitter Cards
- ✅ Canonical URLs
- ✅ Breadcrumb JSON-LD
- ✅ Pagefind-Suche (client-side)
- ✅ Lazy-Loading Images
- ✅ Core Web Vitals optimiert

---

## CTA-Integration (ohAuto.de)

```astro
<!-- Am Ende jeder Modell-Seite -->
<AnkaufCTA 
  modell="Golf 7"
  marke="VW"
  preisMin={4500}
  preisMax={12000}
  link="https://ohauto.de/auto-verkaufen/"
/>
```

**Varianten:**
- `modell={name}` → "Golf 7 verkaufen"
- `motorschaden=true` → "Golf 7 mit Motorschaden verkaufen"
- `stadt={name}` → "Golf 7 verkaufen in Wiesbaden"

---

## Nächste Schritte

1. **Setup:** Astro-Projekt initialisieren
2. **Daten:** JSON-Datenbank aufbereiten
3. **Templates:** Erste Seiten-Templates bauen
4. **Demo:** 5 Pilot-Seiten (Golf, Astra, Polo, Focus, Passat)
5. **Review:** Jasmin zeigen
6. **Migration:** Zu steuerkette.ohauto.de

---

## Tech-Spezifikation

```bash
# Dependencies
astro
@astrojs/tailwind
tailwindcss
pagefind
astro-seo
astro-sitemap

# Dev Dependencies
vitest          # Testing
zod             # Schema-Validierung
prettier        # Formatierung
```
