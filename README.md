# Cookscape Studio — PERN Quotation Generator & PPTX Engine

A high-performance PERN stack quotation generator with **Template Subtraction Method** for manipulating 40MB+ PowerPoint (`.pptx`) presentations.

---

## 🏗️ Architecture & Slide Mapping

The application operates on your 29-slide master template: `Master-Template.pptx`.

### Master Slide Structure:
- **Slide 1**: Cover Page (Personalized Design, Client Details, Sales Rep / Designer Details, Date)
- **Slides 2 – 6**: Introduction, Design Philosophy, Process & Portfolio
- **Slides 7 – 9**: Variant 1 — `LL ELITE` (Divider, Specs, Quotation Slide)
- **Slides 10 – 12**: Variant 2 — `CAPRICOAST MATTE` (Divider, Specs, Quotation Slide)
- **Slides 13 – 15**: Variant 3 — `CAPRICOST GLOSSY` (Divider, Specs, Quotation Slide)
- **Slides 16 – 18**: Variant 4 — `ELEGANT SURABHI` (Divider, Specs, Quotation Slide)
- **Slides 19 – 21**: Variant 5 — `4X TUFF GLOSS` (Divider, Specs, Quotation Slide)
- **Slides 22 – 29**: Execution Timelines, Inclusions & Exclusions, Payment Terms, Terms & Conditions, FAQs, and Thank You closing

### Template Subtraction Method:
When a quotation is generated:
1. **Unselected Variant Slides are purged**: E.g., if only Variant 2 and Variant 5 are selected, slides for Variants 1, 3, and 4 (9 slides) are deleted from the presentation XML and relationship mappings.
2. **Cover Page Variables Replaced**: Client Name, Contact Number, Email, Location, Date, Designer Name, Designer Phone, and Official Email are substituted.
3. **Master Footers Updated**: The footer text across every remaining slide (`Client Name | Location | Contact`) is dynamically updated.
4. **Slide Renumbering**: Remaining slides are renumbered sequentially (1 to N).
5. **Quotation Snips Embedded**: Uploaded screenshots/images of itemized quotes are injected directly into the designated Quotation slides.

---

## 🚀 Running the Project

### 1. Backend Server (Node.js + Express)
```bash
cd server
npm install
node src/index.js
```
- Server runs on: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`
- Test PPTX engine standalone: `node test-pptx.js`

### 2. Frontend Web App (React + Vite + Tailwind)
```bash
cd client
npm install
npm run dev
```
- Frontend runs on: `http://localhost:5173`

---

## 🗄️ Database Configuration (PostgreSQL + Prisma)

The database schema is defined in `server/prisma/schema.prisma` with models:
- `users`: Sales representative profiles
- `clients`: Client details and site locations
- `variants`: Master variant definitions, prices, specs, and slide index mappings
- `quotations`: Historical quotes generated, variant selections, file sizes, and download links

### Connecting to Local PostgreSQL (Configured & Ready):
`server/.env` is configured to connect to your local PostgreSQL instance:
```env
PORT=5000
DATABASE_URL="postgresql://postgres@localhost:5433/quotegenerator?schema=public"
```
To push schema updates or re-seed:
```bash
cd server
npm run prisma:push
npm run prisma:seed
```

> **Note on Zero-Config Fallback:** If PostgreSQL is temporarily stopped, the server gracefully activates its local fallback data store so you can continue generating quotes without interruption.

---

## ⚡ PPTX Manipulation Engines

1. **Option A: Pure Node.js (JSZip) Engine (Primary & Recommended)**
   - Located at `server/src/services/pptxEngine.js`.
   - Operates directly on OpenXML (`presentation.xml`, `presentation.xml.rels`, `[Content_Types].xml`).
   - Blazing fast: Compiles and zips 40MB presentations in **~3-4 seconds** with **zero Python dependency**.
2. **Option B: Python Child Process Engine**
   - Located at `server/src/scripts/generate_ppt.py` and runner `server/src/services/pythonPptxEngine.js`.
   - Automatically fallbacks to Node.js engine if Python is not present in the runtime.
