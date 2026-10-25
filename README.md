# HomeSpace — Modern Real Estate & Luxury Homes Platform

A modern, responsive real estate web application and website template designed with clean architectural styling, abstract decorative backgrounds, high-contrast typography, and a production-grade DevOps infrastructure.

---

## 🌟 Key Features & UI Improvements

- **Abstract Background System**:
  - **Dynamic Mesh & Ambient Orbs**: Layered soft ocean cyan and royal azure ambient glowing orbs with fluid drift animations.
  - **Architectural Grid Matrix**: Geometric dot-grid overlay with elliptical radial masks for an architectural aesthetic.
  - **Dark Luxury Mesh**: Hero Call-To-Action section featuring a deep midnight-slate (`#080d1a`) geometric polygon pattern with ambient lighting.
  - **Inner Page Titles**: Clean geometric dot matrix and soft accent glow across all 14 page banners.
- **Modern Luxury Color Palette**:
  - **Brand Primary Accent**: Vibrant Ocean Azure (`#0284c7`) with deep ocean hover (`#0369a1`).
  - **Headings & Body**: Executive Slate-900 (`#0f172a`) and readable Slate-700 (`#334155`).
  - **Surfaces**: Crisp white cards on soft Slate-50 (`#f8fafc`).
  - **Midnight Footer**: Deep navy-slate (`#0b1120`) with dedicated real estate services and social links.
- **Glassmorphism Sticky Header**: Translucent frosted navigation bar (`backdrop-filter: blur(16px)`) with an integrated **"Explore Homes"** CTA button.
- **High-End Typography**: Google Font **Plus Jakarta Sans** paired with Montserrat and Roboto.
- **Micro-Interactions**: Smooth card hover elevation, property image zoom (`1.05x`), focused input glow rings, and custom sleek scrollbars.

---

## 🛠️ Senior DevOps & Production Architecture

### 1. Production Docker Container (`Dockerfile` & `nginx/default.conf`)
- Built on ultra-lightweight **`nginx:1.27-alpine`**.
- **Security Hardening**: Standard OWASP security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`).
- **Gzip Compression**: Compresses text, CSS, JS, SVG, JSON, and web fonts.
- **Aggressive Caching**: 1-year immutable caching for static assets (`/assets/`), with immediate updates (`no-cache`) for HTML files.
- **Healthchecks**: Built-in container health check (`wget -qO- http://localhost/`).

### 2. CI/CD Workflows (`.github/workflows/`)
- **`ci.yml`**: Automatically lints HTML syntax, validates CSS styles, and verifies critical assets on every pull request and push to `main`.
- **`deploy.yml`**: Zero-configuration automated deployment pipeline targeting **GitHub Pages**.

### 3. SEO & Standards
- **`robots.txt`**: Crawl directives directing search engines to the XML sitemap.
- **`sitemap.xml`**: Validated sitemap mapping all 15 pages with prioritized indexing.
- **`manifest.json`**: Progressive Web App (PWA) manifest for home screen installation.
- **`.gitattributes`**: Normalizes line endings (`LF`) across Windows, macOS, and Linux.

---

## 📄 Pages Included

| Page | File | Description |
|---|---|---|
| **Home** | `index.html` | Hero search with abstract background, featured properties, services, and CTA |
| **Properties** | `properties.html` | Comprehensive property catalog with filter grid |
| **Property Details** | `property-details.html` | Detailed listing view, gallery, amenities, and agent contact |
| **Agents** | `agents.html` | Real estate broker and agent directory |
| **Agent Profile** | `agent-profile.html` | Individual agent bio, active listings, and client reviews |
| **Services** | `services.html` | Real estate advisory, valuation, and management services |
| **Service Details** | `service-details.html` | In-depth breakdown of individual agency services |
| **About Us** | `about.html` | Company mission, history, and leadership team |
| **Blog** | `blog.html` | Real estate market trends, buying tips, and news |
| **Blog Details** | `blog-details.html` | Full article layout with comments and sidebar |
| **Contact** | `contact.html` | Interactive inquiry form, office location, and contact information |
| **Privacy Policy** | `privacy.html` | Privacy disclosure and data protection details |
| **Terms of Service** | `terms.html` | Terms and legal guidelines |
| **404 Error** | `404.html` | Custom error landing page with quick search and back home action |
| **Starter Page** | `starter-page.html` | Clean boilerplate for future custom sections |

---

## 📁 Directory Structure

```text
HomeSpace/
├── .github/
│   └── workflows/
│       ├── ci.yml               # Automated linting & asset validation workflow
│       └── deploy.yml           # Automated GitHub Pages deployment pipeline
├── assets/
│   ├── css/
│   │   └── main.css             # Unified modern styles, abstract bg & color tokens
│   ├── js/
│   │   └── main.js              # Navigation, preloader & slider scripts
│   ├── img/
│   │   ├── real-estate/         # High-resolution property and agent imagery
│   │   └── blog/                # Editorial article thumbnails
│   └── vendor/                  # Bootstrap 5.3.7, AOS, Swiper, PureCounter
├── forms/
│   └── contact.php              # PHP email contact endpoint
├── nginx/
│   └── default.conf             # Hardened Nginx production configuration
├── .editorconfig                # Universal indentation and formatting rules
├── .gitattributes               # Cross-platform line ending normalization
├── .gitignore                   # Comprehensive ignores for IDE, logs, and build artifacts
├── .dockerignore                # Docker image build filter
├── Dockerfile                   # Production Nginx Alpine container
├── docker-compose.yml           # One-command local container orchestration
├── manifest.json                # PWA manifest
├── robots.txt                   # Search crawler directives
├── sitemap.xml                  # XML search engine sitemap
├── index.html                   # Primary landing page
└── README.md                    # Comprehensive documentation
```

---

## 🚀 Running the Project

### Option A: Local Development Server
```bash
# Python 3
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option B: Docker Production Container
```bash
# Build and run with Docker Compose
docker compose up -d --build
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

To stop the container:
```bash
docker compose down
```
