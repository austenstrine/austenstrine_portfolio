# Code style

Cursor loads `.cursor/rules/code-style-preferences.mdc` (`alwaysApply: true`). Keep that file and this one in sync.

Preferences, not build errors. Prefer format-on-save over a failing build.

## JSX / TSX

- Opening tag, content, and closing tag on separate lines. Self-closing (`<br />`) may stay one line.
- One simple attribute: keep the opening tag on one line.
- Two or more attributes, a dense tag, or a multiline value: stack attributes.
- Self-closing with attributes: one attribute per line, one indent.
- Stay in the editor viewport. Wrap long values (especially `className`).
- Wrapped attributes: closing quote and `>` on separate visual boundaries — not `...">`.
- `className`: 1–2 tokens on one line; 3+ tokens split across lines.
- Multiline `className`: attributes on separate lines, `className` first.

### Tailwind

- Class tokens are static string literals only (no runtime-built names). Multiline static strings are fine.

### Catalog chrome

- One radius for search controls: `rounded-full` (search field, Sort, chips, facet rows). Do not mix `rounded-md` selected rows with `rounded-full` fields.
- Selected/highlight uses primary `asgreen` `#257257` (text and/or soft fill). Secondary navy is `sky` `#1b263b`. Never `ink` `#0d1b2a` as a selected fill — ink is body text, not a highlight.

## Indentation

- Tabs, not spaces, except where the format requires spaces (YAML, etc.).
- Stay consistent inside a file.

## TS

- `if` / `else if` / `else` and `try` / `catch` / `finally`: each block on its own line (not `} else {`).
- No space before `(`: `if(...)`, `else if(...)`, `switch(...)`, `catch(...)`.
- Single quotes in TS. Escape apostrophes; do not switch the string to double quotes.
- JSX/HTML attributes keep double quotes.

## Delimiters

- Do not stack `{}` `()` `[]` on one line when it gets dense; newline + one indent.
- One indent per newline, not a jump of two.
- Fat-arrow: stacked `()` on the same arrow is OK.
- Fat-arrow in JSX `{ }`: put the whole arrow expression on a new indented line so `{` and `(` do not stack.

## TSX ternaries

- `?` and `:` each on their own line, one indent deeper than the wrapper.
- Condition stays on the wrapper's opening line: `{cond` then `?` / `:`.
- JSX attribute braces: start on a new line; wrap the ternary in `()`.
- No clean wrapper: wrap the whole ternary in `()`.
- Multiline: closing `}` or `)` on its own line, aligned with the opener. Do not glue `}` to the last operand.

```tsx
{submitting
	? 'Sending code…'
	: 'Send reset code'
}
```

- Extra `()` is optional when the ternary is already in clean JSX `{ }`.
- Find with search/regex. Never fix with a regex replace. Edit each hit so the closer matches its opener.

## Reuse / icons

- Extract repeated UI. Import an existing widget instead of copying markup.
- No raw `<svg>` in pages or HTML. Put SVG in `apps/web/src/components/icons/` with a `className` prop.
- Directional UI: `ArrowLeftIcon` (back/up), `ArrowRightIcon` (open/go). No caret, chevron, or `←` `→` `›` for that job.
- Find inline `<svg>` with search. Move each hit into an icon widget by hand — no regex rewrite.
