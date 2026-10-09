# Total Domain War: manuscript source

The second-edition manuscript (`KDP_MASTER.md`, ~98,000 words) split into one
Markdown file per section. Edit the files in `src/`; never edit the rebuilt
single file.

| Path | Holds |
|---|---|
| `src/front/` | Metadata, copyright, dedication, epigraph, Author's Note, The Stack, Prologue |
| `src/part-1/` to `src/part-5/` | `00-part.md` (the part heading) and one file per chapter |
| `src/appendices/` | Appendices A to G |
| `src/appendix-h/` | Notes and Sourcing, one file per chapter, in chapter order |
| `src/back/` | Acknowledgments, About the Author, A Note on What Comes Next |
| `manifest.json` | Order of every file, titles, word counts, and the source hash |

Appendix H files line up one to one with the chapters of Parts I to IV, so a
chapter and its citations can be edited together.

## Commands (Python 3, standard library only)

```bash
python3 -I tools/build.py            # reassemble into build/book.md for Pandoc/KDP
python3 -I tools/build.py --verify   # rebuild and compare to the recorded hash
python3 -I tools/build.py --rehash   # accept your edits as the new baseline
python3 -I tools/check.py            # banned phrases, round trip, per-section stats
python3 -I tools/check.py --placeholders   # list unfilled [AUTHOR NAME] style fields
```

`--verify` compares against the hash of the original `KDP_MASTER.md`, and it
passes on the untouched split. After you edit, it fails by design. Review the
change, then run `--rehash` to record the new baseline.

## Adding a chapter

1. Create `src/part-N/NN-slug.md` starting with a `## Title` line.
2. Add its entry to `manifest.json` in reading order.
3. If it is a case chapter, add `src/appendix-h/NN-slug.md` for its notes
   and list it in the same order.
