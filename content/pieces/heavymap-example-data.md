---
# Copy of the HeavyMap scaffold template. status stays draft.
# title — required. Shown as the page h1.
title: "Example: HeavyMap parcels"

# summary — required.
summary: "Draft example of a data piece for HeavyMap. Not a measurement, and not for publication."

# date — required. YYYY-MM-DD.
date: 2026-10-03

# updated — required. YYYY-MM-DD.
updated: 2026-10-03

# author — required. A name, not a contact address.
author: "Niagara Assembly"

# type — required. update, data, summary, explainer, post, or article.
type: data

# bucket — a shared section, or an extra section slug from content/subsites/heavymap.json.
bucket: overviews

# topic — an id from this subsite's topics, not from another subsite's list.
topic: parcels-and-buildings

# subcategory — omit except on a pipeline bucket.

# places — region:heavymap lists the piece on HeavyMap only.
places:
  - region:heavymap

entities: []
tags: []

# status — draft is validated and withheld.
status: draft

sources:
  - name: "Example public-data notice"
    locator: "https://example.invalid/heavymap-scaffold"
    retrieved: 2026-10-03
licence: "Example open-data licence. Not a real licence."
dataset: example-heavymap-parcels
geography: county
period: "not a period"
units: records
comparable: false

---

This file is a draft example for the HeavyMap scaffold. It is not a finding, not a data release, and not for publication.

HeavyMap is the subsite. Niagara Region, the Ontario upper-tier municipality, is a place that can fall inside the seed coverage. It is not the name of this subsite.

# What this example is for

It shows the front matter the build accepts. The body is a placeholder.

:::definition heavymap
:::

:::note
Scaffold note. This does not describe a real dataset.
:::
