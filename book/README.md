# Total Domain War: KDP build

One source, `MASTER.md`, builds every file KDP needs:

| Output | File | For |
|---|---|---|
| Print interior, 6×9 | `dist/TDW_interior_6x9.pdf` | KDP paperback **and** hardcover (same interior) |
| Kindle | `dist/TDW_kindle.epub` | KDP eBook upload (EPUB3, epubcheck-clean) |
| Review copy | `dist/TDW_review.docx` | reading and markup, not for upload |
| Cover templates | `dist/TDW_cover_template_{paperback,hardcover}_6x9.{pdf,png}` + `dist/TDW_cover_spec_6x9.txt` | the cover designer |
| Proof spreads | `dist/proofs/*.png` | checking the layout by eye before trusting it |

This folder sits outside `docs/`, so none of it is deployed with the website.

## Build

```sh
sudo ./setup.sh      # once: pandoc, XeLaTeX + KOMA-Script, poppler, Noto CJK, epubcheck 5
./build.sh           # everything
./build.sh pdf proofs            # just the interior and its proof images
TRIM=5.5x8.5 ./build.sh pdf      # compare the smaller trim
PAPER=white ./build.sh cover     # spine width for white paper (default cream)
HC_SPINE=0.95 ./build.sh cover   # hardcover spine from KDP's own template
RELEASE=1 ./build.sh             # fail while any [PLACEHOLDER] remains
```

The script checks its own output and stops on anything KDP would reject:

- **Print PDF:**
  - trim size;
  - page count within KDP's paperback range (24–828) and hardcover range (75–550);
  - inside margin at or above KDP's gutter minimum for the actual page count;
  - outside, top and bottom margins at least 0.25 in;
  - every font embedded;
  - no missing glyphs;
  - no overfull lines.
- **EPUB:** `epubcheck --failonwarnings`, so a single warning fails the build.

## What the build does to the manuscript

Nothing to the wording. `filters/book.lua` maps the markdown structure onto book structure:

- `<!-- FRONT MATTER -->`, `<!-- MAIN MATTER -->` and `<!-- BACK MATTER -->` set the pagination. Front matter is numbered in roman numerals, and arabic page 1 is the Prologue.
- `#` is a Part: its own right-hand page, with a blank page behind it. `##` is a chapter. `###` and `####` are unnumbered sections.
- `## Copyright`, `## Dedication` and `## Epigraph` (marked `.unlisted`) become the usual front-matter pages. The heading word itself is not printed.
- The italic line under a chapter title is set as the chapter subtitle. The **DOMAINS / DIMENSIONS / STRATAGEMS / GAPS** block is set small, in small caps.
- A bold-only line directly above a table is its title, kept on the same page as the table.
- Tables:
  - run across pages when needed, repeating the header row;
  - never split a row;
  - get column widths sized to their content.
- `---` is a scene break (`* * *`). A rule sitting next to a heading is dropped, because it carries no meaning on the page.
- Inline `[N]` citations stay inline text. In print, the space before one is made non-breaking so a citation never starts a line.
- CJK characters are set in Noto Serif CJK TC (print) or tagged `zh-Hant` (EPUB).

## Print design

- **Body type:** EB Garamond 11 pt, with oldstyle figures in text and lining figures in tables. The semibold weight carries the **Documented. / Argued.** lead-ins.
- **Running heads:** the book title on left-hand pages and the chapter title on right-hand pages, in small caps. The folio sits in the outer corner. Chapter openers have no running head and carry the folio at the foot.
- **Margins at 6×9:**

  | Inside | Outside | Top | Bottom |
  |---|---|---|---|
  | 0.75 in | 0.6 in | 0.55 in | 0.75 in |

  The 0.75 in inside margin clears KDP's gutter minimum up to 700 pages, and the build rechecks it against the real page count.
- **Page flow:** widows and orphans are forbidden outright. Pages are ragged-bottom, so facing pages can differ by a line where a paragraph would otherwise split badly.

## KDP facts this relies on (checked September 2026)

- **Inside margin by page count:**

  | Pages | Minimum inside margin |
  |---|---|
  | 24–150 | 0.375 in |
  | 151–300 | 0.5 in |
  | 301–500 | 0.625 in |
  | 501–700 | 0.75 in |
  | 701–828 | 0.875 in |

  Outside, top and bottom margins must be at least 0.25 in without bleed.
- **eBooks:** KDP accepts EPUB (2 and 3) and KPF. MOBI has not been accepted for new uploads since March 2025.
- **Paperback cover:**
  - spine = pages × 0.0025 in (cream) or 0.002252 in (white);
  - full width = 0.125 + 6 + spine + 6 + 0.125 in, height = 9.25 in.
- **Hardcover cover (provisional):**
  - width = 2 × 6 + spine + 0.394 + 2 × 0.591 in;
  - height = 9 + 0.236 + 2 × 0.591 in.
  - KDP sets the hardcover spine from its own stepped table, which could not be reached from the build machine. Take the spine from KDP's hardcover template generator and rebuild with `HC_SPINE=`.
