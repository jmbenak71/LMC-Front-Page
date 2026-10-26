# LMC Front Page Builder

A bookmarklet that helps Lake Michigan College instructors build a Canvas course home page with module navigation buttons.

## Install
Open this repository's GitHub Pages site (linked in the About section) and drag the **LMC Front Page** button to your bookmarks bar.

## Use
1. Open any page in your Canvas course.
2. Click the **LMC Front Page** bookmark.
3. Choose how many buttons you want, which modules they link to, their text, color and order.
4. Add a title, subtitle and welcome message.
5. Click **Copy code**, then paste it into your page's HTML editor (`</>`) in Canvas and save.

## Features
- Finds module names and IDs from the Canvas API automatically.
- Generates inline-styled HTML, so Canvas keeps the design.
- Meets WCAG 2.1 AA contrast in LMC Red (#A6192E) and Graves Gray (#54585A).
- Responsive buttons: 4 per row on desktop, 2 on tablets, 1 on phones, including in the Canvas mobile apps.
- Read-only: nothing in your course changes until you paste and save the code.

## Versions
The current version is shown in the builder's title bar and on the install page. See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

## Files
- `index.html` – the install page (served by GitHub Pages).
- `lmc-front-page-builder.js` – readable bookmarklet source.
- `install-template.html`, `build_install.py` – after editing the `.js` file, run `python build_install.py` to rebuild `index.html`.
