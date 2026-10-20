# Today Learning UI contract

## 1. Identity
Keep the existing quiet reading layout. Animated diagrams explain the article;
their controls use the same restrained treatment as Mermaid and code panels.

## 2. Color
Use existing `global.css` theme tokens: `--surface`, `--surface-soft`, `--border`,
`--text-primary`, `--text-secondary`, `--text-tertiary`, and `--focus-ring`.
Standalone SVGs own their palette and background so they also work in Obsidian.

## 3. Typography
Use `--font-sans`, `--font-size-14`, and `--leading-1-5` for diagram controls and
captions. SVG labels must remain legible on a phone; split dense diagrams.

## 4. Spacing and layout
Reuse `--spacing-8`, `--spacing-12`, `--spacing-16`, `--radius-md`, and
`--radius-sm`. Diagrams fit the reader column. A diagram viewport owns horizontal
overflow; the page must not. Mobile controls wrap and have 44px touch targets.
Expanded mobile diagrams use a larger canvas inside a 60dvh scroll viewport,
with a visible pan hint and keyboard-focusable region.

## 5. Components
Animated diagram: figure, toolbar, isolated SVG viewport, caption, original link.
Controls: play/pause, restart, expand; all states have visible text and keyboard
focus. Expanded view uses the existing native media dialog. Move the live figure
into the dialog and restore it on close; never clone its animation timeline.
Keep a closing SVG dialog rendered but invisible until the close handler restores
the figure; `display:none` would cancel CSS animations before their clocks are saved.
Track CSS clocks by target element, animation name, and repeated-name occurrence,
including completed animations retained from initialization.
No loading placeholder is needed: SVG content is included at build time.

## 6. Motion and interaction
Start on first viewport entry; pause offscreen, in collapsed content, or in a
hidden tab. A manual pause persists across viewport changes. Restart resets both
CSS and SVG animation clocks. Reduced motion defaults to paused with explicit
play available. No animation libraries or scroll handlers are required.

## 7. Surface
Use the existing neutral 1px border, `--radius-md`, and surface backgrounds.
Hover uses `--surface-soft`; focus uses the existing focus ring. SVG content is
isolated from global animation and theme transition overrides with Shadow DOM.

## 8. Constraints and accepted debt
SVGs are trusted repository assets checked at build time, not user uploads.
No scripts, HTML, external resources, or event-triggered SMIL are supported.
Modern browsers are targeted; a normal image remains the fallback. Obsidian
reuses the asset but does not receive the site's playback controls.
