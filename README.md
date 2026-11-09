# InstaVault – Instagram Backup Explorer

A production-quality full-stack web application that transforms your Instagram data download into a searchable, visual archive.

```
       _____           _        __      __             _ _   
      |_   _|         | |       \ \    / /            | | |  
        | |  _ __  ___| |_ __ _  \ \  / /_ _ _   _ ___| | |_ 
        | | | '_ \/ __| __/ _` |  \ \/ / _` | | | / __| | __|
       _| |_| | | \__ \ || (_| |   \  / (_| | |_| \__ \ | |_ 
      |_____|_| |_|___/\__\__,_|    \/ \__,_|\__,_|___/_|\__|
```

---

## 🚀 Key Highlights & Architectural Overview

InstaVault is designed as a **Hybrid Processing Architecture** that gives users total flexibility between client-side privacy and cloud synchronization:

### 🛡️ Mode A: Local Processing (100% Client-Side Privacy)
- **Zero Cloud Transmission**: The user's Instagram export ZIP never leaves their browser.
- **Client-Side Extraction**: Extracted on the fly via `JSZip` into browser memory.
- **Client-Side Parsers & Normalizers**: Browser TypeScript parsers process both HTML and JSON formats.
- **IndexedDB Storage**: Structured collections, media items, comments, likes, and creator profiles are persisted in `Dexie.js`.
- **Offline Capable**: Functions seamlessly without an internet connection or account.
- **Local Exports**: Generates CSV, Excel (XLSX), and JSON exports directly in browser memory.

### ☁️ Mode B: Cloud Processing (Cross-Device Access)
- **FastAPI Engine**: High-performance asynchronous Python backend.
- **Safe Extraction**: Defends against zip-bombs, path traversal (`../`), and nested archives.
- **SQLAlchemy & Alembic**: SQLite for local development and PostgreSQL ready for production.
- **User Isolation & Security**: Per-user tenancy with JWT authentication and bcrypt password hashing.
- **Full REST API**: Endpoints for content items, saved reels, collections, creators, social graphs, analytics, and exports.

---

## 📁 System Architecture & Directory Layout

```
InstaVault/
├── sample_instagram_backup.zip    # Synthetic test backup (Reels, Posts, Collections, Messages)
├── frontend/                      # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Button, Card, Badge, Input, SearchInput, Dialog, Progress, EmptyState
│   │   │   └── layout/            # Sidebar, Header, AppLayout, LandingLayout
│   │   ├── pages/                 # All 18 Application Pages
│   │   │   ├── LandingPage.tsx    # Hero, how-it-works, features, privacy comparison, FAQ
│   │   │   ├── UploadPage.tsx     # Drag-and-drop, validation, mode selection (Local vs Cloud)
│   │   │   ├── ProcessingPage.tsx # 10-stage real-time progress tracker with cancellation
│   │   │   ├── DashboardPage.tsx  # Dynamic KPI cards and Recharts analytics
│   │   │   ├── SavedReelsPage.tsx # Grid/list reel cards, creator badges, open & copy link
│   │   │   ├── SavedPostsPage.tsx # Pinterest-style masonry gallery with metadata
│   │   │   ├── CollectionsPage.tsx# Folder cards with drill-down item inspection
│   │   │   ├── CreatorsPage.tsx   # Creator leaderboard, post/reel counts, profile links
│   │   │   ├── LikesPage.tsx      # Liked posts and media
│   │   │   ├── CommentsPage.tsx   # Authored comments with post references
│   │   │   ├── FollowersPage.tsx  # Follower accounts explorer
│   │   │   ├── FollowingPage.tsx  # Following accounts explorer
│   │   │   ├── MessagesPage.tsx   # Direct messages with click-to-reveal privacy Veil
│   │   │   ├── StoriesPage.tsx    # Historical story archive
│   │   │   ├── LinkExplorerPage.tsx# Searchable tabular registry of all URLs
│   │   │   ├── AnalyticsPage.tsx  # Deep-dive distribution charts & data quality metrics
│   │   │   ├── BackupManagerPage.tsx # Multi-backup management & 2-snapshot diff comparison
│   │   │   ├── ExportCenterPage.tsx  # CSV, XLSX, and JSON generation
│   │   │   └── SettingsPage.tsx   # Local storage metrics and complete data purge
│   │   ├── parsers/               # Client-side HTML & JSON parsing engine
│   │   ├── services/              # Archive scanner, LocalProcessor, ExportService
│   │   ├── db/                    # Dexie.js database schema
│   │   ├── types/                 # Comprehensive TypeScript definitions
│   │   └── utils/                 # cn, formatters, sanitizers
│   └── dist/                      # Production Vite build
└── backend/                       # FastAPI + SQLAlchemy Python backend
    ├── app/
    │   ├── api/routes/            # Auth, Backups, Content, Collections, Creators, Social, Analytics, Export, Search
    │   ├── core/                  # Config, Security (bcrypt + JWT), Exceptions
    │   ├── db/                    # SQLAlchemy models & database session setup
    │   ├── parsers/               # HTMLParser, JSONParser, Registry, Specialized Parsers
    │   ├── schemas/               # Pydantic validation schemas
    │   └── services/              # ArchiveService, CleaningService, ClassificationService, ProcessingService, AnalyticsService, ExportService
    └── tests/                     # Pytest suite with synthetic Instagram fixtures
```

---

## ⚡ Quick Start Guide

### 1. Frontend Development (Local Mode)
```bash
cd frontend
pnpm install
pnpm run dev
```
Open **`http://localhost:5173`** in your browser.
You can immediately drag and drop `sample_instagram_backup.zip` (located in the project root) into the Upload page in **Local Mode** to test the entire local extraction, parsing, analytics, and browsing without any backend requirement.

### 2. Backend Development (Cloud Mode)
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at:
- Swagger UI: **`http://localhost:8000/docs`**
- ReDoc: **`http://localhost:8000/redoc`**
- Health Check: **`http://localhost:8000/api/health`**

---

## 🧪 Testing

### Running Backend Pytest Suite
```bash
cd backend
python -m pytest tests/ -v
```
All 12 unit and integration tests verify:
- ✅ Fast health check & service discovery
- ✅ Full user registration, login, JWT authorization, and backup upload
- ✅ HTML document parsing and link extraction
- ✅ JSON structure parsing across varied export formats
- ✅ Collections parsing and relationship mapping
- ✅ Safe archive extraction with temporary directory sandboxing
- ✅ Zip-bomb defense and path traversal (`../`) rejection
- ✅ URL normalization and query-parameter cleaning
- ✅ Shortcode extraction from Instagram URLs
- ✅ Username normalization (stripping `@`, case-folding)
- ✅ Caption cleaning and HTML entity decoding
- ✅ Hashtag extraction

### Building the Frontend for Production
```bash
cd frontend
pnpm run build
```

---

## 🔒 Security & Privacy

1. **Local Privacy**: Local Mode uses browser `IndexedDB` and Web APIs. No network requests are made with your private data.
2. **Safe ZIP Extraction**: Limits total file counts, total uncompressed bytes, and enforces path canonicalization to prevent path traversal attacks.
3. **Password Hashing**: Modern, salted bcrypt hashing (no plain-text passwords).
4. **Data Veiling**: Sensitive communication data (Direct Messages) is blurred by default with explicit user click-to-reveal.
5. **Multi-Tenant Isolation**: Every database query in cloud mode is scoped to the authenticated `user_id`.
