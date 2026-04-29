# Steuerketten-Webapp

Programmatic-SEO-Webapp für Steuerkette/Zahnriemen-Informationen.

**Entwicklung:** `steuerkette.hiplus.de`  
**Produktion:** `steuerkette.ohauto.de` (nach Migration)

---

## Architektur

```
Astro 5.x + Tailwind CSS + Pagefind
Static Site Generator → SEO-optimiert, schnell, wartungsarm
```

## Setup

### 1. Dependencies installieren

```bash
cd /home/nop/CascadeProjects/chauffeur-texter/ohAuto/steuerketten-webapp
npm install
```

### 2. Daten aufbereiten

```bash
# Rohdaten → Prozessierte Daten (mit Anreicherung)
npm run process-data

# Ergebnis: data/processed/vehicles.json
```

### 3. Dev-Server starten

```bash
npm run dev
# → http://localhost:4321
```

### 4. Build (für Deployment)

```bash
npm run build

# Pagefind-Index erstellen (für Suche)
npm run search:build

# Oder beides zusammen:
npm run build && npm run search:build
```

---

## Projektstruktur

```
├── data/
│   ├── raw/vehicles.json         # Originale JSON-Daten
│   ├── processed/vehicles.json   # Aufbereitete Daten
│   └── schemas/                  # JSON-Schema-Validierung
├── src/
│   ├── components/               # UI-Komponenten
│   │   ├── vehicle/              # MotorTable, AnkaufCTA
│   │   └── seo/                  # FAQSection, Breadcrumbs
│   ├── layouts/                  # BaseLayout, VehicleLayout
│   ├── pages/                    # Astro-Routen
│   │   ├── index.astro           # Startseite
│   │   ├── marke/
│   │   │   ├── index.astro       # Alle Marken
│   │   │   └── [marke].astro     # Marken-Detail
│   │   └── [marke]/
│   │       └── [modell].astro    # Modell-Detail
│   └── content/
│       └── config.ts             # Site-Konfiguration
├── scripts/
│   └── build-data.js             # Datenverarbeitung
└── dist/                         # Build-Output
```

---

## Domain-Konfiguration

In `src/content/config.ts`:

```typescript
export const SITE_CONFIG = {
  url: 'https://steuerkette.hiplus.de',  // ← Anpassen für Migration
  // ...
};
```

Für Build mit anderer Domain:

```bash
SITE_URL=https://steuerkette.ohauto.de npm run build
```

---

## URLs

| Seite | URL | Beschreibung |
|-------|-----|--------------|
| Startseite | `/` | Hero + Suche + Beliebte |
| Alle Marken | `/marke/` | A-Z Übersicht |
| Marken-Detail | `/marke/vw/` | Alle VW-Modelle |
| Modell-Detail | `/marke/vw/golf-7/` | Steuerkette/Zahnriemen Info |
| Suche | `/suche/` | Pagefind-Suche |

---

## Deploy zu Vercel

### Option 1: CLI (empfohlen für erstes Deploy)

```bash
# Vercel CLI installieren (falls noch nicht)
npm install -g vercel

# Einloggen (einmalig)
vercel login

# Deploy-Skript ausführen
./scripts/deploy-vercel.sh

# Oder manuell:
npm run process-data
npm run build
npx pagefind --site dist
vercel --prod
```

### Option 2: Git-Integration (empfohlen für laufende Updates)

1. Repo zu GitHub pushen
2. Vercel-Account → "New Project"
3. GitHub-Repo importieren
4. Build-Einstellungen:
   - Framework: `Astro`
   - Build: `npm run build && npx pagefind --site dist`
   - Output: `dist`

### Option 3: Vercel.json (Zero-Config)

Die `vercel.json` ist bereits konfiguriert. Einfach:

```bash
vercel --prod
```

---

## Migration zu ohauto.de

1. **Domain in Config ändern**
   ```typescript
   // src/content/config.ts
   url: 'https://steuerkette.ohauto.de'
   ```

2. **Build mit Prod-Domain**
   ```bash
   SITE_URL=https://steuerkette.ohauto.de npm run build
   ```

3. **Deploy zu Vercel**
   ```bash
   vercel --prod
   ```

4. **DNS bei hiplus.de**
   - CNAME: `steuerkette` → `cname.vercel-dns.com`
   - Oder: `steuerkette.hiplus.de` → Vercel-Project verknüpfen

5. **Redirect einrichten (optional)**
   - In Vercel Dashboard → Domains → Redirect einrichten
   - Von: `steuerkette.hiplus.de`
   - Nach: `steuerkette.ohauto.de`

---

## ohAuto-Integration

Die CTA-Box am Ende jeder Modell-Seite verlinkt zu ohAuto.de:

```astro
<AnkaufCTA 
  modell="Golf 7"
  marke="VW"
  motorschaden={true}  // Variante für Problemmotoren
/>
```

Konfiguration in `src/content/config.ts`:

```typescript
ohauto: {
  enabled: true,
  url: 'https://ohauto.de',
  ctaText: 'Auto verkaufen?',
}
```

---

## Daten-Anreicherung

`scripts/build-data.js` ergänzt die JSON-Daten:

- Wechselkosten (Standard-Range pro Steuertrieb)
- Risiko-Bewertungen (manuell pflegbar)
- FAQ-Entries (automatisch generiert)
- Slugs (URL-freundliche Namen)
- Meta-Daten (Aktualisierungsdatum)

**Anpassen:**
- Wechselkosten in `KOSTEN_DEFAULT`
- Risiko-Bewertungen in `RISIKO_BEWERTUNGEN`

---

## SEO-Features

- ✅ Schema.org: Vehicle, FAQPage, BreadcrumbList
- ✅ Sitemap.xml (auto-generiert)
- ✅ robots.txt
- ✅ OpenGraph / Twitter Cards
- ✅ Canonical URLs
- ✅ Pagefind-Suche (client-side)
- ✅ Lazy-Loading Images

---

## Nächste Schritte

- [ ] Daten anreichern (Wechselkosten, Risiken)
- [ ] Fotos/Icons für Marken-Logos
- [ ] Pilot-Deploy auf steuerkette.hiplus.de
- [ ] Jasmin zeigen
- [ ] Migration zu steuerkette.ohauto.de
