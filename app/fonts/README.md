# Self-hosted fonts

Committed so production builds never call `fonts.googleapis.com` (that fetch is
unreliable on CI runners and was breaking `next build` on Vercel).

| File | Family | Subset | Upstream |
| --- | --- | --- | --- |
| `plus-jakarta-sans-latin.woff2` | Plus Jakarta Sans | latin | https://fonts.google.com/specimen/Plus+Jakarta+Sans |
| `noto-sans-devanagari-devanagari.woff2` | Noto Sans Devanagari | devanagari | https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari |

Both are variable fonts (weight 400–800) and both are licensed under the
**SIL Open Font License 1.1** (https://openfontlicense.org).

`--font-jakarta` is listed first in the Tailwind font stack, so Latin text uses
Plus Jakarta Sans and Devanagari text falls through to Noto Sans Devanagari.

To refresh a font, download the woff2 for the same subset from Google Fonts and
replace the file — no code change is needed.
