# Code Style Preferences

This file tracks personal formatting preferences for this project so they are easy to apply consistently during edits.

## JSX / TSX Tag Layout

- Prefer opening tags, content, and closing tags on separate lines for readability.
- Keep tags split across lines unless they are self-closing elements.
- Acceptable exception: self-closing tags such as `<br />` and other empty elements.
- Prefer attributes to be stacked vertically when a tag becomes long or dense.
- Prefer attributes to be stacked vertically when a tag has more than 2 attributes.
- Prefer code width to stay within the visible editor viewport to avoid horizontal scrolling.
- For long attribute values (especially `className`), allow multiline formatting inside the value when it improves readability.
- Do not place a closing quote directly next to the closing angle bracket on wrapped attributes; keep wrapped quote/caret boundaries visually distinct.
- Prefer `className` values with more than 2 class tokens to be split across multiple lines.
- If a tag contains a multiline `className` value, place attributes on separate lines and place `className` first.

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

## TSX Ternary Layout

- In TSX, prefer ternary operators with `?` and `:` starting on new lines.
- Keep the condition line at a lower indentation level than the `?` and `:` operand lines.
- When the ternary is not already wrapped by a clean delimiter (for example JSX `{ ... }`), prefer wrapping the full expression in parentheses.
- For wrapped ternaries, place the opening parenthesis on the same line as the condition start and align the final closing parenthesis with the expression boundary indentation.
- Keep ternary expression wrappers visually balanced: the closing `}` or `)` should be on its own line aligned with the opening wrapper when the expression spans multiple lines.

### Context Note

- If the ternary already lives inside clean JSX braces, extra wrapper parentheses are optional.

## Notes

- These are preference rules, not hard requirements of the app runtime.
- If a rule can be auto-applied safely on save, prefer that over throwing a build-blocking error.