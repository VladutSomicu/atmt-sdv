# ATMT-SDV — Automotive Threat Modeling Tool for Software-Defined Vehicles

> A comprehensive, enterprise-grade platform for conducting **Threat Analysis and Risk Assessment (TARA)** in compliance with **UNECE R155** and **ISO 21434** for automotive manufacturers and suppliers.

🌐 **Live Demo:** `https://atmt-sdv.com/login` — use the demo account to explore all features.

---

## Why This Exists

The automotive industry's shift toward Software-Defined Vehicles (SDVs) has transformed modern cars into complex, hyperconnected systems—turning a traditionally isolated mechanical product into an internet-connected software platform. This shift created a massive regulatory challenge.

Under **UNECE WP.29 R155** and **ISO 21434**, every manufacturer and supplier of vehicles intended for public road use must implement a **Cyber Security Management System (CSMS)**, which requires a formal, documented TARA for every vehicle item in scope. This includes even small Tier-2 and Tier-3 suppliers who manufacture a single ECU.

Existing TARA tools are prohibitively expensive (often tens of thousands of euros in licensing), require extensive specialist training, and produce static outputs disconnected from the engineering workflow. This leaves a massive gap for startups, small suppliers, and academic institutions that need affordable, practical tooling.

**ATMT-SDV** digitizes and structures the TARA process. Engineers draw their vehicle's E/E architecture on an interactive canvas, define the vehicle's profile, and the platform's algorithmic engine programmatically identifies attack surfaces, maps threat vectors across STRIDE and LINDDUN, computes risk scores, and generates audit-ready compliance reports.

---

## Key Features

- **Interactive Visual Editor** — a JointJS-powered canvas for drawing Data Flow Diagrams with automotive-specific ECU components, protocol-labeled data flows, and Trust Boundary containers
- **Algorithmic TARA Engine** — a Python-based rule engine that evaluates the graph topology to identify threats based on STRIDE, extended LINDDUN, and automotive-specific attack patterns
- **Context-Aware Risk Scoring** — impact and feasibility scores (SFOP model) are dynamically adjusted based on the vehicle's profile (SAE level, propulsion type, ASIL ratings, physical accessibility)
- **CAPEC & UNECE R155 Enrichment** — each identified threat is enriched with official CAPEC IDs and mapped to UNECE R155 Annex 5 attack categories and mitigations
- **Multi-Role Collaboration** — a four-role RBAC system (Engineer, Architect, Manager, Auditor) enforced both in the UI and on every backend API route
- **Pessimistic Locking** — prevents simultaneous edits via a heartbeat-maintained server-side lock, eliminating race conditions in concurrent workflows
- **Visual Audit Logging** — every change to a project (threat status, risk acceptance, member roles) is recorded with JSON diffs for before/after visibility, satisfying ISO 21434 traceability requirements
- **Automated PDF/JSON Reports** — fully formatted, confidentiality-watermarked compliance reports generated via ReportLab
- **Versioned Diagrams** — every diagram save creates a new version snapshot stored in PostgreSQL JSONB, preserving the full topology history

---

## The TARA Engine — Technical Deep Dive

This is the core algorithmic contribution of the project. It is structured as a deterministic, five-stage analysis pipeline orchestrated by the `ThreatEngine` class.

### Stage 1 · Graph Parsing (`GraphParser`)

The JointJS canvas state is stored as a structured JSON object. The `GraphParser` transforms this raw JSON into three Python data structures consumed by the rule engine:

- **`nodes_dict`** `{node_id: node_data}` — all ECUs, sensors, actuators, and external entities on the canvas
- **`edges_list`** — all directed data flows between nodes, each labeled with an automotive protocol (`CAN`, `CAN-FD`, `LIN`, `FlexRay`, `Ethernet`, `SOME/IP`, `Bluetooth`, `Wi-Fi`, `Cellular`, `V2X`, `ISO-15118`, etc.)
- **`trust_boundaries_list`** — containers that group nodes into logical security zones

Each node is additionally annotated with the ID of its Trust Boundary (if any), enabling the rule engine to query boundary membership in O(1) during threat evaluation.

### Stage 2 · Rule Evaluation (`RuleEngine`)

The engine evaluates **62 declarative threat rules** (`STRIDE_RULES`) across all six STRIDE categories: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.

Rules are expressed as Python lambda predicates operating on node or edge attributes and the vehicle profile, keeping the rule definitions completely decoupled from the traversal logic.

**Example rules:**
```python
# Detects CAN Bus Injection on any CAN-protocol edge
{'id': 'R001', 'stride': 'Spoofing', 'trigger_type': 'edge',
 'condition': lambda e, vp: e.get('protocol') == 'CAN'}

# Detects Hypervisor Escape on virtualized SDV nodes
{'id': 'R045', 'stride': 'Elevation of Privilege', 'trigger_type': 'node',
 'condition': lambda n, vp: vp.get('architecture') == 'SDV' and 'is_virtualized' in n.get('flags', [])}

# Detects EV Charging Parameter Tampering on ISO-15118 edges
{'id': 'R022', 'stride': 'Tampering', 'trigger_type': 'edge',
 'condition': lambda e, vp: e.get('protocol') == 'ISO-15118'}
```

The ruleset covers all major automotive attack surfaces, including:
- In-vehicle bus protocols: CAN, CAN-FD, LIN, FlexRay, Ethernet, SOME/IP
- Wireless attack surfaces: Bluetooth, Wi-Fi, Cellular, V2X (V2I/V2V), Keyless Entry
- EV-specific attacks: EVSE identity spoofing, ISO-15118 parameter tampering, EV billing repudiation, EV charging DoS
- OTA and firmware: unsigned firmware flashing, OTA update hijacking, SDV container image tampering
- Advanced SDV threats: hypervisor escape, container breakout, lateral movement via gateway
- Physical-layer attacks: hardware implants, JTAG/UART debug access, OBD-II diagnostic interface abuse
- Privacy threats (LINDDUN): location tracking, microphone/camera eavesdropping, cloud data breach
- Vehicle-category-specific threats: agricultural machinery (ISOBUS flooding, crop data falsification), commercial trailers (refrigeration shutdown, tachograph forgery, EBS manipulation), motorcycles (HUD eavesdropping, eCall disable)

The traversal complexity is **O(R × (V + E))**, where R is the number of rules (constant at 62), V is the node count, and E is the edge count. In practice this is linear in the size of the diagram.

### Stage 3 · Deduplication (`_deduplicate`)

Multiple rules can independently trigger the same logical threat on the same asset. The engine deduplicates using a composite key `(asset_id, threat_title)` stored in a Python `set`. Lookup and insertion are **O(1)**, ensuring the final threat list contains no redundant entries regardless of how many rules fire.

### Stage 4 · Context-Aware Scoring (`ScoringEngine`)

Each unique threat is assigned a five-dimensional baseline risk score using the **SFOP model**: Safety, Financial, Operational, Privacy (each on a 1–4 scale) and Feasibility (1–5).

The scoring follows a three-step resolution:

1. **Database Match** — queries `ref_threats` for a known threat by title. If found, uses its pre-defined default scores.
2. **Category Fallback** — if no DB match exists, applies a category-level default score table (e.g., Safety-Critical components default to `(4, 3, 4, 1, 2)`).
3. **Contextual Adjustments** — applies a set of vehicle-profile-aware mathematical constraints:
   - **SAE Level** — for SAE ≤ 2 vehicles, safety impact on Perception components is capped at 3 (Major), as human override remains available. For SAE 3–4, Perception safety is forced to maximum (4) with elevated feasibility.
   - **ASIL Integration** — ASIL D assets are guaranteed a minimum safety score of 4; ASIL B/C receive a minimum of 3.
   - **Propulsion** — EV/Hybrid Powertrain nodes receive a minimum safety score of 4 (battery fire risk).
   - **Cloud Connectivity** — cloud-connected nodes receive maximum feasibility (5) and elevated privacy scores.
   - **Physical Accessibility** — OBD-II-accessible nodes have feasibility capped at 2 (physical presence required).
   - **PII Data Types** — nodes flagged with PII data receive elevated privacy impact.
   - All values are clamped to their valid ranges at the end of the pipeline.

The **baseline risk score** is computed as `max(S, F, O, P) × Feasibility`, providing a single comparable risk magnitude per threat.

### Stage 5 · CAPEC/UNECE Enrichment (`CapecMapper`)

The scored threats are enriched by querying the `ref_threats` reference table for official CAPEC identifiers and UNECE R155 Annex 5 attack category mappings. This transforms raw engine output into a standards-compliant threat register directly usable in a formal TARA document.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Browser                          │
│              React 18 + JointJS + Tailwind CSS                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │   Nginx (OCI)   │  ← Reverse Proxy
                    │  + TLS + CSP    │  ← Security Headers
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Flask API     │  ← Gunicorn (production)
                    │  + JWT + CORS   │  ← Application Factory
                    └────────┬────────┘
                             │ SQLAlchemy ORM
                    ┌────────▼────────┐
                    │  PostgreSQL DB  │  ← JSONB for graph + profile
                    │ (Private Subnet)│  ← No public IP
                    └─────────────────┘
```

- **Frontend:** React 18 with Vite build tooling. JointJS handles SVG-based graph rendering and interaction. Stateless JWT authentication stored client-side, with automatic refresh token rotation and a failed-request queue during token refresh.
- **Backend:** Flask 3.1 with the Application Factory pattern for environment isolation. Flask-JWT-Extended for stateless authentication with token revocation via a `revoked_tokens` blocklist table. Pydantic v2 for request schema validation.
- **Database:** PostgreSQL with SQLAlchemy 3 ORM. JSONB columns for vehicle profiles and graph state. UUID primary keys throughout.
- **Deployment:** Docker-compose on Oracle Cloud Infrastructure. The database container resides in a private subnet with no public IP. The web container is exposed through Nginx, which enforces TLS, sets strict Content Security Policy headers (anti-XSS, anti-Clickjacking), and serves the compiled React bundle.
- **Report Generation:** ReportLab (Python) for PDF generation with confidentiality watermarks, section headers, and full threat register tables.

---

## Data Model

| Table | Purpose |
|---|---|
| `users` | Global platform users; `is_admin` flag for super-admin access |
| `projects` | TARA projects; stores `vehicle_profile` (JSONB), locking state, lifecycle status |
| `project_members` | Many-to-many junction with `role` column; unique constraint per `(project_id, user_id)` |
| `diagrams` | Versioned snapshots of JointJS canvas state (`graph_json` JSONB); `dfd_level` for context/system/component diagrams |
| `threats` | Identified threat instances linked to a project; stores SFOP scores, status, justification |
| `audit_log` | Immutable log of all actions; `old_value` / `new_value` JSON columns for visual diff display |
| `ref_assets` | Library of standard automotive components with ASIL ratings, interface types, and vehicle-type filters |
| `ref_threats` | Reference threat catalog with CAPEC IDs, UNECE mappings, and default scores |
| `controls` | Mitigation catalog mapped to protocols and threat categories |
| `revoked_tokens` | JWT blocklist for immediate token invalidation on logout |

---

## Role-Based Access Control

Access is enforced by a custom Python decorator `@requires_project_role(...)` applied directly to every API route. The decorator extracts the JWT identity, queries the `project_members` table, and returns `403 Forbidden` if the role is insufficient — before any business logic executes.

Global administrators bypass the project-role check entirely via `@admin_required`.

| Role | Capabilities |
|---|---|
| **Engineer** | View and edit diagrams, manage threats, run analysis |
| **Architect** | All Engineer capabilities + diagram structure control |
| **Manager** | All project management: add/remove members, manage roles, close project |
| **Auditor** | Read-only access to diagrams, threats, and reports |
| **Admin** | Platform-wide: manage all users, projects, and reference data |

---

## Concurrency & Collaborative Safety

The `projects` table carries three lock columns: `is_locked`, `locked_by` (FK to user), and `locked_at`. When a user enters the diagram editor, the backend acquires a pessimistic lock. The frontend maintains this lock with a periodic heartbeat request. If the heartbeat stops (browser closed, tab killed, network lost), the lock expires and becomes available.

When another user attempts to open the same diagram, the backend returns the locking user's name, which the frontend surfaces as a graceful read-only message rather than a hard failure.

---

## Audit Logging & ISO 21434 Traceability

Every significant action (threat status change, risk acceptance, member invitation, diagram save) writes an `AuditLog` record with the action type, the responsible user, and JSON snapshots of the old and new values. The frontend renders these as visual diffs — additions in green, removals in red — providing field-level traceability required by ISO 21434 for homologation audits.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JointJS, Tailwind CSS |
| Backend | Python 3.12, Flask 3.1, Gunicorn |
| Auth | Flask-JWT-Extended, Flask-Bcrypt |
| Validation | Pydantic v2 |
| Database | PostgreSQL, SQLAlchemy 3, Flask-Migrate (Alembic) |
| Reports | ReportLab |
| Infrastructure | Docker, Nginx, Oracle Cloud Infrastructure (OCI) |
| Standards | UNECE WP.29 R155, ISO 21434, STRIDE, LINDDUN, CAPEC, ISO 26262 (ASIL) |

---

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
# Set DATABASE_URI, JWT_SECRET_KEY, SECRET_KEY in .env
flask db upgrade
flask seed
flask run
```

**Frontend**
```bash
cd frontend
npm install
# Set VITE_API_URL=http://127.0.0.1:5000 in .env
npm run dev
```

---

## Vehicle Profiles Supported

The platform adapts its asset library and scoring logic dynamically based on the vehicle profile defined at project creation:

- **Propulsion:** ICE, EV, Hybrid, FCEV
- **Architecture:** Classic E/E, Domain-based, Centralized, SDV (Software-Defined)
- **SAE Automation Level:** 0 – 5
- **Vehicle Category:** Passenger (M), Commercial Truck (N), Trailer (O), Agricultural (T), Motorcycle (L)
- **External Interfaces:** Wi-Fi, Bluetooth, Cellular, V2X, OBD-II, USB, EVSE
- **OTA capability flag**

---

## Standards & Methodology References

- **UNECE WP.29 R155** — Cybersecurity and Cyber Security Management System (CSMS)
- **ISO/SAE 21434** — Road vehicles: Cybersecurity engineering
- **ISO 26262** — Functional safety: Automotive Safety Integrity Level (ASIL)
- **STRIDE** — Microsoft threat categorization methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- **LINDDUN** — Privacy threat modeling framework
- **CAPEC** — MITRE Common Attack Pattern Enumeration and Classification
