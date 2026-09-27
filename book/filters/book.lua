--[[
book.lua: structural filter shared by the print (LaTeX), EPUB and DOCX builds.

It never changes wording. It maps the manuscript's markdown structure onto
book structure:

  <!-- FRONT MATTER -->  <!-- MAIN MATTER -->  <!-- BACK MATTER -->
      switch LaTeX \frontmatter / \mainmatter / \backmatter
  #  heading            Part (own recto page in print)
  ## heading            chapter
  ### / ####            section / subsection (unnumbered)
  ## Copyright / Dedication / Epigraph {.unlisted}
      special front-matter pages; the heading word itself is not printed
  *Italic-only paragraph* directly under a chapter title
      chapter subtitle
  **DOMAINS** / **DIMENSIONS** / **STRATAGEMS** / **GAPS** paragraphs
      the case "key" block, set small
  **Bold-only paragraph** directly before a table
      table title, kept on the same page as its table
  ---                   scene break ornament, dropped when it sits next to a
                        heading (a rule beside a heading carries no meaning
                        on a printed page)

Inline "[N]" citations stay inline text. In print the space before one is
made non-breaking so a citation never starts a line on its own.
]]

local stringify = pandoc.utils.stringify

local is_latex = FORMAT:match("latex") ~= nil
local is_epub = FORMAT:match("epub") ~= nil
local is_docx = FORMAT:match("docx") ~= nil

local SPECIAL = { Copyright = "copyright", Dedication = "dedication", Epigraph = "epigraph" }
local KEY_LABELS = { DOMAINS = true, DIMENSIONS = true, STRATAGEMS = true, GAPS = true }

local function raw(s)
  return pandoc.RawBlock("latex", s)
end

local function inl_latex(inlines)
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "latex"):gsub("%s+$", "")
end

local function has_class(el, c)
  for _, x in ipairs(el.classes or {}) do
    if x == c then return true end
  end
  return false
end

local function only_inline(block, tag)
  return block and block.t == "Para" and #block.content == 1 and block.content[1].t == tag
end

local function is_key_para(block)
  if not (block and block.t == "Para" and block.content[1] and block.content[1].t == "Strong") then
    return false
  end
  return KEY_LABELS[stringify(block.content[1])] == true
end

---------------------------------------------------------------------------
-- CJK runs: wrap in a CJK font (print) or a lang span (EPUB) so readers and
-- XeTeX both pick a font that has the glyphs.
---------------------------------------------------------------------------
local function is_cjk(cp)
  return (cp >= 0x2E80 and cp <= 0x9FFF) or (cp >= 0xF900 and cp <= 0xFAFF)
      or (cp >= 0x3000 and cp <= 0x303F) or (cp >= 0xFF00 and cp <= 0xFFEF)
end

local function split_cjk(s)
  local parts, buf, mode = {}, {}, nil
  for _, cp in utf8.codes(s) do
    local m = is_cjk(cp)
    if mode ~= nil and m ~= mode then
      parts[#parts + 1] = { cjk = mode, text = table.concat(buf) }
      buf = {}
    end
    mode = m
    buf[#buf + 1] = utf8.char(cp)
  end
  if #buf > 0 then parts[#parts + 1] = { cjk = mode, text = table.concat(buf) } end
  return parts
end

local function Str(el)
  local has = false
  for _, cp in utf8.codes(el.text) do
    if is_cjk(cp) then has = true break end
  end
  if not has then return nil end
  local out = {}
  for _, p in ipairs(split_cjk(el.text)) do
    if not p.cjk then
      out[#out + 1] = pandoc.Str(p.text)
    elseif is_latex then
      out[#out + 1] = pandoc.RawInline("latex", "\\textcjk{" .. p.text .. "}")
    else
      out[#out + 1] = pandoc.Span({ pandoc.Str(p.text) }, { lang = "zh-Hant" })
    end
  end
  return out
end

---------------------------------------------------------------------------
-- Print only: keep a bracketed citation on the line of the word before it.
---------------------------------------------------------------------------
local function Inlines(inlines)
  if not is_latex then return nil end
  for i = 2, #inlines do
    local cur = inlines[i]
    if cur.t == "Str" and cur.text:match("^%[%d+%]") and inlines[i - 1].t == "Space" then
      inlines[i - 1] = pandoc.RawInline("latex", "~")
    end
  end
  return inlines
end

---------------------------------------------------------------------------
-- Tables: give columns widths in proportion to what they hold, so that a
-- short "#" or "Owner" column does not get the same width as a long text
-- column. Rows never split across pages (longtable breaks between rows only).
---------------------------------------------------------------------------
local function cell_text(cell)
  return stringify(cell.contents or cell)
end

local function set_widths(tbl)
  local ncol = #tbl.colspecs
  local weight = {}
  for c = 1, ncol do weight[c] = { total = 0, n = 0, word = 0 } end
  local function scan(rows)
    for _, row in ipairs(rows) do
      for c, cell in ipairs(row.cells) do
        if c <= ncol then
          local t = cell_text(cell)
          weight[c].total = weight[c].total + utf8.len(t)
          weight[c].n = weight[c].n + 1
          for w in t:gmatch("%S+") do
            weight[c].word = math.max(weight[c].word, utf8.len(w))
          end
        end
      end
    end
  end
  scan(tbl.head.rows)
  for _, body in ipairs(tbl.bodies) do scan(body.body) end

  -- Widths are worked out in characters of table type across the measure.
  -- Every column first gets its longest word (so nothing overflows), then
  -- the space left over goes to the columns that hold the most text.
  local line_chars = 80 - 2 * ncol
  local min_w, extra, sum_min, sum_extra = {}, {}, 0, 0
  for c = 1, ncol do
    local avg = weight[c].n > 0 and weight[c].total / weight[c].n or 1
    min_w[c] = math.min(weight[c].word, 18) + 1
    extra[c] = math.max(avg - min_w[c], 0) + 1
    sum_min = sum_min + min_w[c]
    sum_extra = sum_extra + extra[c]
  end
  local width, total = {}, 0
  for c = 1, ncol do
    if sum_min >= line_chars then
      width[c] = min_w[c]
    else
      width[c] = min_w[c] + (line_chars - sum_min) * extra[c] / sum_extra
    end
    total = total + width[c]
  end
  for c = 1, ncol do
    tbl.colspecs[c] = { tbl.colspecs[c][1], width[c] / total }
  end
  return tbl
end

---------------------------------------------------------------------------
-- Headings
---------------------------------------------------------------------------
local function latex_heading(h)
  local title = inl_latex(h.content)
  local plain = stringify(h.content)
  local unlisted = has_class(h, "unlisted")
  if h.level == 1 then
    -- "Part I. The Weapon Fired" -> label "Part I", title "The Weapon Fired"
    local label, rest = plain:match("^(Part [IVXLC]+)%.%s+(.+)$")
    if label then
      return raw(string.format("\\bookpart{%s}{%s}{%s}", label,
        inl_latex(pandoc.Inlines({ pandoc.Str(rest) })), title))
    end
    return raw(string.format("\\bookpart{}{%s}{%s}", title, title))
  elseif h.level == 2 then
    if unlisted then
      return raw(string.format("\\unlistedchapter{%s}", title))
    end
    return raw(string.format("\\bookchapter{%s}", title))
  elseif h.level == 3 then
    return raw(string.format("\\booksection{%s}", title))
  else
    return raw(string.format("\\booksubsection{%s}", title))
  end
end

local EPUB_TYPES = {
  ["Copyright"] = "copyright-page",
  ["Dedication"] = "dedication",
  ["Epigraph"] = "epigraph",
  ["Author's Note"] = "preface",
  ["Author’s Note"] = "preface",
  ["The Stack"] = "preface",
}

---------------------------------------------------------------------------
-- Document pass: needs to see neighbouring blocks.
---------------------------------------------------------------------------
local function Pandoc(doc)
  local blocks = doc.blocks
  local out = pandoc.List()
  local special = nil          -- which special front-matter page we are in
  local toc_done = false
  local in_front = false
  local in_notes = false       -- Appendix H: notes set a size down in print
  local after_chapter_title = false
  local in_part = false        -- inside a "# Part" (EPUB nesting)

  local function close_special()
    if special and is_latex then out:insert(raw("\\" .. special .. "pagestop")) end
    special = nil
  end

  local function close_notes()
    if in_notes and is_latex then out:insert(raw("\\end{notesmatter}")) end
    in_notes = false
  end

  for i, b in ipairs(blocks) do
    local prev, nxt = blocks[i - 1], blocks[i + 1]

    if b.t == "RawBlock" and b.format == "html" and b.text:match("^<!%-%-") then
      local marker = b.text:match("<!%-%-%s*(.-)%s*%-%->")
      if marker == "FRONT MATTER" then
        in_front = true
      elseif marker == "MAIN MATTER" then
        close_special()
        in_front = false
        if is_latex then out:insert(raw("\\mainmatter")) end
      elseif marker == "BACK MATTER" then
        close_special(); close_notes()
        in_part = false
        if is_latex then out:insert(raw("\\backmatter")) end
      end
      -- all HTML comments are dropped from every output
      goto continue
    end

    if b.t == "Header" then
      after_chapter_title = false
      if b.level == 1 then in_part = true end
      -- EPUB: a chapter that sits outside any Part (front matter, Prologue,
      -- back matter) becomes a top-level entry in the reader's contents,
      -- instead of hanging under an empty section pandoc would invent.
      local promote = is_epub and b.level == 2 and not in_part
      if b.level <= 2 then close_special(); close_notes() end
      local name = stringify(b.content)
      if b.level == 2 and has_class(b, "unlisted") and SPECIAL[name] then
        special = SPECIAL[name]
        if is_latex then
          out:insert(raw("\\" .. special .. "pagestart"))
        elseif is_epub then
          -- keep the heading for the nav/landmarks; CSS hides it on the page
          b.attributes["epub:type"] = EPUB_TYPES[name]
          b.classes:insert("hidden-heading")
          if promote then b.level = 1 end
          out:insert(b)
        else
          out:insert(b)
        end
        goto continue
      end

      if is_latex and in_front and not toc_done and b.level == 2 then
        out:insert(raw("\\booktoc"))
        toc_done = true
      end

      if is_epub and EPUB_TYPES[name] then
        b.attributes["epub:type"] = EPUB_TYPES[name]
      end

      local level = b.level
      if is_latex then
        out:insert(latex_heading(b))
      else
        if promote then b.level = 1 end
        out:insert(b)
      end
      if level == 2 then
        after_chapter_title = true
        if name:match("^Appendix H%.") and is_latex then
          out:insert(raw("\\begin{notesmatter}"))
          in_notes = true
        end
      end
      goto continue
    end

    if b.t == "HorizontalRule" then
      if (prev and prev.t == "Header") or (nxt and nxt.t == "Header") or special then
        goto continue
      end
      if is_latex then
        out:insert(raw("\\scenebreak"))
      else
        out:insert(b)
      end
      goto continue
    end

    -- chapter subtitle: an italic-only paragraph straight after a ## title
    if after_chapter_title and only_inline(b, "Emph") then
      after_chapter_title = false
      if is_latex then
        out:insert(raw("\\chaptersubtitle{" .. inl_latex(b.content[1].content) .. "}"))
      else
        out:insert(pandoc.Div({ b }, { class = "chapter-subtitle" }))
      end
      goto continue
    end
    after_chapter_title = false

    if special then
      -- On the copyright page the manuscript puts one fact per line
      -- (the three ISBNs); keep those line breaks.
      if special == "copyright" and b.t == "Para" then
        b.content = b.content:walk({ SoftBreak = function() return pandoc.LineBreak() end })
      end
      if special == "epigraph" and b.t == "BlockQuote" and is_latex then
        out:insert(raw("\\begin{bookepigraph}"))
        for j, q in ipairs(b.content) do
          if j == #b.content and #b.content > 1 then
            out:insert(raw("\\epigraphsource{" .. inl_latex(q.content) .. "}"))
          else
            out:insert(q)
          end
        end
        out:insert(raw("\\end{bookepigraph}"))
        goto continue
      end
      out:insert(b)
      goto continue
    end

    if is_key_para(b) then
      if is_latex then
        local rest = pandoc.Inlines({})
        for j = 2, #b.content do rest:insert(b.content[j]) end
        if rest[1] and rest[1].t == "Space" then rest:remove(1) end
        out:insert(raw("\\casekey{" .. stringify(b.content[1]) .. "}{" .. inl_latex(rest) .. "}"))
      else
        out:insert(pandoc.Div({ b }, { class = "case-key" }))
      end
      goto continue
    end

    -- bold-only paragraph immediately before a table = the table's title
    if only_inline(b, "Strong") and nxt and nxt.t == "Table" then
      if is_latex then
        out:insert(raw("\\tabletitle{" .. inl_latex(b.content[1].content) .. "}"))
      else
        out:insert(pandoc.Div({ b }, { class = "table-title" }))
      end
      goto continue
    end

    if b.t == "Table" then
      set_widths(b)
      if is_latex then
        -- header cells in bold; every cell starts with \hspace{0pt} so TeX
        -- may hyphenate a long first word in a narrow column
        local function prep(rows, bold)
          for _, row in ipairs(rows) do
            for _, cell in ipairs(row.cells) do
              cell.contents = cell.contents:walk({
                Plain = function(p)
                  local body = bold and pandoc.Inlines({ pandoc.Strong(p.content) }) or p.content
                  body:insert(1, pandoc.RawInline("latex", "\\hspace{0pt}"))
                  return pandoc.Plain(body)
                end })
            end
          end
        end
        prep(b.head.rows, true)
        for _, body in ipairs(b.bodies) do prep(body.body, false) end
        out:insert(raw("\\begin{booktable}"))
        out:insert(b)
        out:insert(raw("\\end{booktable}"))
      else
        out:insert(b)
      end
      goto continue
    end

    out:insert(b)
    ::continue::
  end
  close_special(); close_notes()

  doc.blocks = out
  return doc
end

return {
  { Str = Str },
  { Inlines = Inlines },
  { Pandoc = Pandoc },
}
