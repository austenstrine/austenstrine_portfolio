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

## Indentation

- Prefer tabs over spaces for indentation by default.
- Rationale: tabs let each developer choose visual tab width without rewriting file whitespace.
- Keep indentation style consistent within a file once established.

### Practical Exceptions

- Use spaces where the syntax/tooling requires it (for example, some YAML contexts and strict external format requirements).

## Delimiter Layout

- In most cases, avoid stacking opening/closing delimiters (`{}`, `()`, `[]`) tightly on the same line when readability suffers.
- Prefer introducing a newline and indentation instead of dense delimiter stacking.
- Keep delimiter structure visually easy to scan, especially in nested JSX/TSX and nested expressions.

### Exception

- Stacked parentheses are acceptable when they belong to the same fat-arrow expression and improve clarity of that single expression.

## Notes

- These are preference rules, not hard requirements of the app runtime.
- If a rule can be auto-applied safely on save, prefer that over throwing a build-blocking error.