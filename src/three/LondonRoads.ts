import * as THREE from 'three';

export interface SurfaceInfo {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
}

const UP_VEC = new THREE.Vector3(0, 1, 0);

export type RoadNodeId =
  | 'palace'
  | 'trafalgar'
  | 'parliament'
  | 'eye'
  | 'embankment_mid'
  | 'stpauls'
  | 'city_bank'
  | 'shard'
  | 'gherkin'
  | 'tower_north'
  | 'tower_south'
  | 'kensington'
  | 'notting_hill'
  | 'paddington'
  | 'regents'
  | 'camden'
  | 'hampstead'
  | 'islington'
  | 'shoreditch'
  | 'stratford'
  | 'canary_wharf'
  | 'greenwich'
  | 'dulwich'
  | 'brixton'
  | 'battersea'
  | 'chelsea'
  | 'richmond'
  | 'kew_gardens'
  | 'wimbledon';

export interface RoadSegmentSpec {
  id: string;
  name: string;
  from: RoadNodeId;
  to: RoadNodeId;
  controlPoints?: THREE.Vector3[];
  isRoyalMall?: boolean;
  isBridge?: boolean;
  width?: number;
  hasZebraAtStart?: boolean;
  hasZebraAtEnd?: boolean;
}

// 29 Interconnected London Borough & Monument Hubs spanning all 360° of the globe
// Every land hub is positioned well clear of the River Thames channel (y ~ -0.18..0.01)
export const ROAD_NODES: Record<RoadNodeId, THREE.Vector3> = {
  // Central & Royal London (North Bank)
  palace: new THREE.Vector3(-0.38, 0.14, 0.914).normalize(),
  trafalgar: new THREE.Vector3(-0.10, 0.20, 0.975).normalize(),
  parliament: new THREE.Vector3(-0.04, 0.07, 0.996).normalize(),
  embankment_mid: new THREE.Vector3(0.18, 0.11, 0.977).normalize(),
  stpauls: new THREE.Vector3(0.26, 0.23, 0.937).normalize(),
  city_bank: new THREE.Vector3(0.38, 0.11, 0.918).normalize(),
  gherkin: new THREE.Vector3(0.48, 0.24, 0.844).normalize(),
  tower_north: new THREE.Vector3(0.58, 0.11, 0.807).normalize(),

  // Central South Bank
  eye: new THREE.Vector3(0.10, -0.15, 0.984).normalize(),
  shard: new THREE.Vector3(0.38, -0.16, 0.911).normalize(),
  tower_south: new THREE.Vector3(0.62, -0.18, 0.764).normalize(),

  // West & Northwest London (North of River)
  kensington: new THREE.Vector3(-0.68, 0.18, 0.71).normalize(),
  notting_hill: new THREE.Vector3(-0.82, 0.34, 0.46).normalize(),
  paddington: new THREE.Vector3(-0.54, 0.46, 0.70).normalize(),
  regents: new THREE.Vector3(-0.26, 0.56, 0.785).normalize(),
  camden: new THREE.Vector3(0.10, 0.62, 0.778).normalize(),
  hampstead: new THREE.Vector3(-0.04, 0.82, 0.57).normalize(),

  // North, East & Docklands (North of River)
  islington: new THREE.Vector3(0.42, 0.50, 0.757).normalize(),
  shoreditch: new THREE.Vector3(0.68, 0.34, 0.649).normalize(),
  canary_wharf: new THREE.Vector3(0.88, 0.12, 0.46).normalize(),
  stratford: new THREE.Vector3(0.82, 0.38, -0.43).normalize(),

  // Back Hemisphere North/West (Kew & Chiswick)
  kew_gardens: new THREE.Vector3(-0.82, 0.14, -0.55).normalize(),

  // South, Southeast & Back Hemisphere South (South of River)
  greenwich: new THREE.Vector3(0.76, -0.26, 0.59).normalize(),
  dulwich: new THREE.Vector3(0.52, -0.52, -0.68).normalize(),
  brixton: new THREE.Vector3(0.12, -0.48, 0.869).normalize(),
  battersea: new THREE.Vector3(-0.24, -0.34, 0.909).normalize(),
  chelsea: new THREE.Vector3(-0.56, -0.34, 0.754).normalize(),
  richmond: new THREE.Vector3(-0.64, -0.34, -0.69).normalize(),
  wimbledon: new THREE.Vector3(-0.12, -0.62, -0.775).normalize(),
};

export const ROAD_SEGMENTS: RoadSegmentSpec[] = [
  // --- Central Westminster, The Mall & City of London ---
  {
    id: 'the_mall',
    name: 'The Mall (Ceremonial Royal Avenue)',
    from: 'palace',
    to: 'trafalgar',
    isRoyalMall: true,
    width: 0.022,
    hasZebraAtStart: true,
    hasZebraAtEnd: true,
  },
  {
    id: 'whitehall',
    name: 'Whitehall',
    from: 'trafalgar',
    to: 'parliament',
    width: 0.02,
    hasZebraAtStart: true,
    hasZebraAtEnd: true,
  },
  {
    id: 'birdcage_walk',
    name: 'Birdcage Walk',
    from: 'palace',
    to: 'parliament',
    controlPoints: [new THREE.Vector3(-0.22, 0.08, 0.972).normalize()],
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'strand_fleet',
    name: 'The Strand & Fleet Street',
    from: 'trafalgar',
    to: 'stpauls',
    controlPoints: [new THREE.Vector3(0.08, 0.22, 0.972).normalize()],
    width: 0.019,
    hasZebraAtEnd: true,
  },
  {
    id: 'victoria_embankment_west',
    name: 'Victoria Embankment',
    from: 'parliament',
    to: 'embankment_mid',
    controlPoints: [new THREE.Vector3(0.08, 0.09, 0.992).normalize()],
    width: 0.018,
  },
  {
    id: 'victoria_embankment_east',
    name: 'Victoria Embankment & Queen Victoria St',
    from: 'embankment_mid',
    to: 'city_bank',
    controlPoints: [new THREE.Vector3(0.28, 0.11, 0.953).normalize()],
    width: 0.018,
  },
  {
    id: 'ludgate_link',
    name: 'New Bridge Street',
    from: 'stpauls',
    to: 'city_bank',
    width: 0.017,
    hasZebraAtStart: true,
  },
  {
    id: 'cannon_street',
    name: 'Cannon Street & Cornhill',
    from: 'stpauls',
    to: 'gherkin',
    controlPoints: [new THREE.Vector3(0.37, 0.25, 0.894).normalize()],
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'bishopsgate_tower',
    name: 'Minories & Tower Hill',
    from: 'gherkin',
    to: 'tower_north',
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'lower_thames_street',
    name: 'Lower Thames Street',
    from: 'city_bank',
    to: 'tower_north',
    controlPoints: [new THREE.Vector3(0.48, 0.11, 0.87).normalize()],
    width: 0.018,
  },

  // --- River Thames Bridges ---
  {
    id: 'westminster_bridge',
    name: 'Westminster Bridge',
    from: 'parliament',
    to: 'eye',
    controlPoints: [new THREE.Vector3(0.03, -0.04, 0.999).normalize()],
    isBridge: true,
    width: 0.02,
    hasZebraAtStart: true,
    hasZebraAtEnd: true,
  },
  {
    id: 'london_bridge',
    name: 'London Bridge Crossing',
    from: 'city_bank',
    to: 'shard',
    controlPoints: [new THREE.Vector3(0.39, -0.02, 0.921).normalize()],
    isBridge: true,
    width: 0.018,
  },
  {
    id: 'tower_bridge_road',
    name: 'Tower Bridge Crossing',
    from: 'tower_north',
    to: 'tower_south',
    controlPoints: [new THREE.Vector3(0.60, -0.03, 0.799).normalize()],
    isBridge: true,
    width: 0.019,
  },
  {
    id: 'chelsea_bridge',
    name: 'Chelsea Suspension Bridge',
    from: 'kensington',
    to: 'chelsea',
    controlPoints: [new THREE.Vector3(-0.64, -0.10, 0.76).normalize()],
    isBridge: true,
    width: 0.017,
  },
  {
    id: 'greenwich_crossing',
    name: 'Docklands & Greenwich Crossing',
    from: 'canary_wharf',
    to: 'greenwich',
    controlPoints: [new THREE.Vector3(0.84, -0.08, 0.53).normalize()],
    isBridge: true,
    width: 0.017,
  },
  {
    id: 'kew_bridge',
    name: 'Kew King Edward VII Bridge',
    from: 'kew_gardens',
    to: 'richmond',
    controlPoints: [new THREE.Vector3(-0.76, -0.10, -0.64).normalize()],
    isBridge: true,
    width: 0.017,
  },

  // --- South Bank, Battersea, Brixton, Greenwich & South London ---
  {
    id: 'south_bank_walk',
    name: 'South Bank & Stamford Street',
    from: 'eye',
    to: 'shard',
    controlPoints: [new THREE.Vector3(0.24, -0.16, 0.96).normalize()],
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'tooley_street',
    name: 'Tooley Street (Southwark)',
    from: 'shard',
    to: 'tower_south',
    controlPoints: [new THREE.Vector3(0.50, -0.17, 0.85).normalize()],
    width: 0.018,
  },
  {
    id: 'greenwich_highway',
    name: 'Jamaica Road & Greenwich Approach',
    from: 'tower_south',
    to: 'greenwich',
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'albert_embankment',
    name: 'Albert Embankment & Nine Elms',
    from: 'eye',
    to: 'battersea',
    controlPoints: [new THREE.Vector3(-0.08, -0.25, 0.965).normalize()],
    width: 0.017,
  },
  {
    id: 'battersea_park_road',
    name: 'Battersea Park Road',
    from: 'battersea',
    to: 'chelsea',
    width: 0.017,
  },
  {
    id: 'kennington_road',
    name: 'Kennington Road & Brixton Hill',
    from: 'eye',
    to: 'brixton',
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'borough_brixton',
    name: 'Borough High Street & Walworth Road',
    from: 'shard',
    to: 'brixton',
    width: 0.017,
  },
  {
    id: 'clapham_road',
    name: 'Clapham Common Boulevard',
    from: 'battersea',
    to: 'brixton',
    width: 0.016,
  },

  // --- West, Northwest & North London ---
  {
    id: 'knightsbridge_road',
    name: 'Constitution Hill & Knightsbridge',
    from: 'palace',
    to: 'kensington',
    controlPoints: [new THREE.Vector3(-0.54, 0.16, 0.826).normalize()],
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'kensington_church_st',
    name: 'Kensington Church Street',
    from: 'kensington',
    to: 'notting_hill',
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'bayswater_road',
    name: 'Bayswater Road',
    from: 'notting_hill',
    to: 'paddington',
    width: 0.017,
  },
  {
    id: 'park_lane',
    name: 'Park Lane (Mayfair)',
    from: 'kensington',
    to: 'paddington',
    width: 0.017,
  },
  {
    id: 'marylebone_road',
    name: 'Marylebone Road',
    from: 'paddington',
    to: 'regents',
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'regent_street',
    name: 'Regent Street & Portland Place',
    from: 'trafalgar',
    to: 'regents',
    controlPoints: [new THREE.Vector3(-0.18, 0.38, 0.907).normalize()],
    width: 0.018,
  },
  {
    id: 'parkway_camden',
    name: 'Albany Street & Parkway',
    from: 'regents',
    to: 'camden',
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'hampstead_heath_way',
    name: 'Haverstock Hill (Hampstead)',
    from: 'camden',
    to: 'hampstead',
    width: 0.016,
  },
  {
    id: 'finchley_road',
    name: 'Finchley Road & Abbey Road',
    from: 'paddington',
    to: 'hampstead',
    controlPoints: [new THREE.Vector3(-0.34, 0.72, 0.60).normalize()],
    width: 0.016,
  },

  // --- Islington, Shoreditch, Canary Wharf & East London ---
  {
    id: 'pentonville_road',
    name: "Euston & Pentonville Road (King's Cross)",
    from: 'camden',
    to: 'islington',
    width: 0.017,
  },
  {
    id: 'goswell_road',
    name: 'Aldersgate & Goswell Road',
    from: 'stpauls',
    to: 'islington',
    width: 0.017,
  },
  {
    id: 'city_road',
    name: 'City Road & Old Street',
    from: 'islington',
    to: 'shoreditch',
    width: 0.017,
    hasZebraAtEnd: true,
  },
  {
    id: 'bishopsgate_north',
    name: 'Bishopsgate & Shoreditch High St',
    from: 'gherkin',
    to: 'shoreditch',
    width: 0.018,
  },
  {
    id: 'commercial_road',
    name: 'Commercial Road (Docklands)',
    from: 'tower_north',
    to: 'canary_wharf',
    width: 0.018,
    hasZebraAtEnd: true,
  },
  {
    id: 'mile_end_road',
    name: 'Whitechapel & Mile End Road',
    from: 'shoreditch',
    to: 'canary_wharf',
    width: 0.017,
  },

  // --- Back Hemisphere 360° Connections (Stratford, Kew, Richmond, Wimbledon, Dulwich) ---
  {
    id: 'hackney_stratford',
    name: 'Hackney Road & Olympic Way',
    from: 'shoreditch',
    to: 'stratford',
    controlPoints: [new THREE.Vector3(0.84, 0.42, 0.14).normalize()],
    width: 0.017,
  },
  {
    id: 'docklands_stratford',
    name: 'Lea Valley Highway',
    from: 'canary_wharf',
    to: 'stratford',
    controlPoints: [new THREE.Vector3(0.92, 0.25, 0.02).normalize()],
    width: 0.017,
  },
  {
    id: 'north_orbital_west',
    name: 'North Circular & Highgate Ridge',
    from: 'hampstead',
    to: 'stratford',
    controlPoints: [new THREE.Vector3(0.46, 0.72, -0.52).normalize()],
    width: 0.016,
  },
  {
    id: 'western_avenue',
    name: 'Holland Park & Chiswick High Road',
    from: 'notting_hill',
    to: 'kew_gardens',
    controlPoints: [new THREE.Vector3(-0.92, 0.24, -0.05).normalize()],
    width: 0.017,
  },
  {
    id: 'north_circular_kew',
    name: 'Hampstead to Kew Botanical Avenue',
    from: 'hampstead',
    to: 'kew_gardens',
    controlPoints: [new THREE.Vector3(-0.56, 0.62, -0.55).normalize()],
    width: 0.016,
  },
  {
    id: 'putney_richmond_road',
    name: 'Fulham & Upper Richmond Road',
    from: 'chelsea',
    to: 'richmond',
    controlPoints: [new THREE.Vector3(-0.78, -0.36, 0.05).normalize()],
    width: 0.017,
  },
  {
    id: 'richmond_wimbledon',
    name: 'Kingston Vale & Wimbledon Parkside',
    from: 'richmond',
    to: 'wimbledon',
    width: 0.017,
  },
  {
    id: 'wimbledon_brixton',
    name: 'Tooting Bec & Streatham High Road',
    from: 'wimbledon',
    to: 'brixton',
    controlPoints: [new THREE.Vector3(-0.02, -0.68, 0.12).normalize()],
    width: 0.017,
  },
  {
    id: 'wimbledon_dulwich',
    name: 'Crystal Palace Parade & Dulwich Wood',
    from: 'wimbledon',
    to: 'dulwich',
    width: 0.016,
  },
  {
    id: 'dulwich_greenwich',
    name: 'Blackheath Avenue & Royal Park Way',
    from: 'dulwich',
    to: 'greenwich',
    controlPoints: [new THREE.Vector3(0.76, -0.44, -0.05).normalize()],
    width: 0.017,
  },
  {
    id: 'brixton_dulwich',
    name: 'Herne Hill & Dulwich Village Way',
    from: 'brixton',
    to: 'dulwich',
    controlPoints: [new THREE.Vector3(0.38, -0.58, 0.15).normalize()],
    width: 0.016,
  },
];

// Ordered 360° grand tour of nodes for the Street-Level Camera tour
export const STREET_TOUR_NODE_SEQUENCE: RoadNodeId[] = [
  'palace',
  'trafalgar',
  'parliament',
  'eye',
  'shard',
  'tower_south',
  'tower_north',
  'gherkin',
  'stpauls',
  'islington',
  'shoreditch',
  'canary_wharf',
  'greenwich',
  'dulwich',
  'wimbledon',
  'richmond',
  'kew_gardens',
  'notting_hill',
  'kensington',
  'palace',
];

export function sampleRoadSegmentPoint(
  seg: RoadSegmentSpec,
  t: number,
  getSurfacePointAndNormal: (dir: THREE.Vector3) => SurfaceInfo,
  seaLevel: number,
): {
  dir: THREE.Vector3;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
} {
  const p0 = ROAD_NODES[seg.from];
  const pEnd = ROAD_NODES[seg.to];
  const pts = [p0, ...(seg.controlPoints || []), pEnd];

  let rawDir: THREE.Vector3;
  let nextRawDir: THREE.Vector3;
  const eps = 0.01;
  const tClamped = THREE.MathUtils.clamp(t, 0, 1);
  const tNext = THREE.MathUtils.clamp(t + eps, 0, 1);

  const evalPolyline = (u: number): THREE.Vector3 => {
    if (pts.length === 2) {
      return pts[0].clone().lerp(pts[1], u).normalize();
    }
    const inv = 1 - u;
    return new THREE.Vector3()
      .addScaledVector(pts[0], inv * inv)
      .addScaledVector(pts[1], 2 * inv * u)
      .addScaledVector(pts[2], u * u)
      .normalize();
  };

  rawDir = evalPolyline(tClamped);
  nextRawDir =
    tClamped < 1 - eps
      ? evalPolyline(tNext)
      : evalPolyline(Math.max(0, tClamped - eps));

  const surf = getSurfacePointAndNormal(rawDir);
  let radius = Math.max(surf.radius, seaLevel + 0.004) + 0.0022;

  if (seg.isBridge) {
    // Smooth bridge deck camber over the River Thames
    const archBell = Math.sin(tClamped * Math.PI);
    const bridgeDeckRadius = seaLevel + 0.018 + archBell * 0.009;
    radius = Math.max(radius, bridgeDeckRadius);
  }

  const normal = rawDir.clone();
  const point = normal.clone().multiplyScalar(radius);

  const tangent =
    tClamped < 1 - eps
      ? nextRawDir.clone().sub(rawDir)
      : rawDir.clone().sub(nextRawDir);
  tangent.projectOnPlane(normal).normalize();

  return { dir: rawDir, point, normal, tangent };
}

export function findRoadSegmentBetween(
  a: RoadNodeId,
  b: RoadNodeId,
): { seg: RoadSegmentSpec; reversed: boolean } | null {
  for (const seg of ROAD_SEGMENTS) {
    if (seg.from === a && seg.to === b) return { seg, reversed: false };
    if (seg.from === b && seg.to === a) return { seg, reversed: true };
  }
  return null;
}

export function getConnectedRoadNodes(node: RoadNodeId): RoadNodeId[] {
  const neighbors: RoadNodeId[] = [];
  for (const seg of ROAD_SEGMENTS) {
    if (seg.from === node) neighbors.push(seg.to);
    else if (seg.to === node) neighbors.push(seg.from);
  }
  return neighbors;
}

export function getClosestRoadPoint(
  dir: THREE.Vector3,
  getSurfacePointAndNormal: (dir: THREE.Vector3) => SurfaceInfo,
  seaLevel: number,
): {
  minDist: number;
  closestDir: THREE.Vector3;
  tangent: THREE.Vector3;
  roadHalfWidth: number;
  isBridge: boolean;
} {
  let minDist = Infinity;
  let closestDir = dir.clone();
  let bestTangent = new THREE.Vector3(0, 0, 1);
  let bestHalfWidth = 0.012;
  let bestIsBridge = false;

  for (const seg of ROAD_SEGMENTS) {
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sample = sampleRoadSegmentPoint(
        seg,
        t,
        getSurfacePointAndNormal,
        seaLevel,
      );
      const d = sample.dir.distanceTo(dir);
      if (d < minDist) {
        minDist = d;
        closestDir = sample.dir;
        bestTangent = sample.tangent;
        bestHalfWidth = (seg.width || 0.018) * 0.5 + 0.0035;
        bestIsBridge = Boolean(seg.isBridge);
      }
    }
  }

  return {
    minDist,
    closestDir,
    tangent: bestTangent,
    roadHalfWidth: bestHalfWidth,
    isBridge: bestIsBridge,
  };
}

export function createLondonRoadNetwork(
  getSurfacePointAndNormal: (dir: THREE.Vector3) => SurfaceInfo,
  seaLevel: number,
): {
  group: THREE.Group;
  beaconMaterials: THREE.MeshStandardMaterial[];
  rebuildGeometry: () => void;
} {
  const group = new THREE.Group();
  const beaconMaterials: THREE.MeshStandardMaterial[] = [];

  const charcoalAsphaltMat = new THREE.MeshStandardMaterial({
    color: '#2e323b',
    roughness: 0.88,
    metalness: 0.05,
  });
  const royalMallRedMat = new THREE.MeshStandardMaterial({
    color: '#a63a33',
    roughness: 0.78,
    metalness: 0.05,
  });
  const yorkstoneKerbMat = new THREE.MeshStandardMaterial({
    color: '#d8cfc0',
    roughness: 0.82,
  });
  const laneMarkingMat = new THREE.MeshStandardMaterial({
    color: '#f5f2e9',
    roughness: 0.65,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#eab949',
    metalness: 0.75,
    roughness: 0.25,
  });
  const belishaBeaconMat = new THREE.MeshStandardMaterial({
    color: '#ffbe2e',
    emissive: new THREE.Color('#ff9900'),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  beaconMaterials.push(belishaBeaconMat);

  const buildRibbonGeometry = (
    seg: RoadSegmentSpec,
    halfWidth: number,
    lateralOffset: number,
    heightOffset: number,
    steps = 44,
  ): THREE.BufferGeometry => {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sample = sampleRoadSegmentPoint(
        seg,
        t,
        getSurfacePointAndNormal,
        seaLevel,
      );
      const right = new THREE.Vector3()
        .crossVectors(sample.tangent, sample.normal)
        .normalize();

      // Overlap slightly into the start/end hub disks so roads are 100% continuous
      const endExtend =
        i === 0 ? -0.004 : i === steps ? 0.004 : 0;

      const centerPt = sample.point
        .clone()
        .addScaledVector(sample.tangent, endExtend)
        .addScaledVector(right, lateralOffset)
        .addScaledVector(sample.normal, heightOffset);

      const leftPt = centerPt.clone().addScaledVector(right, -halfWidth);
      const rightPt = centerPt.clone().addScaledVector(right, halfWidth);

      positions.push(leftPt.x, leftPt.y, leftPt.z);
      positions.push(rightPt.x, rightPt.y, rightPt.z);

      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);
      normals.push(sample.normal.x, sample.normal.y, sample.normal.z);

      if (i < steps) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  };

  const addZebraCrossing = (
    parent: THREE.Group,
    seg: RoadSegmentSpec,
    tPos: number,
    roadWidth: number,
  ) => {
    const sample = sampleRoadSegmentPoint(
      seg,
      tPos,
      getSurfacePointAndNormal,
      seaLevel,
    );
    const right = new THREE.Vector3()
      .crossVectors(sample.tangent, sample.normal)
      .normalize();

    const crossingGroup = new THREE.Group();
    crossingGroup.position.copy(sample.point).addScaledVector(sample.normal, 0.0009);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      sample.normal,
    );
    const localForward = sample.tangent
      .clone()
      .applyQuaternion(alignQuat.clone().invert());
    const yaw = Math.atan2(localForward.x, localForward.z);
    crossingGroup.quaternion
      .copy(alignQuat)
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw));

    const stripeCount = 5;
    const usableWidth = roadWidth * 0.78;
    for (let s = 0; s < stripeCount; s++) {
      const u = (s / (stripeCount - 1) - 0.5) * usableWidth;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.0018, 0.0006, 0.0052),
        laneMarkingMat,
      );
      stripe.position.set(u, 0.0003, 0);
      crossingGroup.add(stripe);
    }

    for (const side of [-1, 1]) {
      const bx = side * (roadWidth * 0.5 + 0.0028);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0005, 0.0006, 0.009, 6),
        charcoalAsphaltMat,
      );
      pole.position.set(bx, 0.0045, 0);
      crossingGroup.add(pole);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.0015, 8, 8),
        belishaBeaconMat,
      );
      globe.position.set(bx, 0.0095, 0);
      crossingGroup.add(globe);
    }

    void right;
    parent.add(crossingGroup);
  };

  const rebuildGeometry = () => {
    while (group.children.length > 0) {
      const child = group.children.pop()!;
      group.remove(child);
    }

    // 1. Build all Road Segments (Asphalt Carriageway + Left/Right Yorkstone Sidewalks + Center Dashes)
    for (const seg of ROAD_SEGMENTS) {
      const roadWidth = seg.width || 0.018;
      const halfW = roadWidth * 0.5;
      const sidewalkW = 0.0032;

      const roadGeo = buildRibbonGeometry(seg, halfW, 0, 0.0006, 44);
      const roadMesh = new THREE.Mesh(
        roadGeo,
        seg.isRoyalMall ? royalMallRedMat : charcoalAsphaltMat,
      );
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      for (const side of [-1, 1]) {
        const kerbOffset = side * (halfW + sidewalkW * 0.5);
        const kerbGeo = buildRibbonGeometry(
          seg,
          sidewalkW * 0.5,
          kerbOffset,
          0.0013,
          36,
        );
        const kerbMesh = new THREE.Mesh(kerbGeo, yorkstoneKerbMat);
        kerbMesh.receiveShadow = true;
        group.add(kerbMesh);
      }

      const dashCount = 11;
      for (let d = 1; d < dashCount; d += 2) {
        const tMid = (d + 0.5) / dashCount;
        const sample = sampleRoadSegmentPoint(
          seg,
          tMid,
          getSurfacePointAndNormal,
          seaLevel,
        );
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.001, 0.0005, 0.0065),
          laneMarkingMat,
        );
        dash.position
          .copy(sample.point)
          .addScaledVector(sample.normal, 0.001);
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(
          UP_VEC,
          sample.normal,
        );
        const localTan = sample.tangent
          .clone()
          .applyQuaternion(alignQuat.clone().invert());
        const yaw = Math.atan2(localTan.x, localTan.z);
        dash.quaternion
          .copy(alignQuat)
          .multiply(new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw));
        group.add(dash);
      }

      if (seg.hasZebraAtStart) {
        addZebraCrossing(group, seg, 0.16, roadWidth);
      }
      if (seg.hasZebraAtEnd) {
        addZebraCrossing(group, seg, 0.84, roadWidth);
      }
    }

    // 2. Build Circular Civic Plazas & Roundabout Aprons at All 29 Hubs across the Globe
    const nodeKeys = Object.keys(ROAD_NODES) as RoadNodeId[];
    for (const nodeKey of nodeKeys) {
      const dir = ROAD_NODES[nodeKey];
      const surf = getSurfacePointAndNormal(dir);
      const r = Math.max(surf.radius, seaLevel + 0.004) + 0.0022;
      const isRoyal = nodeKey === 'palace';
      const radius =
        nodeKey === 'trafalgar'
          ? 0.028
          : nodeKey === 'palace'
            ? 0.026
            : nodeKey === 'parliament' || nodeKey === 'stpauls'
              ? 0.024
              : 0.019;

      const hubGroup = new THREE.Group();
      hubGroup.position.copy(dir).multiplyScalar(r);
      hubGroup.quaternion.setFromUnitVectors(UP_VEC, dir);

      const outerDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius + 0.004,
          radius + 0.005,
          0.0016,
          24,
        ),
        yorkstoneKerbMat,
      );
      outerDisk.receiveShadow = true;
      hubGroup.add(outerDisk);

      const innerDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.002, 24),
        isRoyal ? royalMallRedMat : charcoalAsphaltMat,
      );
      innerDisk.receiveShadow = true;
      hubGroup.add(innerDisk);

      const island = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.34,
          radius * 0.36,
          0.0026,
          16,
        ),
        yorkstoneKerbMat,
      );
      hubGroup.add(island);

      group.add(hubGroup);
    }

    // 3. Admiralty Arch Ceremonial Gateway & Processional Lamps along The Mall
    const mallSeg = ROAD_SEGMENTS[0];
    for (const tLamp of [0.28, 0.5, 0.72]) {
      const sample = sampleRoadSegmentPoint(
        mallSeg,
        tLamp,
        getSurfacePointAndNormal,
        seaLevel,
      );
      const right = new THREE.Vector3()
        .crossVectors(sample.tangent, sample.normal)
        .normalize();
      for (const side of [-1, 1]) {
        const lampPos = sample.point
          .clone()
          .addScaledVector(right, side * 0.0155);
        const postGroup = new THREE.Group();
        postGroup.position.copy(lampPos);
        postGroup.quaternion.setFromUnitVectors(UP_VEC, sample.normal);

        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0007, 0.001, 0.013, 6),
          charcoalAsphaltMat,
        );
        col.position.y = 0.0065;
        postGroup.add(col);

        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(0.0016, 6, 6),
          goldMat,
        );
        crown.position.y = 0.0135;
        postGroup.add(crown);

        group.add(postGroup);
      }
    }
  };

  rebuildGeometry();

  return { group, beaconMaterials, rebuildGeometry };
}
