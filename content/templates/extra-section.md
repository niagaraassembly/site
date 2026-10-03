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
type: summary

# bucket — required. For a per-subsite section, use that section's slug from
# content/subsites/<slug>.json. The stage values are still
# overviews, overlaps, gathering, processing, packaging, publishing.
# gathering, processing, packaging, and publishing stay valid stages.
bucket: example-section

# topic — omit unless the piece also carries an Overview topic id from this subsite.
# topic: example-topic

# subcategory — omit. Subcategories belong to the four pipeline buckets only.
# subcategory: example-source

# places — required. One or more ids from content/geo.json.
places:
  - region:replace-me

entities: []
tags: []

status: draft
---

Replace this body. Say which subsite the piece belongs to, and that a draft is not a finding.

# What this section is for

One short heading. In the body, `# ` is an h2.

:::note
A supplementary note. Say what it adds at this point.
:::
