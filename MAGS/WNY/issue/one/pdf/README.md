# WNY Issue One — PDF edition

`wny-issue-one.pdf` is the US Letter, native-text edition. `edition.html` is its local paginated preview. Open it through the site preview server at `/MAGS/WNY/issue/one/pdf/edition.html`.

The generator reads the frozen `data/wny/issue-one.json` and reuses the website's editorial rendering functions in `assets/js/wny.js`: publication gate, issue membership, ordering, figures, exclusions, flags, conflicts, sources, people and organisations. No news claims are rewritten. The PDF adds page frames, running heads, folios, contents links and a full-address source directory. Interactive signup becomes a link. Graphical frames and corridor marks remain vector; fonts are embedded by Chromium.

Rebuild from repository root:

```sh
node --experimental-default-type=module MAGS/WNY/issue/one/pdf/build.mjs
chromium --headless --no-sandbox --disable-gpu --allow-file-access-from-files --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf="$PWD/MAGS/WNY/issue/one/pdf/wny-issue-one.pdf" "file://$PWD/MAGS/WNY/issue/one/pdf/edition.html"
```

Wait for `document.body.dataset.ready === 'true'` when using another browser automation workflow. The paginator measures complete content blocks after fonts load. It keeps story cards and source entries whole, moves section headings with their next block, and marks any oversized unit with `data-overflow="true"` for validation. Check the rendered DOM for that marker after style or content changes. Inspect PDF page renders as well as extracted text.
