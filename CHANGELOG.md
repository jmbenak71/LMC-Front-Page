# Changelog

This project uses [semantic versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [1.1.0] - 2026-10-26
### Fixed
- The generated page no longer slides sideways in the Canvas iPhone app (removed negative margins on the button list).
- Long titles and button text now wrap instead of widening the page.

### Changed
- Buttons now show 4 per row on desktop, 2 on tablets and 1 on phones, using inline styles only so the layout also works in the Canvas mobile apps.
- With an odd number of buttons, the last button stays the same width as the others.
- The button list uses `role="list"` / `role="listitem"` so screen readers still announce the number of buttons.

## [1.0.0] - 2026-10-23
### Added
- Bookmarklet that reads a Canvas course's modules through the Canvas API.
- Builder panel: course title, subtitle, welcome text, navigation heading.
- Choose how many buttons, which modules, button text, color (LMC Red or Graves Gray) and order.
- Live preview and one-click copy of Canvas-safe, inline-styled HTML.
- Install page with a drag-to-bookmarks button.
