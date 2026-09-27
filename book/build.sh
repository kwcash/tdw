#!/usr/bin/env bash
# Build every KDP output from MASTER.md in one command.
#
#   ./build.sh                 # everything: pdf epub docx proofs cover
#   ./build.sh pdf proofs      # just some targets
#   TRIM=5.5x8.5 ./build.sh pdf        # compare another trim
#   PAPER=white ./build.sh cover       # spine width for white paper
#   RELEASE=1 ./build.sh       # also fail if any [PLACEHOLDER] remains
#
# Outputs land in dist/. Intermediate files land in build/.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

MASTER="${MASTER:-MASTER.md}"
TRIM="${TRIM:-6x9}"
PAPER="${PAPER:-cream}"
RELEASE="${RELEASE:-0}"
EPUBCHECK_JAR="${EPUBCHECK_JAR:-/opt/epubcheck/epubcheck-5.2.1/epubcheck.jar}"

BUILD="build"
DIST="dist"
mkdir -p "$BUILD" "$DIST"

say()  { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*" >&2; exit 1; }
ok()   { printf 'ok    %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; }

# ------------------------------------------------------------ trim sizes --
# Margins in inches. KDP's minimums: outside/top/bottom 0.25 in (no bleed);
# inside (gutter) grows with page count and is checked after the build.
case "$TRIM" in
  6x9)     PW=6;   PH=9;   INNER=0.75; OUTER=0.6;  TOP=0.55; BOTTOM=0.75 ;;
  5.5x8.5) PW=5.5; PH=8.5; INNER=0.75; OUTER=0.55; TOP=0.5;  BOTTOM=0.7  ;;
  *) fail "unknown TRIM '$TRIM' (use 6x9 or 5.5x8.5)" ;;
esac
TAG="${TRIM}"
INTERIOR="$DIST/TDW_interior_${TAG}.pdf"

# ------------------------------------------------------------ helpers -----
need() { command -v "$1" >/dev/null 2>&1 || fail "missing tool: $1 (see setup.sh)"; }

meta() {  # meta KEY -> value of a top-level YAML key in MASTER.md
  awk -v k="$1" 'NR==1&&/^---$/{y=1;next} y&&/^---$/{exit}
    y{ if (index($0, k":")==1){ sub("^"k":[ ]*",""); gsub(/^"|"$/,""); print; exit } }' "$MASTER"
}

# KDP inside-margin minimum (inches) for a page count.
kdp_gutter() {
  local n=$1
  if   (( n <= 150 )); then echo 0.375
  elif (( n <= 300 )); then echo 0.5
  elif (( n <= 500 )); then echo 0.625
  elif (( n <= 700 )); then echo 0.75
  else echo 0.875; fi
}

pages_of() { pdfinfo "$1" | awk '/^Pages:/{print $2}'; }

# --------------------------------------------------------- placeholders ---
placeholders() {
  say "Placeholder check"
  local hits
  hits=$(grep -noE '\[[A-Z][A-Z0-9 ,.:/-]{2,}[^]]*\]' "$MASTER" | grep -v '^[0-9]*:\[[0-9]' || true)
  if [[ -z "$hits" ]]; then ok "no [PLACEHOLDER] text left"; return; fi
  echo "$hits" | cut -c1-110 | sed 's/^/      line /'
  local n; n=$(echo "$hits" | wc -l)
  if [[ "$RELEASE" == 1 ]]; then fail "$n placeholder(s) remain; fill them before uploading"; fi
  warn "$n placeholder(s) remain (fine for proofs; RELEASE=1 makes this fatal)"
}

# ----------------------------------------------------------------- PDF ----
build_pdf() {
  need pandoc; need xelatex; need pdfinfo; need pdffonts
  say "Print interior ($TRIM)"
  pandoc "$MASTER" -f markdown -t latex \
    --template templates/print.latex \
    --lua-filter filters/book.lua \
    -V paperwidth="${PW}in" -V paperheight="${PH}in" \
    -V inner="${INNER}in" -V outer="${OUTER}in" \
    -V top="${TOP}in" -V bottom="${BOTTOM}in" \
    -V fontdir="$HERE/fonts" \
    -o "$BUILD/interior.tex"
  (
    cd "$BUILD"
    for pass in 1 2 3; do
      xelatex -interaction=nonstopmode -halt-on-error interior.tex > "xelatex-$pass.log" 2>&1 \
        || { tail -30 "xelatex-$pass.log"; fail "xelatex pass $pass"; }
      grep -q 'Rerun to get' interior.log || { (( pass >= 2 )) && break; }
    done
  )
  cp "$BUILD/interior.pdf" "$INTERIOR"
  verify_pdf "$INTERIOR" "$BUILD/interior.log"
}

verify_pdf() {
  local pdf=$1 log=$2
  say "Verify $pdf"
  local size pages min_g
  size=$(pdfinfo "$pdf" | awk '/^Page size:/{print $3"x"$5}')
  local want; want="$(awk -v w="$PW" -v h="$PH" 'BEGIN{printf "%gx%g", w*72, h*72}')"
  [[ "$size" == "$want" ]] && ok "trim $TRIM ($size pt)" || fail "page size $size pt, want $want"

  pages=$(pages_of "$pdf")
  (( pages >= 24 && pages <= 828 )) || fail "$pages pages is outside KDP paperback range 24-828"
  ok "$pages pages (KDP paperback 24-828; hardcover 75-550)"
  (( pages <= 550 )) || warn "$pages pages is over the KDP hardcover maximum of 550"

  min_g=$(kdp_gutter "$pages")
  awk -v a="$INNER" -v b="$min_g" 'BEGIN{exit !(a>=b)}' \
    && ok "inside margin ${INNER}in >= KDP minimum ${min_g}in for $pages pages" \
    || fail "inside margin ${INNER}in < KDP minimum ${min_g}in for $pages pages"
  for m in OUTER TOP BOTTOM; do
    awk -v a="${!m}" 'BEGIN{exit !(a>=0.25)}' || fail "$m margin ${!m}in < 0.25in"
  done
  ok "outside ${OUTER}in, top ${TOP}in, bottom ${BOTTOM}in (KDP minimum 0.25in)"

  local unembedded
  unembedded=$(pdffonts "$pdf" | awk 'NR>2 && $(NF-4)!="yes"' | wc -l)
  (( unembedded == 0 )) && ok "all fonts embedded" || fail "$unembedded font(s) not embedded"

  local missing overfull
  missing=$(grep -c 'Missing character' "$log" || true)
  (( missing == 0 )) && ok "no missing glyphs" || fail "$missing missing glyph(s); see $log"
  overfull=$(grep -c '^Overfull \\hbox' "$log" || true)
  (( overfull == 0 )) && ok "no overfull lines" || warn "$overfull overfull line(s); see $log"
}

# ---------------------------------------------------------------- EPUB ----
build_epub() {
  need pandoc; need java
  say "EPUB3"
  local isbn ident
  isbn="$(meta isbn-ebook)"
  {
    echo "---"
    if [[ "$isbn" =~ ^97[89][0-9-]{10,14}$ ]]; then
      echo "identifier:"
      echo "  - scheme: ISBN-13"
      echo "    text: \"urn:isbn:${isbn//-/}\""
    else
      # No ISBN yet: a stable UUID derived from the title keeps the same
      # identifier across rebuilds; the placeholder ISBN is kept alongside.
      ident=$(python3 -c "import uuid;print(uuid.uuid5(uuid.NAMESPACE_URL,'totaldomainwar.com/book/'+'$(meta title)'))")
      echo "identifier:"
      echo "  - scheme: UUID"
      echo "    text: \"urn:uuid:$ident\""
      echo "  - scheme: ISBN-13"
      echo "    text: \"$isbn\""
    fi
    echo "creator:"
    echo "  - role: aut"
    echo "    text: \"$(meta author)\""
    echo "date: \"$(date -u +%Y-%m-%d)\""
    echo "---"
  } > "$BUILD/epub-meta.yaml"

  pandoc "$MASTER" "$BUILD/epub-meta.yaml" -f markdown -t epub3 \
    --lua-filter filters/book.lua \
    --css epub/book.css \
    --toc --toc-depth=2 \
    --split-level=2 \
    ${COVER_IMAGE:+--epub-cover-image="$COVER_IMAGE"} \
    -o "$DIST/TDW_kindle.epub"
  python3 tools/epub_landmarks.py "$DIST/TDW_kindle.epub" prologue-two-men-with-nothing "Start" \
    | sed 's/^/ok    /'
  ok "wrote $DIST/TDW_kindle.epub"

  if [[ -f "$EPUBCHECK_JAR" ]]; then
    java -jar "$EPUBCHECK_JAR" --failonwarnings "$DIST/TDW_kindle.epub" > "$BUILD/epubcheck.log" 2>&1 \
      && ok "epubcheck: no errors, no warnings" \
      || { grep -E 'ERROR|WARNING|FATAL' "$BUILD/epubcheck.log" | head -30; fail "epubcheck"; }
  else
    warn "epubcheck not found at $EPUBCHECK_JAR; EPUB not validated (see setup.sh)"
  fi
}

# ---------------------------------------------------------------- DOCX ----
build_docx() {
  need pandoc
  say "Review DOCX"
  pandoc "$MASTER" -f markdown -t docx \
    --lua-filter filters/book.lua \
    --toc --toc-depth=2 \
    -o "$DIST/TDW_review.docx"
  ok "wrote $DIST/TDW_review.docx"
}

# -------------------------------------------------------------- proofs ----
# Renders chosen spreads to PNG so the layout can be checked by eye.
page_with() {  # first page (1-based) whose text matches a regex, from $2
  local re=$1 from=${2:-1} n; n=$(pages_of "$INTERIOR")
  for ((i=from; i<=n; i++)); do
    if pdftotext -f "$i" -l "$i" -layout "$INTERIOR" - 2>/dev/null | grep -qE "$re"; then echo "$i"; return; fi
  done
  echo 0
}

build_proofs() {
  need pdftoppm; need pdftotext; need xelatex
  [[ -f "$INTERIOR" ]] || build_pdf
  say "Proof pages"
  local out="$DIST/proofs"; rm -rf "$out"; mkdir -p "$out"
  local toc prologue part1 hk tbl cjk notes
  toc=$(page_with '^ *Contents *$')
  prologue=$(page_with '^ *Prologue: Two Men With Nothing *$')
  part1=$(page_with '^ *The Weapon Fired *$')
  hk=$(page_with 'How the Party Took Apart a Free City')
  tbl=$(page_with 'Now: No New Statute Needed')
  cjk=$(page_with '三十六')
  notes=$(page_with '^ *Appendix H\. Notes and Sourcing' "$tbl")

  # name:left:right  (0 = blank slot so a recto sits on the right)
  local spreads=(
    "01_halftitle-title:0:1"
    "02_title-copyright:3:4"
    "03_dedication-epigraph:5:7"
    "04_contents:$toc:$((toc+1))"
    "05_roman-to-arabic:$((prologue-1)):$prologue"
    "06_running-heads:$((prologue+1)):$((prologue+2))"
    "07_part-opener:$((part1-1)):$part1"
    "08_chapter-opener:$((hk-1)):$hk"
    "09_table-roadmap:$((tbl+1 - (tbl+1)%2)):$((tbl+1 - (tbl+1)%2 + 1))"
    "10_cjk-page:$((cjk - cjk%2)):$((cjk - cjk%2 + 1))"
    "11_notes:$((notes+1)):$((notes+2))"
  )
  for s in "${spreads[@]}"; do
    IFS=: read -r name l r <<<"$s"
    printf '\\documentclass{article}\\usepackage{pdfpages}\\begin{document}\\includepdf[pages={%s,%s},nup=2x1,frame,delta=8 0]{%s}\\end{document}\n' \
      "$([[ $l == 0 ]] && echo '{}' || echo "$l")" "$r" "$HERE/$INTERIOR" > "$BUILD/proof.tex"
    (cd "$BUILD" && xelatex -interaction=nonstopmode proof.tex >/dev/null 2>&1) || fail "proof $name"
    pdftoppm -r 110 -png -singlefile "$BUILD/proof.pdf" "$out/$name"
    ok "$out/$name.png (pages $l, $r)"
  done
}

# --------------------------------------------------------------- cover ----
build_cover() {
  need python3; need xelatex; need pdftoppm
  [[ -f "$INTERIOR" ]] || build_pdf
  say "Cover templates"
  local pages; pages=$(pages_of "$INTERIOR")
  python3 tools/cover.py --pages "$pages" --paper "$PAPER" --trim "$TRIM" \
    --title "$(meta title)" --out "$BUILD" ${HC_SPINE:+--hc-spine "$HC_SPINE"}
  for kind in paperback hardcover; do
    # two passes: TikZ needs the page anchor from the first
    (cd "$BUILD" && for pass in 1 2; do xelatex -interaction=nonstopmode "cover_$kind.tex" >/dev/null 2>&1; done) \
      || fail "cover $kind"
    cp "$BUILD/cover_$kind.pdf" "$DIST/TDW_cover_template_${kind}_${TAG}.pdf"
    pdftoppm -r 300 -png -singlefile "$BUILD/cover_$kind.pdf" "$DIST/TDW_cover_template_${kind}_${TAG}"
    ok "$DIST/TDW_cover_template_${kind}_${TAG}.pdf + .png (300 dpi)"
  done
  cp "$BUILD/cover_spec.txt" "$DIST/TDW_cover_spec_${TAG}.txt"
  cat "$DIST/TDW_cover_spec_${TAG}.txt"
}

# ---------------------------------------------------------------- main ----
targets=("$@")
(( ${#targets[@]} )) || targets=(pdf epub docx proofs cover)
placeholders
for t in "${targets[@]}"; do
  case "$t" in
    pdf) build_pdf ;; epub) build_epub ;; docx) build_docx ;;
    proofs) build_proofs ;; cover) build_cover ;;
    *) fail "unknown target '$t'" ;;
  esac
done
say "Done. Outputs in $DIST/"
