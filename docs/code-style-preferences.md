# Code Style Preferences

This file tracks personal formatting preferences for this project so they are easy to apply consistently during edits.

## JSX / TSX Tag Layout

- Prefer opening tags, content, and closing tags on separate lines for readability.
- Keep tags split across lines unless they are self-closing elements.
- For tags with opening and closing tags, keep the opening tag on one line when it has only one simple attribute.
- For tags with opening and closing tags, prefer stacked attributes when there are 2 or more attributes, or when the single attribute value itself needs multiline formatting.
- Acceptable exception: self-closing tags such as `<br />` and other empty elements.
- For self-closing tags that include attributes, prefer placing attributes on their own lines with one-level indentation.
- Prefer attributes to be stacked vertically when a tag becomes long or dense.
- Prefer attributes to be stacked vertically when a tag has more than 2 attributes.
- Prefer code width to stay within the visible editor viewport to avoid horizontal scrolling.
- For long attribute values (especially `className`), allow multiline formatting inside the value when it improves readability.
- Do not place a closing quote directly next to the closing angle bracket on wrapped attributes; keep wrapped quote/caret boundaries visually distinct.
- Prefer `className` values with more than 2 class tokens to be split across multiple lines.
- Keep `className` values with 1 or 2 class tokens on a single line.
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

## TS Statement Layout

- For statement chains such as `if` / `else if` / `else` and `try` / `catch` / `finally`, place each new block on its own line rather than attaching it to the preceding closing brace.
- For statement keywords with conditions or operands, prefer no space between the keyword and the opening parenthesis: `if(...)`, `else if(...)`, `switch(...)`, `catch(...)`.

## TS String Quotes

- In TypeScript and script-like TypeScript expressions, prefer single quotes over double quotes.
- Avoid mixing quote styles when it can be avoided; if a string contains an apostrophe, escape it rather than switching the whole string to double quotes.
- JSX and HTML-like attribute syntax are the visual exception and may continue using double quotes.

## Delimiter Layout

- In most cases, avoid stacking opening/closing delimiters (`{}`, `()`, `[]`) tightly on the same line when readability suffers.
- Prefer introducing a newline and indentation instead of dense delimiter stacking.
- Do not compound indentation jumps on a single newline; each new line should indent by at most one structural level.
- Keep delimiter structure visually easy to scan, especially in nested JSX/TSX and nested expressions.

### Exception

- Stacked parentheses are acceptable when they belong to the same fat-arrow expression and improve clarity of that single expression.
- When a fat-arrow expression appears inside JSX braces, place the full fat-arrow expression on a new indented line so the `{` does not stack with the expression's opening `(`.

## TSX Ternary Layout

- In TSX, prefer ternary operators with `?` and `:` starting on new lines.
- Keep the condition line at a lower indentation level than the `?` and `:` operand lines.
- Keep ternary `?` and `:` operand lines indented exactly one level deeper than the ternary's enclosing delimiter level.
- When a ternary is wrapped by a delimiter (`{` or `(`), keep the condition on the same line as that opening delimiter.
- For ternaries in JSX attribute braces, prefer starting the expression on a new line and wrapping the ternary in parentheses.
- When the ternary is not already wrapped by a clean delimiter (for example JSX `{ ... }`), prefer wrapping the full expression in parentheses.
- For wrapped ternaries, place the opening parenthesis on the same line as the condition start and align the final closing parenthesis with the expression boundary indentation.
- Keep ternary expression wrappers visually balanced: the closing `}` or `)` should be on its own line aligned with the opening wrapper when the expression spans multiple lines.

### Context Note

- If the ternary already lives inside clean JSX braces, extra wrapper parentheses are optional.

## Notes

- These are preference rules, not hard requirements of the app runtime.
- If a rule can be auto-applied safely on save, prefer that over throwing a build-blocking error.