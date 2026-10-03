---
# Copy this file to content/pieces/<slug>.md
# The filename, without .md, is the canonical slug: /pieces/<slug>/
# Leave status as draft. Only status: published is written onto the public site.
# The owner approves publication. Do not put contact details, owner-of-record
# data, or internal strategy in the file.

# title — required. Shown as the page h1.
title: "Replace this title"

# summary — required. The lede, and the page's meta description.
summary: "Replace this summary."

# date — required. YYYY-MM-DD. The publication date.
date: 2026-10-03

# updated — required. YYYY-MM-DD. Equals date until the piece changes.
updated: 2026-10-03

# author — required. A name. Not an email address or phone number.
author: "Niagara Assembly"

# type — required. One of: update, data, summary, explainer, post, article.
type: post

# bucket — required. One of: overviews, overlaps, gathering, processing, packaging, publishing.
# Depth is derived from the bucket: overviews and overlaps are explanatory;
# the four pipeline buckets are technical. Do not add a depth field.
bucket: overviews

# topic — required on Overviews. An id from content/topics.json.
# On other buckets, omit it unless this piece should join a cross-region view on that topic.
topic: funding-and-programs

# subcategory — omit here. Local subcategories belong to the four pipeline buckets only.
# subcategory: municipal-records

# places — required. One or more ids from content/geo.json.
# A place id (town:buffalo) or a region id (region:greater-niagara).
# The piece is listed on a subsite when a place falls inside that subsite's regions,
# or when a region id is one of the subsite's regions.
places:
  - town:st-catharines

# entities — optional. Stable ids for firms, hubs, and other named things.
entities: []

# tags — optional extra labels. They do not replace topic.
tags: []

# ingredients — omit. Ingredients belong to Overlaps only.
# ingredients:
#   - kind: trend
#     ref: topic:technology-adoption-and-automation

# status — required. draft, published, or superseded.
# Drafts are validated and then withheld. They do not get a public page.
status: draft

# supersededBy — required only when status is superseded.
# Value is the successor's canonical path, for example /pieces/later-slug/
# supersededBy: /pieces/later-slug/

# sources — required for data pieces, overlaps, and any piece that carries a claim.
# sources:
#   - name: "Publisher or dataset name"
#     locator: "https://example.invalid/report"
#     retrieved: 2026-10-03

# licence — required for data-backed pieces. Omit on other pieces.
# licence: "Name the licence"
#
# dataset, geography, period, units, comparable — required only when type is data.
# comparable: true only when the dataset follows the shared schema, so it can sit
# beside another region's series with the same units and geography level.
# dataset: example-dataset
# geography: county
# period: "2024"
# units: jobs
# comparable: false
---

A post is a shorter dated piece. Say the one thing it is for, then stop.

The page title is the h1, taken from `title`. In the body, a line starting with `# ` is an h2, and `## ` is an h3.

Margin items are anchored here, in the text. Each fence has a kind. On a wide screen they move into the right margin. On a narrow screen they stay inline.

:::definition greater-niagara
:::

:::note
A supplementary note. Say what it adds at this point in the argument.
:::

:::quote
A short pull quote from the paragraph it sits beside.
:::

:::figure
src: /assets/img/logo.jpg
alt: Placeholder mark, not a figure about the region
caption: Say what the figure shows.
:::

:::deeper
href: /pieces/example-gathering/
label: The technical piece that backs this passage
:::

