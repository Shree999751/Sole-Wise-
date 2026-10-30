# Shoes Wise - Footwear Material Database & Cost Optimization Platform

**Shoes Wise** is a responsive, production-oriented industrial SaaS platform built specifically for footwear material engineering, technical material comparison, alternative-material recommendation, manufacturing construction sequence analysis, and footwear production cost optimization.

Built with a clean industrial design language (navy blue `#0F172A`, light gray surfaces `#F8FAFC`, subtle borders `#E2E8F0`, and emerald `#10B981` accents), it bridges footwear design studios, factory operators, costing teams, and procurement managers with real database calculations.

---

## Key Modules & Capabilities

### 1. Interactive Dashboard (Overview)
- **Live Database Metrics**: Material counts, active product BOM projects, approved supplier counts, and cumulative validated batch savings across optimization scenarios.
- **Component Breakdown**: Visual distribution of materials across 8 standardized footwear categories (Upper, Lining, Insole, Outsole, Midsole, Adhesives, Threads, Reinforcements).
- **Price Audit Log**: Tracks who changed quotations, effective dates, and reasons for every price change.
- **Quick Action Bar**: Add material, trigger side-by-side comparison, generate new product BOM, or launch the Cost Optimizer.

### 2. Footwear Material Library
- Searchable, filterable, and sortable database supporting 8 footwear categories:
  - Upper materials (Full Grain Calfskin, Clarino Microfiber, Recycled Jacquard Mesh)
  - Lining materials (Full Aniline Pigskin, Cambrelle Non-Woven Moisture Management)
  - Insole materials (Texon T480 Cellulose Insole Board, OrthoLite Eco Plush Molded Footbed)
  - Outsole materials (Vibram Morflex Luxury Casual, Nitrile Solid Rubber High-Traction)
  - Midsole materials (Supercritical Nitrogen E-TPU Nitro, Compression Molded EVA Phylon)
  - Adhesives (Nan Pao Waterborne PU Cement)
  - Threads (Coats Gral Bonded Polyester Continuous Filament #40)
  - Reinforcements & accessories (Texon SportFlex Thermoplastic Toe Puff)
- **Category-Specific Dynamic Forms**: Automatically tailors physical properties (Bally flex cycles, tensile/tear strength, shore hardness A/C, slip resistance dry/wet CoF, DIN abrasion loss mm³, open time, bonding strength) based on the material category selected.
- **Full CRUD & Validation**: Create, edit, archive/unarchive, and delete with safety checks preventing deletion of materials actively assigned to product BOMs.
- **CSV Import & Export**: Validates imported CSV rows and displays an error report prior to committing to the database.

### 3. Material Detail & Audit Trail
- Technical specification sheet with test standards (SATRA, ISO, ASTM).
- Complete historical audit log showing who altered pricing, price basis (FOB, Ex-Works), effective dates, and change justification.
- Verification badges distinguishing verified laboratory data from supplier-declared or user-entered estimates.

### 4. Technical Material Comparison & Simulation
- Multi-material side-by-side matrix (2 or more materials).
- Unit normalization (e.g., converting $\text{m}^2$ to $\text{sq.ft}$, meters to yards).
- Flags missing test specifications and unverified laboratory results.
- **Consumption Simulator**: User inputs custom consumption per pair (e.g. 2.4 sq.ft) and batch size (e.g. 1,000 pairs) to immediately simulate per-pair cost impact and total batch savings against a designated baseline.
- **Print & CSV Export**: One-click printable comparison report and CSV export.

### 5. Alternative-Material Recommendation Engine
- **Mandatory Constraint Filtering**: Filter by maximum budget ceiling, minimum tensile strength (MPa), minimum Bally flex endurance cycles, and water resistance requirements.
- **Multi-Criteria Scoring Engine**: Transparent 0–100 score balancing cost reduction percentage with technical parity (tensile strength and flex cycle retention).
- **Audit Caveats**: Flags substitute candidates that require physical laboratory validation before factory adoption.
- **Clear Explanations**: Lists exact reasons why an alternative was scored or why non-compliant candidates were rejected.

### 6. Footwear Products & Bill of Materials (BOM)
- Product styles (e.g., Heritage Oxford Derby, AeroPulse Performance Runner, Titan Pro Safety Boot).
- Component-level BOM mapping (Vamp, Tongue, Lining, Insole, Midsole, Outsole, Toe Puff, Threads, Cement).
- **Engineering Formula**:
  $$\text{Extended Cost} = \text{Consumption} \times \left(1 + \frac{\text{Wastage \%}}{100}\right) \times \text{Unit Price} \times \text{Conversion Factor}$$
- Configurable cutting scrap allowances (natural leather 15–22%, synthetic roll 4–8%).

### 7. Construction Sequence Table (Manufacturing Operations)
- Step-by-step editable manufacturing sequence inspired by footwear technical data sheets.
- Columns:
  1. Sequence number with drag/move reordering handles
  2. Operation title and department (Clicking, Skiving, Closing, Lasting, Sole Attaching, Finishing)
  3. Operator grade (Master Craftsman, Skilled Operator, Standard Operator, Assistant)
  4. Assigned machinery (Travelling Head Clicker, Fortuna Skiver, Post-Bed Twin Needle, 9-Pincer Toe Laster, Sole Press)
  5. Standard Allowed Minutes (SAM)
  6. Direct labour rate per hour
  7. Machine rate per hour (power and amortization)
  8. Calculated operation cost
- Inline duplicate, edit, reorder, and delete with instant auto-recalculation.

### 8. Footwear Cost Optimizer & What-If Analyzer
- Comprehensive manufacturing cost breakdown:
  - Direct Bill of Materials (BOM) cost
  - Direct manufacturing labour
  - Machinery operating depreciation
  - Factory overhead percentage surcharge
  - Tooling and shoe last amortization per pair
  - Inner shoe box, tissue paper, and packaging
  - Quality assurance (QA) end-of-line AQL inspection
- **Target Cost Variance**: Automatically identifies whether the shoe is "Under Budget" or "Over Budget" against the design cost ceiling.
- **Scenario Persistence**: Save alternative costing scenarios directly to the database without overwriting baseline product BOMs.

### 9. Supplier Management
- Global vendor directory with contact details, location, and audited quality ratings.
- Multi-quotation tracking with MOQ, lead times, and price basis (FOB, Ex-Works, DDP).

### 10. Tech Pack Reports & Exports
- Printable official Footwear Production Tech Sheet combining:
  1. Bill of Materials table
  2. Construction sequence sheet
  3. Full final cost buildup and overheads
- Exportable CSV catalogues.

---

## Technical Architecture

- **Backend**: Python 3.14 + FastAPI + SQLAlchemy ORM + Pydantic v2
- **Database**: SQLite (default zero-config local engine in `./shoes_wise.db`) or PostgreSQL (via `DATABASE_URL` environment variable)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons + Recharts
- **Testing**: `pytest` test suite with 13 automated unit tests covering mathematical formulas, SAM calculations, recommendation filtering, and API endpoints.

---

## Quick Start & Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v24.16)

### Option 1: Run the Complete Application (Single Port)
The FastAPI backend serves both the REST API and the pre-built React production frontend on a single port:

1. **Activate Python Virtual Environment**:
   ```powershell
   .\venv\Scripts\activate
   ```
2. **Start Server**:
   ```powershell
   python run_server.py
   ```
   Or simply run:
   ```cmd
   start_dev.bat
   ```
3. Open your browser to: **http://127.0.0.1:8000**
   - Interactive UI: `http://127.0.0.1:8000`
   - API Documentation: `http://127.0.0.1:8000/docs`

---

### Option 2: Run Development Mode (Dual Server with Hot-Reloading)

If you want live hot-reloading for both backend and frontend:

1. **Backend Server**:
   ```powershell
   $env:PYTHONPATH="."
   .\venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Frontend Dev Server** (in a second terminal):
   ```powershell
   cd frontend
   npm run dev
   ```
   Open **http://localhost:5173**. API calls are automatically proxied to port 8000.

---

## Running Automated Tests

Run the automated test suite with `pytest`:

```powershell
$env:PYTHONPATH="."
.\venv\Scripts\pytest backend\tests -v
```

All 13 test suites verify:
- Component extended cost formula with wastage percentages
- Construction sequence SAM labor and machine cost math
- Footwear cost sheet aggregation and factory overheads
- Metric unit normalization (sq.m to sq.ft, meters to yards)
- Recommendation engine mandatory constraints and score ranking
- API endpoints for health, overview, materials, compare, products, and operations.

---

## Database Seed Data

The platform automatically seeds realistic footwear industry data upon first launch:
- **7 Certified Suppliers**: Conceria Prima Pelle (Italy), Texon Non-Woven Solutions (Germany), Vibram Performance Rubber (Italy), OrthoLite Eco-Systems (Vietnam), Dongguan Shengda Tech (China), Nan Pao Resins (Taiwan), Coats Group (UK).
- **12+ Specialized Footwear Materials**: Full grain bovine leather, Clarino microfiber suede, engineered jacquard mesh, pigskin lining, Cambrelle lining, Texon T480 cellulose board, OrthoLite open-cell PU foam, Vibram Morflex rubber sole, nitrile rubber cleat outsole, supercritical E-TPU midsole, water-based PU cement, bonded polyester thread #40, and thermoplastic toe puff.
- **3 Realistic Footwear Styles**:
  1. *Heritage Tuscan Oxford Derby* (Dress Footwear - Target Cost $36.00)
  2. *AeroPulse Nitro Running Shoe* (Athletic / Running - Target Cost $27.50)
  3. *Titan Pro 6" Industrial Safety Boot* (Work & Safety - Target Cost $42.00)
- **14-Step Construction Sequences**: From clicking and skiving through post-bed stitching, lasting, halogenation, flash drying, hydraulic sole pressing, to packaging.

