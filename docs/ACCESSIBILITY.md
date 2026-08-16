# Accessibility

DrawScope and its project-specific GitHub Pages site target WCAG 2.2 AA.

- semantic headings, landmarks, navigation, forms, labels, tables, captions, times, and buttons
- skip link and visible high-contrast focus
- keyboard-complete navigation and ticket analysis
- text plus status labels; meaning never depends on color alone
- light and dark semantic token themes
- reduced-motion handling
- responsive layout down to a 320-pixel content width
- wrapping and local table scrolling for long content
- error messages with live alert semantics
- pending/disabled states and stable content during queries
- a keyboard-operable landing-page tour with roving tab focus, Left/Right navigation,
  a visible pause control, meaningful screenshot alternatives, and no autoplay under
  reduced motion

Release review includes keyboard-only completion, focus order/visibility, 200% zoom,
Windows scaling, narrow/short windows, dark theme, and reduced motion. Project-site
review adds desktop and mobile viewport inspection, skip-link behavior, tour
pause/resume, horizontal table access, metadata, and console checks. Automated checks
complement rather than replace manual review.
