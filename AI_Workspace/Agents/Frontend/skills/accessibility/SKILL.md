# accessibility

## Objective
Ensure UI changes are operable, perceivable, and understandable for users relying on keyboard navigation and assistive technologies.

## Use when
- Implementing forms, dialogs, navigation, and dynamic content.
- Adding custom controls or non-standard interaction patterns.

## Core checks
1. Keyboard navigation works end-to-end (tab order and traps).
2. Semantic elements and ARIA are correct and minimal.
3. Labels, names, and descriptions are present for controls.
4. Color contrast is adequate for text and interactive elements.
5. Focus styles are visible and not removed.

## Output expectations
- Call out accessibility-sensitive decisions in PR/task notes.
- Include at least one verification step (manual keyboard path or automated check).
