import { WebsiteGenerationMeta } from '../types';

export interface PrebuiltWebsiteFile {
  path: string;
  language: 'html' | 'css' | 'javascript';
  content: string;
}

export interface PrebuiltWebsiteProject {
  templateId: string;
  siteTitle: string;
  outputDirectory: string;
  entryFilePath: string;
  files: PrebuiltWebsiteFile[];
  responseContent: string;
  websiteMeta: WebsiteGenerationMeta;
}

interface TemplateDefinition {
  id: string;
  siteTitle: string;
  summary: string;
  keywords: string[];
  theme: {
    accent: string;
    soft: string;
    bgA: string;
    bgB: string;
    tint: string;
    visualA: string;
    visualB: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    chips: string[];
  };
  cards: Array<{ title: string; meta: string; price: string; text: string; badge: string; visual: string }>;
  summaryTitle: string;
  summaryRows: Array<{ label: string; value: string }>;
}

function joinPath(base: string, ...parts: string[]) {
  const joined = [base.replace(/[\\/]+$/, ''), ...parts]
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');

  return joined.replace(/^([A-Za-z]:)\//, '$1/');
}

function renderChips(chips: string[]) {
  return chips.map((chip) => `<span>${chip}</span>`).join('');
}

function renderCards(cards: TemplateDefinition['cards'], buttonLabel: string) {
  return cards.map((card) => `
        <article class="card">
          <div class="visual">
            <span>${card.visual}</span>
          </div>
          <div class="card-body">
            <header>
              <div>
                <h3>${card.title}</h3>
                <p class="meta">${card.meta}</p>
              </div>
              <strong class="price">${card.price}</strong>
            </header>
            <p>${card.text}</p>
            <div class="card-actions">
              <span class="badge">${card.badge}</span>
              <button class="mini-button">${buttonLabel}</button>
            </div>
          </div>
        </article>`).join('');
}

function renderSummary(rows: TemplateDefinition['summaryRows']) {
  return rows.map((row) => `<div class="summary-row"><span>${row.label}</span><strong>${row.value}</strong></div>`).join('');
}

function buildHtml(template: TemplateDefinition) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${template.siteTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">${template.hero.eyebrow}</p>
          <h1>${template.siteTitle}</h1>
        </div>
        <div class="topbar-actions">
          <button class="ghost-button">Preview flow</button>
          <button class="primary-button">Launch demo</button>
        </div>
      </header>

      <main class="page-grid">
        <section class="hero-card">
          <div>
            <p class="eyebrow">Template-backed website</p>
            <h2>${template.hero.title}</h2>
            <p class="hero-copy">${template.hero.subtitle}</p>
            <div class="chip-row">${renderChips(template.hero.chips)}</div>
          </div>
          <div class="hero-side">
            <p class="eyebrow">Frontend only</p>
            <strong>Responsive + polished</strong>
            <p>Built with plain HTML, CSS, and JavaScript so it opens reliably in the local browser after saving.</p>
          </div>
        </section>

        <section class="layout">
          <div class="panel">
            <p class="eyebrow">Featured collection</p>
            <div class="card-grid">
              ${renderCards(template.cards, 'Select')}
            </div>
          </div>
          <aside class="summary-card">
            <p class="eyebrow">Quick summary</p>
            <h3>${template.summaryTitle}</h3>
            <div class="summary-list">
              ${renderSummary(template.summaryRows)}
            </div>
            <p class="note">${template.summary}</p>
          </aside>
        </section>
      </main>
    </div>

    <script src="./script.js"></script>
  </body>
</html>`;
}

function buildCss(template: TemplateDefinition) {
  return `:root {
  --accent: ${template.theme.accent};
  --accent-soft: ${template.theme.soft};
  --bg-a: ${template.theme.bgA};
  --bg-b: ${template.theme.bgB};
  --tint: ${template.theme.tint};
  --visual-a: ${template.theme.visualA};
  --visual-b: ${template.theme.visualB};
  --panel: rgba(255, 255, 255, 0.9);
  --panel-strong: rgba(255, 255, 255, 0.97);
  --line: rgba(15, 23, 42, 0.08);
  --text: #172033;
  --muted: #617187;
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top left, var(--bg-a), transparent 34%),
    radial-gradient(circle at bottom right, var(--bg-b), transparent 38%),
    linear-gradient(180deg, #f7f9fd, #eef3fb);
}

.shell {
  min-height: 100vh;
  padding: 28px;
}

.topbar,
.hero-card,
.panel,
.summary-card {
  border: 1px solid var(--line);
  border-radius: 30px;
  background: var(--panel);
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
}

.topbar-actions {
  display: flex;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--accent);
}

h1, h2, h3, p { margin: 0; }

.page-grid {
  display: grid;
  gap: 22px;
  margin-top: 22px;
}

.hero-card {
  padding: 28px;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
}

.hero-card h2 {
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1;
  margin-bottom: 14px;
}

.hero-copy,
.hero-side p,
.card-body p,
.meta,
.note {
  color: var(--muted);
  line-height: 1.65;
}

.hero-side {
  padding: 22px;
  border-radius: 26px;
  background: linear-gradient(180deg, var(--panel-strong), var(--tint));
  border: 1px solid var(--line);
}

.hero-side strong {
  display: block;
  font-size: 1.9rem;
  margin-bottom: 10px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.chip-row span,
.badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.layout {
  display: grid;
  gap: 22px;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
}

.panel,
.summary-card {
  padding: 22px;
}

.card-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
}

.visual {
  min-height: 180px;
  padding: 18px;
  display: flex;
  align-items: end;
  font-weight: 800;
  color: white;
  background: linear-gradient(135deg, var(--visual-a), var(--visual-b));
}

.card-body {
  padding: 18px;
}

.card-body header,
.card-actions,
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-body p,
.card-actions {
  margin-top: 14px;
}

.meta {
  margin-top: 4px;
  font-size: 0.85rem;
}

.price {
  color: var(--accent);
  font-size: 1rem;
}

.summary-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.summary-row {
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.8);
}

.primary-button,
.ghost-button,
.mini-button {
  border: 0;
  border-radius: 999px;
  font: inherit;
  cursor: pointer;
  transition: transform 180ms ease, opacity 180ms ease;
}

.primary-button,
.mini-button {
  padding: 11px 18px;
  color: white;
  background: linear-gradient(135deg, var(--accent), #111827);
}

.ghost-button {
  padding: 11px 18px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid var(--line);
}

.primary-button:hover,
.ghost-button:hover,
.mini-button:hover {
  transform: translateY(-1px);
}

.note {
  margin-top: 16px;
}

@media (max-width: 1080px) {
  .hero-card,
  .layout,
  .card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .shell { padding: 16px; }
  .topbar { flex-direction: column; align-items: flex-start; }
  .topbar-actions { width: 100%; flex-direction: column; }
  .topbar-actions button { width: 100%; }
  .hero-card,
  .panel,
  .summary-card {
    border-radius: 22px;
    padding: 18px;
  }
}`;
}

function buildScript(template: TemplateDefinition) {
  return `const siteTitle = ${JSON.stringify(template.siteTitle)};
console.info(siteTitle + ' loaded');

document.querySelectorAll('.mini-button, .primary-button, .ghost-button').forEach((button) => {
  button.addEventListener('click', () => {
    button.animate(
      [
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: 'translateY(-2px)', opacity: 0.95 },
        { transform: 'translateY(0px)', opacity: 1 }
      ],
      { duration: 220, easing: 'ease-out' }
    );
  });
});

document.querySelectorAll('.mini-button').forEach((button) => {
  button.addEventListener('click', () => {
    const original = button.textContent;
    button.textContent = 'Added';
    setTimeout(() => {
      button.textContent = original ?? 'Select';
    }, 900);
  });
});`;
}

function codeBlock(language: string, path: string, content: string) {
  return `\`\`\`${language}\n// FILE: ${path}\n${content}\n\`\`\``;
}

const templates: TemplateDefinition[] = [
  {
    id: 'shopping-website',
    siteTitle: 'NovaCart Shopping Website',
    summary: 'A polished ecommerce storefront for college demos with featured products, offer-ready visuals, and a compact cart summary.',
    keywords: ['shopping', 'shop', 'store', 'ecommerce', 'e-commerce', 'product', 'cart', 'marketplace'],
    theme: { accent: '#7c3aed', soft: 'rgba(124, 58, 237, 0.12)', bgA: 'rgba(124, 58, 237, 0.16)', bgB: 'rgba(14, 165, 233, 0.12)', tint: 'rgba(124, 58, 237, 0.08)', visualA: '#111827', visualB: '#7c3aed' },
    hero: { eyebrow: 'Shopping website template', title: 'Build a premium storefront without waiting on complex model output.', subtitle: 'Use this template for shopping website requests when you want a reliable, good-looking static frontend that opens locally and feels complete.', chips: ['Responsive', 'Product cards', 'Cart summary', 'Static frontend'] },
    cards: [
      { title: 'Runner kit', meta: 'Best seller', price: '₹4,999', text: 'Performance shoes, bottle, and lightweight carry accessories packed into one polished card layout.', badge: 'Top pick', visual: 'Midnight Runner' },
      { title: 'Campus audio', meta: 'New arrival', price: '₹3,499', text: 'Wireless buds with fast charging and a clean lifestyle presentation for frontend showcase projects.', badge: 'Trending', visual: 'Studio Pods' },
      { title: 'Travel pack', meta: 'Weekend carry', price: '₹2,899', text: 'A balanced layout for bags, accessories, and lifestyle merchandise demos.', badge: 'Popular', visual: 'Atlas Pack' },
      { title: 'Desk lamp', meta: 'Study setup', price: '₹1,299', text: 'Neat utility product styling that keeps the storefront varied and visually convincing.', badge: 'Fast ship', visual: 'Focus Lamp' },
    ],
    summaryTitle: 'Weekend essentials',
    summaryRows: [
      { label: 'Runner kit', value: '₹4,999' },
      { label: 'Desk lamp', value: '₹1,299' },
      { label: 'Delivery', value: 'Free' },
    ],
  },
  {
    id: 'ticket-booking-system',
    siteTitle: 'PulsePass Ticket Booking',
    summary: 'A practical ticket booking frontend with event cards, timing details, and a reservation summary section.',
    keywords: ['ticket', 'booking', 'movie', 'cinema', 'seat', 'reservation', 'showtime', 'event'],
    theme: { accent: '#ea580c', soft: 'rgba(234, 88, 12, 0.12)', bgA: 'rgba(249, 115, 22, 0.16)', bgB: 'rgba(217, 70, 239, 0.1)', tint: 'rgba(234, 88, 12, 0.08)', visualA: '#0f172a', visualB: '#64748b' },
    hero: { eyebrow: 'Ticket booking template', title: 'Present a booking flow that looks confident on desktop and mobile.', subtitle: 'This template is ideal for cinema, event, or travel-ticket practical projects where a strong frontend matters more than backend logic.', chips: ['Seat-style booking', 'Show cards', 'Summary area', 'Demo ready'] },
    cards: [
      { title: 'The Skyline Escape', meta: '7:30 PM · Premium screen', price: '₹280', text: 'Action-thriller showcase card with strong contrast visuals and a practical booking CTA.', badge: 'Tonight', visual: 'Skyline Escape' },
      { title: 'Campus Laugh Riot', meta: '9:00 PM · Arena stage', price: '₹320', text: 'An alternative event card for college testing, keeping the layout flexible beyond movies.', badge: 'Live', visual: 'Laugh Riot' },
      { title: 'Metro Express', meta: '6:15 AM · AC coach', price: '₹450', text: 'Travel-style booking entry to make the template useful for broader reservation demos.', badge: 'Travel', visual: 'Metro Express' },
      { title: 'Weekend Concert', meta: '8:00 PM · Open lawn', price: '₹599', text: 'A concert option that helps the page feel like a complete multi-event booking system.', badge: 'Popular', visual: 'Neon Concert' },
    ],
    summaryTitle: 'Reservation summary',
    summaryRows: [
      { label: 'Selected event', value: 'Skyline Escape' },
      { label: 'Seats', value: 'A1, A2' },
      { label: 'Total', value: '₹560' },
    ],
  },
  {
    id: 'restaurant-ordering-website',
    siteTitle: 'Saffron Table Ordering',
    summary: 'A warm restaurant ordering layout with menu highlights and a simple order tray for demo presentations.',
    keywords: ['restaurant', 'food', 'ordering', 'menu', 'cafe', 'delivery', 'dining', 'meal'],
    theme: { accent: '#b45309', soft: 'rgba(180, 83, 9, 0.12)', bgA: 'rgba(245, 158, 11, 0.16)', bgB: 'rgba(239, 68, 68, 0.1)', tint: 'rgba(180, 83, 9, 0.08)', visualA: '#7c2d12', visualB: '#f59e0b' },
    hero: { eyebrow: 'Restaurant website template', title: 'Show a menu and order journey that feels finished even as a static frontend.', subtitle: 'Great for restaurant, cafe, or food-delivery college practicals where the final UI needs to look refined and responsive.', chips: ['Menu cards', 'Order summary', 'Warm visual theme', 'Responsive layout'] },
    cards: [
      { title: 'Smoked paneer tikka', meta: 'Starter plate', price: '₹240', text: 'A chef-pick menu card with layered typography and a strong food-service aesthetic.', badge: 'Chef pick', visual: 'Paneer Tikka' },
      { title: 'Truffle pasta bowl', meta: 'Main course', price: '₹390', text: 'Premium pasta card that helps the menu feel modern and complete for demo use.', badge: 'Popular', visual: 'Pasta Bowl' },
      { title: 'Mango milk cloud', meta: 'Dessert', price: '₹180', text: 'A dessert card to keep the menu varied and visually balanced across categories.', badge: 'Seasonal', visual: 'Mango Cloud' },
      { title: 'Citrus cooler', meta: 'Beverage', price: '₹120', text: 'A fresh beverage option that rounds out the ordering experience with lighter content.', badge: 'Fast prep', visual: 'Cooler' },
    ],
    summaryTitle: 'Table 07 order',
    summaryRows: [
      { label: 'Paneer tikka', value: '₹240' },
      { label: 'Pasta bowl', value: '₹390' },
      { label: 'Total', value: '₹630' },
    ],
  },
  {
    id: 'hotel-booking-website',
    siteTitle: 'HarborStay Hotel Booking',
    summary: 'A travel-ready hotel booking page with room cards and a clean reservation summary.',
    keywords: ['hotel', 'room booking', 'stay', 'resort', 'travel', 'accommodation', 'lodge'],
    theme: { accent: '#0f766e', soft: 'rgba(15, 118, 110, 0.12)', bgA: 'rgba(6, 182, 212, 0.14)', bgB: 'rgba(20, 184, 166, 0.1)', tint: 'rgba(15, 118, 110, 0.08)', visualA: '#164e63', visualB: '#14b8a6' },
    hero: { eyebrow: 'Hotel booking template', title: 'Use a calm premium travel layout for room discovery and reservation previews.', subtitle: 'This template works well for hotel, resort, or accommodation booking practicals where the UI needs to look polished right away.', chips: ['Room cards', 'Reservation summary', 'Travel styling', 'Open locally'] },
    cards: [
      { title: 'Sunset suite', meta: 'Ocean-view stay', price: '₹7,800', text: 'High-value room card with balcony-style positioning and a premium travel tone.', badge: 'Breakfast', visual: 'Sunset Suite' },
      { title: 'Harbor loft', meta: 'Couple studio', price: '₹5,900', text: 'An alternative room configuration that keeps the listing varied and usable in demos.', badge: 'Best value', visual: 'Harbor Loft' },
      { title: 'Family bay room', meta: '4 guest setup', price: '₹8,600', text: 'A practical larger-room example that helps the booking page feel complete.', badge: 'Family', visual: 'Bay Room' },
      { title: 'Workcation deck', meta: 'Studio + desk', price: '₹6,500', text: 'Useful for showing mixed business and leisure traveler needs inside one layout.', badge: 'Work-ready', visual: 'Deck Studio' },
    ],
    summaryTitle: '3-night reservation',
    summaryRows: [
      { label: 'Room', value: 'Sunset suite' },
      { label: 'Stay total', value: '₹23,400' },
      { label: 'Taxes', value: '₹2,106' },
    ],
  },
  {
    id: 'appointment-booking-website',
    siteTitle: 'CareLink Appointment Booking',
    summary: 'A clean appointment-booking frontend for doctors, clinics, salons, or service consultations.',
    keywords: ['appointment', 'doctor', 'clinic', 'hospital', 'consultation', 'medical', 'slot'],
    theme: { accent: '#2563eb', soft: 'rgba(37, 99, 235, 0.12)', bgA: 'rgba(59, 130, 246, 0.14)', bgB: 'rgba(34, 211, 238, 0.1)', tint: 'rgba(37, 99, 235, 0.08)', visualA: '#1d4ed8', visualB: '#38bdf8' },
    hero: { eyebrow: 'Appointment website template', title: 'Deliver a trustworthy booking interface for service-based practical projects.', subtitle: 'Use this when the local model would struggle with a complete workflow but you still need a polished appointment UI that works locally.', chips: ['Specialist cards', 'Booking summary', 'Professional tone', 'Responsive'] },
    cards: [
      { title: 'Dr. Nisha Rao', meta: 'General physician', price: '10:00 AM', text: 'A strong specialist card layout for clinic, doctor, or consultation booking projects.', badge: '12 yrs exp', visual: 'Dr. Nisha' },
      { title: 'Dr. Arjun Sen', meta: 'Skin specialist', price: '11:30 AM', text: 'A second profile to make the service listing feel genuine and practical for demos.', badge: 'Top rated', visual: 'Dr. Arjun' },
      { title: 'Dental checkup', meta: 'Quick consult', price: '2:00 PM', text: 'Shows how the same layout can flex into procedure or service-slot style booking.', badge: 'Fast slot', visual: 'Dental Care' },
      { title: 'Nutrition review', meta: 'Wellness consult', price: '4:00 PM', text: 'Rounds out the page with another service variant for a complete appointment portal feel.', badge: 'Online', visual: 'Nutrition' },
    ],
    summaryTitle: 'Consultation summary',
    summaryRows: [
      { label: 'Doctor', value: 'Dr. Nisha Rao' },
      { label: 'Mode', value: 'In clinic' },
      { label: 'Fee', value: '₹650' },
    ],
  },
];

export function getPrebuiltWebsiteTemplates() {
  return templates.map(({ id, siteTitle, summary, keywords }) => ({ id, siteTitle, summary, keywords }));
}

export function detectPrebuiltWebsiteIntent(input: string) {
  const normalized = input.toLowerCase();
  let best: TemplateDefinition | null = null;
  let bestScore = 0;

  for (const template of templates) {
    const score = template.keywords.reduce((count, keyword) => count + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

export function buildPrebuiltWebsiteProject(request: string, workspaceRoot: string): PrebuiltWebsiteProject | null {
  const template = detectPrebuiltWebsiteIntent(request);
  if (!template) {
    return null;
  }

  const outputDirectory = joinPath(workspaceRoot, template.id);
  const files: PrebuiltWebsiteFile[] = [
    { path: joinPath(outputDirectory, 'index.html'), language: 'html', content: buildHtml(template) },
    { path: joinPath(outputDirectory, 'styles.css'), language: 'css', content: buildCss(template) },
    { path: joinPath(outputDirectory, 'script.js'), language: 'javascript', content: buildScript(template) },
  ];
  const entryFilePath = files[0].path;
  const projectTree = files.map((file) => `- ${file.path}`).join('\n');
  const fileBlocks = files.map((file) => codeBlock(file.language, file.path, file.content)).join('\n\n');
  const responseContent = [
    `Using the built-in ${template.siteTitle} starter so this request produces a polished, reliable frontend instead of a weak low-quality mockup.`,
    '',
    'Build steps:',
    '1. Create a clean three-file project structure for local browser opening.',
    '2. Fill the page with a responsive layout, refined styling, and practical demo content.',
    '3. Save the generated files into the workspace so the site can be opened immediately.',
    '',
    `Output folder: ${outputDirectory}`,
    'Generated files:',
    projectTree,
    '',
    fileBlocks,
  ].join('\n');

  return {
    templateId: template.id,
    siteTitle: template.siteTitle,
    outputDirectory,
    entryFilePath,
    files,
    responseContent,
    websiteMeta: {
      isWebsiteRequest: true,
      shouldAutoOpen: true,
      isBasicWebsite: /\bbasic\b/i.test(request),
      entryFilePath,
      templateId: template.id,
      siteTitle: template.siteTitle,
      autoApplied: false,
      outputDirectory,
    },
  };
}
