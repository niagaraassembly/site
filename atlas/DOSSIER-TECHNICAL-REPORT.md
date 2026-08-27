# The Sidebar Dossier — a technical report

**Audience:** a reviewer with a background in statistics and applied
mathematics who has not seen this codebase.
**Purpose:** to specify precisely what the Atlas asserts about a single
property, how each assertion is constructed, and what substantiates it.
**Date:** 2026-08-27.

Companion to `../docs/superpowers/specs/2026-08-23-atlas-engine-design.md` (the
engine) and `2026-08-27-atlas-enrichment-design.md` (the attributes).

Throughout, **observed** values are drawn from the live cache and are marked as
such. Values used only to demonstrate a calculation are marked **illustrative**.
Nothing in this document is a real assertion about a real business.

---

## 1. What the dossier is

The Atlas holds 445,075 analysis units across thirteen municipalities. The
dossier is what a reader sees when they select **one** of them.

It is not a scorecard. A scorecard reports a verdict; the dossier reports a
**structured argument** — a set of claims, each with its evidence, its method,
its uncertainty and its provenance, arranged so that a reader may reach a
different conclusion than the engine did and be right.

That framing is not decoration. It follows from a constraint the project cannot
relax: the Atlas makes claims about identifiable real property, often occupied
by named businesses. A verdict that cannot be interrogated is, in that setting,
a liability rather than a product.

### 1.1 The reader's contract

Every element of the panel satisfies four properties:

| Property | Meaning |
|---|---|
| **Attributed** | every number names the dataset it came from and the date it was retrieved |
| **Dated** | every claim carries the observation date of its *source*, not of the build |
| **Bounded** | quantities derived from ranges are reported as intervals, not midpoints |
| **Refusable** | where evidence is absent the panel says so; it never substitutes a zero |

The fourth is the one most often violated in practice and is treated formally in
§7.

---

## 2. Anatomy of the panel

The dossier is composed of eight bands. Bands render in a fixed order, and any
band whose evidence is unavailable renders **as unavailable** rather than being
omitted — absence of a band would be indistinguishable from absence of the
condition it describes.

```
┌─ SUBJECT ─────────────────────────────────────────────────────┐
│  unit id · tier · municipality · geometry class                │
├─ ASSERTION (optional) ────────────────────────────────────────┤
│  present only where a record states something specific         │
│  carries claim_state ∈ {supported, contested, refuted}         │
├─ REGULATORY ──────────────────────────────────────────────────┤
│  zoning now · zoning previously · designation · CIP areas      │
├─ PHYSICAL ────────────────────────────────────────────────────┤
│  area · footprint · coverage · frontage · relief               │
├─ CONSTRAINT ──────────────────────────────────────────────────┤
│  encumbrance fractions, each naming its authority              │
│  vetoes reported separately and never summed                   │
├─ ACCESS ──────────────────────────────────────────────────────┤
│  distances to access POINTS, each with its tag confidence      │
├─ NEIGHBOURS ──────────────────────────────────────────────────┤
│  count and sector mix within 100 / 250 / 500 m                 │
├─ HISTORY ─────────────────────────────────────────────────────┤
│  imagery epochs · rezoning · permits · register appearances    │
├─ EVIDENCE ────────────────────────────────────────────────────┤
│  registers covering this unit · staleness · disagreements      │
└───────────────────────────────────────────────────────────────┘
```

**The assertion band is optional; the context bands are not.** Most units carry
no assertion — nothing departed, nothing is dormant — and their context is still
the point. An atlas that renders a full panel only where it suspects
abandonment is a decline map.

---

## 3. A worked subject

All values in this section are **observed** from the cache unless marked.

**Unit:** Hopkins Steel Works, 2 Broadway, Welland.

This subject is chosen deliberately. On 2026-08-23 the Atlas shipped a layer
asserting that this business had departed. Assembling its dossier placed the
business in its own neighbours band, and the contradiction was visible in one
step. Checking all 68 claims in that layer found 64 false. The dossier is
therefore not only a presentation surface; §6 treats it as a verification stage.

```
SUBJECT
  unit_tier      footprint            (Welland publishes no parcel fabric)
  municipality   welland
  nei_id         8130

ASSERTION
  claim_state    refuted
  claim          "departed — last seen 2018, gone by 2022"
                 source: derived departures layer, build of 2026-08-21
  refutation     nei_id 8130 present in NEI editions 2017, 2018, 2019 AND 2022
                 source: Niagara Region Employment Inventory, OGL 2.0
  displayed as   "Records disagree about this site." — both records shown,
                 neither adopted

REGULATORY
  zoning now     L1 — Light Industrial        (Welland By-law 2017-117)
  zoning before  I2                           (superseded by-law)
  designation    Light Industrial             (Official Plan Schedule B)
  incentive      Brownfield CIA               (Community Improvement Plan area)

PHYSICAL
  building       present · nearest neighbouring structure 17 m

ACCESS
  rail_served    513 m       tag_confidence: partial (2,223 of 4,399 rail
                             features regionally carry no usage tag)
  site plan      247 m       (nearest active application)

NEIGHBOURS
  within 500 m   18 businesses · 3 manufacturing

HISTORY
  business       recorded in NEI 2017, 2018, 2019, 2022
  address form   "2 Broadway" (2017, 2018) → "2 Broadway Street" (2019, 2022)
  rezoning       I2 → L1
```

The address-form line is not trivia. That restyling is what produced the false
departure: a join keyed on the address string failed across editions, while
`nei_id` held. The dossier surfaces it because the reason a claim was wrong is
itself evidence about how much to trust neighbouring claims.

---

## 4. Citation

### 4.1 The unit of citation is the claim, not the panel

Each rendered value carries a superscript marker resolving to a **source
record**, not a bibliography entry. The distinction matters: two values from the
same dataset but different editions cite differently.

```
zoning now   L1 — Light Industrial ¹

¹ City of Welland, Current Zoning By-law 2017-117
  layer            welland-zoning-current
  retrieved        2026-08-22
  licence          Open Government Licence 2.0 (Welland)
  join method      J3 point-in-polygon
  observation date by-law adopted 2017
  note             retrieved via ArcGIS Online Hub cache; the City's own
                   server was unreachable on the retrieval date
```

Six fields are mandatory: **layer, retrieved, licence, join method, observation
date, note-if-any**. The separation of *retrieved* from *observation date* is
load-bearing — a 2017 by-law fetched in 2026 is a current fact with an old
origin, whereas a 2022 business inventory fetched in 2026 is a four-year-old
observation being read today.

### 4.2 Join method is part of the citation

Because the six join methods differ in trustworthiness, the method that produced
a value is part of what substantiates it:

| Method | Notation | What a reader should infer |
|---|---|---|
| J1 identifier | `id` | exact; the source asserts this linkage |
| J2 normalized address | `addr(r)` | matched at rate *r*; some records did not match |
| J3 point-in-polygon | `pip` | geometric containment; exact given geometry |
| J4 containment | `in` | exact given geometry |
| J5 proximity | `≈d` | a distance under a stated ceiling |
| J6 overlap | `∩t` | matched above threshold *t*; a judgement call |

A value carrying `addr(0.869)` tells a reader that 13.1% of that table did not
place, and therefore that absence in this panel is weaker evidence than presence.

### 4.3 Grouped source rail

Beneath the bands, sources are grouped by **evidence class** rather than by
publisher, because the class is what governs how much weight a claim carries:

```
OBSERVED — a register states this
  Niagara Region Employment Inventory (2017, 2018, 2019, 2022) · OGL 2.0
  Welland Zoning By-law 2017-117 · OGL 2.0 (Welland)

INFERRED — computed by this Atlas
  departure detection · nei_id absence across later editions
  rail-served proximity · OSM service and usage tags

UNAVAILABLE — sought and absent
  parcel fabric · Welland publishes none
  assessed value · MPAC is fee-based province-wide
```

The third group is deliberate. A reader who cannot see what was looked for and
not found will misread absence as irrelevance.

---

## 5. From attribute to assertion

The engine constructs claims through four ascending levels. Each level is a
strictly stronger epistemic commitment than the one below, and the panel labels
which level it is operating at.

### Level 0 — Attribute
A value copied from a source, normalised but not interpreted.
*"Zoning is L1."* Substantiated by citation alone.

### Level 1 — Derived quantity
An arithmetic function of attributes, with no threshold applied.
*"Building coverage is 0.19."* Substantiated by citation of inputs plus the
formula, which is published (Appendix A).

### Level 2 — Signal
A derived quantity compared against a threshold, producing a contribution to a
score. *"Coverage 0.19 is below the regional median 0.41 → +18."* Substantiated
by inputs, formula, threshold, **and the provenance of the threshold**, which is
the part most often omitted in practice.

### Level 3 — Assertion
A claim about the world. *"Records disagree about this site."* Substantiated by
everything above plus an explicit `claim_state`, and — critically — subject to
refutation checks (§6).

**The panel never renders a Level 3 assertion without displaying the Level 2
signals that produced it.** This is the "show your work" property, and it is
what makes a disagreeing reader possible.

---

## 6. Refutation as a pipeline stage

Each assertion type has a defined refutation condition:

| Assertion | Refuted by |
|---|---|
| business departed | that `nei_id` present in **any later** edition |
| site dormant | an open permit, application or current licence |
| building demolished | a footprint present in a later epoch at that location |
| land under-occupied | recent permit activity, or employment above band |

Resulting in `claim_state ∈ {supported, contested, refuted}`.

**A failed check does not delete the finding — it changes what is shown.**
Suppression would hide the most informative thing on the panel, which is that
two records disagree about the same ground, and would leave the reader trusting
a silence they cannot inspect.

What is withheld is the **unqualified claim**, never the information:

- *not published:* "Hopkins Steel Works ceased operating at 2 Broadway."
- *published:* both records, cited and dated, and the discrepancy between them.

A **computed claim** — the engine's own reading — may sit alongside, labelled as
computed, with inputs listed and confidence stated. It never replaces the
underlying records.

---

## 7. Missing data

The single most consequential design rule in the system:

> **A quantity that cannot be computed is `null`. It is never `0`.**

The motivating case: under-occupancy is a ratio whose denominator is employment.
Hamilton publishes no business register. Reporting Hamilton at *0% occupied*
inverts the meaning — zero reads as *empty* when the truth is *unmeasured*. A
subagent working outside this rule produced exactly that error, together with a
regional claim of "93% vacancy" formed by dividing business count by every
building footprint including houses.

Null propagates strictly: any function with a null argument returns null, and
the panel renders the reason rather than the value.

```
under-occupancy   unavailable
                  no employment denominator — Hamilton publishes no
                  business inventory comparable to the NEI
```

Confidence is a separate quantity (Appendix A.4) and never compensates for a
null. A high-confidence null is still null; it merely means we are certain we
cannot say.

---

## 8. Three scores and a flag

The engine emits three scores and never composites them:

- **Under-occupancy** — is this land carrying less activity than its size implies?
- **Transition** — has something changed here recently?
- **Evidence** — how much do we actually know?

Plus **dormancy**, which is a *flag* rather than a score, present only where a
record states something and `null` otherwise (§9).

**There is no fourth field and no place to add one.** A single number would be
the most requested feature and the most dishonest: it would average a physical
observation, a temporal observation and an epistemic one into a quantity with no
referent. Evidence in particular **qualifies** the other two rather than adding
to them — high under-occupancy at low evidence is a lead, not a finding, and the
panel renders it as such.

---

## 9. Dormancy is sized to its evidence

Measured 2026-08-23. The coverage column is not a footnote — the three signal
families are scoped to three different territories and cannot be summed:

| Signal | Count | Coverage |
|---|---:|---|
| OSM `brownfield` | 316 | study area |
| OSM `disused` (recorded) | 71 | study area |
| NEI departures 2019→2022, all sectors | 121 | Niagara Region (12 municipalities) |
| ↳ industrial sector only | 15 | Niagara Region |
| Hamilton demolition permits (typed `DP`) | 3,007 | City of Hamilton |
| Hamilton registered vacant | 84 | City of Hamilton |

The denominator matters: 121 departures arise from 12,016 businesses over three
years. A convergence rule requiring three or four of these to agree on one unit returns
approximately nothing. Dormancy is therefore **not scored for every unit**; it is
a flag computed only where at least one qualifying observation exists, at one of
three levels — `recorded`, `corroborated`, `single-signal`.

`dormancy = null` is the normal case and means *no dormancy evidence recorded
here*, never *this site is active*.

The words *vacant*, *empty* and *available* are reserved for `recorded`, where a
register supplies them, and are then quoted with attribution.

**Validation:** Hamilton's 84 registered-vacant buildings are the test set.
Dormancy is aimed at exactly what that register measures, so the flag should
fire on them. This test can fail, which is its value.

---

## 10. What the dossier refuses to say

Stated plainly because a reviewer should be able to check that the system honours
its own limits:

| Refused | Why |
|---|---|
| "This site is vacant" | unless a register says so, and then quoted |
| "This business is failing" | never; no source supports it and the harm is real |
| "This site is available" | no source we hold records availability; the word is barred |
| a single composite score | §8 |
| a distance implying access | access is to points, not networks |
| a zero standing for missing | §7 |

---

# Appendix A — Formulas

Notation. For unit *u*:

| Symbol | Quantity | Units | Domain |
|---|---|---|---|
| $A_p$ | parcel area | m² | $(0,\infty)$, null at address tier |
| $A_b$ | building footprint area | m² | $[0,\infty)$ |
| $G$ | indoor gross floor area | m² | $[0,\infty)$, null where unreported |
| $E$ | employment | persons | an **interval** $[E_\ell, E_h]$ |
| $\kappa$ | building coverage | — | $[0,1]$ |
| $c_j$ | encumbrance fraction, constraint *j* | — | $[0,1]$ |
| $C$ | confidence | — | $[0,1]$ |

All areas are computed in **EPSG:32617** (UTM 17N). Areas computed in EPSG:4326
are wrong by a latitude-dependent factor and — worse — wrong *plausibly*.
Verified 2026-08-23: shapely areas in EPSG:32617 agree with Welland's published
`GeometrySTArea` across **1,980 polygons** at median relative error **0.0000%**,
p95 **0.0000%** — agreement to the reported precision of the check, which is the
strongest statement that measurement supports.

## A.1 Employment is an interval, not a scalar

The NEI reports employment as a **band**, e.g. `"Small (5-99 Employees)"`.
Collapsing a band to its midpoint manufactures precision the source does not
have, and every downstream ratio inherits the fabrication.

Employment is therefore carried as an interval $E = [E_\ell, E_h]$ and all
derived quantities are computed under interval arithmetic. For a positive
quantity $X$ divided by $E$:

$$\frac{X}{E} = \left[\frac{X}{E_h},\ \frac{X}{E_\ell}\right]$$

Note the inversion of endpoints: dividing by the **larger** employment bound
gives the **smaller** area-per-employee.

Where the source reports an exact count (Welland's business directory gives
integer `FullTime`), $E_\ell = E_h$ and the interval degenerates to a point.
The record carries `employees_basis ∈ {band, exact, mixed}` so a reader can see
which.

**Calibration.** Welland is the only municipality where both forms exist for the
same ground — 923 businesses with exact counts against NEI bands. It is the sole
available estimate of midpoint error and should be reported, not assumed.

## A.2 Derived ratios

$$\kappa = \frac{A_b}{A_p} \qquad
\alpha = \frac{A_p}{E} \qquad
\gamma = \frac{G}{E}$$

$\alpha$ and $\gamma$ are intervals by construction. $\kappa$ is a scalar.

**The conservatism convention (D7).** Where a single value is required for
scoring, the engine uses the endpoint that *minimises* apparent under-occupancy:

$$\tilde\alpha = \frac{A_p}{E_h}$$

Using $E_\ell$ would maximise apparent under-use — it would make the engine
flattering to its own thesis. The engine is deliberately biased **against** the
conclusion it exists to find. The full interval is reported alongside so the
reader sees the uncertainty rather than inheriting the choice silently.

## A.3 Signals and the additive form

Each signal $s_i$ is a triple (condition, delta, label). The score is

$$U \;=\; \mathrm{clip}\!\left(\sum_{i} w_i \cdot \mathbb{1}[\phi_i(u)],\; 0,\; 100\right)$$

with $w_i$ read from a **versioned weight table** and $\phi_i$ the firing
condition. Every score carries `weights_version`; a score computed under v1 is
not comparable to one under v2, and a chart mixing them is a bug that looks like
a trend.

**Why additive and not learned.** A fitted model would almost certainly rank
better. It is rejected because:

1. **No labels exist.** There is no ground-truth register of "sites worth
   investigating." Hamilton's 84 recorded vacancies are the only labelled set,
   and 84 is a validation set, not a training set.
2. **Interpretability is the product.** Every point of score must be traceable
   to a named piece of evidence a reader can dispute. A gradient-boosted
   ranking cannot be argued with by a municipal planner.
3. **The weights are contested by design.** They are published, versioned, and
   changed by pull request with the score deltas posted. That governance model
   requires coefficients that mean something individually.

The cost is accepted openly: **additive independence is false.** A large parcel
with low coverage and no operator triple-counts one underlying fact. Mitigations
are (a) signal families are constructed to be as near-disjoint as the data
allows, and (b) the signal list is always displayed, so a reader can see the
triple-count and discount it. This is a real limitation, not a solved problem.

## A.4 Confidence

Confidence is **multiplicative**, over factors in $(0,1]$:

$$C \;=\; f_{\text{tier}} \cdot f_{\text{reg}} \cdot f_{\text{stale}} \cdot f_{\text{tag}}$$

$$f_{\text{tier}} = \begin{cases}
1.0 & \text{parcel} \\
0.8 & \text{footprint} \\
0.5 & \text{address (area-derived scores only)}
\end{cases}$$

$$f_{\text{reg}} = 1 - e^{-\lambda n}, \quad n = \text{independent registers covering } u$$

$$f_{\text{stale}} = e^{-\mu \Delta t}, \quad \Delta t = \text{years since observation}$$

$f_{\text{tag}}$ carries source-tagging completeness — for rail-derived access,
the fraction of relevant features carrying the `usage` tag (regionally
$2176/4399 \approx 0.49$).

**Multiplicative rather than additive** because the factors are not
compensatory: excellent freshness does not repair a missing denominator. A
product also has the correct absorbing behaviour — any factor at zero drives
$C$ to zero, which is the right answer when a necessary input is absent.

$\lambda$ and $\mu$ are weight-table parameters, versioned with the rest.

**Confidence is never multiplied into a score.** It is reported beside it. A
score of 78 at confidence 0.2 is a different object from a score of 16, and
collapsing them would destroy exactly the distinction the reader needs.

## A.5 Constraint fractions

For unit geometry $\Omega_u$ and constraint layer $j$ with geometry $\Gamma_j$:

$$c_j \;=\; \frac{\mathrm{area}\!\left(\Omega_u \cap \Gamma_j\right)}{\mathrm{area}(\Omega_u)} \in [0,1]$$

computed in EPSG:32617.

Fractions rather than booleans because a parcel 5% clipped by a watercourse
setback is a materially different proposition from one wholly inside a regulated
area, and the fraction costs nothing extra — the intersection is already
computed.

**At address tier $\Omega_u$ is a point**, $\mathrm{area}(\Omega_u) = 0$, and the
expression is undefined. Address-tier units receive boolean containment and the
record's `unit_tier` states why. A point must never report $c_j \in \{0,1\}$ as
though a fraction had been evaluated.

Summaries: $c_{\max} = \max_j c_j$, $\;n_c = |\{j : c_j > 0\}|$.

## A.6 Vetoes are not weights

Let $V(u) \in \{0,1\}$ indicate any veto condition — a low-clearance access
route, a subsurface contaminant attenuation zone, a landlocked parcel, absence
of a commercially permitted border crossing for a border-dependent use.

$V$ is **not** folded into $U$. Representing a disqualifying condition as a large
negative weight is a category error: it implies compensability, and a site that
a standard trailer cannot reach is not redeemed by excellent rail access.

$$\text{panel} \;=\; \big(U,\ T,\ C,\ \text{dormancy},\ V,\ \text{signals}\big)$$

with $V$ rendered as a named condition citing the record that produced it.

## A.7 Two-pass spatial evaluation

Naïve evaluation of A.5 over $|U| \approx 3.6\times10^5$ polygon units against
constraint layers whose densest feature occupies 137 KB is intractable. The
engine evaluates in two passes:

1. Construct $\mathcal{T}_j$, an STR-tree over $\Gamma_j$.
2. For each $u$, retrieve candidates $\{ \gamma \in \Gamma_j : \mathrm{bbox}(\gamma) \cap \mathrm{bbox}(\Omega_u) \neq \emptyset \}$.
3. Evaluate the exact intersection only on candidates.

Correctness is preserved because bounding-box overlap is a **necessary**
condition for geometric intersection. The prefilter can only produce false
positives, which the exact pass removes; it cannot produce false negatives.

That guarantee holds only if the bounding boxes are correct, which is a
non-obvious failure surface: a bbox defect silently drops true intersections and
every test still passes. The required test is therefore that a **known-encumbered
unit returns encumbered**, not merely that the routine executes.

## A.8 Distances

$$d_k(u) = \begin{cases}
\min_{p \in P_k} \lVert u - p \rVert & \text{if } \min < D_{\max} \\
\texttt{null} & \text{otherwise}
\end{cases}$$

where $P_k$ is the set of **access points** for mode $k$ and $D_{\max} = 5{,}000$ m.

$P_k$ is emphatically not the mode's network. For rail, $P_k$ comprises track
with `service ∈ {spur, siding, yard}` or `usage ∈ {industrial, branch}` —
excluding mainline, from which nothing can be loaded, and excluding `crossover`,
which is junction geometry rather than track. Equivalent restrictions apply to
highway (interchanges, not carriageway), water (docks, quays, cranes — not the
canal centreline) and border (commercially permitted crossings only).

The null beyond $D_{\max}$ means *we did not look further*, which is a different
statement from a large distance, and is rendered as such.

---

# Appendix B — Worked evaluation

Subject: the Hopkins Steel Works unit (§3). Values marked **[obs]** are observed;
**[ill]** are illustrative, supplied only to complete an arithmetic
demonstration.

```
unit_tier              footprint                                    [obs]
A_b                    3,400 m²                                     [ill]
A_p                    null  — Welland publishes no parcel fabric   [obs]
G                      null  — indoorgfa unreported this edition    [obs]
E                      [5, 99]  band "Small (5-99 Employees)"       [obs]
```

**Step 1 — coverage.**
$\kappa = A_b / A_p$. $A_p$ is null $\Rightarrow \kappa = \texttt{null}$.

**Step 2 — area per employee.**
$\alpha = A_p / E$. $A_p$ is null $\Rightarrow \alpha = \texttt{null}$.

**Step 3 — under-occupancy.**
Every area-denominated input is null. Therefore

$$U = \texttt{null}$$

rendered as:

```
under-occupancy   unavailable
                  no parcel geometry — the City of Welland publishes
                  building footprints but no parcel fabric
```

**This is the correct output and the most important line in the appendix.** A
system that returned 0 here would rank a fully occupied steel fabricator as
maximally under-occupied on the strength of a missing denominator. The observed
counterexample — a subagent reporting Hamilton at "0% occupied" because Hamilton
has no business register — is precisely this failure.

**Step 4 — confidence for the scores that *are* computable.**

$$f_{\text{tier}} = 0.8 \;\text{(footprint)}, \quad
f_{\text{reg}} = 1 - e^{-\lambda \cdot 3}, \quad
f_{\text{stale}} = e^{-\mu \cdot 4}$$

with $n = 3$ registers (NEI, Welland zoning, Welland Official Plan) **[obs]** and
$\Delta t = 4$ years since the 2022 NEI edition **[obs]**. Taking
$\lambda = 0.6,\ \mu = 0.05$ **[ill]**:

$$f_{\text{reg}} = 1 - e^{-1.8} = 0.835, \qquad f_{\text{stale}} = e^{-0.2} = 0.819$$

$$C = 0.8 \times 0.835 \times 0.819 \times 1.0 \approx 0.547$$

Reported as `evidence 0.55`, beside — never multiplied into — the scores.

**Step 5 — access.**

$d_{\text{rail-served}} = 513\ \text{m}$ **[obs]**, below $D_{\max}$, tag
confidence `partial` because 2,223 of 4,399 regional rail features carry no
`usage` tag **[obs]**. Rendered with that qualification attached, since a unit
reporting no rail-served track nearby may be near untagged track.

**Step 6 — assertion.**

The departure claim is evaluated against its refutation condition: `nei_id` 8130
appears in the 2019 and 2022 editions, both later than the claimed
`last_seen = 2018` **[obs]**. Therefore

$$\texttt{claim\_state} = \texttt{refuted}$$

and the panel renders the discrepancy — both records, cited and dated — rather
than either the claim or a blank.

---

# Appendix C — Open questions for the reviewer

Points where the design makes a defensible choice among alternatives, offered
for challenge:

1. **Additive scoring** (A.3). Independence is false and known to be false.
   Is displaying the signal list an adequate mitigation, or does the
   triple-counting warrant an explicit correlation adjustment?
2. **Multiplicative confidence** (A.4). The product form gives correct absorbing
   behaviour but compounds pessimistically across many weak factors. Is a
   noisy-or or a weighted geometric mean better behaved?
3. **The conservatism convention** (A.2). Using $E_h$ biases the engine against
   its own thesis. Is a deliberate one-sided bias preferable to reporting the
   interval and letting the reader choose?
4. **$\lambda$ and $\mu$** (A.4) are unfitted. With 84 labelled vacancies in
   Hamilton, is any calibration defensible, or does fitting on 84 points invite
   worse error than a stated prior?
5. **Interval arithmetic** (A.1) is used for employment but not propagated into
   confidence. Should $C$ itself be an interval?
6. **The 5 km ceiling** (A.8) is a judgement. Is a mode-specific ceiling — rail
   shorter, highway longer — better justified than one constant?
