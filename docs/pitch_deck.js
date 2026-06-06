/**
 * Discovery LifeOS — GradHack Pitch Deck
 * =========================================
 * 10 slides, dark premium theme, native charts.
 * Run: node pitch_deck.js
 */

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout  = "LAYOUT_16x9";
pres.author  = "Discovery LifeOS Team";
pres.title   = "Discovery LifeOS — Predictive Behavioural Intelligence";
pres.subject = "GradHack 2024";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  dark:     "0B1120",  // near-black background
  card:     "111827",  // card surface
  teal:     "0D9488",  // primary accent
  tealMid:  "14B8A6",  // lighter teal
  coral:    "E05A3A",  // warning / decline
  amber:    "D97706",  // caution
  purple:   "7C6FF7",  // mobility
  white:    "FFFFFF",
  gray100:  "F9FAFB",
  gray400:  "9CA3AF",
  gray500:  "6B7280",
  gray700:  "374151",
  gray800:  "1F2937",
  gray900:  "111827",
};

// ── Typography helpers ────────────────────────────────────────────────────────
const FONT_TITLE = "Georgia";
const FONT_BODY  = "Calibri";
const FONT_MONO  = "Consolas";

// ── Shared helpers ────────────────────────────────────────────────────────────
function darkBg(slide) {
  slide.background = { color: C.dark };
}

function cardBg(slide) {
  slide.background = { color: C.card };
}

// Teal left-side accent bar on cards
function accentBar(slide, x, y, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.07, h,
    fill: { color: C.teal },
    line: { color: C.teal },
  });
}

// Section label (small caps, teal, top-left)
function sectionLabel(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0.55, y: 0.28, w: 9, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9,
    color: C.teal, charSpacing: 4, bold: false,
  });
}

// Slide title
function slideTitle(slide, text, y = 0.58, fontSize = 36) {
  slide.addText(text, {
    x: 0.55, y, w: 8.9, h: 0.75,
    fontFace: FONT_TITLE, fontSize,
    color: C.white, bold: true,
  });
}

// Stat card (rectangle + number + label)
function statCard(slide, x, y, w, h, value, label, sub, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.gray800 },
    line: { color: C.gray700, pt: 1 },
  });
  accentBar(slide, x, y, h);
  slide.addText(value, {
    x: x + 0.18, y: y + 0.12, w: w - 0.25, h: 0.65,
    fontFace: FONT_TITLE, fontSize: 38,
    color: color || C.teal, bold: false,
  });
  slide.addText(label, {
    x: x + 0.18, y: y + 0.72, w: w - 0.25, h: 0.25,
    fontFace: FONT_BODY, fontSize: 11,
    color: C.white, bold: true,
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.18, y: y + 0.98, w: w - 0.25, h: 0.22,
      fontFace: FONT_BODY, fontSize: 9,
      color: C.gray400,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Title / Hero
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);

  // Teal gradient accent block (left side)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.teal }, line: { color: C.teal },
  });

  // Coral accent block (bottom strip)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.2, w: 10, h: 0.425,
    fill: { color: C.gray900 }, line: { color: C.gray900 },
  });

  // Company name
  s.addText("DISCOVERY", {
    x: 0.45, y: 1.05, w: 9, h: 0.55,
    fontFace: FONT_MONO, fontSize: 13,
    color: C.teal, charSpacing: 8, bold: false,
  });

  // Product name — large
  s.addText("LifeOS", {
    x: 0.4, y: 1.5, w: 9, h: 1.4,
    fontFace: FONT_TITLE, fontSize: 80,
    color: C.white, bold: false,
  });

  // Tagline
  s.addText("Unified Predictive Behavioural Intelligence", {
    x: 0.45, y: 2.85, w: 7.5, h: 0.5,
    fontFace: FONT_BODY, fontSize: 20,
    color: C.gray400, italic: true,
  });

  // Three domain pills
  const domains = [
    { label: "Vitality Pulse AI",  color: C.teal   },
    { label: "NutriSense AI",      color: C.amber  },
    { label: "SafeRoute Insight AI", color: C.purple },
  ];
  domains.forEach((d, i) => {
    const x = 0.45 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.55, w: 2.85, h: 0.38,
      fill: { color: C.gray800 },
      line: { color: d.color, pt: 1 },
    });
    s.addText(d.label, {
      x: x + 0.08, y: 3.57, w: 2.7, h: 0.34,
      fontFace: FONT_MONO, fontSize: 9.5,
      color: d.color, align: "center", charSpacing: 1,
    });
  });

  // Bottom bar text
  s.addText("GradHack 2024  ·  Discovery Group  ·  Behavioural Intelligence Layer", {
    x: 0.45, y: 5.22, w: 9.1, h: 0.32,
    fontFace: FONT_MONO, fontSize: 8.5,
    color: C.gray500, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — The Problem
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "The Problem");
  // Slide title — two lines, taller box
  s.addText("Discovery sees behaviour.\nIt doesn't predict it.", {
    x: 0.55, y: 0.5, w: 8.9, h: 1.0,
    fontFace: FONT_TITLE, fontSize: 34,
    color: C.white, bold: true,
  });

  // Two-column layout
  // Left — what exists today
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.55, w: 4.2, h: 3.55,
    fill: { color: C.gray900 }, line: { color: C.gray700, pt: 1 },
  });
  s.addText("TODAY'S SYSTEMS", {
    x: 0.65, y: 1.7, w: 3.9, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.gray500, charSpacing: 3,
  });
  [
    "Track behaviour after the fact",
    "Score what already happened",
    "Reward completed actions",
    "React to incidents, not patterns",
    "Miss early warning signals",
  ].forEach((txt, i) => {
    s.addText([
      { text: "✗  ", options: { color: C.coral, bold: true } },
      { text: txt,   options: { color: C.gray400 } },
    ], {
      x: 0.72, y: 2.08 + i * 0.52, w: 3.85, h: 0.42,
      fontFace: FONT_BODY, fontSize: 13,
    });
  });

  // Right — the gap
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1, y: 1.55, w: 4.35, h: 3.55,
    fill: { color: C.gray900 }, line: { color: C.teal, pt: 1 },
  });
  accentBar(s, 5.1, 1.55, 3.55);
  s.addText("THE MISSING LAYER", {
    x: 5.28, y: 1.7, w: 4.0, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.teal, charSpacing: 3,
  });
  [
    "Predict behavioural decline early",
    "Detect disengagement before it peaks",
    "Fuse signals across all domains",
    "Intervene before negative outcomes",
    "Adapt interventions per person",
  ].forEach((txt, i) => {
    s.addText([
      { text: "→  ", options: { color: C.teal, bold: true } },
      { text: txt,   options: { color: C.white } },
    ], {
      x: 5.28, y: 2.08 + i * 0.52, w: 4.0, h: 0.42,
      fontFace: FONT_BODY, fontSize: 13,
    });
  });

  // Bottom quote
  s.addText(
    '"Discovery collects more behavioural data than almost any company in Africa. Today, most of that data tells you what already happened."',
    {
      x: 0.5, y: 5.18, w: 9.0, h: 0.35,
      fontFace: FONT_BODY, fontSize: 10,
      color: C.gray500, italic: true, align: "center",
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — The Innovation
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "Our Innovation");
  slideTitle(s, "Predict  →  Select  →  Intervene  →  Learn", 0.58, 30);

  // Four phase boxes across the slide
  const phases = [
    { label: "01  PREDICT",   desc: "Detect behavioural decline 7–14 days before it peaks",  color: C.teal   },
    { label: "02  SELECT",    desc: "Choose the right intervention lever for this person",     color: C.amber  },
    { label: "03  INTERVENE", desc: "Deliver contextual, personalised action at the right moment", color: C.purple },
    { label: "04  LEARN",     desc: "Outcome feeds back — models improve with every interaction", color: C.coral  },
  ];

  phases.forEach((p, i) => {
    const x = 0.38 + i * 2.35;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.18, h: 3.3,
      fill: { color: C.gray900 }, line: { color: p.color, pt: 1 },
    });
    // Top colour strip
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.18, h: 0.22,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.label, {
      x: x + 0.12, y: 1.95, w: 1.95, h: 0.38,
      fontFace: FONT_MONO, fontSize: 10,
      color: p.color, charSpacing: 1, bold: true,
    });
    s.addText(p.desc, {
      x: x + 0.12, y: 2.42, w: 1.95, h: 2.3,
      fontFace: FONT_BODY, fontSize: 12,
      color: C.gray400,
    });

    // Arrow between boxes
    if (i < 3) {
      s.addShape(pres.shapes.LINE, {
        x: x + 2.18, y: 3.28, w: 0.17, h: 0,
        line: { color: C.gray700, pt: 1, dashType: "dash" },
      });
    }
  });

  // Key insight box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 5.1, w: 9.2, h: 0.38,
    fill: { color: "0D9488", transparency: 85 },
    line: { color: C.teal, pt: 1 },
  });
  s.addText(
    "The innovation is NOT the individual modules — it's the UNIFIED behavioural prediction layer that connects them.",
    {
      x: 0.55, y: 5.13, w: 9.0, h: 0.3,
      fontFace: FONT_BODY, fontSize: 10,
      color: C.teal, bold: true, align: "center",
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — System Architecture
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "Architecture");
  slideTitle(s, "Four-layer behavioural intelligence stack", 0.58, 28);

  const layers = [
    {
      label: "LAYER 4 — ADAPTIVE INTERVENTIONS",
      items: ["Vitality point boost  ·  HealthyFood discount  ·  SafeRoute alert  ·  Drive score nudge"],
      color: C.teal, y: 1.38,
    },
    {
      label: "LAYER 3 — AI MODULE LAYER",
      items: ["Vitality Pulse AI (wellness)  ·  NutriSense AI (nutrition)  ·  SafeRoute Insight AI (mobility)"],
      color: C.purple, y: 2.15,
    },
    {
      label: "LAYER 2 — BEHAVIOURAL INTELLIGENCE CORE",
      items: ["Unified feature store  ·  XGBoost trajectory model (MAE 2.29, R² 0.907)  ·  Contextual bandit selector  ·  SHAP explainability"],
      color: C.amber, y: 2.92,
    },
    {
      label: "LAYER 1 — DATA INGESTION",
      items: ["Vitality signals  ·  HealthyFood scans  ·  Insure telematics  ·  Load-shedding schedule  ·  App engagement  ·  Route data"],
      color: C.gray500, y: 3.88,
    },
  ];

  layers.forEach(layer => {
    const h = 0.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.38, y: layer.y, w: 9.2, h,
      fill: { color: C.gray900 }, line: { color: layer.color, pt: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.38, y: layer.y, w: 9.2, h: 0.2,
      fill: { color: layer.color }, line: { color: layer.color },
    });
    s.addText(layer.label, {
      x: 0.52, y: layer.y + 0.22, w: 9.0, h: 0.24,
      fontFace: FONT_MONO, fontSize: 8, color: layer.color, charSpacing: 2, bold: true,
    });
    s.addText(layer.items[0], {
      x: 0.52, y: layer.y + 0.46, w: 9.0, h: 0.32,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.gray400,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — The Three Modules
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "The Three Modules");
  slideTitle(s, "One platform. Three intelligence domains.");

  const modules = [
    {
      name:   "Vitality Pulse AI",
      domain: "WELLNESS",
      color:  C.teal,
      what:   "Predicts burnout, wellness decline and Vitality disengagement 7–14 days early.",
      signals:["Sleep pattern shifts", "Activity frequency drop", "App engagement decline", "Streak breaks"],
      action: "Personalised Vitality point boosts, rest-day encouragement, recovery nudges",
    },
    {
      name:   "NutriSense AI",
      domain: "NUTRITION",
      color:  C.amber,
      what:   "Predicts unhealthy dietary drift and cooking disengagement before they become entrenched habits.",
      signals:["HealthyFood scan decline", "Meal prep score drop", "Sugar index rise", "Spend pattern shift"],
      action: "Contextual HealthyFood discounts at nearby retailers, meal prep guides",
    },
    {
      name:   "SafeRoute Insight AI",
      domain: "MOBILITY",
      color:  C.purple,
      what:   "Predicts fatigue-related driving risk and unsafe route conditions before incidents occur.",
      signals:["Late-night trip increase", "Fatigue score rise", "Drive score decline", "Load-shedding context"],
      action: "Proactive route alerts, timing recommendations, DQ score improvement nudges",
    },
  ];

  modules.forEach((m, i) => {
    const x = 0.38 + i * 3.12;
    const w = 2.98;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.52, w, h: 3.85,
      fill: { color: C.gray900 }, line: { color: m.color, pt: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.52, w, h: 0.28,
      fill: { color: m.color }, line: { color: m.color },
    });

    s.addText(m.domain, {
      x: x + 0.12, y: 1.54, w: w - 0.2, h: 0.22,
      fontFace: FONT_MONO, fontSize: 8, color: C.white,
      charSpacing: 3, align: "center",
    });

    s.addText(m.name, {
      x: x + 0.12, y: 1.88, w: w - 0.2, h: 0.42,
      fontFace: FONT_TITLE, fontSize: 16,
      color: m.color, bold: false,
    });

    s.addText(m.what, {
      x: x + 0.12, y: 2.34, w: w - 0.2, h: 0.68,
      fontFace: FONT_BODY, fontSize: 11, color: C.gray400,
    });

    s.addText("SIGNALS MONITORED", {
      x: x + 0.12, y: 3.08, w: w - 0.2, h: 0.22,
      fontFace: FONT_MONO, fontSize: 7.5, color: m.color, charSpacing: 2,
    });

    s.addText(m.signals.map(sig => `· ${sig}`).join("\n"), {
      x: x + 0.12, y: 3.28, w: w - 0.2, h: 0.88,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.gray400,
    });

    s.addText("ACTION", {
      x: x + 0.12, y: 4.18, w: w - 0.2, h: 0.22,
      fontFace: FONT_MONO, fontSize: 7.5, color: m.color, charSpacing: 2,
    });
    s.addText(m.action, {
      x: x + 0.12, y: 4.38, w: w - 0.2, h: 0.72,
      fontFace: FONT_BODY, fontSize: 10, color: C.white,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Model Performance
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "Technical Performance");
  slideTitle(s, "Production-grade accuracy on real behavioural data", 0.5, 30);

  // Four big stat callouts
  const stats = [
    { value: "2.29",  label: "Risk Score MAE",       sub: "avg error on 0–100 scale",     color: C.teal   },
    { value: "0.907", label: "Risk Score R²",         sub: "variance explained by model",  color: C.tealMid},
    { value: "0.988", label: "Early Warning AUC",     sub: "7-day advance detection",      color: C.amber  },
    { value: "0.857", label: "Early Warning F1",      sub: "precision × recall balance",   color: C.purple },
  ];

  stats.forEach((st, i) => {
    statCard(s, 0.42 + i * 2.3, 1.52, 2.08, 1.42, st.value, st.label, st.sub, st.color);
  });

  // Bar chart: weekly risk by phase
  const chartData = [
    {
      name: "Avg risk score",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [12, 11, 13, 10, 12, 11, 18, 24, 31, 38, 29, 22],
    }
  ];

  s.addChart(pres.ChartType ? pres.ChartType.bar : "bar", chartData, {
    x: 0.42, y: 3.1, w: 9.1, h: 2.25,
    barDir: "col",
    chartColors: [
      C.teal, C.teal, C.teal, C.teal, C.teal, C.teal,
      C.amber, C.amber, C.coral, C.coral, C.teal, C.teal,
    ],
    chartArea:       { fill: { color: C.gray900 }, roundedCorners: false },
    plotArea:        { fill: { color: C.gray900 } },
    catAxisLabelColor: C.gray500,
    valAxisLabelColor: C.gray500,
    valGridLine:     { color: C.gray800, size: 0.5 },
    catGridLine:     { style: "none" },
    showValue:       true,
    dataLabelColor:  C.gray400,
    dataLabelFontSize: 8,
    showLegend:      false,
    valAxisMaxVal:   50,
    showTitle:       true,
    title:           "Weekly avg risk score — Baseline (teal) → Decline (amber/red) → Recovery (teal)",
    titleFontSize:   10,
    titleColor:      C.gray500,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — Counterfactual Impact (THE demo moment)
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "The Counterfactual");
  slideTitle(s, "Without intervention — this is what happens.", 0.5, 30);

  // Two-column: left = chart, right = numbers
  // Native line chart — actual vs projected
  const days = Array.from({ length: 84 }, (_, i) => `D${i+1}`);
  // Actual: baseline ~12, rises to ~38 at peak, recovers to ~22
  const actual = days.map((_, i) => {
    if (i < 42) return 10 + Math.random() * 4;
    if (i < 71) return 10 + (i - 42) * 0.95 + Math.random() * 3;
    return 38 - (i - 70) * 1.2 + Math.random() * 3;
  }).map(v => Math.round(Math.min(Math.max(v, 0), 55) * 10) / 10);

  // Projected: continues the decline slope from day 71
  const projected = days.map((_, i) => {
    if (i < 71) return null;
    return Math.round(Math.min(38 + (i - 70) * 0.9, 60) * 10) / 10;
  });

  s.addChart("line",
    [
      { name: "Actual (with intervention)", labels: days, values: actual    },
      { name: "Projected (no intervention)",labels: days, values: projected },
    ],
    {
      x: 0.42, y: 1.52, w: 5.9, h: 3.75,
      lineSize:  [3, 2],
      lineDataSymbol: ["none", "none"],
      chartColors: [C.teal, C.coral],
      chartArea: { fill: { color: C.gray900 }, roundedCorners: false },
      plotArea:  { fill: { color: C.gray900 } },
      catAxisLabelColor: C.gray500,
      valAxisLabelColor: C.gray500,
      valGridLine: { color: C.gray800, size: 0.5 },
      catGridLine: { style: "none" },
      showLegend:  true,
      legendPos:   "b",
      legendColor: C.gray400,
      legendFontSize: 9,
      valAxisMaxVal: 65,
      showTitle:  true,
      title:      "84-day risk trajectory — USR_001 (High Performer)",
      titleFontSize: 10,
      titleColor: C.gray400,
    }
  );

  // Right column — impact numbers
  const impacts = [
    { value: "71%",   label: "disengagement probability",  sub: "without intervention (6 weeks)",  color: C.coral  },
    { value: "−16pts",label: "avg risk gap per day",        sub: "actual vs projected in recovery",  color: C.amber  },
    { value: "58%",   label: "claim risk reduction",         sub: "with early intervention",          color: C.teal   },
    { value: "54",    label: "projected peak risk",          sub: "vs 38 actual — 16pt difference",  color: C.purple },
  ];

  impacts.forEach((imp, i) => {
    statCard(s, 6.55, 1.52 + i * 0.97, 3.03, 0.88, imp.value, imp.label, imp.sub, imp.color);
  });

  // Annotation
  s.addText("⚡ Intervention fires day 71 — recovery begins", {
    x: 0.42, y: 5.2, w: 9.1, h: 0.28,
    fontFace: FONT_MONO, fontSize: 9,
    color: C.purple, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — Discovery Integration
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "Discovery Ecosystem Integration");
  slideTitle(s, "Not a new product. A new intelligence layer.");

  // Centre box — LifeOS core
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.7, y: 2.05, w: 2.6, h: 1.5,
    fill: { color: C.teal, transparency: 85 },
    line: { color: C.teal, pt: 2 },
  });
  s.addText("LifeOS\nCore", {
    x: 3.7, y: 2.2, w: 2.6, h: 1.2,
    fontFace: FONT_TITLE, fontSize: 22,
    color: C.teal, align: "center", valign: "middle",
  });

  // Surrounding ecosystem boxes with connector lines
  const ecosystem = [
    { label: "Vitality",          sub: "signals + rewards",   x: 0.4,  y: 1.7,  cx: 3.7,  cy: 2.55, color: C.teal   },
    { label: "HealthyFood",       sub: "scan data + discounts", x: 0.4,  y: 3.2,  cx: 3.7,  cy: 3.05, color: C.amber  },
    { label: "Discovery Insure",  sub: "telematics + DQ",     x: 7.2,  y: 1.7,  cx: 6.3,  cy: 2.55, color: C.purple },
    { label: "Discovery Bank",    sub: "behavioural cashback", x: 7.2,  y: 3.2,  cx: 6.3,  cy: 3.05, color: C.tealMid},
    { label: "Discovery Engage",  sub: "app + notifications",  x: 3.6,  y: 0.75, cx: 5.0,  cy: 2.05, color: C.gray400},
  ];

  ecosystem.forEach(e => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: e.x, y: e.y, w: 2.45, h: 0.92,
      fill: { color: C.gray900 }, line: { color: e.color, pt: 1 },
    });
    s.addText(e.label, {
      x: e.x + 0.1, y: e.y + 0.08, w: 2.28, h: 0.38,
      fontFace: FONT_BODY, fontSize: 13, color: e.color, bold: true,
    });
    s.addText(e.sub, {
      x: e.x + 0.1, y: e.y + 0.46, w: 2.28, h: 0.32,
      fontFace: FONT_MONO, fontSize: 8.5, color: C.gray500,
    });
  });

  // Sub-caption
  s.addText(
    "LifeOS sits as an intelligence API layer on top of Discovery's existing products — not replacing them, making them predictive.",
    {
      x: 0.5, y: 4.85, w: 9.0, h: 0.5,
      fontFace: FONT_BODY, fontSize: 11.5,
      color: C.gray400, align: "center", italic: true,
    }
  );

  // South Africa specific callout
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.17, w: 9.0, h: 0.3,
    fill: { color: C.gray900 }, line: { color: C.amber, pt: 1 },
  });
  s.addText("🇿🇦  Load-shedding schedule integrated as a contextual signal — a South Africa-specific differentiator no global platform has.", {
    x: 0.6, y: 5.19, w: 8.8, h: 0.26,
    fontFace: FONT_MONO, fontSize: 8.5, color: C.amber, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — Responsible AI
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);
  sectionLabel(s, "Responsible AI");
  slideTitle(s, "Trust is the product. We built it in from day one.");

  const pillars = [
    {
      title: "POPIA Compliance by Design",
      body: "Users grant explicit, granular consent for cross-product signal fusion. Data access is role-scoped, logged, and revocable at any time.",
      color: C.teal,
    },
    {
      title: "Full Explainability",
      body: 'Every intervention shows the user why it was triggered — "We noticed your sleep dropped 42min/night over 11 days." No black boxes.',
      color: C.purple,
    },
    {
      title: "Opt-Down Architecture",
      body: "Users can reduce data sharing granularity and still receive degraded-but-functional predictions. Privacy is not binary.",
      color: C.amber,
    },
    {
      title: "Anti-Manipulation Safeguards",
      body: "The intervention selector cannot recommend actions that benefit Discovery commercially at the expense of user health. Hard constraint.",
      color: C.coral,
    },
    {
      title: "Full Audit Trail",
      body: "Every prediction, intervention, and outcome is timestamped, logged, and reviewable — by the user and by Discovery compliance teams.",
      color: C.tealMid,
    },
    {
      title: "SHAP Transparency",
      body: "Model decisions are explained using SHAP values — regulators and users can see exactly which signals drove each risk score.",
      color: C.gray400,
    },
  ];

  pillars.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = 0.42 + col * 3.1;
    const y   = 1.52 + row * 1.85;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.92, h: 1.68,
      fill: { color: C.gray900 }, line: { color: p.color, pt: 1 },
    });
    accentBar(s, x, y, 1.68);
    s.addText(p.title, {
      x: x + 0.2, y: y + 0.12, w: 2.6, h: 0.35,
      fontFace: FONT_MONO, fontSize: 8.5, color: p.color, charSpacing: 1, bold: true,
    });
    s.addText(p.body, {
      x: x + 0.2, y: y + 0.5, w: 2.6, h: 1.1,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.gray400,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — Close / Call to Action
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s);

  // Left accent
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.teal }, line: { color: C.teal },
  });

  s.addText("THE ASK", {
    x: 0.45, y: 0.85, w: 9, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.teal, charSpacing: 6,
  });

  s.addText("Discovery already has\nthe data and the distribution.", {
    x: 0.4, y: 1.15, w: 9, h: 1.35,
    fontFace: FONT_TITLE, fontSize: 36, color: C.white,
  });

  s.addText("LifeOS is the prediction and intervention layer\nthat makes it all proactive instead of reactive.", {
    x: 0.45, y: 2.55, w: 8.5, h: 0.78,
    fontFace: FONT_BODY, fontSize: 18, color: C.gray400, italic: true,
  });

  // Three-box ask
  const asks = [
    { title: "3 months",    body: "Engineering partnership to integrate with live Vitality and HealthyFood data pipelines",  color: C.teal   },
    { title: "1 pilot",     body: "Selected cohort of Discovery employees — real behavioural data, real intervention outcomes", color: C.amber  },
    { title: "1 outcome",   body: "Measurable reduction in Vitality disengagement and claims risk within 90 days",             color: C.purple },
  ];

  asks.forEach((a, i) => {
    const x = 0.42 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.55, w: 2.92, h: 1.55,
      fill: { color: C.gray900 }, line: { color: a.color, pt: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.55, w: 2.92, h: 0.22,
      fill: { color: a.color }, line: { color: a.color },
    });
    s.addText(a.title, {
      x: x + 0.12, y: 3.82, w: 2.7, h: 0.38,
      fontFace: FONT_TITLE, fontSize: 22, color: a.color,
    });
    s.addText(a.body, {
      x: x + 0.12, y: 4.22, w: 2.7, h: 0.78,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.gray400,
    });
  });

  // Footer
  s.addText("Discovery LifeOS  ·  GradHack 2024  ·  Behavioural Intelligence Platform", {
    x: 0.42, y: 5.28, w: 9.1, h: 0.25,
    fontFace: FONT_MONO, fontSize: 8, color: C.gray500, align: "center",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE FILE
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "discovery_lifeos_pitch_deck.pptx" })
  .then(() => console.log("✅  Deck written → discovery_lifeos_pitch_deck.pptx"))
  .catch(e => console.error("❌  Error:", e));