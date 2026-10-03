# Study Companion

An accessibility-first study app. Students upload study material (slides, PDFs,
documents, lecture recordings, etc.), then annotate it, take notes scoped to a
specific slide/page, and review it back. Accessibility is not a feature of this
app — it is the baseline every feature is built to. Code that works visually
but breaks for keyboard or screen reader users is not done.

## Stack

- `frontend/` — React 19 + TypeScript + Vite, npm workspace
- `backend/` — FastAPI (Python 3.14+, managed with `uv`)
- Run both: `npm run dev` from root. Tests: `npm run test` (or `test:frontend` /
  `test:backend`). Lint: `npm run lint -w frontend`.

## Accessibility rules (non-negotiable)

Target: WCAG 2.2 AA minimum.

- **Keyboard first.** Every interactive element must be reachable and operable
  via keyboard alone: Tab/Shift+Tab order follows visual/reading order, Enter/Space
  activate, Escape closes, arrow keys work within composite widgets (lists,
  menus, tab groups). Never trap focus; never rely on hover-only or drag-only
  interactions for anything functional.
- **No disorienting focus moves.** Don't open a modal/toast/popover that silently
  yanks screen reader focus somewhere confusing, and don't suppress focus
  outlines. If a dialog opens, focus moves into it deliberately and returns to
  the trigger on close. Prefer inline/non-modal UI (inline panels, disclosure
  widgets) over popups where it achieves the same goal — a popup is justified
  only when it genuinely needs to interrupt.
- **Native elements before ARIA.** Use `<button>`, `<a>`, `<nav>`, `<dialog>`,
  `<input>`, etc. for their semantics first. Only add ARIA roles/attributes when
  no native element covers the case, and never to patch over wrong markup (e.g.
  `<div role="button">` is a last resort, not a default). `NavRail.tsx` and
  `SessionCard.tsx` show the existing pattern: semantic `<nav>`/`<a>`,
  `aria-current`, `aria-label`, `aria-hidden` on decorative marks.
  - **Exception for links that trigger an action** (e.g. "Resume" on a
    `SessionCard`): these should be real `<a>`/`<button>` elements with
    meaningful `href`/`onClick`, not `href="#"` placeholders — `href="#"` is
    currently used as scaffolding in `NavRail`/`SessionCard` and needs real
    routes before ship.
- **Live, dynamic content announces itself.** Loading states, upload progress,
  save confirmations, and newly-generated notes/annotations need
  `aria-live` regions or equivalent — don't make screen reader users poll the
  screen to find out something happened.
- **Content-specific accessibility**, since this app is about consuming study
  material:
  - Annotations and slide/page notes must be reachable and readable without a
    mouse (e.g. keyboard shortcut or focusable list to jump between
    annotations on a page, not just a canvas overlay you click).
  - Lecture recordings need captions/transcripts and a keyboard-operable
    player (play/pause, seek, speed, skip-to-marker tied to notes).
  - Uploaded documents/slides rendered as images or canvas need a text
    alternative or structured equivalent — don't make the only way to read
    content be a flat image.
- Respect user motion/contrast preferences (`prefers-reduced-motion`,
  `prefers-contrast`) and don't rely on color alone to convey meaning (see
  mastery/band colors below — pair color with icon/label, as `MasteryBadge`
  and `SessionCard` bands already do).

## Design system / tokens

All design tokens live in `frontend/src/theme/tokens.css`, generated from
Figma. **Never hardcode colors, spacing, radii, or fonts in component CSS —
use the custom properties.**

- Color: `--surface`, `--surface-raised`, `--surface-sunken`, `--ink`,
  `--ink-muted`, `--line`, `--line-strong`, `--primary`, `--primary-soft`,
  `--on-primary`, highlight colors (`--hl-*`), mastery colors (`--mastery-*`,
  each with a `-soft` background variant).
- Spacing: `--space-1` through `--space-8` (4px scale).
- Radius: `--radius-md`, `--radius-full`.
- Fonts: `--font-display` (Lexend), `--font-body` (Atkinson Hyperlegible
  Next), `--font-mono` (Atkinson Hyperlegible Mono) — chosen for readability.
- Themes are selected via `data-theme` on `<html>`, driven by
  `ThemeContext.tsx`/`ThemeSwitcher.tsx`: `light`, `dark`, and **`high-contrast`**
  — a real, maintained third theme, not an afterthought. Any new token or
  component must define sane values in all three.
- Component pattern already established: one `ComponentName.tsx` +
  `ComponentName.css` per component in `frontend/src/components/`, CSS using
  `component-name__part` / `is-state` BEM-ish naming, consuming tokens only.
  Check `frontend/src/components/` before adding a new component — reuse
  `Icon`, `List`, `SectionHeader`, `PageHeader`, etc. rather than
  reimplementing.

## Current state

Early stage: a `Home` page assembled from the component library above,
talking to a FastAPI backend that's still a skeleton (`backend/app/main.py`).
Upload, annotation, slide-notes, and recording features described above are
planned, not yet implemented — build toward them, but don't assume more
backend/API surface exists than what's in `backend/app/`.
