/* Application state for the Industrial Atlas: which layers exist, which are
   on, fetching them, and rendering the detail panel. Geographic rendering is
   map.js.

   Layers are fetched lazily, on first activation, rather than all at load.
   The generated data is ~16 MB across eight files and most sessions will
   never open all of them; loading rail and truck routes up front would cost
   every visitor 5 MB to look at employment land.

   Nothing here fabricates. A layer that fails to load says so on its own row
   and stays off — it never silently renders as empty, which would read as
   "there is no industry here". */
(function () {
  'use strict';

  /* The single source of truth for what the atlas shows. The toggle list, the
     map styling and the credits are all generated from this, so they cannot
     drift apart. `colour` is duplicated into CSS via the swatch variable. */
  var LAYERS = [
    {
      id: 'ham-employment',
      theme: 'WHAT IS ALLOWED',
      region: 'ONT',
      file: 'data/hamilton-employment-land.geojson',
      label: 'Employment lands',
      group: 'LAND & PLANNING',
      source: 'City of Hamilton',
      freshness: 'UPDATED ANNUALLY',
      colour: '#e8a33d',
      weight: 1.6,
      fillOpacity: 0.2,
      on: true,
    },
    {
      id: 'ham-zoning',
      theme: 'WHAT IS ALLOWED',
      region: 'ONT',
      file: 'data/hamilton-zoning-industrial.geojson',
      label: 'Industrial zoning',
      group: 'LAND & PLANNING',
      source: 'City of Hamilton',
      freshness: 'UPDATED ANNUALLY',
      colour: '#c98a2e',
      weight: 1,
      fillOpacity: 0.16,
      on: false,
    },
    {
      id: 'osm-land',
      theme: 'WHAT IS ALLOWED',
      region: 'BOTH',
      file: 'data/osm-land.geojson',
      label: 'Industrial land',
      group: 'LAND & PLANNING',
      source: 'OpenStreetMap',
      freshness: 'RECENT',
      colour: '#4fc3d9',
      weight: 1,
      fillOpacity: 0.14,
      on: true,
    },
    {
      id: 'osm-disused',
      theme: 'WHAT IS AVAILABLE',
      region: 'BOTH',
      file: 'data/osm-disused.geojson',
      label: 'Brownfield & recorded disused',
      group: 'LAND & PLANNING',
      source: 'OpenStreetMap',
      freshness: 'RECENT',
      colour: '#b18cf0',
      weight: 1.2,
      fillOpacity: 0.18,
      dash: '3 2',
      on: false,
    },
    {
      id: 'us-parcels',
      theme: 'WHAT IS HERE NOW',
      file: 'data/us-industrial-parcels.geojson',
      label: 'Industrial parcels',
      group: 'LAND & PLANNING',
      region: 'WNY',
      source: 'NYS GIS + Niagara Co.',
      freshness: 'UPDATED ANNUALLY',
      colour: '#e8a33d',
      weight: 1.4,
      fillOpacity: 0.22,
      on: true,
    },
    {
      id: 'us-brownfield',
      theme: 'WHAT IS AVAILABLE',
      file: 'data/us-brownfield.geojson',
      label: 'Brownfield opportunity areas',
      group: 'LAND & PLANNING',
      region: 'WNY',
      source: 'NYS Dept of State',
      freshness: 'HISTORICAL',
      colour: '#b18cf0',
      weight: 1.4,
      fillOpacity: 0.2,
      on: false,
    },
    {
      id: 'us-facilities',
      theme: 'WHAT IS HERE NOW',
      file: 'data/us-facilities.geojson',
      label: 'Regulated facilities',
      group: 'PLACES',
      region: 'WNY',
      source: 'NYS DEC',
      freshness: 'UPDATED ANNUALLY',
      colour: '#9ae66e',
      on: false,
    },
    {
      /* Derived, not observed: addresses that held an industrial occupier in
         2017/18/19 and hold nothing at all by 2022. The closest thing to an
         availability signal that exists in Ontario without MLS — but a
         departure is not a listing, and the popup says so. */
      id: 'nei-departures',
      theme: 'WHAT IS AVAILABLE',
      region: 'ONT',
      file: 'data/niagara-departures.geojson',
      label: 'Industry departed',
      group: 'PLACES',
      source: 'Niagara Region Employment Inventory',
      freshness: 'UPDATED ANNUALLY',
      colour: '#f2c14e',
      on: true,
    },
    {
      id: 'osm-places',
      theme: 'WHAT IS HERE NOW',
      region: 'BOTH',
      file: 'data/osm-places.geojson',
      label: 'Industrial places',
      group: 'PLACES',
      source: 'OpenStreetMap',
      freshness: 'RECENT',
      colour: '#7fe0f0',
      on: true,
    },
    {
      id: 'osm-rail',
      theme: 'HOW IT CONNECTS',
      region: 'BOTH',
      file: 'data/osm-rail.geojson',
      label: 'Rail network',
      group: 'INFRASTRUCTURE',
      source: 'OpenStreetMap',
      freshness: 'RECENT',
      colour: '#f05e5e',
      weight: 1.5,
      fillOpacity: 0,
      on: false,
    },
    {
      id: 'ham-rail',
      theme: 'HOW IT CONNECTS',
      region: 'ONT',
      file: 'data/hamilton-rail.geojson',
      label: 'Rail (Hamilton GIS)',
      group: 'INFRASTRUCTURE',
      source: 'City of Hamilton',
      freshness: 'UPDATED ANNUALLY',
      colour: '#f0956e',
      weight: 1.4,
      fillOpacity: 0,
      on: false,
    },
    {
      id: 'ham-truck',
      theme: 'HOW IT CONNECTS',
      region: 'ONT',
      file: 'data/hamilton-truck-routes.geojson',
      label: 'Truck routes',
      group: 'INFRASTRUCTURE',
      source: 'City of Hamilton',
      freshness: 'UPDATED ANNUALLY',
      colour: '#7d86a0',
      weight: 1.2,
      fillOpacity: 0,
      dash: '4 3',
      on: false,
    },
  ];

  /* The two sides of the map. OSM spans the border, so its layers are filed
     as BOTH and appear under either tab -- sharing one Leaflet layer and one
     checkbox state, because they genuinely are one dataset. Splitting them by
     longitude at ingestion would double the files to describe the same
     features. */
  var REGIONS = [
    {
      id: 'ONT', label: 'ONT',
      title: 'Ontario — Hamilton, Burlington, Niagara',
      bounds: [[42.80, -80.30], [43.55, -78.95]],
      /* Each side gets its own coverage note, because what is published --
         and what is therefore missing -- differs completely by country. A
         single generic caveat would understate both. */
      note: 'Hamilton publishes land, zoning and infrastructure but no business '
          + 'inventory. Niagara Region publishes 98,065 business records that '
          + 'are not loaded yet. Parcel data is not public in Ontario: MPAC '
          + 'charges for it. Outside Hamilton, everything here is '
          + 'OpenStreetMap.',
    },
    {
      id: 'WNY', label: 'WNY',
      title: 'Western New York — Erie and Niagara counties',
      bounds: [[42.40, -79.15], [43.40, -78.40]],
      note: 'New York publishes parcels free, so industrial sites here carry '
          + 'property class, floor area and assessment — detail the Ontario '
          + 'side cannot have. Parcels are Erie County only: Niagara County NY '
          + 'is not in the state dataset. Owner names are removed at '
          + 'ingestion.',
    },
  ];

  var activeRegion = 'ONT';

  /* The tab strip used to switch region. Region is a filter now, and the
     tabs do something the map could not do before: re-cut the same twelve
     layers three ways. Grouping by question is the default because it is
     the only one that tells a newcomer what the map is for; the other two
     answer "what kind of data is this" and "who publishes it", which are
     questions you only have once you know your way around. */
  var VIEWS = [
    { id: 'theme',  label: 'PURPOSE', key: function (s) { return s.theme || 'OTHER'; },
      title: 'Group layers by the question they help answer' },
    { id: 'group',  label: 'TYPE',    key: function (s) { return s.group; },
      title: 'Group layers by kind of data' },
    { id: 'source', label: 'SOURCE',  key: function (s) { return (s.source || 'Unknown').toUpperCase(); },
      title: 'Group layers by who publishes them' },
  ];

  var activeView = 'theme';
  var layerFilter = '';
  var rowFor = {};        /* spec.id -> the row node, built once and reused */
  var collapsed = {};     /* group name -> true when folded shut */

  var FRESH_CLASS = {
    'RECENT': 'fresh--recent',
    'UPDATED ANNUALLY': 'fresh--annual',
    'STATIC': 'fresh--static',
  };

  var loaded = {};    /* id -> { layer, meta } */
  var pending = 0;

  function byId(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function setBusy(delta) {
    pending += delta;
    byId('loading').hidden = pending <= 0;
  }

  /* --- detail panel ------------------------------------------------------- */

  function kvTable(obj, limit) {
    var table = el('table', 'kv');
    var count = 0;
    Object.keys(obj).forEach(function (key) {
      var value = obj[key];
      if (value === null || value === '' || value === undefined) return;
      if (limit && count >= limit) return;
      count++;
      var row = document.createElement('tr');
      row.appendChild(el('th', '', key));
      row.appendChild(el('td', '', String(value)));
      table.appendChild(row);
    });
    return count ? table : null;
  }

  function showDetail(feature, meta) {
    var panel = byId('detail');
    var props = feature.properties || {};
    while (panel.firstChild) panel.removeChild(panel.firstChild);

    panel.appendChild(el('h2', 'detail__title', props.name || 'Unnamed feature'));
    panel.appendChild(el('p', 'detail__kind',
      (props.layer || '') + (meta.dataset ? ' · ' + meta.dataset : '')));

    if (props.categories && props.categories.length) {
      panel.appendChild(el('h3', '', 'Classification'));
      var tags = el('div', 'tags');
      props.categories.forEach(function (c) { tags.appendChild(el('span', 'tag', c)); });
      panel.appendChild(tags);
    }

    /* Provenance is shown for every feature, always. It is the difference
       between an atlas and a picture (brief section 6). */
    var source = props.source || {};
    panel.appendChild(el('h3', '', 'Source'));
    var prov = el('div', 'provenance');
    prov.appendChild(el('p', '', source.name || meta.source || 'unknown'));
    if (source.dataset) prov.appendChild(el('p', '', source.dataset));
    if (source.source_modified) {
      prov.appendChild(el('p', '', 'Source updated ' + source.source_modified.slice(0, 10)));
    }
    if (source.retrieved_at) {
      prov.appendChild(el('p', '', 'Retrieved ' + source.retrieved_at));
    }
    if (props.freshness) {
      var badge = el('span', 'fresh ' + (FRESH_CLASS[props.freshness] || ''), props.freshness);
      var wrap = el('p', '');
      wrap.appendChild(badge);
      prov.appendChild(wrap);
    }
    if (source.license) prov.appendChild(el('p', '', source.license));
    if (source.url) {
      var link = el('a', '', 'View at source');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      var p = el('p', '');
      p.appendChild(link);
      prov.appendChild(p);
    }
    panel.appendChild(prov);

    /* Original attributes, verbatim. The normalization above is an
       interpretation; a user checking our work needs what the source said. */
    var raw = props.osm_tags || props.attributes;
    if (raw) {
      panel.appendChild(el('h3', '', 'Source attributes'));
      var table = kvTable(raw, 40);
      if (table) panel.appendChild(table);
    }
  }

  /* --- layers ------------------------------------------------------------- */

  function activate(spec, row) {
    if (loaded[spec.id]) {
      window.AtlasMap.add(loaded[spec.id].layer);
      return;
    }

    row.classList.add('is-loading');
    row.classList.remove('is-failed');
    setBusy(1);

    fetch(spec.file)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (collection) {
        var layer = window.AtlasMap.buildLayer(spec, collection, showDetail);
        loaded[spec.id] = { layer: layer, meta: collection.atlas || {} };
        row.classList.remove('is-loading');

        var count = (collection.atlas || {}).feature_count;
        if (count !== undefined) {
          var meta = row.querySelector('.layer__count');
          if (meta) meta.textContent = count.toLocaleString() + ' features';
        }

        /* Only draw if the box is still ticked — a slow layer that the user
           switched off mid-fetch must not reappear. */
        if (row.querySelector('input').checked) window.AtlasMap.add(layer);
      })
      .catch(function () {
        row.classList.remove('is-loading');
        row.classList.add('is-failed');
        row.querySelector('input').checked = false;
      })
      .then(function () { setBusy(-1); });
  }

  function inRegion(spec) {
    if (activeRegion === 'ALL') return true;
    return spec.region === 'BOTH' || spec.region === activeRegion;
  }

  function matchesFilter(spec) {
    if (!layerFilter) return true;
    var hay = [spec.label, spec.source, spec.group, spec.theme].join(' ').toLowerCase();
    return hay.indexOf(layerFilter) !== -1;
  }

  /* Rows are built once and shown or hidden by region rather than rebuilt on
     every tab switch -- rebuilding would drop the checkbox state and the
     feature counts already fetched. */
  /* Moves the map and swaps the coverage note. Which rows are shown is
     render()'s job now — this used to do both and the two responsibilities
     pulled in different directions once region became a filter. */
  function applyRegion(move) {
    var region = REGIONS.filter(function (x) { return x.id === activeRegion; })[0];
    var note = byId('region-note');
    if (note) {
      note.textContent = region ? region.note
        : 'Both sides at once. What is published differs completely by country, '
        + 'so a gap on one side is usually a publishing gap, not an empty map.';
    }
    /* focus() takes a Leaflet layer and reads its extent; a region is raw
       bounds, so it goes to the map directly. */
    if (move && region && window.AtlasMap.instance) {
      window.AtlasMap.instance.fitBounds(region.bounds, { padding: [20, 20] });
    }
  }

  /* The tab strip re-cuts the same layers three ways. */
  function buildTabs() {
    var strip = el('div', 'views');
    strip.setAttribute('role', 'tablist');
    VIEWS.forEach(function (view) {
      var tab = el('button', 'views__tab', view.label);
      tab.type = 'button';
      tab.title = view.title;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('data-view', view.id);
      tab.addEventListener('click', function () {
        activeView = view.id;
        render();
      });
      strip.appendChild(tab);
    });
    byId('layers').parentNode.insertBefore(strip, byId('layers'));
  }

  /* Region is a filter now, not a mode. ALL is offered and is the point of
     the atlas: the argument is that the region crosses the border. */
  function buildControls() {
    var wrap = el('div', 'controls');

    var search = document.createElement('input');
    search.type = 'search';
    search.className = 'controls__search';
    search.placeholder = 'Filter layers';
    search.setAttribute('aria-label', 'Filter layers');
    search.addEventListener('input', function () {
      layerFilter = search.value.trim().toLowerCase();
      render();
    });
    wrap.appendChild(search);

    var chips = el('div', 'chips');
    [{ id: 'ONT', label: 'ONT' },
     { id: 'WNY', label: 'WNY' },
     { id: 'ALL', label: 'Both sides' }].forEach(function (option) {
      var chip = el('button', 'chips__chip', option.label);
      chip.type = 'button';
      chip.setAttribute('data-region', option.id);
      chip.addEventListener('click', function () {
        activeRegion = option.id;
        applyRegion(true);
        render();
      });
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);

    byId('layers').parentNode.insertBefore(wrap, byId('layers'));
  }

  /* Rows are built ONCE and moved between groups on every re-render.
     Rebuilding them would drop the checkbox state and the feature counts
     already fetched, and would re-trigger every active layer's download. */
  function buildRow(spec) {
    var row = el('label', 'layer');
    row.style.setProperty('--swatch', spec.colour);
    row.setAttribute('data-region', spec.region || 'BOTH');
    row.setAttribute('data-layer', spec.id);

    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!spec.on;
    row.appendChild(box);

    var body = el('div', '');
    body.appendChild(el('span', 'layer__name', spec.label));

    var meta = el('span', 'layer__meta');
    meta.appendChild(el('span', 'layer__count', spec.source));
    meta.appendChild(document.createTextNode(' \u00b7 '));
    meta.appendChild(el('span', 'fresh ' + (FRESH_CLASS[spec.freshness] || ''),
                        spec.freshness));
    if (spec.region === 'BOTH') {
      meta.appendChild(document.createTextNode(' \u00b7 '));
      meta.appendChild(el('span', 'layer__both', 'both sides'));
    }
    body.appendChild(meta);
    row.appendChild(body);

    box.addEventListener('change', function () {
      if (box.checked) {
        activate(spec, row);
      } else if (loaded[spec.id]) {
        window.AtlasMap.remove(loaded[spec.id].layer);
      }
    });

    return row;
  }

  function render() {
    var container = byId('layers');
    var view = VIEWS.filter(function (v) { return v.id === activeView; })[0];

    var visible = LAYERS.filter(function (spec) {
      return inRegion(spec) && matchesFilter(spec);
    });

    /* Detach rather than clear: the nodes are reused, so innerHTML = '' on a
       container holding them would destroy state we depend on. */
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!visible.length) {
      container.appendChild(el('p', 'layers__empty', 'No layers match.'));
      return;
    }

    var order = [];
    visible.forEach(function (spec) {
      var key = view.key(spec);
      if (order.indexOf(key) === -1) order.push(key);
    });

    order.forEach(function (key) {
      var members = visible.filter(function (s) { return view.key(s) === key; });
      var live = members.filter(function (s) {
        var row = rowFor[s.id];
        return row && row.querySelector('input').checked;
      }).length;

      var head = el('button', 'layers__group', '');
      head.type = 'button';
      head.setAttribute('aria-expanded', String(!collapsed[key]));
      head.appendChild(el('span', 'layers__group-name', key));
      head.appendChild(el('span', 'layers__group-count',
                          live ? live + '/' + members.length : String(members.length)));
      head.addEventListener('click', function () {
        collapsed[key] = !collapsed[key];
        render();
      });
      container.appendChild(head);

      if (collapsed[key]) return;
      members.forEach(function (spec) {
        container.appendChild(rowFor[spec.id]);
      });
    });

    var tabs = document.querySelectorAll('.views__tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('aria-selected',
        String(tabs[i].getAttribute('data-view') === activeView));
    }
    var chips = document.querySelectorAll('.chips__chip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].setAttribute('aria-pressed',
        String(chips[j].getAttribute('data-region') === activeRegion));
    }
  }

  function buildSwitches() {
    LAYERS.forEach(function (spec) { rowFor[spec.id] = buildRow(spec); });
    render();
    /* Activation happens after the rows exist, so a layer that starts on has
       a row to report its count into. */
    LAYERS.forEach(function (spec) {
      if (spec.on) activate(spec, rowFor[spec.id]);
    });
  }

  /* Attribution for every source that can appear, listed whether or not its
     layer happens to be switched on. Both licences require it, and ODbL
     additionally carries share-alike on anything derived from OSM. */
  function buildCredits() {
    var credits = byId('credits');
    credits.appendChild(el('p', '',
      'Industrial data: OpenStreetMap contributors (ODbL 1.0); '
      + 'City of Hamilton Open Data Licence.'));
    credits.appendChild(el('p', '',
      'Coverage: Hamilton, Burlington and the Niagara Peninsula. '
      + 'Sources and retrieval dates are shown per feature.'));
  }

  function init() {
    if (typeof L === 'undefined') {
      byId('loading').hidden = false;
      byId('loading').textContent = 'Map library failed to load';
      return;
    }
    window.AtlasMap.init('map');
    window.AtlasMap.instance.on('click', function () {
      var panel = byId('detail');
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      panel.appendChild(el('p', 'detail__empty',
        'Select anything on the map to see what it is and where the '
        + 'information came from.'));
    });
    buildTabs();
    buildControls();
    buildSwitches();
    applyRegion(false);
    buildCredits();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
