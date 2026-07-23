# Code Style Preferences

This file tracks personal formatting preferences for this project so they are easy to apply consistently during edits.

## JSX / TSX Tag Layout

- Prefer opening tags, content, and closing tags on separate lines for readability.
- Keep tags split across lines unless they are self-closing elements.
- Acceptable exception: self-closing tags such as `<br />` and other empty elements.
- Prefer attributes to be stacked vertically when a tag becomes long or dense.
- Prefer code width to stay within the visible editor viewport to avoid horizontal scrolling.
- For long attribute values (especially `className`), allow multiline formatting inside the value when it improves readability.
- Do not place a closing quote directly next to the closing angle bracket on wrapped attributes; keep wrapped quote/caret boundaries visually distinct.

### Tailwind Safety

- Keep Tailwind class tokens as static string literals (no runtime-generated class names).
- Multiline static class strings are allowed, but class tokens must remain plain text in the source so Tailwind can detect them.

## Notes

- These are preference rules, not hard requirements of the app runtime.
- If a rule can be auto-applied safely on save, prefer that over throwing a build-blocking error.