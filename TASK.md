# TASK — Steuerketten-Webapp

**Ziel:** Programmatic-SEO-Webapp für Steuerkette/Zahnriemen-Infos
**Stack:** Astro + Tailwind + Pagefind
**Dev-URL:** steuerkette.hiplus.de
**Prod-URL:** steuerkette.ohauto.de (später)

---

## Phase 1: Setup ✅

- [x] Projektstruktur erstellen
- [x] Astro-Config + Tailwind
- [x] Daten-Schema definieren
- [x] Build-Skript für Datenverarbeitung
- [x] Rohdaten kopieren (aus ohAuto-Projekt)
- [x] BaseLayout mit SEO
- [x] VehicleLayout mit Schema.org
- [x] MotorTable-Komponente
- [x] FAQSection mit Accordion
- [x] AnkaufCTA (ohAuto-Integration)
- [x] Breadcrumbs

## Phase 2: Seiten ✅

- [x] Startseite (Hero + Suche + Marken)
- [x] Marken-Übersicht (A-Z)
- [x] Marken-Detailseite
- [x] Modell-Detailseite (getStaticPaths)
- [x] Suchseite (Pagefind)

## Phase 3: Setup & Build ✅

- [x] npm install (Dependencies ok)
- [x] npm run process-data (57 Fahrzeuge verarbeitet)
- [x] npm run build (77 Seiten generiert)
- [x] npm run search:build (Pagefind-Index erstellt)

## Phase 4: Daten-Qualität ✅

- [x] Wechselkosten für Top-Modelle verifiziert (Quellen: Retromotion, Autobild, CarWiki)
- [x] Risiko-Bewertungen recherchiert (HOCH: Ford 1.0 EcoBoost, Golf 6 1.4 TSI)
- [x] Build-Skript mit recherchierten Daten aktualisiert
- [x] Modell-spezifische Kosten eingepflegt (BMW €1.300+, Ford €600–900, etc.)
- [ ] Motorvarianten aus Generationen extrahieren (nachgelagert)
- [ ] FAQ-Entries mit echten Daten anreichern (nachgelagert)

## Phase 5: Deploy ⏳

- [ ] Vercel-Projekt einrichten
- [ ] Deploy zu Vercel
- [ ] DNS: steuerkette.hiplus.de
- [ ] Jasmin zeigen
- [ ] Feedback einarbeiten

## Phase 6: Migration ⏳

- [ ] Domain auf ohauto.de umstellen
- [ ] Redirect von hiplus.de
- [ ] DNS-Records anpassen

---

## Dateien-Übersicht

```
ohAuto/steuerketten-webapp/
├── docs/PROJECT.md           # Architektur-Doku
├── README.md                  # Setup-Anleitung
├── TASK.md                    # Diese Datei
├── package.json               # Dependencies
├── astro.config.mjs           # Build-Config
├── tailwind.config.mjs        # Styling
├── data/
│   ├── raw/vehicles.json      # Originale Daten
│   ├── processed/             # Wird generiert
│   └── schemas/
├── scripts/build-data.js      # Datenverarbeitung
├── src/
│   ├── content/config.ts      # Site-Konfiguration
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── VehicleLayout.astro
│   ├── components/
│   │   ├── vehicle/
│   │   │   ├── MotorTable.astro
│   │   │   └── AnkaufCTA.astro
│   │   └── seo/
│   │       ├── FAQSection.astro
│   │       └── Breadcrumbs.astro
│   └── pages/
│       ├── index.astro
│       ├── marke/
│       │   ├── index.astro
│       │   └── [marke].astro
│       └── [marke]/
│           └── [modell].astro
```

---

## Kommandos

```bash
# Setup
cd ohAuto/steuerketten-webapp
npm install

# Daten aufbereiten
npm run process-data

# Dev-Server
npm run dev

# Build
npm run build && npm run search:build
```

---

## Offene Fragen

- [x] Soll ich jetzt `npm install` + Test-Build machen? ✅ DONE
- [ ] Wechselkosten-Recherche für Top 10 Modelle? (vor Deploy)
- [ ] Vercel-Deploy jetzt oder nach Daten-Check?
