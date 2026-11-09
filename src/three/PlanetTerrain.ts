import * as THREE from 'three';
import { WeatherMode } from '../types/world';

export interface UniqueVertex {
  baseDir: THREE.Vector3;
  jitteredDir: THREE.Vector3;
  radius: number;
  attrIndices: number[];
}

export interface FacetInfo {
  index: number;
  v0: number;
  v1: number;
  v2: number;
  centerDir: THREE.Vector3;
  normal: THREE.Vector3;
  moisture: number;
  snowCover: number;
  noiseSeed: number;
  isUrbanPlaza: boolean;
  isEmbankment: boolean;
}

export interface PlanetTerrainHandles {
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  baseRadius: number;
  seaLevel: number;
  thamesCenterline: THREE.Vector3[];
  uniqueVertices: UniqueVertex[];
  facets: FacetInfo[];
  getSurfaceRadiusAtDir: (dir: THREE.Vector3) => number;
  getSurfacePointAndNormal: (dir: THREE.Vector3) => {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    radius: number;
    isWater: boolean;
    isBeach: boolean;
    isMountain: boolean;
  };
  ensureDryLandDirection: (dir: THREE.Vector3, margin?: number) => THREE.Vector3;
  findNearestWaterDirection: (dir: THREE.Vector3, maxAngle?: number) => THREE.Vector3 | null;
  sculptAtDirection: (
    dir: THREE.Vector3,
    mode: 'raise' | 'lower' | 'mountain' | 'lake',
  ) => boolean;
  applyRainAtDirection: (dir: THREE.Vector3, dt: number) => void;
  applySnowAtDirection: (dir: THREE.Vector3, dt: number) => void;
  applyGlobalWeather: (weatherMode: WeatherMode, dt: number) => void;
  update: (
    elapsedTime: number,
    dt: number,
    nightFactor: number,
    sunDir?: THREE.Vector3,
  ) => void;
}

function pseudoNoise3D(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

// Continuous 360-degree S-Curve centerline of the River Thames around the globe:
// Flows from Kew/Richmond & Putney in the West, past Chelsea & Battersea,
// curves north through Westminster (Big Ben <-> London Eye) & Victoria Embankment,
// past St. Paul's & The Shard, under Tower Bridge, around Canary Wharf / Greenwich,
// and loops across the back hemisphere back to Kew/Richmond.
export const THAMES_CENTERLINE: THREE.Vector3[] = [
  new THREE.Vector3(-0.76, -0.10, -0.64).normalize(), // Kew & Richmond Reach (West Back)
  new THREE.Vector3(-0.94, -0.14, -0.31).normalize(), // Chiswick & Barnes Reach
  new THREE.Vector3(-0.95, -0.18, 0.25).normalize(),  // Hammersmith & Putney Reach
  new THREE.Vector3(-0.72, -0.20, 0.66).normalize(),  // Chelsea & Battersea Reach
  new THREE.Vector3(-0.34, -0.16, 0.927).normalize(), // Vauxhall & Millbank Reach
  new THREE.Vector3(0.03, -0.04, 0.999).normalize(),  // Westminster Reach (Big Ben <-> London Eye)
  new THREE.Vector3(0.18, 0.01, 0.983).normalize(),   // Charing Cross / Victoria Embankment Bend
  new THREE.Vector3(0.39, -0.01, 0.921).normalize(),  // Blackfriars & Bankside (St. Paul's <-> The Shard)
  new THREE.Vector3(0.60, -0.03, 0.799).normalize(),  // Pool of London / Tower Bridge
  new THREE.Vector3(0.84, -0.08, 0.53).normalize(),   // Canary Wharf / Greenwich Reach
  new THREE.Vector3(0.96, -0.10, 0.08).normalize(),   // Docklands & Woolwich Reach
  new THREE.Vector3(0.82, -0.12, -0.56).normalize(),  // Thames Estuary East
  new THREE.Vector3(0.32, -0.12, -0.94).normalize(),  // Outer Thames Loop
  new THREE.Vector3(-0.32, -0.10, -0.94).normalize(), // Kingston / Hampton Court Reach
  new THREE.Vector3(-0.76, -0.10, -0.64).normalize(), // Closes 360° loop at Kew
];

const RIVER_HALF_WIDTH = 0.052;
const EMBANKMENT_WIDTH = RIVER_HALF_WIDTH + 0.026;

function distanceToPolylineOnSphere(
  pt: THREE.Vector3,
  polyline: THREE.Vector3[],
): { dist: number; segIndex: number; t: number; closest: THREE.Vector3; tangent: THREE.Vector3 } {
  let minDist = 999;
  let bestSeg = 0;
  let bestT = 0;
  const bestClosest = new THREE.Vector3(0, 0, 1);
  const bestTangent = new THREE.Vector3(1, 0, 0);
  const ab = new THREE.Vector3();
  const ap = new THREE.Vector3();
  const closest = new THREE.Vector3();

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    ab.subVectors(b, a);
    const lenSq = ab.lengthSq();
    let t = 0;
    if (lenSq > 1e-8) {
      ap.subVectors(pt, a);
      t = THREE.MathUtils.clamp(ap.dot(ab) / lenSq, 0, 1);
    }
    closest.copy(a).addScaledVector(ab, t).normalize();
    const d = pt.distanceTo(closest);
    if (d < minDist) {
      minDist = d;
      bestSeg = i;
      bestT = t;
      bestClosest.copy(closest);
      bestTangent.copy(ab).normalize();
    }
  }
  return {
    dist: minDist,
    segIndex: bestSeg,
    t: bestT,
    closest: bestClosest,
    tangent: bestTangent,
  };
}

export function createPlanetTerrain(): PlanetTerrainHandles {
  const group = new THREE.Group();
  const baseRadius = 0.75;
  const seaLevel = 0.738;

  // Subdivide icosahedron to detail 5 for crisp River Thames banks, Ludgate Hill & urban terraces
  const baseGeo = new THREE.IcosahedronGeometry(1.0, 5);
  const nonIndexedGeo = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo;
  const posAttr = nonIndexedGeo.attributes.position;
  const vertexCount = posAttr.count;
  const facetCount = vertexCount / 3;

  const uniqueMap = new Map<string, number>();
  const uniqueVertices: UniqueVertex[] = [];
  const attrToUnique = new Int32Array(vertexCount);

  const tempV = new THREE.Vector3();
  for (let i = 0; i < vertexCount; i++) {
    tempV.fromBufferAttribute(posAttr, i).normalize();
    const key = `${Math.round(tempV.x * 10000)}_${Math.round(tempV.y * 10000)}_${Math.round(tempV.z * 10000)}`;
    let uIdx = uniqueMap.get(key);
    if (uIdx === undefined) {
      uIdx = uniqueVertices.length;
      uniqueMap.set(key, uIdx);

      const n1 = pseudoNoise3D(tempV.x * 3.1, tempV.y * 3.1, tempV.z * 3.1) - 0.5;
      const n2 = pseudoNoise3D(tempV.y * 4.7, tempV.z * 4.7, tempV.x * 4.7) - 0.5;
      const up =
        Math.abs(tempV.y) < 0.9
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);
      const t1 = new THREE.Vector3().crossVectors(tempV, up).normalize();
      const t2 = new THREE.Vector3().crossVectors(tempV, t1).normalize();

      const jitteredDir = tempV
        .clone()
        .addScaledVector(t1, n1 * 0.011)
        .addScaledVector(t2, n2 * 0.011)
        .normalize();

      uniqueVertices.push({
        baseDir: tempV.clone(),
        jitteredDir,
        radius: baseRadius,
        attrIndices: [i],
      });
    } else {
      uniqueVertices[uIdx].attrIndices.push(i);
    }
    attrToUnique[i] = uIdx;
  }

  // Authentic London Topographical Features across the entire 360° globe:
  const hampsteadCenter = new THREE.Vector3(0.02, 0.86, 0.51).normalize();
  const northCrownCenter = new THREE.Vector3(0.05, 0.95, -0.30).normalize();
  const primroseHillCenter = new THREE.Vector3(-0.34, 0.68, 0.65).normalize();
  const ludgateHillCenter = new THREE.Vector3(0.26, 0.23, 0.937).normalize();
  const greenwichHillCenter = new THREE.Vector3(0.68, -0.34, 0.65).normalize();
  const richmondHillCenter = new THREE.Vector3(-0.62, -0.45, -0.64).normalize();
  const crystalPalaceHillCenter = new THREE.Vector3(0.18, -0.72, -0.67).normalize();
  const westminsterPlateau = new THREE.Vector3(-0.14, 0.14, 0.98).normalize();

  for (let i = 0; i < uniqueVertices.length; i++) {
    const uv = uniqueVertices[i];
    const d = uv.jitteredDir;

    const wave1 =
      Math.sin(d.x * 4.0 + d.y * 3.0) *
      Math.cos(d.z * 3.6 - d.y * 2.2) *
      0.012;
    const wave2 =
      Math.sin(d.x * 9.5 - d.z * 8.2) *
      Math.sin(d.y * 7.4) *
      0.004;
    let r = baseRadius + 0.020 + wave1 + wave2;

    // Level out the central London urban basin (Westminster, The Mall, Whitehall, South Bank)
    const distWestminster = d.distanceTo(westminsterPlateau);
    if (distWestminster < 0.72) {
      const flatBlend = Math.pow(1.0 - distWestminster / 0.72, 1.25);
      const civicTarget = baseRadius + 0.020 + wave2 * 0.2;
      r = THREE.MathUtils.lerp(r, civicTarget, flatBlend * 0.88);
    }

    // Ludgate Hill elevation for St. Paul's Cathedral
    const distLudgate = d.distanceTo(ludgateHillCenter);
    if (distLudgate < 0.22) {
      const lFactor = Math.pow(1.0 - distLudgate / 0.22, 1.5);
      r += lFactor * 0.022;
    }

    // Primrose Hill overlook
    const distPrimrose = d.distanceTo(primroseHillCenter);
    if (distPrimrose < 0.26) {
      const pFactor = Math.pow(1.0 - distPrimrose / 0.26, 1.5);
      r += pFactor * 0.036;
    }

    // Hampstead Heath & Northern Heights
    const distHampstead = d.distanceTo(hampsteadCenter);
    if (distHampstead < 0.38) {
      const hFactor = Math.pow(1.0 - distHampstead / 0.38, 1.5);
      r += hFactor * 0.044;
    }
    const distCrown = d.distanceTo(northCrownCenter);
    if (distCrown < 0.45) {
      const mFactor = Math.pow(1.0 - distCrown / 0.45, 1.6);
      r += mFactor * 0.052;
    }

    // Greenwich Observatory Hill
    const distGreenwich = d.distanceTo(greenwichHillCenter);
    if (distGreenwich < 0.28) {
      const gFactor = Math.pow(1.0 - distGreenwich / 0.28, 1.5);
      r += gFactor * 0.032;
    }

    // Richmond Hill & Crystal Palace Ridge on the southern/back hemisphere
    const distRichmond = d.distanceTo(richmondHillCenter);
    if (distRichmond < 0.32) {
      const rFactor = Math.pow(1.0 - distRichmond / 0.32, 1.5);
      r += rFactor * 0.032;
    }
    const distCrystal = d.distanceTo(crystalPalaceHillCenter);
    if (distCrystal < 0.32) {
      const cFactor = Math.pow(1.0 - distCrystal / 0.32, 1.5);
      r += cFactor * 0.035;
    }

    // Carve the continuous 360° River Thames Channel
    const thamesInfo = distanceToPolylineOnSphere(d, THAMES_CENTERLINE);
    if (thamesInfo.dist < RIVER_HALF_WIDTH) {
      const channelProfile = Math.pow(
        1.0 - thamesInfo.dist / RIVER_HALF_WIDTH,
        1.25,
      );
      r = seaLevel - 0.012 - channelProfile * 0.044;
    } else if (thamesInfo.dist < EMBANKMENT_WIDTH) {
      // Crisp Victoria & Albert Granite Embankment walls right along the riverbanks
      const bankT =
        (thamesInfo.dist - RIVER_HALF_WIDTH) / (EMBANKMENT_WIDTH - RIVER_HALF_WIDTH);
      const embankmentTarget = seaLevel + 0.017 + bankT * 0.008;
      r = THREE.MathUtils.lerp(embankmentTarget, Math.max(r, seaLevel + 0.018), bankT);
    } else {
      r = Math.max(r, seaLevel + 0.018);
    }

    uv.radius = r;
  }

  // Urban civic districts across all 360° of London
  const civicCenters = [
    new THREE.Vector3(-0.38, 0.14, 0.914).normalize(), // Buckingham Palace Forecourt
    new THREE.Vector3(-0.10, 0.20, 0.975).normalize(), // Trafalgar Square
    new THREE.Vector3(-0.04, 0.07, 0.996).normalize(), // Westminster / Parliament Square
    new THREE.Vector3(0.26, 0.23, 0.937).normalize(),  // St. Paul's / Ludgate Hill
    new THREE.Vector3(0.38, 0.11, 0.918).normalize(),  // Bank / City of London
    new THREE.Vector3(0.48, 0.24, 0.844).normalize(),  // Gherkin / Bishopsgate
    new THREE.Vector3(0.58, 0.11, 0.807).normalize(),  // Tower Hill
    new THREE.Vector3(0.10, -0.14, 0.985).normalize(), // South Bank / London Eye Plaza
    new THREE.Vector3(0.38, -0.15, 0.913).normalize(), // London Bridge / The Shard Plaza
    new THREE.Vector3(-0.68, 0.18, 0.71).normalize(),  // Kensington
    new THREE.Vector3(-0.78, 0.34, 0.52).normalize(),  // Notting Hill
    new THREE.Vector3(-0.52, 0.44, 0.73).normalize(),  // Paddington & Marylebone
    new THREE.Vector3(-0.26, 0.56, 0.785).normalize(), // Regent's Park
    new THREE.Vector3(0.12, 0.58, 0.805).normalize(),  // Camden & King's Cross
    new THREE.Vector3(0.42, 0.48, 0.77).normalize(),   // Islington & Angel
    new THREE.Vector3(0.68, 0.34, 0.65).normalize(),   // Shoreditch & Spitalfields
    new THREE.Vector3(0.88, 0.14, 0.45).normalize(),   // Canary Wharf
    new THREE.Vector3(0.74, -0.26, 0.616).normalize(), // Greenwich Maritime Hub
    new THREE.Vector3(-0.46, -0.29, 0.838).normalize(), // Chelsea & Battersea
    new THREE.Vector3(0.84, 0.36, -0.40).normalize(),  // Stratford
    new THREE.Vector3(-0.84, 0.12, -0.53).normalize(), // Kew Gardens
    new THREE.Vector3(-0.64, -0.32, -0.70).normalize(), // Richmond
  ];

  const facets: FacetInfo[] = [];
  for (let f = 0; f < facetCount; f++) {
    const v0 = attrToUnique[f * 3];
    const v1 = attrToUnique[f * 3 + 1];
    const v2 = attrToUnique[f * 3 + 2];
    const centerDir = new THREE.Vector3()
      .add(uniqueVertices[v0].jitteredDir)
      .add(uniqueVertices[v1].jitteredDir)
      .add(uniqueVertices[v2].jitteredDir)
      .normalize();
    const seed = pseudoNoise3D(
      centerDir.x * 11.3,
      centerDir.y * 11.3,
      centerDir.z * 11.3,
    );
    const thamesDist = distanceToPolylineOnSphere(centerDir, THAMES_CENTERLINE).dist;
    const isEmbankment = thamesDist >= RIVER_HALF_WIDTH && thamesDist <= EMBANKMENT_WIDTH + 0.022;
    const isUrbanPlaza =
      civicCenters.some((hub) => centerDir.distanceTo(hub) < 0.18) ||
      (seed > 0.35 && civicCenters.some((hub) => centerDir.distanceTo(hub) < 0.25));

    facets.push({
      index: f,
      v0,
      v1,
      v2,
      centerDir,
      normal: centerDir.clone(),
      moisture: 0,
      snowCover: 0,
      noiseSeed: seed,
      isUrbanPlaza,
      isEmbankment,
    });
  }

  const colorAttr = new THREE.Float32BufferAttribute(
    new Float32Array(vertexCount * 3),
    3,
  );
  nonIndexedGeo.setAttribute('color', colorAttr);

  const colDeepRiverbed = new THREE.Color('#6e7573');
  const colGraniteEmbankment = new THREE.Color('#b8b0a2');
  const colGraniteDark = new THREE.Color('#a39b8d');
  const colYorkstoneLight = new THREE.Color('#d9d1c3');
  const colYorkstoneDark = new THREE.Color('#c7beb0');
  const colParkLight = new THREE.Color('#7bc462');
  const colParkMid = new THREE.Color('#5aa350');
  const colParkDeep = new THREE.Color('#3f8241');
  const colHeathHigh = new THREE.Color('#4f8f4a');
  const colSnow = new THREE.Color('#f7fbff');
  const colSnowShade = new THREE.Color('#e3eef9');

  const tempColor = new THREE.Color();
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();

  const updateTerrainGeometryAndColors = () => {
    for (let u = 0; u < uniqueVertices.length; u++) {
      const uv = uniqueVertices[u];
      const x = uv.jitteredDir.x * uv.radius;
      const y = uv.jitteredDir.y * uv.radius;
      const z = uv.jitteredDir.z * uv.radius;
      for (let k = 0; k < uv.attrIndices.length; k++) {
        posAttr.setXYZ(uv.attrIndices[k], x, y, z);
      }
    }
    posAttr.needsUpdate = true;
    nonIndexedGeo.computeVertexNormals();

    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const u0 = uniqueVertices[facet.v0];
      const u1 = uniqueVertices[facet.v1];
      const u2 = uniqueVertices[facet.v2];
      p0.copy(u0.jitteredDir).multiplyScalar(u0.radius);
      p1.copy(u1.jitteredDir).multiplyScalar(u1.radius);
      p2.copy(u2.jitteredDir).multiplyScalar(u2.radius);
      e1.subVectors(p1, p0);
      e2.subVectors(p2, p0);
      facet.normal.crossVectors(e1, e2).normalize();
    }
  };

  const updateTerrainColorsOnly = () => {
    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const r0 = uniqueVertices[facet.v0].radius;
      const r1 = uniqueVertices[facet.v1].radius;
      const r2 = uniqueVertices[facet.v2].radius;
      const avgR = (r0 + r1 + r2) / 3;

      if (avgR < seaLevel - 0.004) {
        tempColor.copy(colDeepRiverbed);
      } else if (avgR < seaLevel + 0.015 || facet.isEmbankment) {
        tempColor.copy(
          facet.noiseSeed > 0.5 ? colGraniteEmbankment : colGraniteDark,
        );
      } else if (facet.isUrbanPlaza) {
        tempColor.copy(
          facet.noiseSeed > 0.5 ? colYorkstoneLight : colYorkstoneDark,
        );
      } else if (avgR > 0.805) {
        tempColor.copy(facet.noiseSeed > 0.5 ? colHeathHigh : colParkDeep);
      } else {
        const hNorm =
          (avgR - (seaLevel + 0.015)) / (0.805 - (seaLevel + 0.015)) +
          (facet.noiseSeed - 0.5) * 0.25;
        if (hNorm < 0.35) {
          tempColor.copy(colParkLight);
        } else if (hNorm < 0.7) {
          tempColor.copy(colParkMid);
        } else {
          tempColor.copy(colParkDeep);
        }
      }

      if (facet.moisture > 0.001) {
        const darken = 1.0 - facet.moisture * 0.26;
        tempColor.multiplyScalar(darken);
      }

      if (facet.snowCover > 0.001 && avgR >= seaLevel) {
        const snowTarget = facet.noiseSeed > 0.45 ? colSnow : colSnowShade;
        tempColor.lerp(snowTarget, Math.min(1.0, facet.snowCover * 0.92));
      }

      const baseIdx = f * 3;
      colorAttr.setXYZ(baseIdx, tempColor.r, tempColor.g, tempColor.b);
      colorAttr.setXYZ(baseIdx + 1, tempColor.r, tempColor.g, tempColor.b);
      colorAttr.setXYZ(baseIdx + 2, tempColor.r, tempColor.g, tempColor.b);
    }
    colorAttr.needsUpdate = true;
  };

  updateTerrainGeometryAndColors();
  updateTerrainColorsOnly();

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.82,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(nonIndexedGeo, terrainMaterial);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // ---------------------------------------------------------------------------
  // RIVER THAMES WATER SURFACE
  // ---------------------------------------------------------------------------
  const waterBaseGeo = new THREE.IcosahedronGeometry(seaLevel, 5);
  const waterGeo = waterBaseGeo.index
    ? waterBaseGeo.toNonIndexed()
    : waterBaseGeo;
  const waterPos = waterGeo.attributes.position;
  const waterCount = waterPos.count;
  const waterDirs: THREE.Vector3[] = [];
  const waterPhases = new Float32Array(waterCount);
  const waterColorAttr = new THREE.Float32BufferAttribute(
    new Float32Array(waterCount * 3),
    3,
  );
  waterGeo.setAttribute('color', waterColorAttr);

  for (let i = 0; i < waterCount; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(waterPos, i).normalize();
    waterDirs.push(d);
    waterPhases[i] =
      d.x * 11.0 + d.y * 9.0 + d.z * 13.0 + pseudoNoise3D(d.x, d.y, d.z) * 4.0;
  }

  const getSurfaceRadiusAtDir = (dir: THREE.Vector3): number => {
    let bestDot = -2;
    let bestRadius = baseRadius;
    for (let i = 0; i < uniqueVertices.length; i++) {
      const dot = dir.dot(uniqueVertices[i].jitteredDir);
      if (dot > bestDot) {
        bestDot = dot;
        bestRadius = uniqueVertices[i].radius;
      }
    }
    return bestRadius;
  };

  const colShallowThames = new THREE.Color('#3b9db0');
  const colMidThames = new THREE.Color('#1f7691');
  const colDeepThames = new THREE.Color('#124a63');
  const wColor = new THREE.Color();

  const updateWaterColors = () => {
    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const terrainR =
        (uniqueVertices[facet.v0].radius +
          uniqueVertices[facet.v1].radius +
          uniqueVertices[facet.v2].radius) /
        3;
      const depth = Math.max(0, seaLevel - terrainR);

      const t = THREE.MathUtils.clamp(depth / 0.055, 0, 1);
      if (t < 0.45) {
        wColor.copy(colShallowThames).lerp(colMidThames, t / 0.45);
      } else {
        wColor.copy(colMidThames).lerp(colDeepThames, (t - 0.45) / 0.55);
      }

      const i = f * 3;
      waterColorAttr.setXYZ(i, wColor.r, wColor.g, wColor.b);
      waterColorAttr.setXYZ(i + 1, wColor.r, wColor.g, wColor.b);
      waterColorAttr.setXYZ(i + 2, wColor.r, wColor.g, wColor.b);
    }
    waterColorAttr.needsUpdate = true;
  };

  updateWaterColors();

  const waterMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: 0.88,
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  const getSurfacePointAndNormal = (dir: THREE.Vector3) => {
    const normDir = dir.clone().normalize();
    let bestDot = -2;
    let bestFacet = facets[0];

    for (let f = 0; f < facets.length; f++) {
      const dot = normDir.dot(facets[f].centerDir);
      if (dot > bestDot) {
        bestDot = dot;
        bestFacet = facets[f];
      }
    }

    const r0 = uniqueVertices[bestFacet.v0].radius;
    const r1 = uniqueVertices[bestFacet.v1].radius;
    const r2 = uniqueVertices[bestFacet.v2].radius;
    const r = (r0 + r1 + r2) / 3;

    const uprightNormal = normDir
      .clone()
      .lerp(bestFacet.normal, 0.25)
      .normalize();

    return {
      point: normDir.clone().multiplyScalar(r),
      normal: uprightNormal,
      radius: r,
      isWater: r < seaLevel + 0.002,
      isBeach: r >= seaLevel + 0.002 && r < seaLevel + 0.016,
      isMountain: r > 0.812,
    };
  };

  /**
   * Ensures a direction vector for any land building / house is safely on dry land
   * outside the River Thames channel, and guarantees the underlying terrain facet is dry.
   */
  const ensureDryLandDirection = (
    dir: THREE.Vector3,
    margin = 0.046,
  ): THREE.Vector3 => {
    const safeDir = dir.clone().normalize();
    const minSafeDist = RIVER_HALF_WIDTH + margin;
    const info = distanceToPolylineOnSphere(safeDir, THAMES_CENTERLINE);

    if (info.dist < minSafeDist) {
      const away = safeDir.clone().sub(info.closest);
      if (away.lengthSq() < 1e-6) {
        // Fallback perpendicular to river tangent
        away.crossVectors(info.tangent, info.closest);
        if (safeDir.y >= info.closest.y) {
          if (away.y < 0) away.negate();
        } else {
          if (away.y > 0) away.negate();
        }
      }
      away.normalize();
      safeDir
        .copy(info.closest)
        .addScaledVector(away, minSafeDist + 0.012)
        .normalize();
    }

    // Also verify the nearest facet vertices are dry land (>= seaLevel + 0.018)
    let bestDot = -2;
    let bestFacet = facets[0];
    for (let f = 0; f < facets.length; f++) {
      const dot = safeDir.dot(facets[f].centerDir);
      if (dot > bestDot) {
        bestDot = dot;
        bestFacet = facets[f];
      }
    }

    let raisedAny = false;
    for (const vIdx of [bestFacet.v0, bestFacet.v1, bestFacet.v2]) {
      if (uniqueVertices[vIdx].radius < seaLevel + 0.018) {
        uniqueVertices[vIdx].radius = seaLevel + 0.019;
        raisedAny = true;
      }
    }
    if (raisedAny) {
      updateTerrainGeometryAndColors();
      updateTerrainColorsOnly();
      updateWaterColors();
    }

    return safeDir;
  };

  const findNearestWaterDirection = (
    dir: THREE.Vector3,
    maxDist = 0.65,
  ): THREE.Vector3 | null => {
    const normDir = dir.clone().normalize();
    let bestDist = maxDist;
    let bestDir: THREE.Vector3 | null = null;
    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const avgR =
        (uniqueVertices[facet.v0].radius +
          uniqueVertices[facet.v1].radius +
          uniqueVertices[facet.v2].radius) /
        3;
      if (avgR < seaLevel - 0.004) {
        const d = normDir.distanceTo(facet.centerDir);
        if (d < bestDist) {
          bestDist = d;
          bestDir = facet.centerDir.clone();
        }
      }
    }
    return bestDir;
  };

  const sculptAtDirection = (
    dir: THREE.Vector3,
    mode: 'raise' | 'lower' | 'mountain' | 'lake',
  ): boolean => {
    const normDir = dir.clone().normalize();
    let brushRadius = 0.22;
    let deltaStrength = 0.026;
    const minR = 0.66;
    const maxR = 0.92;

    if (mode === 'mountain') {
      brushRadius = 0.28;
      deltaStrength = 0.058;
    } else if (mode === 'lake') {
      brushRadius = 0.26;
      deltaStrength = -0.056;
    } else if (mode === 'raise') {
      brushRadius = 0.22;
      deltaStrength = 0.024;
    } else if (mode === 'lower') {
      brushRadius = 0.22;
      deltaStrength = -0.026;
    }

    let modified = false;
    for (let i = 0; i < uniqueVertices.length; i++) {
      const uv = uniqueVertices[i];
      const dist = uv.jitteredDir.distanceTo(normDir);
      if (dist < brushRadius) {
        const falloff = Math.pow(1.0 - dist / brushRadius, 1.5);
        uv.radius = THREE.MathUtils.clamp(
          uv.radius + deltaStrength * falloff,
          minR,
          maxR,
        );
        modified = true;
      }
    }

    if (modified) {
      updateTerrainGeometryAndColors();
      updateTerrainColorsOnly();
      updateWaterColors();
    }
    return modified;
  };

  let moistureDirty = false;
  const applyRainAtDirection = (dir: THREE.Vector3, dt: number) => {
    const normDir = dir.clone().normalize();
    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const dist = facet.centerDir.distanceTo(normDir);
      if (dist < 0.28) {
        const intensity = 1.0 - dist / 0.28;
        facet.moisture = Math.min(1.0, facet.moisture + dt * 1.65 * intensity);
        if (facet.snowCover > 0) {
          facet.snowCover = Math.max(0, facet.snowCover - dt * 0.8 * intensity);
        }
        moistureDirty = true;
      }
    }
  };

  const applySnowAtDirection = (dir: THREE.Vector3, dt: number) => {
    const normDir = dir.clone().normalize();
    for (let f = 0; f < facets.length; f++) {
      const facet = facets[f];
      const dist = facet.centerDir.distanceTo(normDir);
      if (dist < 0.28) {
        const intensity = 1.0 - dist / 0.28;
        facet.snowCover = Math.min(1.0, facet.snowCover + dt * 1.45 * intensity);
        moistureDirty = true;
      }
    }
  };

  const applyGlobalWeather = (weatherMode: WeatherMode, dt: number) => {
    if (weatherMode === 'rain' || weatherMode === 'storm') {
      terrainMaterial.roughness = THREE.MathUtils.lerp(terrainMaterial.roughness, 0.52, dt * 2.5);
      for (let f = 0; f < facets.length; f++) {
        facets[f].moisture = Math.min(0.88, facets[f].moisture + dt * 0.45);
        if (facets[f].snowCover > 0) {
          facets[f].snowCover = Math.max(0, facets[f].snowCover - dt * 0.4);
        }
      }
      moistureDirty = true;
    } else if (weatherMode === 'snow') {
      terrainMaterial.roughness = THREE.MathUtils.lerp(terrainMaterial.roughness, 0.88, dt * 2.5);
      for (let f = 0; f < facets.length; f++) {
        const wave = 0.65 + 0.35 * facets[f].noiseSeed;
        facets[f].snowCover = Math.min(0.95, facets[f].snowCover + dt * 0.38 * wave);
        if (facets[f].moisture > 0) {
          facets[f].moisture = Math.max(0, facets[f].moisture - dt * 0.3);
        }
      }
      moistureDirty = true;
    } else if (weatherMode === 'fog') {
      terrainMaterial.roughness = THREE.MathUtils.lerp(terrainMaterial.roughness, 0.72, dt * 2.0);
      for (let f = 0; f < facets.length; f++) {
        facets[f].moisture = THREE.MathUtils.lerp(facets[f].moisture, 0.32, dt * 0.8);
      }
      moistureDirty = true;
    } else {
      terrainMaterial.roughness = THREE.MathUtils.lerp(terrainMaterial.roughness, 0.82, dt * 2.0);
    }
  };

  const update = (
    elapsedTime: number,
    dt: number,
    _nightFactor: number,
  ) => {
    for (let i = 0; i < waterCount; i++) {
      const d = waterDirs[i];
      const terrainRadius = uniqueVertices[attrToUnique[i]].radius;
      const depth = seaLevel - terrainRadius;

      if (depth <= 0.001) {
        const dryR = Math.min(seaLevel - 0.004, terrainRadius - 0.004);
        waterPos.setXYZ(i, d.x * dryR, d.y * dryR, d.z * dryR);
      } else {
        const phase = waterPhases[i];
        const shoreMask = THREE.MathUtils.clamp(depth / 0.012, 0.0, 1.0);
        const wave =
          (Math.sin(elapsedTime * 2.4 + phase) * 0.0018 +
            Math.cos(elapsedTime * 1.7 - phase * 0.7) * 0.0012) *
          shoreMask;
        const r = seaLevel + wave;
        waterPos.setXYZ(i, d.x * r, d.y * r, d.z * r);
      }
    }
    waterPos.needsUpdate = true;

    let anyWetOrSnow = false;
    for (let f = 0; f < facets.length; f++) {
      if (facets[f].moisture > 0) {
        facets[f].moisture = Math.max(0, facets[f].moisture - dt * 0.14);
        anyWetOrSnow = true;
      }
      if (facets[f].snowCover > 0) {
        facets[f].snowCover = Math.max(0, facets[f].snowCover - dt * 0.055);
        anyWetOrSnow = true;
      }
    }
    if (anyWetOrSnow || moistureDirty) {
      updateTerrainColorsOnly();
      moistureDirty = false;
    }
  };

  return {
    group,
    terrainMesh,
    waterMesh,
    baseRadius,
    seaLevel,
    thamesCenterline: THAMES_CENTERLINE,
    uniqueVertices,
    facets,
    getSurfaceRadiusAtDir,
    getSurfacePointAndNormal,
    ensureDryLandDirection,
    findNearestWaterDirection,
    sculptAtDirection,
    applyRainAtDirection,
    applySnowAtDirection,
    applyGlobalWeather,
    update,
  };
}
