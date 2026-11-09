# Authentic 3D Mini London: Interconnected Road Network, Thames Geography, Monument Orientation & Automatic Cycles

This plan details the complete architectural, geographical, and systems blueprint to transform the miniature globe into an authentic, bustling **3D Mini London**—featuring a continuous meandering River Thames, true-to-life relative monument positions and orientations, an interconnected road and bridge network with moving double-decker buses and black cabs, street-level monument views, an urban population (with all farm elements removed), an exact-duration automatic Day–Night hemisphere lighting cycle, and an automatic universal London weather cycle.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **No code has been modified in this step.** Review the complete spatial layout, road topology, monument orientation, and automatic cycle specifications below. Click **Proceed** (or reply with any adjustments) to give the green light to build.

- **Complete Removal of Rural / Farm Elements**: All sheep, wooden corral fences, beehives, windmills, campfires, and coastal lighthouses will be removed. The former pasture area becomes **St. James's Park & Hyde Park** with wrought-iron railings, paved tree-lined promenades, and ornamental fountains.
- **Exact-Interval Automatic Day–Night Cycle**: Daytime and Nighttime each run for an **exact, equal 30.0-second duration** (forming a regular **60.0-second 24-hour London GMT cycle**), with the Elizabeth Tower (Big Ben) clock hands and a live GMT clock synchronized to the sun and moon orbit.
- **True Sun/Moon Hemisphere Lighting**: The Sun and Moon orbit $180^\circ$ apart around the globe; the hemisphere facing the Sun receives crisp daylight while the opposite side rests in night/moonlight, with streetlamps, building windows, and bridge lights illuminating automatically as darkness sweeps over them.
- **Automatic Universal Weather State Machine**: London weather transitions automatically on a regular schedule across the entire city (`Sunny Interval` $\rightarrow$ `London Rain` $\rightarrow$ `Rainbow Clearing` $\rightarrow$ `Victorian Pea-Souper Fog` $\rightarrow$ `Winter Snow Flurry`), while keeping manual weather override buttons available when desired.

---

## 1. Overview & Core Concept

- **What It Does**: Recreates central London on an open-air 3D miniature globe where every major landmark is situated in its real-world geographical relationship along the **Great Bend of the River Thames** and linked by a continuous network of paved London streets, roundabouts, and bridges.
- **Target Experience**: A living, self-running tabletop diorama of London where double-decker Routemaster buses, black Hackney cabs, Thames clippers, and London pedestrians circulate through iconic thoroughfares (**The Mall**, **Whitehall**, **The Strand**, **Victoria Embankment**, **Westminster Bridge**, **Tower Bridge**), viewed from either a full-globe perspective or a **street-level road camera** looking up at the monuments.

---

## 2. Geography, Elevations & Spatial Orientation of Monuments

### A. River Thames S-Curve & Topographical Elevations
In real London, the River Thames enters from the southwest (Vauxhall/lambeth), curves sharply **northward past Westminster**, bends **eastward at Charing Cross / Victoria Embankment**, flows past **St. Paul's Cathedral & The Shard**, and passes beneath **Tower Bridge** toward Greenwich.

```
                      [ NORTH: PRIMROSE HILL & HAMPSTEAD HEATH ]
                            (High Green Ridges: r = 0.805)
                                          │
     [ WEST: HYDE PARK ]                  ▼                  [ NORTHEAST: THE CITY ]
   ┌──────────────────────┐     ┌───────────────────┐      ┌─────────────────────────┐
   │  Buckingham Palace   │     │ Trafalgar Square  │      │  St. Paul's Cathedral   │
   │ & Victoria Memorial  ├────►│ & Nelson's Column ├─────►│   (Atop Ludgate Hill)   │
   │  (Elev: r = 0.768)   │ The │  (Elev: r = 0.766)│ The  │    (Elev: r = 0.782)    │
   └──────────────────────┘ Mall└─────────┬─────────┘Strand└────────────┬────────────┘
                                          │ Whitehall                   │
                                          ▼                             ▼
                            ┌───────────────────────┐      ┌─────────────────────────┐
                            │ Big Ben & Parliament  │      │ The Gherkin & Tower of  │
                            │ (North-West Bank)     │      │ London (North-East Bank)│
                            └───────────┬───────────┘      └────────────┬────────────┘
   ═════════════════════════════════════╪═══════════════════════════════╪═════════════
     RIVER THAMES S-CURVE    [Westminster Bridge]               [Tower Bridge]
     (Water Level: r = 0.752)           │                               │
   ═════════════════════════════════════╪═══════════════════════════════╪═════════════
                            ┌───────────┴───────────┐      ┌────────────┴────────────┐
                            │    The London Eye     │      │        The Shard        │
                            │   (South Bank Pier)   ├─────►│  & London Bridge Plaza  │
                            └───────────────────────┘Queens└─────────────────────────┘
                                                      Walk
```

### B. Elevation Profile Across the Globe
1. **River Thames Channel (`r = 0.752`)**: Deep slate-teal tidal river carving a continuous S-bend across the central belt, bordered by **granite Victoria & Albert Embankment walls (`r = 0.760`)** so the water never floods the streets.
2. **Westminster, Whitehall & South Bank Terraces (`r = 0.764 – 0.768`)**: Flat, level Yorkstone-paved civic plateaus allowing clean road geometry and flush building foundations.
3. **Ludgate Hill & Cornhill (`r = 0.782`)**: A distinct elevated rise on the North Bank east of Fleet Street so **St. Paul's Cathedral** crowns the historic skyline just as it does in real London.
4. **Primrose Hill & Hampstead Heath (`r = 0.795 – 0.820`)**: Elevated northern green hills offering a natural backdrop behind Regent's Park and the West End.
5. **Greenwich Observatory Hill (`r = 0.784`)**: Southeastern parkland rise overlooking the lower Thames loop.

### C. Monument Architecture & Exact Spatial Orientation
Every landmark is recreated with multi-part procedural geometry matching our handcrafted miniature aesthetic and oriented to its true civic axis:

| Monument | Location on Globe | Architectural Details | Spatial Orientation |
| :--- | :--- | :--- | :--- |
| **Buckingham Palace & Victoria Memorial** | West-Central Inland (Anchoring the western end of The Mall) | Neoclassical Portland stone East Front, central crimson royal balcony, classical pediment, wrought-iron forecourt gates with gold royal crests, and the white marble **Victoria Memorial** with gilded Winged Victory statue in the front rotary. | **Faces East-Northeast** directly down the red-asphalt axis of **The Mall** toward Admiralty Arch and Trafalgar Square. |
| **Trafalgar Square & Nelson's Column** | Central North-Bank Hub (Intersection of The Mall, Whitehall & The Strand) | Fluted Corinthian column with Admiral Nelson statue, 4 Landseer bronze lions at the base, twin turquoise octagonal fountains, and the **National Gallery** neoclassical dome & portico along the north terrace. | **Faces South** down **Whitehall** toward Big Ben, with the National Gallery framing the northern backdrop. |
| **Big Ben & Palace of Westminster** | North-West Bank of the Thames Bend (Westminster) | Perpendicular Gothic Revival riverfront wing with golden stone tracery, corner Victoria Tower, and the 96m **Elizabeth Tower (Big Ben)** with 4 glowing opal clock dials, moving gold hands, cast-iron belfry, and Ayrton Light. | **Aligned parallel to the Thames embankment**, with Big Ben at the north end facing **Westminster Bridge** and **Whitehall**. |
| **The London Eye** | South Bank of the Thames (Directly across from Big Ben) | White tubular steel A-frame slanted over the river, Jubilee Gardens boarding pier, rotating spoked tension wheel, and 12 motorized glass passenger pods that stay level as the wheel turns. | **Faces West-Northwest across the Thames** directly toward Big Ben and the Houses of Parliament. |
| **St. Paul's Cathedral** | Perched on Ludgate Hill (Central-East North Bank) | Sir Christopher Wren's English Baroque masterpiece in pale Portland stone: cruciform nave, twin Baroque west bell towers, colonnaded Whispering Gallery drum, ribbed lead dome, golden lantern, and cross. | **West Front faces West** down **Fleet Street / The Strand** toward Trafalgar Square. |
| **The Shard** | South Bank near London Bridge (Opposite the City) | 72-story neo-futuristic pyramidal tower with angled crystalline blue-silver glass facets, spire fractures at the open top, and illuminated sky-lobby bands. | Anchors the **Eastern South Bank** alongside the southern approach to London Bridge and Tower Bridge. |
| **The Gherkin (30 St Mary Axe)** | City of London Financial District (Northeast of St. Paul's) | Iconic bullet-shaped cigar silhouette with interlocking diamond steel diagrid, dark spiraling atrium bands, and glass lens cap. | Rises in the **City financial cluster** north of the Tower of London. |
| **Tower Bridge & Tower of London** | Eastern Thames Gateway | **Tower Bridge**: Twin Victorian Gothic Pennant-stone towers with blue-and-white suspension chains, high-level walkways, and bascule road deck. **Tower of London**: Medieval Norman White Tower with 4 corner turrets and battlements on the north bank. | **Tower Bridge spans North-to-South** perpendicular to the Thames; **Tower of London** sits immediately at its northern landfall. |

---

## 3. Interconnected London Road & Bridge Network

### A. What the Roads Look Like
Instead of isolated stepping stones, London is connected by a **continuous spherical road graph** built from ribbon meshes conformed to the globe's curvature:
- **Carriageway Surface**: Charcoal-slate Tarmacadam (`#2f333b`) on standard streets, and **Royal Ceremonial Red Asphalt (`#9e3a34`)** exclusively on **The Mall** between Buckingham Palace and Trafalgar Square.
- **Pavements & Kerbs**: Raised pale **Yorkstone sidewalks (`#d6cbb9`)** flanking both sides of every road so pedestrians walk on sidewalks while vehicles stay on the carriageway.
- **Road Markings & Street Furniture**:
  - Dashed white centerline markings (`#f4f1ea`) and roundabout rings at **Victoria Memorial Circe**, **Trafalgar Square**, and **Parliament Square**.
  - **Zebra Crossings** (alternating black-and-white stripes with twin amber **Belisha Beacons**) at major monument entrances.
  - **K6 Red Telephone Boxes**, **Royal Mail Red Pillar Postboxes**, and **Victorian cast-iron gas streetlamps** placed systematically along the Yorkstone kerbs.

### B. Complete Interconnected Route Topology
```
  [Buckingham Palace Rotary]
              │
              ═══ (1) THE MALL (Ceremonial Red Asphalt + Plane Trees) ═══► [Trafalgar Square Roundabout]
              │                                                                   │               │
      (2) Birdcage Walk                                             (3) Whitehall │               │ (4) The Strand & Fleet St
              │                                                                   ▼               ▼
              └──────────────────────────────────────────────────────► [Parliament Square]   [St. Paul's / Ludgate Hill]
                                                                       (Big Ben & Abbey)          │
                                                                                  │               │ (5) Cannon St / Eastcheap
                                                                      (Westminster Bridge)        ▼
                                                                                  │          [City & Tower Hill]
                                                                                  ▼          (Gherkin & Tower of London)
                                                                       [London Eye Plaza]         │
                                                                                  │        (Tower Bridge)
                                                                                  │               │
                                                                                  ▼               ▼
                                                                       ═══ (6) SOUTH BANK / BOROUGH HIGH ST ═══
                                                                                 (Via The Shard)
```

### C. Moving Traffic & Urban Population
- **Red Routemaster Double-Decker Buses & Black London Hackney Cabs**: Follow the directed waypoints of the road graph continuously—driving down The Mall, circling Trafalgar Square, heading down Whitehall, crossing Westminster Bridge past the London Eye, continuing east past The Shard, and crossing Tower Bridge back to the City.
- **London Pedestrians & Royal Guards**:
  - **Londoners** (commuters with umbrellas/coats and tourists) walk along the Yorkstone sidewalks, cross at Zebra crossings, and gather at Trafalgar Square, the South Bank promenade, and St. Paul's steps.
  - **King's / Queen's Foot Guards** in scarlet tunics and tall bearskin caps march in formation along the forecourt of Buckingham Palace.

---

## 4. Camera Perspectives: Street-Level Road View & Monument Tours

To let you experience London from inside the streets as well as from above, the camera system will feature four tailored perspectives:
1. **Street-Level Road View (`street`)**: A low-angle camera gliding directly along the interconnected roads (`0.04` units above the pavement)—traveling down **The Mall** from Buckingham Palace, turning down **Whitehall** with **Big Ben** towering ahead, crossing **Westminster Bridge** beside the **London Eye**, and passing through the twin Gothic towers of **Tower Bridge**.
2. **Westminster & Royal View (`village`)**: Close-up architectural inspection of Big Ben, Parliament Square, Whitehall, and Trafalgar Square.
3. **Thames Panorama (`surface`)**: Skimming low over the River Thames water surface looking across at the bridges, The Shard, St. Paul's dome, and river clippers.
4. **Full London Globe (`orb`)**: Hero tabletop view of the entire open-air London globe resting on its walnut and brass pedestal.

---

## 5. Exact-Interval Automatic Day–Night Cycle & Automatic Weather

### A. Deterministic Day–Night Shift & Directional Hemisphere Lighting
- **Exact Regular Interval**:
  - Full 24-hour cycle = **60.0 seconds** (exact wall-clock delta progression).
  - **Daytime (`06:00 – 18:00`)**: Exact **30.0 seconds**.
  - **Nighttime (`18:00 – 06:00`)**: Exact **30.0 seconds**.
- **Synchronized Sun, Moon & Big Ben Clock**:
  - The Sun and Moon revolve continuously around the equatorial/ecliptic plane $180^\circ$ apart (`sunAngle = (timeOfDay - 0.25) * 2π`, `moonAngle = sunAngle + π`).
  - The 4 clock faces on **Big Ben (Elizabeth Tower)** and the HUD clock readout display the exact corresponding London time.
- **True Directional Hemisphere Illumination**:
  - `sunLight` tracks the 3D position of the Sun sphere and casts real shadows across the globe; facets and buildings on the **Sun-facing hemisphere** receive warm directional sunlight, while the **Moon-facing hemisphere** is lit by cool silver `moonLight`.
  - Building windows, K6 phone kiosks, Victorian streetlamps, London Eye capsules, Tower Bridge floodlights, and bus headlamps automatically illuminate based on local solar elevation and night progression.

### B. Automatic Universal Weather Pattern
- Weather runs automatically via a continuous London meteorological scheduler (advancing every **18 seconds** with smooth 3-second crossfades):
  1. **Crisp London Sunshine (`clear`)**: Blue-gold sky dome, sparkling Thames water, high-altitude cumulus puffs.
  2. **Classic London Rain (`rain`)**: Slate overcast sky, city-wide 3D falling rain streaks, wet reflective roads and terrain, and warm cozy window glow across all London buildings.
  3. **Thames Rainbow Clearing (`rainbow`)**: Rain parts as a full-arc rainbow spans across the River Thames between Westminster and St. Paul's.
  4. **Victorian Pea-Souper Fog (`fog`)**: Atmospheric amber-grey mist banks drifting along the Thames channel and wrapping around Tower Bridge and Big Ben.
  5. **Winter Snow Flurry (`snow`)**: Gentle city-wide snowfall dusting London's rooftops, parks, and Yorkstone squares in white.

---

## 6. Technical Architecture & System Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         3D MINI LONDON CONTROLLER & SCENE                         │
├───────────────────────────┬───────────────────────────┬───────────────────────────┤
│ 1. Geography & Roads      │ 2. Landmarks & Traffic    │ 3. Automatic Cycles       │
│ ───────────────────────── │ ───────────────────────── │ ───────────────────────── │
│ • River Thames S-Curve    │ • Buckingham Palace +     │ • 60s Exact Clock:        │
│   Channel (r = 0.752)     │   Victoria Memorial       │   - 30.0s Daytime         │
│ • Granite Embankments     │ • Trafalgar Sq & Nelson   │   - 30.0s Nighttime       │
│ • Ludgate Hill &          │ • Big Ben (Synced Hands)  │ • 180° Opposing Sun/Moon  │
│   Primrose Hill Elevations│ • London Eye (Rotating)   │   Hemisphere Lighting     │
│ • Continuous Road Splines:│ • St. Paul's Cathedral    │ • Auto Weather Scheduler: │
│   - The Mall (Red Asphalt)│ • The Shard & The Gherkin │   Clear ──► Rain ──►      │
│   - Whitehall & Strand    │ • Tower Bridge & Tower    │   Rainbow ──► Fog ──► Snow│
│   - Westminster & Tower   │ • Waypoint Traffic:       │ • Street-Level Camera     │
│     Bridges + Zebra       │   Red Buses, Black Cabs,  │   Spline Follower         │
│     Crossings             │   Londoners & Foot Guards │                           │
└───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

### Summary Checklist of What Will Be Built Upon Approval
1. **Sculpt the River Thames S-Bend & London Hills**: Carve the continuous river channel from Westminster to Tower Bridge with granite embankment walls, raise Ludgate Hill for St. Paul's and Primrose Hill in the north, and remove all farm/pasture terrain.
2. **Construct the Interconnected Road & Bridge Network**: Generate continuous 3D road splines (The Mall in royal red asphalt, Whitehall, The Strand, Victoria Embankment, South Bank, Westminster Bridge, Millennium/London Bridge, and Tower Bridge) with raised Yorkstone sidewalks, white lane dashes, and Zebra crossings.
3. **Orient & Upgrade All London Monuments**: Position Buckingham Palace (+ Victoria Memorial), Trafalgar Square (+ National Gallery & Nelson's Column), Big Ben & Parliament (with moving clock hands), The London Eye, St. Paul's Cathedral, The Shard, The Gherkin, and Tower Bridge + Tower of London in their exact relative geographic layout and facing axes.
4. **Replace Farm Life with Urban London Traffic & Population**: Remove all sheep, corral fences, beehives, windmills, and campfires; add waypoint-following **Red Double-Decker Buses**, **Black London Cabs**, **Royal Foot Guards**, and **London pedestrians** along the sidewalks.
5. **Add Street-Level Camera View**: Implement a road-following street-level camera mode that glides through London's streets and across its bridges looking up at the monuments.
6. **Implement Exact 30s Day / 30s Night Hemisphere Cycle & Auto Weather**: Lock the solar/lunar orbital clock to an exact, regular 30s day + 30s night interval with true sun-side daylight reflection and an automatic universal weather cycle.
