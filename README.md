# Kumo Scans

Kumo Scans is a self-hosted manga & manhwa reader built with Flask.  
It’s designed for a clean, mobile-friendly reading experience with proper support for both **page-based manga** and **vertical scroll manhwa**.

> ⚠️ This is a personal project, not an official scanlation group or hosting service.

---

## Features

- 📚 **Manga & Manhwa support**
  - Manga: classic page layout with small gaps and rounded borders.
  - Manhwa/Webtoon: full-width vertical panels, no gaps between images.

- 📱 **Reader UX**
  - Header auto-hides while scrolling down for immersion.
  - Single tap on the page toggles the header (and UI) on/off.
  - At the very top of the page, the header can’t be hidden by accident.
  - Per-chapter scroll position is saved and restored.

- 📖 **End of chapter flow**
  - “End of chapter” card at the bottom with:
    - Previous chapter / Next chapter
    - Back to series (first & last chapter only).

- ⬆️⬇️ **Small floating scroll tools**
  - Tiny buttons in the bottom-right corner:
    - `↑` scroll to top
    - `↓` scroll to bottom

- 🌙 **Dark-only theme**
  - Forced dark mode, no OS/theme toggle.
  - Simple, anime-reader-focused layout.

---

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML (Jinja templates), CSS, vanilla JavaScript
- **Data:** File-based content (folders + metadata files for series/chapters)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
