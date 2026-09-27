#!/usr/bin/env python3
"""Write KDP cover templates (paperback and hardcover) as TikZ/LaTeX files.

The templates are blank guides for a cover designer: every zone is drawn
and labelled with its size in inches and in pixels at 300 dpi.

Paperback (KDP's published formula):
    spine  = pages x paper thickness
             white 0.002252 in/page, cream 0.0025 in/page
    width  = bleed + back + spine + front + bleed      (bleed 0.125 in)
    height = bleed + trim height + bleed
    safe   = keep text 0.125 in inside every trim line (0.25 in from the
             outer edge); spine text needs 0.0625 in clear on each side
             and is allowed only above 79 pages
    barcode area 2 x 1.2 in, bottom right of the back cover

Hardcover (case laminate): PROVISIONAL.
    width  = 2 x trim width + spine + 0.394 + 2 x 0.591 wrap
    height = trim height + 0.236 + 2 x 0.591 wrap
    KDP sets the hardcover spine from its own stepped table, which could
    not be reached from the build machine. The default estimate below
    must be replaced with KDP's value (pass --hc-spine) before final art.
"""
import argparse
import os

DPI = 300
BLEED = 0.125
SAFE = 0.125
SPINE_CLEAR = 0.0625
PAPER = {"white": 0.002252, "cream": 0.0025}
HC_WRAP = 0.591
HC_JOINT_TOTAL = 0.394   # extra width across the spine joints
HC_HEIGHT_EXTRA = 0.236  # board overhang, top + bottom


def px(inches):
    return round(inches * DPI)


def fmt(inches):
    return f'{inches:.3f} in ({px(inches)} px)'


PREAMBLE = r"""\documentclass{article}
\usepackage[paperwidth=%(W).4fin,paperheight=%(H).4fin,margin=0in]{geometry}
\usepackage{fontspec}
\setmainfont{EBGaramond}[Path=%(fontdir)s/,Extension=.otf,UprightFont=*-Regular,ItalicFont=*-Italic,BoldFont=*-SemiBold]
\usepackage{tikz}
\pagestyle{empty}
\begin{document}\noindent
\begin{tikzpicture}[x=1in,y=1in,remember picture,overlay,shift={(current page.south west)}]
"""

END = r"""\end{tikzpicture}
\end{document}
"""


def label(x, y, text, size=r"\scriptsize", anchor="center", rotate=0):
    return (f"\\node[anchor={anchor},rotate={rotate},align=center,font={size}] "
            f"at ({x:.4f},{y:.4f}) {{{text}}};\n")


def paperback(pages, paper, tw, th, title, fontdir):
    spine = pages * PAPER[paper]
    W = BLEED + tw + spine + tw + BLEED
    H = BLEED + th + BLEED
    back_x0 = BLEED
    spine_x0 = BLEED + tw
    front_x0 = spine_x0 + spine
    t = PREAMBLE % dict(W=W, H=H, fontdir=fontdir)
    # bleed zone tint
    t += f"\\fill[red!12] (0,0) rectangle ({W:.4f},{H:.4f});\n"
    t += f"\\fill[white] ({BLEED},{BLEED}) rectangle ({W-BLEED:.4f},{H-BLEED:.4f});\n"
    # safe zones
    for x0, x1 in ((back_x0, spine_x0), (front_x0, W - BLEED)):
        t += (f"\\fill[green!8] ({x0+SAFE:.4f},{BLEED+SAFE:.4f}) rectangle "
              f"({x1-SAFE:.4f},{H-BLEED-SAFE:.4f});\n")
    t += f"\\fill[blue!10] ({spine_x0:.4f},{BLEED:.4f}) rectangle ({front_x0:.4f},{H-BLEED:.4f});\n"
    if spine > 2 * SPINE_CLEAR:
        t += (f"\\fill[blue!22] ({spine_x0+SPINE_CLEAR:.4f},{BLEED+SAFE:.4f}) rectangle "
              f"({front_x0-SPINE_CLEAR:.4f},{H-BLEED-SAFE:.4f});\n")
    # trim line and folds
    t += f"\\draw[black,thick] ({BLEED},{BLEED}) rectangle ({W-BLEED:.4f},{H-BLEED:.4f});\n"
    for x in (spine_x0, front_x0):
        t += f"\\draw[black,dashed] ({x:.4f},0) -- ({x:.4f},{H:.4f});\n"
    # barcode box, bottom right of back cover, 0.25 in from trim
    bx1 = spine_x0 - 0.25
    by0 = BLEED + 0.25
    t += (f"\\fill[yellow!40] ({bx1-2:.4f},{by0:.4f}) rectangle ({bx1:.4f},{by0+1.2:.4f});\n"
          + label(bx1 - 1, by0 + 0.6, r"BARCODE AREA\\2 $\times$ 1.2 in\\keep clear"))
    # labels
    t += label(back_x0 + tw / 2, H / 2 + 0.5, r"\Large BACK COVER")
    t += label(back_x0 + tw / 2, H / 2, f"{tw} $\\times$ {th} in trim")
    t += label(front_x0 + tw / 2, H / 2 + 0.5, r"\Large FRONT COVER")
    t += label(front_x0 + tw / 2, H / 2, title)
    t += label(front_x0 + tw / 2, H / 2 - 0.35, f"{tw} $\\times$ {th} in trim")
    t += label(spine_x0 + spine / 2, H / 2, f"SPINE {spine:.3f} in",
               size=r"\tiny", rotate=-90)
    t += label(W / 2, H - 0.06,
               f"PAPERBACK {tw}$\\times${th}, {pages} pages, {paper} paper. "
               f"Full cover {W:.3f} $\\times$ {H:.3f} in = {px(W)} $\\times$ {px(H)} px at {DPI} dpi. "
               "Red: bleed (trimmed off). Green: safe area for text. Blue: spine. Dashed: folds.",
               size=r"\tiny", anchor="north")
    t += END
    spec = {
        "kind": "paperback", "pages": pages, "paper": paper,
        "spine": spine, "W": W, "H": H,
        "spine_text_allowed": pages > 79,
    }
    return t, spec


def hardcover(pages, paper, tw, th, title, fontdir, hc_spine=None):
    spine = hc_spine if hc_spine else pages * PAPER[paper] + 0.125
    W = 2 * tw + spine + HC_JOINT_TOTAL + 2 * HC_WRAP
    H = th + HC_HEIGHT_EXTRA + 2 * HC_WRAP
    joint = HC_JOINT_TOTAL / 2
    board_w = tw
    back_x0 = HC_WRAP
    spine_x0 = HC_WRAP + board_w + joint
    front_x0 = spine_x0 + spine + joint
    board_y0, board_y1 = HC_WRAP, H - HC_WRAP
    t = PREAMBLE % dict(W=W, H=H, fontdir=fontdir)
    t += f"\\fill[red!12] (0,0) rectangle ({W:.4f},{H:.4f});\n"
    t += f"\\fill[white] ({HC_WRAP},{HC_WRAP}) rectangle ({W-HC_WRAP:.4f},{H-HC_WRAP:.4f});\n"
    safe = 0.25
    for x0 in (back_x0, front_x0):
        t += (f"\\fill[green!8] ({x0+safe:.4f},{board_y0+safe:.4f}) rectangle "
              f"({x0+board_w-safe:.4f},{board_y1-safe:.4f});\n")
    t += f"\\fill[orange!20] ({spine_x0-joint:.4f},{board_y0}) rectangle ({spine_x0:.4f},{board_y1:.4f});\n"
    t += f"\\fill[orange!20] ({spine_x0+spine:.4f},{board_y0}) rectangle ({front_x0:.4f},{board_y1:.4f});\n"
    t += f"\\fill[blue!10] ({spine_x0:.4f},{board_y0}) rectangle ({spine_x0+spine:.4f},{board_y1:.4f});\n"
    t += f"\\draw[black,thick] ({HC_WRAP},{HC_WRAP}) rectangle ({W-HC_WRAP:.4f},{H-HC_WRAP:.4f});\n"
    for x in (spine_x0 - joint, spine_x0, spine_x0 + spine, front_x0):
        t += f"\\draw[black,dashed] ({x:.4f},0) -- ({x:.4f},{H:.4f});\n"
    t += label(back_x0 + board_w / 2, H / 2 + 0.5, r"\Large BACK BOARD")
    t += label(front_x0 + board_w / 2, H / 2 + 0.5, r"\Large FRONT BOARD")
    t += label(front_x0 + board_w / 2, H / 2, title)
    t += label(spine_x0 + spine / 2, H / 2, f"SPINE {spine:.3f} in (PROVISIONAL)",
               size=r"\tiny", rotate=-90)
    t += label(W / 2, H - 0.08,
               f"HARDCOVER (case laminate) {tw}$\\times${th}, {pages} pages. "
               f"Full cover {W:.3f} $\\times$ {H:.3f} in = {px(W)} $\\times$ {px(H)} px at {DPI} dpi. "
               "Red: wrap (folds round the board). Orange: hinge joints, no text. Blue: spine.",
               size=r"\tiny", anchor="north")
    t += label(W / 2, 0.12,
               r"\textbf{PROVISIONAL.} Confirm spine and totals against KDP's hardcover template "
               r"generator before final art; rebuild with HC\_SPINE=<value>.",
               size=r"\tiny", anchor="south")
    t += END
    spec = {"kind": "hardcover", "pages": pages, "paper": paper,
            "spine": spine, "W": W, "H": H, "provisional": hc_spine is None}
    return t, spec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, required=True)
    ap.add_argument("--paper", choices=PAPER, default="cream")
    ap.add_argument("--trim", default="6x9")
    ap.add_argument("--title", default="Title")
    ap.add_argument("--out", default="build")
    ap.add_argument("--hc-spine", type=float, default=None)
    a = ap.parse_args()
    tw, th = (float(v) for v in a.trim.split("x"))
    tw = int(tw) if tw.is_integer() else tw
    th = int(th) if th.is_integer() else th
    fontdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fonts")
    fontdir = os.path.normpath(fontdir)

    pb, pbs = paperback(a.pages, a.paper, tw, th, a.title, fontdir)
    hc, hcs = hardcover(a.pages, a.paper, tw, th, a.title, fontdir, a.hc_spine)
    with open(os.path.join(a.out, "cover_paperback.tex"), "w") as f:
        f.write(pb)
    with open(os.path.join(a.out, "cover_hardcover.tex"), "w") as f:
        f.write(hc)

    lines = [
        f"KDP cover template spec: {a.trim} trim, {a.pages} interior pages, {a.paper} paper",
        f"All pixel sizes at {DPI} dpi.",
        "",
        "PAPERBACK (KDP published formula)",
        f"  spine width        {fmt(pbs['spine'])}   = {a.pages} x {PAPER[a.paper]} in",
        f"  bleed              {fmt(BLEED)} on every outside edge",
        f"  front / back       {fmt(tw)} wide x {fmt(th)} high (trim)",
        f"  FULL COVER         {pbs['W']:.3f} x {pbs['H']:.3f} in = {px(pbs['W'])} x {px(pbs['H'])} px",
        f"  safe area          text >= {SAFE} in inside each trim line",
        f"  spine text         {'allowed' if pbs['spine_text_allowed'] else 'NOT allowed (79 pages or fewer)'}; "
        f"keep {SPINE_CLEAR} in clear each side of the spine",
        "  barcode area       2 x 1.2 in, bottom right of back cover, 0.25 in from trim",
        "",
        "HARDCOVER, case laminate (PROVISIONAL spine)" if hcs["provisional"] else "HARDCOVER, case laminate",
        f"  spine width        {fmt(hcs['spine'])}"
        + ("   ESTIMATE: replace with KDP's value (HC_SPINE=...)" if hcs["provisional"] else ""),
        f"  wrap               {fmt(HC_WRAP)} on every outside edge",
        f"  hinge joints       {fmt(HC_JOINT_TOTAL)} total across the spine",
        f"  FULL COVER         {hcs['W']:.3f} x {hcs['H']:.3f} in = {px(hcs['W'])} x {px(hcs['H'])} px",
        "",
        "Recompute after any change to the interior page count: ./build.sh pdf cover",
    ]
    with open(os.path.join(a.out, "cover_spec.txt"), "w") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
