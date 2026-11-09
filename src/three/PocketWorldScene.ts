import * as THREE from 'three';
import {
  BuildingInfo,
  CameraViewId,
  TimeMode,
  ToolId,
  WeatherMode,
  WeatherOverlayState,
  WorldState,
} from '../types/world';
import { createRoomEnvTexture } from '../utils/textures';
import {
  createBatterseaPowerStationMesh,
  createBigBenMesh,
  createBlackCabMesh,
  createBuckinghamPalaceMesh,
  createCanaryWharfMesh,
  createGreenwichObservatoryMesh,
  createKewPalaceMesh,
  createLondonEyeMesh,
  createRedDoubleDeckerBusMesh,
  createShardOrGherkinMesh,
  createStPaulsCathedralMesh,
  createTowerBridgeMesh,
  createTowerOfLondonMesh,
  createWestminsterBridgeMesh,
} from './LondonLandmarks';
import {
  createLondonRoadNetwork,
  findRoadSegmentBetween,
  getClosestRoadPoint,
  getConnectedRoadNodes,
  ROAD_NODES,
  ROAD_SEGMENTS,
  RoadNodeId,
  RoadSegmentSpec,
  sampleRoadSegmentPoint,
  STREET_TOUR_NODE_SEQUENCE,
} from './LondonRoads';
import {
  BalloonEntity,
  CloudEntity,
  createBeehiveMesh,
  createCampfireMesh,
  createFlowerClusterMesh,
  createHotAirBalloonMesh,
  createLanternPostMesh,
  createOakTreeMesh,
  createPalmTreeMesh,
  createPastelHouseMesh,
  createPineTreeMesh,
  createPuffyCloudMesh,
  createRainbowArchMesh,
  createSailboatMesh,
  createSheepMesh,
  createShootingStarMesh,
  createSteppingPathMesh,
  createStoneWatchtowerMesh,
  createStoneWellMesh,
  createStripedLighthouseMesh,
  createSwanDuckFlockMesh,
  createVillagerMesh,
  createWhiteWindmillMesh,
  createWoodenDockMesh,
  createWoodenFenceMesh,
  DuckEntity,
  PlacedObjectEntity,
  PlacedObjectType,
  SailboatEntity,
  SheepEntity,
  ShootingStarEntity,
  VillagerEntity,
} from './MiniatureObjects';
import { createPlanetTerrain } from './PlanetTerrain';
import { createRoomEnvironment } from './RoomEnvironment';

const UP_VEC = new THREE.Vector3(0, 1, 0);

interface SparkleBurst {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  age: number;
  maxAge: number;
}

interface RoadVehicleEntity {
  id: string;
  kind: 'redbus' | 'blackcab';
  mesh: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  fromNode: RoadNodeId;
  toNode: RoadNodeId;
  seg: RoadSegmentSpec;
  reversed: boolean;
  t: number;
  speed: number;
  dir: THREE.Vector3;
  yaw: number;
}

// Calm, natural Day-Night interval constants:
// 90.0 seconds exact Daytime (06:00–18:00) + 90.0 seconds exact Nighttime (18:00–06:00) = 180.0s full daily cycle
const DAY_DURATION_SEC = 90.0;
const NIGHT_DURATION_SEC = 90.0;
const FULL_CYCLE_SEC = DAY_DURATION_SEC + NIGHT_DURATION_SEC;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function getSeasonForMonth(
  monthIndex: number,
): 'Winter' | 'Spring' | 'Summer' | 'Autumn' {
  if (monthIndex === 11 || monthIndex === 0 || monthIndex === 1) return 'Winter';
  if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
  if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
  return 'Autumn';
}

export class PocketWorldController {
  private container: HTMLElement;
  private onStateChange: (updater: (prev: WorldState) => WorldState) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  private roomEnv!: ReturnType<typeof createRoomEnvironment>;
  private planetRoot!: THREE.Group;
  private terrain!: ReturnType<typeof createPlanetTerrain>;
  private roadNetwork!: ReturnType<typeof createLondonRoadNetwork>;
  private objectsGroup!: THREE.Group;
  private inhabitantsGroup!: THREE.Group;
  private atmosphereGroup!: THREE.Group;
  private effectsGroup!: THREE.Group;
  private festiveLightsGroup!: THREE.Group;
  private festiveBulbMats: THREE.MeshStandardMaterial[] = [];

  // Celestial bodies & lighting
  private roomWindowLight!: THREE.DirectionalLight;
  private roomAmbientLight!: THREE.AmbientLight;
  private roomHemiLight!: THREE.HemisphereLight;
  private sunGroup!: THREE.Group;
  private sunLight!: THREE.DirectionalLight;
  private moonGroup!: THREE.Group;
  private moonLight!: THREE.DirectionalLight;
  private firefliesPoints!: THREE.Points;
  private firefliesMat!: THREE.PointsMaterial;
  private firefliesBasePositions: THREE.Vector3[] = [];

  // Entities
  private placedObjects: PlacedObjectEntity[] = [];
  private roadVehicles: RoadVehicleEntity[] = [];
  private villagers: VillagerEntity[] = [];
  private sheepList: SheepEntity[] = [];
  private clouds: CloudEntity[] = [];
  private sailboats: SailboatEntity[] = [];
  private ducks: DuckEntity[] = [];
  private balloons: BalloonEntity[] = [];
  private shootingStars: ShootingStarEntity[] = [];
  private sparkles: SparkleBurst[] = [];

  private wellDirection = ROAD_NODES.trafalgar.clone();
  private pastureCenter = new THREE.Vector3(0, -1, 0);
  private pastureRadius = 0.001;
  private houseCounter = 0;
  private shardCounter = 0;
  private villagerCounter = 0;
  private boatCounter = 0;
  private balloonCounter = 0;
  private shootingStarGazeTimer = 0;

  // Universal London Weather System (governed automatically by daily & yearly cycles)
  private weatherMode: WeatherMode = 'clear';
  private weatherAuto = true;
  private globalRainLines!: THREE.LineSegments;
  private globalRainMat!: THREE.LineBasicMaterial;
  private globalRainVelocities: THREE.Vector3[] = [];
  private globalSnowPoints!: THREE.Points;
  private globalSnowMat!: THREE.PointsMaterial;
  private globalSnowVelocities: THREE.Vector3[] = [];
  private globalFogGroup!: THREE.Group;
  private globalFogMats: THREE.MeshBasicMaterial[] = [];
  private rainBlend = 0;
  private snowBlend = 0;
  private fogBlend = 0;

  // Hover indicator on spherical surface
  private cursorRing!: THREE.Mesh;

  // Interaction, Daily & Yearly Calendar state
  private activeTool: ToolId = 'bigben';
  private activeView: CameraViewId = 'orb';
  private streetCamProgress = 0;
  private timeMode: TimeMode = 'auto';
  private timeOfDay = 0.22; // Starts in late morning so London is brightly lit and transitions smoothly
  private lastReportedClockMinute = -1;
  private dayCount = 1;
  private monthIndex = 11; // Starts in December (11) to showcase festive Christmas fairy lights & annual snow cycle
  private yearCount = 1;

  private isPointerDown = false;
  private isDraggingSpin = false;
  private pointerDownPos = new THREE.Vector2();
  private lastPointerPos = new THREE.Vector2();
  private angularVelocity = new THREE.Vector2(0.0, 0.0);

  // Initial 3-second 360-degree intro spin state
  private introSpinActive = true;
  private introSpinElapsed = 0;

  // Camera choreography (Centered on standalone London globe at origin)
  private camCurrentPos = new THREE.Vector3(0.0, 0.16, 2.75);
  private camCurrentLook = new THREE.Vector3(0.0, 0.0, 0.0);
  private camTargetPos = new THREE.Vector3(0.0, 0.16, 2.75);
  private camTargetLook = new THREE.Vector3(0.0, 0.0, 0.0);
  private camCurrentUp = new THREE.Vector3(0, 1, 0);
  private camTargetUp = new THREE.Vector3(0, 1, 0);
  private selectedObject: PlacedObjectEntity | null = null;
  private planetTargetQuat: THREE.Quaternion | null = null;
  private hiddenByOcclusion: THREE.Object3D[] = [];

  // 30-Second Choreographed Demo Tour state
  private tourActive = false;
  private tourElapsed = 0;
  private tourStartTimeMs = 0;
  private lastReportedTourRemaining = -1;
  private tourStepTriggered = new Set<number>();
  private tourCursorDir = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
  private tourSpawnedCleanups: (() => void)[] = [];

  constructor(
    container: HTMLElement,
    onStateChange: (updater: (prev: WorldState) => WorldState) => void,
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.initScene();
    this.populateInitialWorld();
    this.bindEvents();
    this.syncWorldStats();
    this.animate();
  }

  private initScene() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Near clipping plane set to 0.015 so close-up front views never slice into building facades
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.015, 60);
    this.applyCameraPreset('orb', true);

    const envMap = createRoomEnvTexture();
    this.scene.environment = envMap;

    // 1. Domestic Room Environment (Windowsill, Linen Cloth, Succulent, Walnut Stand, Brass Collar, Glass Orb)
    this.roomEnv = createRoomEnvironment(envMap);
    this.scene.add(this.roomEnv.group);

    // 2. Room Lighting (Warm evening window light + subdued interior fill)
    this.roomAmbientLight = new THREE.AmbientLight('#f2e6dc', 0.55);
    this.scene.add(this.roomAmbientLight);

    this.roomHemiLight = new THREE.HemisphereLight('#dcd0f0', '#5e4b3e', 0.52);
    this.scene.add(this.roomHemiLight);

    this.roomWindowLight = new THREE.DirectionalLight('#ffdfb8', 1.35);
    this.roomWindowLight.position.set(-4.8, 4.6, 3.8);
    this.roomWindowLight.castShadow = true;
    this.roomWindowLight.shadow.mapSize.set(2048, 2048);
    this.roomWindowLight.shadow.camera.near = 1.0;
    this.roomWindowLight.shadow.camera.far = 15.0;
    const d = 3.2;
    this.roomWindowLight.shadow.camera.left = -d;
    this.roomWindowLight.shadow.camera.right = d;
    this.roomWindowLight.shadow.camera.top = d;
    this.roomWindowLight.shadow.camera.bottom = -d;
    this.roomWindowLight.shadow.bias = -0.0005;
    this.scene.add(this.roomWindowLight);

    // 3. Suspended Faceted Planet Root (Centered inside the glass orb at (0,0,0))
    this.planetRoot = new THREE.Group();
    this.scene.add(this.planetRoot);

    this.terrain = createPlanetTerrain();
    this.planetRoot.add(this.terrain.group);

    this.roadNetwork = createLondonRoadNetwork(
      (dir) => this.terrain.getSurfacePointAndNormal(dir),
      this.terrain.seaLevel,
    );
    this.planetRoot.add(this.roadNetwork.group);

    this.objectsGroup = new THREE.Group();
    this.planetRoot.add(this.objectsGroup);

    this.inhabitantsGroup = new THREE.Group();
    this.planetRoot.add(this.inhabitantsGroup);

    this.atmosphereGroup = new THREE.Group();
    this.planetRoot.add(this.atmosphereGroup);

    this.effectsGroup = new THREE.Group();
    this.planetRoot.add(this.effectsGroup);

    this.festiveLightsGroup = new THREE.Group();
    this.planetRoot.add(this.festiveLightsGroup);

    // 4. Celestial Bodies (Small glowing Sun & Pale Moon on opposing sides of curved path)
    this.initCelestialBodies();

    // 5. Drifting Fireflies & Universal London Weather System (Rain, Snow, Pea-Souper Fog)
    this.initFireflies();
    this.initUniversalWeather();

    // 6. Surface Placement Cursor Ring
    const ringGeo = new THREE.RingGeometry(0.028, 0.036, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fff8d6',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.cursorRing = new THREE.Mesh(ringGeo, ringMat);
    this.cursorRing.visible = false;
    this.planetRoot.add(this.cursorRing);
  }

  private initCelestialBodies() {
    // 1. Radiant Storybook Sun with Sculpted Sunbeam Crown & Astrolabe Ring
    this.sunGroup = new THREE.Group();

    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.055, 2),
      new THREE.MeshBasicMaterial({ color: '#fff5b8' }),
    );
    this.sunGroup.add(sunCore);

    // Inner & outer rotating sunbeam crowns (12 alternating long/short sculpted rays)
    const rayCrown = new THREE.Group();
    rayCrown.name = 'sunRayCrown';
    const rayPrimaryMat = new THREE.MeshBasicMaterial({ color: '#ffd45c' });
    const raySecondaryMat = new THREE.MeshBasicMaterial({ color: '#ffae36' });

    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const isLong = i % 2 === 0;
      const rayLen = isLong ? 0.036 : 0.024;
      const rayRad = isLong ? 0.011 : 0.0085;
      const rayGeo = new THREE.ConeGeometry(rayRad, rayLen, 4);
      const ray = new THREE.Mesh(
        rayGeo,
        isLong ? rayPrimaryMat : raySecondaryMat,
      );
      const dist = 0.052 + rayLen * 0.45;
      ray.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
      ray.rotation.z = angle - Math.PI / 2;
      rayCrown.add(ray);
    }
    this.sunGroup.add(rayCrown);

    // Delicate tilted golden astrolabe ring around the Sun
    const sunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.086, 0.0016, 8, 36),
      new THREE.MeshBasicMaterial({
        color: '#ffe28a',
        transparent: true,
        opacity: 0.65,
      }),
    );
    sunRing.name = 'sunAstrolabeRing';
    sunRing.rotation.set(0.65, 0.35, 0);
    this.sunGroup.add(sunRing);

    const sunHalo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.098, 2),
      new THREE.MeshBasicMaterial({
        color: '#ffbe4f',
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.sunGroup.add(sunHalo);
    this.planetRoot.add(this.sunGroup);

    // Little sun directional light casting moving shadows across the planet
    this.sunLight = new THREE.DirectionalLight('#fff0c2', 1.9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.2;
    this.sunLight.shadow.camera.far = 3.5;
    const sd = 1.05;
    this.sunLight.shadow.camera.left = -sd;
    this.sunLight.shadow.camera.right = sd;
    this.sunLight.shadow.camera.top = sd;
    this.sunLight.shadow.camera.bottom = -sd;
    this.sunLight.shadow.bias = -0.0008;
    this.planetRoot.add(this.sunLight);
    this.planetRoot.add(this.sunLight.target);

    // 2. Detailed Cratered Moon with Lunar Mare Basins & Companion Starlets
    this.moonGroup = new THREE.Group();
    const moonMat = new THREE.MeshStandardMaterial({
      color: '#e8effc',
      emissive: new THREE.Color('#8eabdc'),
      emissiveIntensity: 0.55,
      roughness: 0.72,
      flatShading: true,
    });
    const craterMat = new THREE.MeshStandardMaterial({
      color: '#bccbe6',
      emissive: new THREE.Color('#6b88b8'),
      emissiveIntensity: 0.45,
      roughness: 0.82,
      flatShading: true,
    });

    const moonBody = new THREE.Group();
    moonBody.name = 'moonBody';

    const moonMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.052, 2),
      moonMat,
    );
    moonBody.add(moonMesh);

    // Sculpted rimmed craters & lunar basins on the Moon surface
    const craterSpecs: [number, number, number, number][] = [
      [0.35, 0.25, 0.9, 0.013],
      [-0.48, 0.38, 0.79, 0.0105],
      [0.18, -0.52, 0.83, 0.0115],
      [-0.65, -0.25, 0.71, 0.009],
      [0.58, 0.42, -0.69, 0.012],
      [-0.25, 0.68, -0.69, 0.01],
      [0.12, -0.74, -0.66, 0.011],
    ];
    for (const [cx, cy, cz, cr] of craterSpecs) {
      const dir = new THREE.Vector3(cx, cy, cz).normalize();
      const craterGroup = new THREE.Group();
      craterGroup.position.copy(dir.clone().multiplyScalar(0.0505));
      craterGroup.lookAt(dir.clone().multiplyScalar(0.15));

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(cr, cr * 0.26, 6, 12),
        craterMat,
      );
      const basin = new THREE.Mesh(
        new THREE.CircleGeometry(cr * 0.85, 10),
        craterMat,
      );
      basin.position.z = -0.0008;
      craterGroup.add(rim, basin);
      moonBody.add(craterGroup);
    }
    this.moonGroup.add(moonBody);

    // Orbiting silver companion starlets around the Moon
    const starletGroup = new THREE.Group();
    starletGroup.name = 'moonStarlets';
    const starletMat = new THREE.MeshBasicMaterial({ color: '#eef5ff' });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const starlet = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.0055 - i * 0.001, 0),
        starletMat,
      );
      starlet.position.set(
        Math.cos(angle) * 0.078,
        Math.sin(angle * 1.5) * 0.018,
        Math.sin(angle) * 0.078,
      );
      starletGroup.add(starlet);
    }
    this.moonGroup.add(starletGroup);

    const moonHalo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.076, 2),
      new THREE.MeshBasicMaterial({
        color: '#b5d0ff',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    );
    this.moonGroup.add(moonHalo);
    this.planetRoot.add(this.moonGroup);

    // Moon directional light to illuminate silver edges on terrain at night
    this.moonLight = new THREE.DirectionalLight('#b8d4ff', 0.0);
    this.planetRoot.add(this.moonLight);
    this.planetRoot.add(this.moonLight.target);
  }

  private initFireflies() {
    const count = 38;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distributed in the atmosphere shell between planet (0.82) and inner glass orb (1.36)
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const r = 0.84 + Math.random() * 0.48;
      const pos = dir.multiplyScalar(r);
      this.firefliesBasePositions.push(pos);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Soft circular glow sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 248, 150, 1)');
    grad.addColorStop(0.4, 'rgba(215, 245, 110, 0.65)');
    grad.addColorStop(1, 'rgba(180, 230, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const spriteTex = new THREE.CanvasTexture(canvas);

    this.firefliesMat = new THREE.PointsMaterial({
      map: spriteTex,
      size: 0.065,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.firefliesPoints = new THREE.Points(geo, this.firefliesMat);
    this.planetRoot.add(this.firefliesPoints);
  }

  private initUniversalWeather() {
    // 1. Universal London Rain Streaks enveloping the entire globe (r = 0.78 .. 1.32)
    const rainCount = 420;
    const rainPositions = new Float32Array(rainCount * 6);
    this.globalRainVelocities = [];
    for (let i = 0; i < rainCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const r = 0.79 + Math.random() * 0.52;
      const start = dir.clone().multiplyScalar(r);
      const streakLen = 0.042;
      const end = dir.clone().multiplyScalar(r - streakLen);

      rainPositions[i * 6] = start.x;
      rainPositions[i * 6 + 1] = start.y;
      rainPositions[i * 6 + 2] = start.z;
      rainPositions[i * 6 + 3] = end.x;
      rainPositions[i * 6 + 4] = end.y;
      rainPositions[i * 6 + 5] = end.z;

      this.globalRainVelocities.push(dir.clone().multiplyScalar(-(0.62 + Math.random() * 0.28)));
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.globalRainMat = new THREE.LineBasicMaterial({
      color: '#b8dcff',
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.globalRainLines = new THREE.LineSegments(rainGeo, this.globalRainMat);
    this.planetRoot.add(this.globalRainLines);

    // 2. Universal London Winter Snow Flurries enveloping the entire globe
    const snowCount = 380;
    const snowPositions = new Float32Array(snowCount * 3);
    this.globalSnowVelocities = [];
    for (let i = 0; i < snowCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const r = 0.78 + Math.random() * 0.54;
      const pt = dir.clone().multiplyScalar(r);
      snowPositions[i * 3] = pt.x;
      snowPositions[i * 3 + 1] = pt.y;
      snowPositions[i * 3 + 2] = pt.z;

      const tangent = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      )
        .cross(dir)
        .normalize();
      this.globalSnowVelocities.push(
        dir
          .clone()
          .multiplyScalar(-(0.14 + Math.random() * 0.08))
          .addScaledVector(tangent, 0.05),
      );
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    this.globalSnowMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.018,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.globalSnowPoints = new THREE.Points(snowGeo, this.globalSnowMat);
    this.planetRoot.add(this.globalSnowPoints);

    // 3. Universal London Pea-Souper Fog Wisps & Localized Thames Mist Banks hugging the river reaches
    this.globalFogGroup = new THREE.Group();
    this.globalFogMats = [];
    const fogColors = ['#d8d0bc', '#c9c4b6', '#dcd6c8', '#cfc8b4'];
    const totalFogWisps = 36;
    for (let i = 0; i < totalFogWisps; i++) {
      const fMat = new THREE.MeshBasicMaterial({
        color: fogColors[i % fogColors.length],
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      this.globalFogMats.push(fMat);

      const wispGroup = new THREE.Group();
      // First 20 wisps hug the River Thames equatorial band; remaining 16 cover London's hills & squares
      let dir: THREE.Vector3;
      if (i < 20) {
        const lon = (i / 20) * Math.PI * 2;
        const thamesLat = Math.sin(lon * 2.0) * 0.14 + (Math.random() - 0.5) * 0.08;
        dir = new THREE.Vector3(
          Math.sin(lon),
          thamesLat,
          Math.cos(lon),
        ).normalize();
      } else {
        dir = new THREE.Vector3(
          Math.random() - 0.5,
          (Math.random() - 0.5) * 0.85,
          Math.random() - 0.5,
        ).normalize();
      }
      const alt = i < 20 ? 0.772 + (i % 3) * 0.018 : 0.788 + (i % 4) * 0.028;
      wispGroup.position.copy(dir).multiplyScalar(alt);
      wispGroup.quaternion.setFromUnitVectors(UP_VEC, dir);

      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.055 + p * 0.015, 1),
          fMat,
        );
        puff.scale.set(1.9, 0.34, 1.35);
        puff.position.set((p - 1) * 0.038, (p % 2) * 0.006, (p - 1) * 0.015);
        wispGroup.add(puff);
      }
      this.globalFogGroup.add(wispGroup);
    }
    this.planetRoot.add(this.globalFogGroup);
  }

  private populateInitialWorld() {
    // =========================================================================
    // 1. INTERCONNECTED LONDON MONUMENTS ACROSS ALL 360° OF THE GLOBE
    // =========================================================================

    // A. Trafalgar Square, Nelson's Column & National Gallery (-0.10, 0.20, 0.975)
    const trafalgarYaw = this.computeYawFacingTarget(
      ROAD_NODES.trafalgar,
      ROAD_NODES.parliament,
    );
    this.placeStaticObject('well', ROAD_NODES.trafalgar, trafalgarYaw, false, false, {
      id: 'trafalgar_square',
      title: "Trafalgar Square & Nelson's Column",
      borough: 'City of Westminster',
      yearBuilt: '1843',
      style: 'Neoclassical Civic Plaza',
      architect: 'Sir Charles Barry & William Railton',
      summary:
        'The ceremonial heart of Central London, anchored by the 169-foot Corinthian granite column of Admiral Lord Nelson and flanked by four bronze lions and twin Lutyens fountains.',
      history:
        "Laid out between the 1820s and 1840s on the site of the Royal Mews at Charing Cross, Trafalgar Square commemorates Britain's 1805 naval victory at Cape Trafalgar. Its northern terrace is crowned by the National Gallery (1838), while Whitehall, The Mall, and The Strand radiate directly from its roundabout.",
      highlights: [
        'Four bronze lions sculpted by Sir Edwin Landseer at the base of the column (1867)',
        'Twin turquoise mermaid & triton fountains redesigned by Sir Edwin Lutyens (1939)',
        'Traditional Charing Cross point from which all London road distances are measured',
      ],
    });

    // B. Buckingham Palace & Victoria Memorial (-0.40, 0.14, 0.906)
    const palaceDir = new THREE.Vector3(-0.40, 0.14, 0.906).normalize();
    const palaceYaw = this.computeYawFacingTarget(palaceDir, ROAD_NODES.trafalgar);
    this.placeStaticObject('palace', palaceDir, palaceYaw, true, false, {
      id: 'buckingham_palace',
      title: 'Buckingham Palace & Victoria Memorial',
      borough: 'City of Westminster',
      yearBuilt: '1703 / 1913',
      style: 'Beaux-Arts Neoclassical',
      architect: 'John Nash & Sir Aston Webb',
      summary:
        "The official London residence and administrative headquarters of the British Monarch, terminating the red ceremonial avenue of The Mall behind gilded iron gates and the winged gold Victoria Memorial.",
      history:
        'Originally built as Buckingham House for the Duke of Buckingham in 1703, it was acquired by King George III in 1761 and enlarged into a three-wing royal palace by John Nash in the 1820s. Queen Victoria made it the sovereign residence upon her accession in 1837, and Sir Aston Webb added the iconic Portland stone East Front and central balcony in 1913.',
      highlights: [
        '775 rooms including 19 State Rooms, the Throne Room, and the Grand Staircase',
        "Guarded by the King's Guard in scarlet tunics and tall bearskin caps",
        'The Royal Standard flies from the roof mast whenever the Sovereign is in residence',
      ],
    });

    // C. Big Ben (Elizabeth Tower) & Houses of Parliament (-0.05, 0.07, 0.996)
    const bigBenDir = new THREE.Vector3(-0.05, 0.07, 0.996).normalize();
    const bigBenYaw = this.computeYawFacingTarget(bigBenDir, ROAD_NODES.eye);
    this.placeStaticObject('bigben', bigBenDir, bigBenYaw, true, false, {
      id: 'big_ben_parliament',
      title: 'Big Ben (Elizabeth Tower) & Palace of Westminster',
      borough: 'City of Westminster',
      yearBuilt: '1859',
      style: 'Perpendicular Gothic Revival',
      architect: 'Sir Charles Barry & Augustus Pugin',
      summary:
        "London's world-famous 316-foot Gothic clock tower and riverside seat of the UK Parliament, featuring four 23-foot opal glass clock dials and the cast-iron Ayrton Light.",
      history:
        'After a devastating fire destroyed the medieval Palace of Westminster in 1834, Charles Barry and Augustus Pugin designed the grand limestone Gothic Revival complex along the North Bank of the Thames. Completed in 1859, the clock tower houses the 13.7-tonne Great Bell ("Big Ben") and remained the largest four-faced chiming clock in the world.',
      highlights: [
        'Four 7-meter clock dials framed in 24-carat gold leaf with Latin inscriptions',
        'Synchronized live to London Greenwich Mean Time (GMT) day and night',
        'Ayrton Light lantern above the belfry illuminates when Parliament sits after dark',
      ],
    });

    // D. Westminster Bridge (0.03, -0.04, 0.999)
    const westminsterBridgeDir = new THREE.Vector3(0.03, -0.04, 0.999).normalize();
    const westminsterBridgeYaw = this.computeYawFacingTarget(
      westminsterBridgeDir,
      ROAD_NODES.eye,
    );
    this.placeStaticObject(
      'westminsterbridge',
      westminsterBridgeDir,
      westminsterBridgeYaw,
      true,
      false,
      {
        id: 'westminster_bridge',
        title: 'Westminster Bridge',
        borough: 'Westminster to Lambeth (South Bank)',
        yearBuilt: '1862',
        style: 'Victorian Cast-Iron Seven-Arch Bridge',
        architect: 'Thomas Page & Sir Charles Barry',
        summary:
          'The oldest surviving road bridge across the central River Thames, painted in distinctive verdigris green to match the leather benches of the House of Commons.',
        history:
          'Opened on Queen Victoria’s birthday in May 1862 to replace an 18th-century stone bridge, Westminster Bridge was engineered by Thomas Page with Gothic trefoil detailing by Charles Barry. Its seven low-slung iron arches link Parliament Square on the North Bank directly to County Hall and the London Eye on the South Bank.',
        highlights: [
          'Painted in green — the official color of the House of Commons chambers',
          'Crowned by ornate Victorian octagonal gas-style triple-globe streetlamps',
          'Immortalized by William Wordsworth’s sonnet "Composed upon Westminster Bridge"',
        ],
      },
    );

    // E. The London Eye (0.11, -0.15, 0.982)
    const londonEyeDir = new THREE.Vector3(0.11, -0.15, 0.982).normalize();
    const londonEyeYaw = this.computeYawFacingTarget(londonEyeDir, bigBenDir);
    this.placeStaticObject('londoneye', londonEyeDir, londonEyeYaw, true, false, {
      id: 'london_eye',
      title: 'The London Eye (Millennium Wheel)',
      borough: 'London Borough of Lambeth (South Bank)',
      yearBuilt: '2000',
      style: 'High-Tech Cantilevered Observation Wheel',
      architect: 'Marks Barfield Architects',
      summary:
        'A 443-foot cantilevered observation wheel on the South Bank of the River Thames with 32 sealed glass passenger capsules representing the London boroughs.',
      history:
        'Designed by husband-and-wife architects David Marks and Julia Barfield to celebrate the turn of the Millennium, the London Eye was assembled flat on barges over the Thames before being hoisted upright. Supported from one side only by a giant white A-frame spindle, it offers sweeping 25-mile panoramas across the capital.',
      highlights: [
        '32 ovoid glass passenger pods — one for each London borough',
        'Cantilevered A-frame engineering anchored into the South Bank Jubilee Gardens',
        'Directly faces the Houses of Parliament and Big Ben across Westminster Reach',
      ],
    });

    // F. St. Paul's Cathedral (0.26, 0.25, 0.932)
    const stPaulsDir = new THREE.Vector3(0.26, 0.25, 0.932).normalize();
    const stPaulsYaw = this.computeYawFacingTarget(stPaulsDir, ROAD_NODES.trafalgar);
    this.placeStaticObject('stpauls', stPaulsDir, stPaulsYaw, true, false, {
      id: 'st_pauls_cathedral',
      title: "St. Paul's Cathedral",
      borough: 'City of London (Ludgate Hill)',
      yearBuilt: '1710',
      style: 'English Baroque',
      architect: 'Sir Christopher Wren',
      summary:
        'Sir Christopher Wren’s English Baroque masterpiece crowning Ludgate Hill, famous for its lead-sheathed triple dome, Corinthian colonnade, and Golden Gallery.',
      history:
        'After the Great Fire of London destroyed Old St. Paul’s in 1666, Sir Christopher Wren spent 35 years designing and building the present Portland stone cathedral. Completed in 1710, its 365-foot dome dominated the London skyline for over 250 years and became a symbol of resilience when it survived the Blitz of World War II.',
      highlights: [
        'Ingenious triple-shell dome with an inner Whispering Gallery and Golden Cross',
        'Twin Baroque West Front bell towers flanking a double-story Corinthian portico',
        'Resting place of Admiral Lord Nelson, the Duke of Wellington, and Christopher Wren',
      ],
    });

    // G. London Bridge & Millennium Crossing (0.39, -0.01, 0.921)
    const londonBridgeDir = new THREE.Vector3(0.39, -0.01, 0.921).normalize();
    const londonBridgeYaw = this.computeYawFacingTarget(
      londonBridgeDir,
      ROAD_NODES.shard,
    );
    this.placeStaticObject('bridge', londonBridgeDir, londonBridgeYaw, true, false, {
      id: 'london_bridge',
      title: 'London Bridge Crossing',
      borough: 'City of London to Southwark',
      yearBuilt: '43 AD / 1973',
      style: 'Historic Thames River Crossing',
      architect: 'John Rennie / Lord Holford',
      summary:
        'The oldest river crossing site in London, linking the ancient Roman financial heart of the City of London directly to Southwark and Borough Market.',
      history:
        'First bridged by the Romans around 50 AD at the lowest tidal crossing point of the Thames, medieval London Bridge was famous for over 600 years for its houses, shops, and waterwheels built directly across its 19 stone arches. Today it serves as the vital commuter artery between Bank and London Bridge Quarter.',
      highlights: [
        'Marks the boundary between the upper Thames and the maritime Pool of London',
        'Directly connects Monument & Cannon Street on the North Bank to The Shard',
        'Celebrated in folklore, medieval chronicles, and the classic nursery rhyme',
      ],
    });

    // H. The Shard (0.39, -0.17, 0.905)
    const shardDir = new THREE.Vector3(0.39, -0.17, 0.905).normalize();
    const shardYaw = this.computeYawFacingTarget(shardDir, stPaulsDir);
    this.placeStaticObject('shard', shardDir, shardYaw, true, false, {
      id: 'the_shard',
      title: 'The Shard (London Bridge Tower)',
      borough: 'London Borough of Southwark',
      yearBuilt: '2012',
      style: 'Neo-Futurist Glass Spire',
      architect: 'Renzo Piano',
      summary:
        "The tallest skyscraper in the United Kingdom at 1,016 feet (309.6m), sculpted from eight angled glass facets that fracture open at the summit like a crystal spire.",
      history:
        'Inspired by the church spires of Christopher Wren and the masts of tall ships painted by Canaletto on the Thames, Pritzker Prize-winning architect Renzo Piano designed The Shard as a "vertical city" rising directly above London Bridge station. Its extra-white low-iron glass facade reflects the ever-changing London sky.',
      highlights: [
        '11,000 angled glass panels equivalent in area to eight football pitches',
        'Open-air fractures at the 95th-story crown allow the building to breathe in the wind',
        'Houses offices, restaurants, a hotel, and the 72nd-floor View from The Shard',
      ],
    });

    // I. The Gherkin — 30 St Mary Axe (0.50, 0.26, 0.826)
    const gherkinDir = new THREE.Vector3(0.50, 0.26, 0.826).normalize();
    this.placeStaticObject('shard', gherkinDir, -0.4, true, false, {
      id: 'the_gherkin',
      title: '30 St Mary Axe ("The Gherkin")',
      borough: 'City of London (Financial District)',
      yearBuilt: '2004',
      style: 'High-Tech Diagrid Skyscraper',
      architect: 'Foster + Partners (Lord Norman Foster)',
      summary:
        'An iconic 591-foot bullet-shaped tower in the City of London featuring a spiraling diamond-lattice steel exoskeleton and aerodynamic energy-saving atriums.',
      history:
        'Built on the historic site of the Baltic Exchange in the heart of the Square Mile, Norman Foster’s 41-story tower revolutionized sustainable high-rise design. Its curved profile deflects wind turbulence from street level while spiraling dark-and-light glass bands trace six internal sky-courts that act as the building’s lungs.',
      highlights: [
        'Column-free interior supported entirely by its external steel diagrid lattice',
        'Topped by a 360-degree glass lens dome overlooking the City of London',
        'Winner of the prestigious RIBA Stirling Prize for Architecture in 2004',
      ],
    });

    // J. Tower of London — Historic White Tower (0.59, 0.14, 0.795)
    const towerOfLondonDir = new THREE.Vector3(0.59, 0.14, 0.795).normalize();
    const towerOfLondonYaw = this.computeYawFacingTarget(
      towerOfLondonDir,
      ROAD_NODES.tower_south,
    );
    this.placeStaticObject(
      'toweroflondon',
      towerOfLondonDir,
      towerOfLondonYaw,
      true,
      false,
      {
        id: 'tower_of_london',
        title: 'His Majesty’s Royal Palace & Fortress of the Tower of London',
        borough: 'London Borough of Tower Hamlets (Tower Hill)',
        yearBuilt: '1078',
        style: 'Norman Romanesque & Medieval Concentric Fortress',
        architect: 'William the Conqueror & Gundulf of Rochester',
        summary:
          'A 950-year-old Norman castle on the North Bank of the Thames, home to the Crown Jewels, the Yeoman Warders ("Beefeaters"), and the legendary Tower Ravens.',
        history:
          'Founded by William the Conqueror in 1066 and anchored by the Caen-stone White Tower begun in 1078, the Tower of London has served as a royal palace, armory, royal mint, menagerie, and state prison. Expanded with concentric curtain walls and a moat by Kings Richard the Lionheart, Henry III, and Edward I, it is a UNESCO World Heritage Site.',
        highlights: [
          'Safeguards the priceless British Crown Jewels under armed guard',
          'Corner turrets topped by three square Norman towers and one round observatory turret',
          'Legend holds that if the six resident ravens ever leave the Tower, the kingdom will fall',
        ],
      },
    );

    // K. Tower Bridge (0.60, -0.03, 0.799)
    const towerBridgeDir = new THREE.Vector3(0.60, -0.03, 0.799).normalize();
    const towerBridgeYaw = this.computeYawFacingTarget(
      towerBridgeDir,
      ROAD_NODES.tower_south,
    );
    this.placeStaticObject(
      'towerbridge',
      towerBridgeDir,
      towerBridgeYaw,
      true,
      false,
      {
        id: 'tower_bridge',
        title: 'Tower Bridge',
        borough: 'Tower Hamlets to Southwark (Pool of London)',
        yearBuilt: '1894',
        style: 'Victorian Gothic Revival Bascule & Suspension Bridge',
        architect: 'Sir Horace Jones & Sir John Wolfe Barry',
        summary:
          'London’s ceremonial gateway across the Pool of London, combining twin Cornish-granite Gothic towers, high-level glass walkways, and blue-and-white suspension chains.',
        history:
          'Built between 1886 and 1894 to allow tall masted ships into the bustling Pool of London without disrupting cross-river road traffic, Tower Bridge conceals a massive 11,000-ton steel framework clad in Portland stone to harmonize with the neighboring Tower of London. Its twin bascules still raise for river vessels today.',
        highlights: [
          'Painted in royal blue, white, and gold for Queen Elizabeth II’s Silver Jubilee in 1977',
          'Twin 140-foot high-level pedestrian walkways linking the North and South towers',
          'Counterweighted hydraulic bascules can open to an 86-degree angle in 60 seconds',
        ],
      },
    );

    // L. Kensington Palace & Royal Orangery (-0.70, 0.20, 0.685)
    const kensingtonPalaceDir = new THREE.Vector3(-0.70, 0.20, 0.685).normalize();
    const kensingtonPalaceYaw = this.computeYawFacingTarget(
      kensingtonPalaceDir,
      ROAD_NODES.palace,
    );
    this.placeStaticObject(
      'palace',
      kensingtonPalaceDir,
      kensingtonPalaceYaw,
      true,
      false,
      {
        id: 'kensington_palace',
        title: 'Kensington Palace & The Orangery',
        borough: 'Royal Borough of Kensington and Chelsea',
        yearBuilt: '1605 / 1689',
        style: 'Stuart & Georgian Royal Residence',
        architect: 'Sir Christopher Wren & Nicholas Hawksmoor',
        summary:
          'Set on the western edge of Kensington Gardens, this tranquil royal palace was the birthplace of Queen Victoria and has served as a residence for British royals since 1689.',
        history:
          'Originally a Jacobean mansion known as Nottingham House, it was purchased by King William III and Queen Mary II in 1689 to escape the damp air of Whitehall. Christopher Wren added the grand pavilions and the Queen’s Apartments, while William Kent painted the opulent Cupola Room.',
        highlights: [
          'Birthplace and childhood home of Queen Victoria (born here in May 1819)',
          'Surrounded by the Sunken Garden, Cradle Walk, and the Round Pond in Kensington Gardens',
          'Features the 1704 Baroque Orangery designed by Nicholas Hawksmoor',
        ],
      },
    );

    // M. One Canada Square & Canary Wharf Financial District (0.88, 0.14, 0.453)
    const canaryTowerDir = new THREE.Vector3(0.88, 0.14, 0.453).normalize();
    const canaryTowerYaw = this.computeYawFacingTarget(
      canaryTowerDir,
      ROAD_NODES.tower_north,
    );
    this.placeStaticObject('canarywharf', canaryTowerDir, canaryTowerYaw, true, false, {
      id: 'canary_wharf_tower',
      title: 'One Canada Square (Canary Wharf)',
      borough: 'London Borough of Tower Hamlets (Isle of Dogs)',
      yearBuilt: '1991',
      style: 'Postmodern Stainless-Steel Obelisk Skyscraper',
      architect: 'César Pelli',
      summary:
        'The 770-foot flagship tower of London’s Docklands financial district on the Isle of Dogs, crowned by a gleaming 130-foot illuminated pyramid roof.',
      history:
        'Constructed on the former West India Docks where ships once unloaded fruit and goods from the Canary Islands, One Canada Square spearheaded the dramatic regeneration of East London’s Docklands into a global banking hub. For twenty years it stood as the tallest building in the United Kingdom.',
      highlights: [
        'Clad in durable brushed stainless steel inspired by classic Manhattan skyscrapers',
        'Topped by a pyramid beacon that flashes a warning light to aircraft across East London',
        'Connected to Central London by the Docklands Light Railway (DLR) and Elizabeth Line',
      ],
    });

    // N. Royal Observatory & Old Royal Naval College, Greenwich (0.76, -0.28, 0.581)
    const greenwichDir = new THREE.Vector3(0.76, -0.28, 0.581).normalize();
    const greenwichYaw = this.computeYawFacingTarget(
      greenwichDir,
      ROAD_NODES.canary_wharf,
    );
    this.placeStaticObject('greenwich', greenwichDir, greenwichYaw, true, false, {
      id: 'royal_greenwich',
      title: 'Royal Observatory & Old Royal Naval College, Greenwich',
      borough: 'Royal Borough of Greenwich',
      yearBuilt: '1675 / 1696',
      style: 'English Baroque Maritime Ensemble',
      architect: 'Sir Christopher Wren & Inigo Jones',
      summary:
        'Home of the Prime Meridian (0°00\'00" Longitude) and Greenwich Mean Time (GMT), overlooking the sweeping river bend of Maritime Greenwich.',
      history:
        'Commissioned by King Charles II in 1675 so Royal Astronomer John Flamsteed could perfect celestial navigation at sea, the Royal Observatory sits atop Greenwich Hill above the twin Baroque domes of Christopher Wren’s Old Royal Naval College and Inigo Jones’s Queen’s House.',
      highlights: [
        'Defines Longitude 0° — where the Eastern and Western Hemispheres meet',
        'Home to the bright red Flamsteed Time Ball that drops daily at 13:00 GMT since 1833',
        'Designated a UNESCO World Heritage Site for its maritime and scientific legacy',
      ],
    });

    // O. Battersea Power Station (-0.26, -0.35, 0.90)
    const batterseaDir = new THREE.Vector3(-0.26, -0.35, 0.90).normalize();
    const batterseaYaw = this.computeYawFacingTarget(
      batterseaDir,
      ROAD_NODES.palace,
    );
    this.placeStaticObject('battersea', batterseaDir, batterseaYaw, true, false, {
      id: 'battersea_power_station',
      title: 'Battersea Power Station',
      borough: 'London Borough of Wandsworth (Nine Elms)',
      yearBuilt: '1933 / 1955',
      style: 'Art Deco Brick Cathedral of Power',
      architect: 'Sir Giles Gilbert Scott',
      summary:
        'A monumental Grade II* listed Art Deco landmark on the South Bank of the Thames, instantly recognizable by its four towering white fluted chimneys.',
      history:
        'Designed by Sir Giles Gilbert Scott—the same architect who created Britain’s red K6 telephone box—Battersea Power Station once supplied a fifth of London’s electricity, including Buckingham Palace and the Houses of Parliament. After decades of dereliction, it was restored into a vibrant riverside quarter.',
      highlights: [
        'One of the largest brick buildings in the world, containing over 6 million bricks',
        'Four 331-foot white Art Deco chimneys modeled on classical fluted columns',
        'Featured on the cover of Pink Floyd’s 1977 album "Animals"',
      ],
    });

    // P. Wimbledon Windmill on the Common (-0.14, -0.64, -0.755)
    const wimbledonMillDir = new THREE.Vector3(-0.14, -0.64, -0.755).normalize();
    const wimbledonMillYaw = this.computeYawFacingTarget(
      wimbledonMillDir,
      ROAD_NODES.richmond,
    );
    this.placeStaticObject('windmill', wimbledonMillDir, wimbledonMillYaw, true, false, {
      id: 'wimbledon_windmill',
      title: 'Wimbledon Windmill',
      borough: 'London Borough of Merton (Wimbledon Common)',
      yearBuilt: '1817',
      style: 'Georgian Hollow-Post Smock Mill',
      architect: 'Charles March',
      summary:
        'A picturesque white-painted octagonal timber smock mill standing in the wooded expanse of Wimbledon Common in Southwest London.',
      history:
        'Built in 1817 by carpenter Charles March to grind corn for surrounding Surrey villages, Wimbledon Windmill operated until 1864 when its machinery was removed and the brick base was converted into six cottages. In 1908, Robert Baden-Powell wrote parts of "Scouting for Boys" in the mill house.',
      highlights: [
        'Rare hollow-post smock design combining a two-story brick base with an octagonal tower',
        'Preserved as a working museum in the heart of 1,140-acre Wimbledon Common',
        'Restored rotating four-sail cap that catches the Southwest London breeze',
      ],
    });

    // Q. Brixton Windmill — Ashby's Mill (0.14, -0.50, 0.854)
    const brixtonMillDir = new THREE.Vector3(0.14, -0.50, 0.854).normalize();
    const brixtonMillYaw = this.computeYawFacingTarget(
      brixtonMillDir,
      ROAD_NODES.eye,
    );
    this.placeStaticObject('windmill', brixtonMillDir, brixtonMillYaw, true, false, {
      id: 'brixton_windmill',
      title: "Brixton Windmill (Ashby's Mill)",
      borough: 'London Borough of Lambeth (Brixton Hill)',
      yearBuilt: '1816',
      style: 'Regency Brick Tower Mill',
      architect: 'John Ashby',
      summary:
        'Inner London’s last surviving working windmill, built on Brixton Hill during the Regency era and still milling stoneground wholemeal flour today.',
      history:
        'Leaseholder John Ashby erected this four-story brick tower mill in 1816 when Lambeth was still rolling farmland south of the Thames. When new Victorian housing terraces blocked the wind in 1862, the Ashby family installed steam and gas engines to keep grinding flour for London bakeries until 1934.',
      highlights: [
        'Grade II* listed Regency industrial monument in Windmill Gardens',
        'Retains two pairs of traditional millstones — one wind-driven, one modular',
        'Restored white boat-shaped cap and sails contrasting with tarred brickwork',
      ],
    });

    // R. Trinity Buoy Wharf Lighthouse (0.94, 0.04, 0.338)
    const trinityLightDir = new THREE.Vector3(0.94, 0.04, 0.338).normalize();
    const trinityLightYaw = this.computeYawFacingTarget(
      trinityLightDir,
      ROAD_NODES.canary_wharf,
    );
    this.placeStaticObject('lighthouse', trinityLightDir, trinityLightYaw, true, false, {
      id: 'trinity_buoy_lighthouse',
      title: 'Trinity Buoy Wharf Lighthouse',
      borough: 'London Borough of Tower Hamlets (Leamouth)',
      yearBuilt: '1864',
      style: 'Victorian Experimental Maritime Lighthouse',
      architect: 'Sir James Douglass (Trinity House)',
      summary:
        'London’s only lighthouse, standing at the confluence of the River Thames and Bow Creek where scientist Michael Faraday tested electric maritime beacons.',
      history:
        'Constructed in 1864 by Trinity House—the authority responsible for all English lighthouses—this experimental tower was used to test optical lenses and train lighthouse keepers across the British Empire. Physicist Michael Faraday conducted his pioneering electric arc lighting experiments inside its lantern room.',
      highlights: [
        'Laboratory of Victorian physicist Michael Faraday’s maritime light experiments',
        'Overlooks the Thames Estuary approach and the O2 Peninsula across the river',
        'Sweeping nocturnal searchlight beam illuminates the eastern Thames reaches',
      ],
    });

    // S. Kew Palace & Royal Botanic Pagoda (-0.84, 0.16, -0.518)
    const kewPalaceDir = new THREE.Vector3(-0.84, 0.16, -0.518).normalize();
    const kewPalaceYaw = this.computeYawFacingTarget(
      kewPalaceDir,
      ROAD_NODES.richmond,
    );
    this.placeStaticObject('kewpalace', kewPalaceDir, kewPalaceYaw, true, false, {
      id: 'kew_palace_gardens',
      title: 'Kew Palace & Royal Botanic Gardens',
      borough: 'London Borough of Richmond upon Thames',
      yearBuilt: '1631 / 1759',
      style: 'Flemish-Bond Dutch Gable Royal Villa',
      architect: 'Samuel Fortrey & Sir William Chambers',
      summary:
        'The intimate red-brick royal retreat of King George III and Queen Charlotte, nestled inside the 300-acre UNESCO World Heritage Royal Botanic Gardens at Kew.',
      history:
        'Built in 1631 by silk merchant Samuel Fortrey in the Mannerist "Artisan" style with curved Dutch gables, Kew Palace became the beloved summer home of King George III. Surrounding it are the world-famous Palm House, Temperate House, and the 163-foot Great Pagoda designed by Sir William Chambers in 1762.',
      highlights: [
        'Intact Georgian royal kitchens, Queen Charlotte’s cottage, and riverside gardens',
        'Home to the world’s largest collection of living plants (over 50,000 species)',
        'Connected across the Thames by the three-arched stone Kew Bridge',
      ],
    });

    // T. ArcelorMittal Orbit & Queen Elizabeth Olympic Park, Stratford (0.82, 0.40, -0.41)
    const stratfordOrbitDir = new THREE.Vector3(0.82, 0.40, -0.41).normalize();
    const stratfordOrbitYaw = this.computeYawFacingTarget(
      stratfordOrbitDir,
      ROAD_NODES.canary_wharf,
    );
    this.placeStaticObject(
      'londoneye',
      stratfordOrbitDir,
      stratfordOrbitYaw,
      true,
      false,
      {
        id: 'olympic_park_stratford',
        title: 'Queen Elizabeth Olympic Park & Observation Wheel',
        borough: 'London Borough of Newham (Stratford)',
        yearBuilt: '2012',
        style: 'Contemporary Structural Expressionism',
        architect: 'Sir Anish Kapoor, Cecil Balmond & Zaha Hadid',
        summary:
          'The legacy hub of the London 2012 Olympic and Paralympic Games in East London, featuring dramatic sculptural landmarks, waterways, and cultural venues.',
        history:
          'Created for the 2012 Summer Olympics across 560 acres of reclaimed industrial marshland along the River Lea, the park transformed Stratford into a major East London cultural and technology district ("East Bank") with new parks, stadiums, and skyline observation towers.',
        highlights: [
          'Panoramic views stretching 20 miles across Canary Wharf and the City of London',
          'Set amidst the Lea Valley waterways, Velopark, and Zaha Hadid’s Aquatics Centre',
          'Linked directly to Shoreditch, Hampstead, and Docklands via the eastern avenues',
        ],
      },
    );

    // U. Severndroog Castle & Dulwich Picture Gallery (0.54, -0.54, -0.645)
    const dulwichTowerDir = new THREE.Vector3(0.54, -0.54, -0.645).normalize();
    const dulwichTowerYaw = this.computeYawFacingTarget(
      dulwichTowerDir,
      ROAD_NODES.greenwich,
    );
    this.placeStaticObject(
      'watchtower',
      dulwichTowerDir,
      dulwichTowerYaw,
      true,
      false,
      {
        id: 'dulwich_severndroog',
        title: 'Severndroog Castle & Dulwich Heritage Quarter',
        borough: 'Southwark & Royal Borough of Greenwich',
        yearBuilt: '1784 / 1811',
        style: 'Georgian Gothic Revival Folly & Gallery',
        architect: 'Richard Jupp & Sir John Soane',
        summary:
          'A romantic 18th-century Gothic turret rising above the ancient oak woodlands of South London alongside Sir John Soane’s pioneering public art gallery in Dulwich.',
        history:
          'Built in 1784 on Shooter’s Hill to commemorate Commodore Sir William James and perched near Dulwich Village—where Sir John Soane designed the world’s first purpose-built public art gallery in 1811—this South London ridge offers sweeping vistas back toward the Thames.',
        highlights: [
          'Triangular Gothic turret with hexagonal corner towers and crenellated battlements',
          'Neighbors Dulwich Village, one of London’s best-preserved Georgian enclaves',
          'Surrounded by ancient South London woodland and ornamental parkways',
        ],
      },
    );

    // V. Westminster & Bankside Thames Clipper Piers
    const westminsterPierDir = new THREE.Vector3(0.18, 0.04, 0.983).normalize();
    this.placeStaticObject('dock', westminsterPierDir, 1.55, true, false, {
      id: 'westminster_pier',
      title: 'Victoria Embankment & Westminster Pier',
      borough: 'City of Westminster',
      yearBuilt: '1870',
      style: 'Victorian Granite River Embankment Pier',
      architect: 'Sir Joseph Bazalgette',
      summary:
        'A bustling riverboat pier along Sir Joseph Bazalgette’s granite Victoria Embankment, where Thames Clippers and sightseeing boats depart between Westminster and Greenwich.',
      history:
        'Constructed as part of Sir Joseph Bazalgette’s monumental 1864–1870 Victoria Embankment engineering project—which reclaimed 37 acres from the River Thames while housing London’s intercepting sewer and District Line railway—this pier connects river travelers to Whitehall and the West End.',
      highlights: [
        'Engineered by Sir Joseph Bazalgette using Cornish and Aberdeen granite',
        'Adorned with cast-iron dolphin lamp standards and bronze lion mooring rings',
        'Gateway for Thames riverboats sailing past St. Paul’s, The Shard, and Tower Bridge',
      ],
    });

    // =========================================================================
    // 2. 44 GEORGIAN & VICTORIAN LONDON TOWNHOUSES ACROSS ALL 360° BOROUGHS
    //    (Every house is verified on dry land well clear of the River Thames!)
    // =========================================================================
    const houseConfigs: {
      dir: THREE.Vector3;
      faceTarget: THREE.Vector3;
      title: string;
      borough: string;
      yearBuilt: string;
      style: string;
      architect: string;
      summary: string;
      history: string;
    }[] = [
      // Belgravia & Mayfair
      {
        dir: new THREE.Vector3(-0.52, 0.24, 0.819).normalize(),
        faceTarget: ROAD_NODES.kensington,
        title: 'Belgrave Square Georgian Terrace',
        borough: 'Belgravia, City of Westminster',
        yearBuilt: '1826',
        style: 'Regency White-Stucco Townhouse',
        architect: 'Thomas Cubitt & George Basevi',
        summary: 'Grand cream-stuccoed Regency townhouse with wrought-iron balconies and portico entrance in the heart of Belgravia.',
        history: 'Developed by master builder Thomas Cubitt for the Grosvenor Estate in the 1820s, Belgravia transformed former marshy Five Fields west of Buckingham Palace into London’s most aristocratic residential quarter.',
      },
      {
        dir: new THREE.Vector3(-0.46, 0.30, 0.835).normalize(),
        faceTarget: ROAD_NODES.palace,
        title: 'Grosvenor Square Mayfair Residence',
        borough: 'Mayfair, City of Westminster',
        yearBuilt: '1774',
        style: 'Georgian Red-Brick & Portland Stone',
        architect: 'Robert Adam',
        summary: 'Elegant Georgian townhouse in Mayfair featuring tall sash windows, fanlight doorway, and classical cornice.',
        history: 'Named after the annual two-week "May Fair" held in Shepherd Market until 1764, Mayfair became the epicenter of Georgian society between Hyde Park and Regent Street.',
      },
      // Knightsbridge & Kensington
      {
        dir: new THREE.Vector3(-0.62, 0.26, 0.739).normalize(),
        faceTarget: ROAD_NODES.kensington,
        title: 'Egerton Crescent Townhouse',
        borough: 'Knightsbridge, Kensington & Chelsea',
        yearBuilt: '1843',
        style: 'Early Victorian Italianate Stucco',
        architect: 'George Basevi',
        summary: 'Curved Italianate terrace house overlooking manicured communal gardens in Knightsbridge.',
        history: 'Built during the early reign of Queen Victoria along the western approach to Hyde Park, Knightsbridge blossomed around the Great Exhibition of 1851 in neighboring South Kensington.',
      },
      {
        dir: new THREE.Vector3(-0.75, 0.14, 0.646).normalize(),
        faceTarget: ROAD_NODES.kensington,
        title: 'Kensington Palace Gardens Villa',
        borough: 'Royal Borough of Kensington & Chelsea',
        yearBuilt: '1846',
        style: 'Victorian Palazzetto Architecture',
        architect: 'Sir Charles Barry',
        summary: 'Tree-lined Victorian villa bordering Kensington Gardens with ornamental window boxes and slate mansard roof.',
        history: 'Laid out on the former kitchen gardens of Kensington Palace in the 1840s, this leafy avenue became famous for its grand Victorian villas and diplomatic residences.',
      },
      // Notting Hill & Holland Park
      {
        dir: new THREE.Vector3(-0.78, 0.38, 0.49).normalize(),
        faceTarget: ROAD_NODES.notting_hill,
        title: 'Portobello Road Pastel Terrace',
        borough: 'Notting Hill, Kensington & Chelsea',
        yearBuilt: '1858',
        style: 'Victorian Pastel-Stucco Terrace',
        architect: 'Thomas Allom',
        summary: 'Vibrant pastel-painted Victorian townhouse in Notting Hill along the famous Portobello antique market route.',
        history: 'Originally developed as the Ladbroke Estate in the 1850s with private communal paddock gardens behind each crescent, Notting Hill is celebrated worldwide for its colorful facades and Caribbean Carnival.',
      },
      {
        dir: new THREE.Vector3(-0.86, 0.30, 0.41).normalize(),
        faceTarget: ROAD_NODES.notting_hill,
        title: 'Lansdowne Crescent Garden House',
        borough: 'Notting Hill, Kensington & Chelsea',
        yearBuilt: '1862',
        style: 'Mid-Victorian Classical Crescent',
        architect: 'James Thomson',
        summary: 'Curved stuccoed townhouse perched on Notting Hill crest with private rear access to communal lawns.',
        history: 'Designed around the circular topography of St. John’s Hill, the crescents of Notting Hill pioneered the Victorian ideal of shared woodland gardens enclosed within urban blocks.',
      },
      // Paddington, Bayswater & Marylebone
      {
        dir: new THREE.Vector3(-0.62, 0.44, 0.649).normalize(),
        faceTarget: ROAD_NODES.paddington,
        title: 'Connaught Village Georgian House',
        borough: 'Paddington, City of Westminster',
        yearBuilt: '1828',
        style: 'Late Georgian Stock-Brick Terrace',
        architect: 'Samuel Pepys Cockerell',
        summary: 'Warm London stock-brick townhouse near Paddington Basin and Hyde Park’s Albion Gate.',
        history: 'Part of the historic Tyburnia estate north of Bayswater Road, Paddington expanded rapidly after Isambard Kingdom Brunel opened Paddington Station in 1854.',
      },
      {
        dir: new THREE.Vector3(-0.46, 0.48, 0.747).normalize(),
        faceTarget: ROAD_NODES.paddington,
        title: 'Baker Street & Marylebone Terrace',
        borough: 'Marylebone, City of Westminster',
        yearBuilt: '1790',
        style: 'Georgian Grid Townhouse',
        architect: 'John Prince (Portman Estate)',
        summary: 'Classic four-story Marylebone townhouse on the historic Portman grid near Baker Street.',
        history: 'Immortalized by Sir Arthur Conan Doyle as the neighborhood of Sherlock Holmes at 221B Baker Street, Marylebone retains its crisp 18th-century street grid and village high street.',
      },
      // Regent's Park & Primrose Hill
      {
        dir: new THREE.Vector3(-0.18, 0.54, 0.822).normalize(),
        faceTarget: ROAD_NODES.regents,
        title: "Cumberland Terrace (Regent's Park)",
        borough: 'London Borough of Camden',
        yearBuilt: '1826',
        style: 'Regency Neoclassical Palace Facade',
        architect: 'John Nash',
        summary: 'Palatial Regency terrace overlooking the outer circle of Regent’s Park with sculpted pediments.',
        history: 'Commissioned by the Prince Regent (later King George IV) as part of a grand royal route from Carlton House up Regent Street to Regent’s Park, John Nash’s terraces remain a pinnacle of Regency urbanism.',
      },
      {
        dir: new THREE.Vector3(-0.34, 0.60, 0.724).normalize(),
        faceTarget: ROAD_NODES.regents,
        title: 'Chalcot Square Pastel House',
        borough: 'Primrose Hill, London Borough of Camden',
        yearBuilt: '1855',
        style: 'Italianate Pastel Victorian Villa',
        architect: 'Eton College Estate',
        summary: 'Storybook pastel-painted Victorian townhouse at the foot of Primrose Hill.',
        history: 'Home over the decades to poets Sylvia Plath and Ted Hughes as well as Paddington Bear in fiction, Chalcot Square is famed for its candy-colored stucco facades.',
      },
      // Bloomsbury & Covent Garden
      {
        dir: new THREE.Vector3(0.04, 0.34, 0.939).normalize(),
        faceTarget: ROAD_NODES.trafalgar,
        title: 'Bedford Square Literary Townhouse',
        borough: 'Bloomsbury, London Borough of Camden',
        yearBuilt: '1780',
        style: 'Georgian Coade-Stone Doorway Terrace',
        architect: 'Thomas Leverton',
        summary: 'Complete Georgian garden square house in literary Bloomsbury near the British Museum.',
        history: 'Built between 1775 and 1783 for the Duke of Bedford, Bloomsbury’s garden squares became the intellectual home of the Bloomsbury Group, Virginia Woolf, and Charles Dickens.',
      },
      {
        dir: new THREE.Vector3(0.16, 0.36, 0.919).normalize(),
        faceTarget: ROAD_NODES.stpauls,
        title: 'Lincoln’s Inn & Chancery Lane Chambers',
        borough: 'Holborn, City of Westminster / Camden',
        yearBuilt: '1725',
        style: 'Queen Anne & Early Georgian Legal Chambers',
        architect: 'Inns of Court Master Builders',
        summary: 'Historic brick chambers flanking London’s ancient legal quarter above Fleet Street.',
        history: 'Situated between the City of London and the Royal Courts of Justice on the Strand, Holborn and Lincoln’s Inn have housed barristers and scholars since the 15th century.',
      },
      // Camden & Hampstead
      {
        dir: new THREE.Vector3(0.06, 0.64, 0.766).normalize(),
        faceTarget: ROAD_NODES.camden,
        title: 'Regent’s Canal Lockside Cottage',
        borough: 'Camden Town, London Borough of Camden',
        yearBuilt: '1824',
        style: 'Regency Canal-Keeper’s Cottage',
        architect: 'John Nash & James Morgan',
        summary: 'Charming canal-side house beside Camden Lock where narrowboats traverse North London.',
        history: 'Opened in 1820 to link the Grand Junction Canal at Paddington to the Thames at Limehouse, the Regent’s Canal turned Camden into a bustling junction of waterways, railways, and music.',
      },
      {
        dir: new THREE.Vector3(0.18, 0.60, 0.779).normalize(),
        faceTarget: ROAD_NODES.camden,
        title: 'St. Pancras & King’s Cross Victorian Terrace',
        borough: 'King’s Cross, London Borough of Camden',
        yearBuilt: '1868',
        style: 'High Victorian Gothic Revival Brick',
        architect: 'Sir George Gilbert Scott School',
        summary: 'Red-brick Victorian townhouse with pointed dormer gables near St. Pancras Chambers.',
        history: 'Built during the golden age of the Midland and Great Northern Railways, the streets around King’s Cross blend polychrome brickwork with restored industrial heritage.',
      },
      {
        dir: new THREE.Vector3(-0.08, 0.84, 0.536).normalize(),
        faceTarget: ROAD_NODES.hampstead,
        title: 'Church Row Georgian House, Hampstead',
        borough: 'Hampstead, London Borough of Camden',
        yearBuilt: '1720',
        style: 'Queen Anne Hilltop Townhouse',
        architect: 'Hampstead Master Carpenters',
        summary: 'Historic hilltop townhouse on cobbled Church Row near the wild meadows of Hampstead Heath.',
        history: 'Perched 400 feet above the Thames basin, Hampstead grew as an 18th-century chalybeate spa village and sanctuary for poet John Keats and painter John Constable.',
      },
      {
        dir: new THREE.Vector3(0.08, 0.80, 0.594).normalize(),
        faceTarget: ROAD_NODES.hampstead,
        title: 'Keats Grove Regency Cottage',
        borough: 'Hampstead Heath, Camden',
        yearBuilt: '1815',
        style: 'Regency Villa with Veranda',
        architect: 'William Woods',
        summary: 'White-washed Regency villa nestled beneath old-growth oaks on the southern edge of Hampstead Heath.',
        history: 'It was in a garden just like this in Hampstead in the spring of 1819 that Romantic poet John Keats listened to a nightingale and composed "Ode to a Nightingale".',
      },
      // Islington, Clerkenwell & Shoreditch
      {
        dir: new THREE.Vector3(0.36, 0.52, 0.774).normalize(),
        faceTarget: ROAD_NODES.islington,
        title: 'Canonbury Square Georgian Terrace',
        borough: 'Islington, London Borough of Islington',
        yearBuilt: '1805',
        style: 'Late Georgian Villa Terrace',
        architect: 'Henry Leroux',
        summary: 'Graceful Georgian townhouse in leafy Islington with wrought-iron fanlight and garden square view.',
        history: 'Once home to author George Orwell and publisher Evelyn Waugh, Islington’s early 19th-century squares were built along the ridge overlooking the City of London.',
      },
      {
        dir: new THREE.Vector3(0.48, 0.46, 0.747).normalize(),
        faceTarget: ROAD_NODES.islington,
        title: 'Camden Passage Antique Shop House',
        borough: 'Angel, London Borough of Islington',
        yearBuilt: '1795',
        style: 'Georgian Shopfront & Residence',
        architect: 'Islington Guild Builders',
        summary: 'Timber-trimmed Georgian townhouse and shopfront along pedestrianized Camden Passage.',
        history: 'Established along the ancient Great North Road out of the City of London, Angel and Camden Passage have hosted markets, coaching inns, and antique dealers for centuries.',
      },
      {
        dir: new THREE.Vector3(0.62, 0.38, 0.686).normalize(),
        faceTarget: ROAD_NODES.shoreditch,
        title: 'Fournier Street Huguenot Silk-Weaver House',
        borough: 'Spitalfields & Shoreditch, Tower Hamlets',
        yearBuilt: '1726',
        style: 'Early Georgian Huguenot Townhouse',
        architect: 'Nicholas Hawksmoor Circle',
        summary: 'Preserved 18th-century townhouse with wide attic weaver’s windows near Christ Church Spitalfields.',
        history: 'Built in the 1720s by French Protestant Huguenot master silk weavers who settled just east of Bishopsgate, these houses feature wide top-floor windows to maximize daylight at the looms.',
      },
      {
        dir: new THREE.Vector3(0.74, 0.30, 0.601).normalize(),
        faceTarget: ROAD_NODES.shoreditch,
        title: 'Columbia Road Flower Market Cottage',
        borough: 'Bethnal Green & Shoreditch, Tower Hamlets',
        yearBuilt: '1866',
        style: 'Victorian Market Terrace',
        architect: 'Baroness Burdett-Coutts Estate',
        summary: 'Cozy Victorian cottage with overflowing flower boxes on East London’s Columbia Road.',
        history: 'Founded by philanthropist Angela Burdett-Coutts in the 1860s, Columbia Road became famous for its Sunday flower market where East Enders bought plants for their window boxes.',
      },
      // Canary Wharf & Docklands (North of Thames)
      {
        dir: new THREE.Vector3(0.82, 0.18, 0.543).normalize(),
        faceTarget: ROAD_NODES.canary_wharf,
        title: 'Narrow Street Georgian Captain’s House',
        borough: 'Limehouse, London Borough of Tower Hamlets',
        yearBuilt: '1760',
        style: 'Maritime Georgian Townhouse',
        architect: 'Thames Master Shipwrights',
        summary: 'Historic sea captain’s house in Limehouse overlooking the approach to Canary Wharf.',
        history: 'Narrow Street in Limehouse is one of East London’s oldest surviving Georgian streets, once inhabited by sea captains, shipwrights, and East India Company merchants.',
      },
      // South Bank, Southwark & Tower Bridge South
      {
        dir: new THREE.Vector3(0.24, -0.22, 0.945).normalize(),
        faceTarget: ROAD_NODES.eye,
        title: 'Roupell Street Artisans’ Cottage',
        borough: 'Waterloo, London Borough of Lambeth',
        yearBuilt: '1828',
        style: 'Late Georgian Artisan Cottage',
        architect: 'John Roupell',
        summary: 'Uniform honey-brick Regency cottage tucked behind the South Bank and Waterloo.',
        history: 'Built by gold smelter John Roupell in the 1820s after the draining of Lambeth Marsh, Roupell Street is prized as one of London’s most intact early 19th-century streetscapes.',
      },
      {
        dir: new THREE.Vector3(0.50, -0.22, 0.838).normalize(),
        faceTarget: ROAD_NODES.shard,
        title: 'Borough Market & St. Thomas Street House',
        borough: 'Southwark, London Borough of Southwark',
        yearBuilt: '1818',
        style: 'Georgian Hop-Merchant’s House',
        architect: 'Southwark Estate Builders',
        summary: 'Historic merchant house in Southwark beside London’s 1,000-year-old Borough Market.',
        history: 'Southwark has been London’s southern larder since medieval times, famous for its coaching inns (like The George Inn), hop warehouses, and Shakespearean playhouses.',
      },
      {
        dir: new THREE.Vector3(0.66, -0.24, 0.712).normalize(),
        faceTarget: ROAD_NODES.tower_south,
        title: 'Shad Thames Spice Warehouse Residence',
        borough: 'Bermondsey, London Borough of Southwark',
        yearBuilt: '1873',
        style: 'Victorian Maritime Conversion',
        architect: 'Butler’s Wharf Architects',
        summary: 'Converted cinnamon, tea, and spice warehouse residence immediately south of Tower Bridge.',
        history: 'Known as the "Larder of Empire" in the 19th century, Shad Thames was lined with aromatic warehouses storing tea, coffee, and spices unloaded in the Pool of London.',
      },
      // Greenwich & Blackheath (Southeast)
      {
        dir: new THREE.Vector3(0.80, -0.32, 0.508).normalize(),
        faceTarget: ROAD_NODES.greenwich,
        title: 'Crooms Hill Georgian Villa, Greenwich',
        borough: 'Royal Borough of Greenwich',
        yearBuilt: '1732',
        style: 'Georgian Parkside Townhouse',
        architect: 'Greenwich Royal Works',
        summary: 'Red-brick Georgian townhouse bordering the western wall of Royal Greenwich Park.',
        history: 'Winding uphill alongside Greenwich Park since Tudor times, Crooms Hill features an unbroken sequence of 17th- and 18th-century residences once home to Poet Laureate Cecil Day-Lewis.',
      },
      {
        dir: new THREE.Vector3(0.70, -0.36, 0.616).normalize(),
        faceTarget: ROAD_NODES.greenwich,
        title: 'Blackheath Paragon Crescent House',
        borough: 'Blackheath, Royal Borough of Greenwich',
        yearBuilt: '1794',
        style: 'Georgian Colonnaded Crescent Villa',
        architect: 'Michael Searles',
        summary: 'Stately Georgian villa overlooking the open heath south of Greenwich Park.',
        history: 'Surveyor Michael Searles designed The Paragon in the 1790s as a sweeping crescent of brick villas linked by Tuscan Doric colonnades facing the open common of Blackheath.',
      },
      // Battersea, Chelsea & Brixton (Southwest & South)
      {
        dir: new THREE.Vector3(-0.18, -0.34, 0.923).normalize(),
        faceTarget: ROAD_NODES.battersea,
        title: 'Prince of Wales Drive Parkside House',
        borough: 'Battersea, London Borough of Wandsworth',
        yearBuilt: '1882',
        style: 'Late Victorian Queen Anne Revival',
        architect: 'Sir James Pennethorne Circle',
        summary: 'Ornamental red-brick Victorian house overlooking the boating lake and lawns of Battersea Park.',
        history: 'After Sir James Pennethorne laid out the 200-acre Battersea Park on the South Bank in 1858, its southern avenue was lined with Queen Anne Revival mansion blocks and townhouses.',
      },
      {
        dir: new THREE.Vector3(-0.34, -0.36, 0.869).normalize(),
        faceTarget: ROAD_NODES.battersea,
        title: 'Albert Bridge Road Victorian Villa',
        borough: 'Battersea Park West, Wandsworth',
        yearBuilt: '1878',
        style: 'Victorian Gabled Townhouse',
        architect: 'Wandsworth Master Builders',
        summary: 'Gabled Victorian townhouse along the western edge of Battersea Park near Albert Bridge.',
        history: 'Built shortly after the opening of Ordish’s pastel-painted Albert Suspension Bridge in 1873, this avenue connects Chelsea across the Thames to Clapham and Battersea.',
      },
      {
        dir: new THREE.Vector3(-0.50, -0.34, 0.796).normalize(),
        faceTarget: ROAD_NODES.chelsea,
        title: 'Cheyne Walk Riverside House, Chelsea',
        borough: 'Chelsea, Kensington & Chelsea',
        yearBuilt: '1718',
        style: 'Queen Anne & Georgian Chelsea Residence',
        architect: 'Chelsea Manor Craftsmen',
        summary: 'Historic Chelsea townhouse famed as the home of painters, poets, and bohemian artists.',
        history: 'Over the centuries, Cheyne Walk and King’s Road in Chelsea attracted painter J.M.W. Turner, novelist George Eliot, Dante Gabriel Rossetti, and Oscar Wilde.',
      },
      {
        dir: new THREE.Vector3(-0.62, -0.32, 0.715).normalize(),
        faceTarget: ROAD_NODES.chelsea,
        title: 'Bywater Street Pastel Cottage, Chelsea',
        borough: 'Chelsea (King’s Road), Kensington & Chelsea',
        yearBuilt: '1852',
        style: 'Victorian Pastel Chelsea Terrace',
        architect: 'Cadogan Estate',
        summary: 'Charming pastel-pink and blue Victorian cottage just off Chelsea’s King’s Road.',
        history: 'Originally a private royal road built for King Charles II to travel from St. James’s to Hampton Court, King’s Road became the heart of Swinging Sixties London fashion.',
      },
      {
        dir: new THREE.Vector3(0.04, -0.46, 0.887).normalize(),
        faceTarget: ROAD_NODES.brixton,
        title: 'Cleaver Square Georgian House, Kennington',
        borough: 'Kennington & Brixton, Lambeth',
        yearBuilt: '1789',
        style: 'Georgian Garden Square Terrace',
        architect: 'Michael Searles',
        summary: 'Tranquil Georgian townhouse surroundingSouth London’s oldest garden square.',
        history: 'Laid out in 1789 around a plane-tree lawn where locals still play pétanque, Cleaver Square is a hidden Georgian gem along the historic road from Westminster Bridge to Brixton.',
      },
      {
        dir: new THREE.Vector3(0.22, -0.48, 0.849).normalize(),
        faceTarget: ROAD_NODES.brixton,
        title: 'Trinity Gardens Regency House, Brixton',
        borough: 'Brixton, London Borough of Lambeth',
        yearBuilt: '1824',
        style: 'Regency Stuccoed Terrace',
        architect: 'Thomas Bailey',
        summary: 'Leafy Regency square house in the vibrant cultural heart of Brixton.',
        history: 'Developed shortly after the opening of Vauxhall and Waterloo Bridges in the 1810s, Brixton became South London’s premier shopping boulevard—home to Electric Avenue, the first market street lit by electricity in 1888.',
      },

      // --- Back Hemisphere Districts (Stratford, Dulwich, Wimbledon, Richmond, Kew Gardens) ---
      {
        dir: new THREE.Vector3(0.76, 0.44, -0.474).normalize(),
        faceTarget: ROAD_NODES.stratford,
        title: 'East Village & Hackney Wick Terrace',
        borough: 'Stratford & Hackney, East London',
        yearBuilt: '1892',
        style: 'Late Victorian East End Terrace',
        architect: 'Lea Valley Builders',
        summary: 'Warm brick East London townhouse overlooking the canals of Hackney and Stratford.',
        history: 'Situated between Victoria Park—London’s oldest public "People’s Park" opened in 1845—and the Queen Elizabeth Olympic Park, this quarter blends Victorian terraces with creative canalside studios.',
      },
      {
        dir: new THREE.Vector3(0.88, 0.32, -0.35).normalize(),
        faceTarget: ROAD_NODES.stratford,
        title: 'Tredegar Square Regency House, Bow',
        borough: 'Bow & Stratford, East London',
        yearBuilt: '1832',
        style: 'Regency Stuccoed East End Square',
        architect: 'Sir Charles Morgan Estate',
        summary: 'Grand Regency terrace in East London along the historic Roman road to Colchester.',
        history: 'Laid out in the 1830s along Mile End and Bow Road, Tredegar Square is considered the finest surviving Regency garden square in East London.',
      },
      {
        dir: new THREE.Vector3(0.46, 0.68, -0.568).normalize(),
        faceTarget: ROAD_NODES.hampstead,
        title: 'Highgate Village Georgian House',
        borough: 'Highgate, North London',
        yearBuilt: '1738',
        style: 'Georgian Hilltop Mansion',
        architect: 'Highgate Master Masons',
        summary: 'Elevated Georgian brick townhouse in Highgate Village with panoramic views south to St. Paul’s.',
        history: 'Standing at the highest natural point of the northern ridge alongside Hampstead Heath, Highgate is steeped in the legend of Dick Whittington, who heard the Bow Bells from Highgate Hill.',
      },
      {
        dir: new THREE.Vector3(-0.48, 0.64, -0.598).normalize(),
        faceTarget: ROAD_NODES.kew_gardens,
        title: 'Hampstead Garden Suburb Cottage',
        borough: 'Barnet & Camden, Northwest London',
        yearBuilt: '1908',
        style: 'Arts & Crafts Cottage Architecture',
        architect: 'Sir Edwin Lutyens & Raymond Unwin',
        summary: 'Steep-gabled Arts & Crafts cottage with leaded casement windows and Privet hedges.',
        history: 'Founded by Dame Henrietta Barnett in 1906 and master-planned by Raymond Unwin and Edwin Lutyens, this model garden suburb inspired town planning around the world.',
      },
      {
        dir: new THREE.Vector3(-0.78, 0.22, -0.585).normalize(),
        faceTarget: ROAD_NODES.kew_gardens,
        title: 'Kew Green Georgian Herbologist House',
        borough: 'Kew, Richmond upon Thames',
        yearBuilt: '1772',
        style: 'Georgian Village Green Terrace',
        architect: 'Royal Botanist Circle',
        summary: 'Brick Georgian residence facing the triangular cricket green outside Kew Gardens’ Elizabeth Gate.',
        history: 'Clustered around St. Anne’s Church (1714) where artists Thomas Gainsborough and Johann Zoffany are buried, Kew Green housed royal botanists, plant hunters, and court musicians.',
      },
      {
        dir: new THREE.Vector3(-0.90, 0.18, -0.397).normalize(),
        faceTarget: ROAD_NODES.kew_gardens,
        title: 'Bedford Park Arts & Crafts Villa, Chiswick',
        borough: 'Chiswick, West London',
        yearBuilt: '1879',
        style: 'Queen Anne Arts & Crafts Villa',
        architect: 'Richard Norman Shaw',
        summary: 'Pioneering red-brick Arts & Crafts house in Chiswick with white wooden balconies and tile-hung gables.',
        history: 'Designed by Richard Norman Shaw in the late 1870s, Bedford Park in Chiswick was the world’s first garden suburb, attracting poet W.B. Yeats and Impressionist painter Camille Pissarro.',
      },
      {
        dir: new THREE.Vector3(-0.70, -0.32, -0.638).normalize(),
        faceTarget: ROAD_NODES.richmond,
        title: 'Maids of Honour Row, Richmond Green',
        borough: 'London Borough of Richmond upon Thames',
        yearBuilt: '1724',
        style: 'Early Georgian Palladian Terrace',
        architect: 'Court of George I',
        summary: 'Celebrated row of four early Georgian brick houses facing historic Richmond Green beside the Old Palace Gate.',
        history: 'Built in 1724 on the orders of George, Prince of Wales (later George II) to house the Maids of Honour serving Princess Caroline at Richmond Lodge, these houses stand directly beside the surviving Tudor gatehouse of Henry VII’s Richmond Palace.',
      },
      {
        dir: new THREE.Vector3(-0.56, -0.38, -0.735).normalize(),
        faceTarget: ROAD_NODES.richmond,
        title: 'Richmond Hill Terrace Overlook House',
        borough: 'Richmond upon Thames, Southwest London',
        yearBuilt: '1769',
        style: 'Georgian Hilltop Villa',
        architect: 'Sir Robert Taylor Circle',
        summary: 'Georgian townhouse perched atop Richmond Hill above the famous protected view of the Thames bend.',
        history: 'The view of the River Thames from Richmond Hill is the only view in England protected by an Act of Parliament (1902), painted repeatedly by J.M.W. Turner and Joshua Reynolds.',
      },
      {
        dir: new THREE.Vector3(-0.22, -0.60, -0.769).normalize(),
        faceTarget: ROAD_NODES.wimbledon,
        title: 'Southside Common Georgian House, Wimbledon',
        borough: 'Wimbledon Village, London Borough of Merton',
        yearBuilt: '1785',
        style: 'Georgian Common-Side Residence',
        architect: 'Wimbledon Manor Builders',
        summary: 'Stately Georgian residence facing the horse-riding bridleways and ponds of Wimbledon Common.',
        history: 'Before becoming synonymous with the All England Lawn Tennis Championships (founded 1868), Wimbledon Village was a hilltop retreat of 18th-century merchant houses bordering the Common.',
      },
      {
        dir: new THREE.Vector3(-0.04, -0.66, -0.75).normalize(),
        faceTarget: ROAD_NODES.wimbledon,
        title: 'Wimbledon High Street Timber-Gable House',
        borough: 'Wimbledon, Southwest London',
        yearBuilt: '1888',
        style: 'Victorian Tudor-Revival Village House',
        architect: 'Merton Estate Architects',
        summary: 'Half-timbered Victorian house with flower boxes in the heart of Wimbledon Village.',
        history: 'Built during the late Victorian expansion of Southwest London, Wimbledon Village blends country-common charm with direct road links to Richmond and Clapham.',
      },
      {
        dir: new THREE.Vector3(0.44, -0.54, -0.717).normalize(),
        faceTarget: ROAD_NODES.dulwich,
        title: 'College Road Georgian Villa, Dulwich Village',
        borough: 'Dulwich, London Borough of Southwark',
        yearBuilt: '1792',
        style: 'Georgian Weatherboard & Brick Villa',
        architect: 'Dulwich College Estate (Edward Alleyn Foundation)',
        summary: 'White picket-fenced Georgian villa in leafy Dulwich Village near the Picture Gallery and Park.',
        history: 'Preserved since Elizabethan actor Edward Alleyn founded the "College of God’s Gift" here in 1619, Dulwich Village retains its white fingerposts, Georgian villas, and historic tollgate.',
      },
      {
        dir: new THREE.Vector3(0.62, -0.48, -0.62).normalize(),
        faceTarget: ROAD_NODES.dulwich,
        title: 'Crystal Palace Park & Sydenham Ridge Villa',
        borough: 'Dulwich & Crystal Palace, South London',
        yearBuilt: '1856',
        style: 'High Victorian Italianate Villa',
        architect: 'Sir Joseph Paxton Circle',
        summary: 'Grand hilltop Victorian villa built when Joseph Paxton’s glass Crystal Palace was relocated to South London in 1854.',
        history: 'After the Great Exhibition of 1851 in Hyde Park, the iron-and-glass Crystal Palace was re-erected on Sydenham Hill, turning the surrounding South London ridge into a sought-after Victorian neighborhood.',
      },
    ];

    const initialHouses: PlacedObjectEntity[] = [];
    houseConfigs.forEach((cfg, idx) => {
      const safeDir = this.terrain.ensureDryLandDirection(cfg.dir, 0.052);
      const houseYaw = this.computeYawFacingTarget(safeDir, cfg.faceTarget);
      const hObj = this.placeStaticObject('house', safeDir, houseYaw, true, false, {
        id: `london_house_${idx + 1}`,
        title: cfg.title,
        borough: cfg.borough,
        yearBuilt: cfg.yearBuilt,
        style: cfg.style,
        architect: cfg.architect,
        summary: cfg.summary,
        history: cfg.history,
        highlights: [
          `Located in ${cfg.borough} along London's interconnected road network`,
          `Architectural style: ${cfg.style} (${cfg.yearBuilt})`,
          'Features warm illuminated sash windows, window flower boxes, and pitched chimney roof',
        ],
      });
      initialHouses.push(hObj);
    });

    // Rebuild road ribbons so any terrain adjustments around dry-land houses match 100%
    this.roadNetwork.rebuildGeometry();

    // =========================================================================
    // 3. 24 VICTORIAN GAS STREETLAMPS & K6 RED TELEPHONE BOXES ACROSS THE GLOBE
    // =========================================================================
    const lanternDirs = [
      new THREE.Vector3(-0.24, 0.19, 0.952).normalize(),  // The Mall
      new THREE.Vector3(-0.07, 0.13, 0.989).normalize(),  // Whitehall
      new THREE.Vector3(0.12, 0.22, 0.968).normalize(),   // The Strand
      new THREE.Vector3(0.16, 0.12, 0.980).normalize(),   // Victoria Embankment
      new THREE.Vector3(0.42, 0.22, 0.88).normalize(),    // City / Bank
      new THREE.Vector3(0.24, -0.17, 0.956).normalize(),  // South Bank
      new THREE.Vector3(-0.62, 0.18, 0.763).normalize(),  // Knightsbridge
      new THREE.Vector3(0.66, -0.20, 0.724).normalize(),  // Tower Bridge South
      new THREE.Vector3(-0.74, 0.28, 0.608).normalize(),  // Notting Hill
      new THREE.Vector3(-0.38, 0.50, 0.778).normalize(),  // Marylebone
      new THREE.Vector3(-0.06, 0.60, 0.798).normalize(),  // Camden
      new THREE.Vector3(0.28, 0.54, 0.792).normalize(),   // Islington
      new THREE.Vector3(0.58, 0.30, 0.755).normalize(),   // Shoreditch
      new THREE.Vector3(0.78, 0.16, 0.605).normalize(),   // Canary Wharf Approach
      new THREE.Vector3(0.70, -0.24, 0.672).normalize(),  // Greenwich
      new THREE.Vector3(-0.12, -0.28, 0.952).normalize(), // Albert Embankment
      new THREE.Vector3(-0.42, -0.34, 0.841).normalize(), // Chelsea
      new THREE.Vector3(0.06, -0.38, 0.923).normalize(),  // Kennington
      new THREE.Vector3(0.84, 0.36, -0.405).normalize(),  // Stratford
      new THREE.Vector3(0.22, 0.76, -0.611).normalize(),  // Highgate
      new THREE.Vector3(-0.68, 0.42, -0.60).normalize(),  // Chiswick / Kew
      new THREE.Vector3(-0.72, -0.32, -0.616).normalize(),// Richmond
      new THREE.Vector3(-0.28, -0.56, -0.778).normalize(),// Wimbledon
      new THREE.Vector3(0.36, -0.56, -0.745).normalize(), // Dulwich
    ];
    lanternDirs.forEach((lDir, idx) => {
      const safeLDir = this.terrain.ensureDryLandDirection(lDir, 0.044);
      this.placeStaticObject('lantern', safeLDir, idx * 0.85, true, false);
    });

    // =========================================================================
    // 4. ROYAL PARKS TREES & KEW ROSE BEDS ACROSS ALL 360° OF LONDON
    // =========================================================================
    const oakDirs = [
      new THREE.Vector3(-0.30, 0.09, 0.949).normalize(),  // St. James's Park
      new THREE.Vector3(-0.22, 0.25, 0.943).normalize(),  // Green Park
      new THREE.Vector3(-0.56, 0.10, 0.822).normalize(),  // Hyde Park
      new THREE.Vector3(-0.62, 0.34, 0.706).normalize(),  // Kensington Gardens
      new THREE.Vector3(-0.08, 0.56, 0.824).normalize(),  // Regent's Park
      new THREE.Vector3(0.68, -0.34, 0.645).normalize(),  // Greenwich Royal Park
      new THREE.Vector3(0.45, 0.58, -0.678).normalize(),  // Victoria Park East
      new THREE.Vector3(-0.35, 0.42, -0.837).normalize(), // Holland Park West
      new THREE.Vector3(0.76, 0.32, -0.56).normalize(),   // Lea Valley Park
      new THREE.Vector3(-0.88, 0.22, 0.42).normalize(),   // Kensington West
      new THREE.Vector3(0.22, -0.62, -0.75).normalize(),  // Dulwich Park
      new THREE.Vector3(-0.18, -0.58, 0.794).normalize(), // Clapham Common
      new THREE.Vector3(0.32, -0.38, 0.867).normalize(),  // Burgess Park
      new THREE.Vector3(-0.22, -0.44, 0.871).normalize(), // Battersea Park
      new THREE.Vector3(0.54, 0.44, 0.717).normalize(),   // Hoxton Square
      new THREE.Vector3(-0.46, 0.38, 0.802).normalize(),  // Portman Square
      new THREE.Vector3(0.62, 0.52, 0.587).normalize(),   // London Fields
      new THREE.Vector3(0.88, -0.28, 0.384).normalize(),  // Blackheath Oaks
      new THREE.Vector3(0.64, -0.36, -0.677).normalize(), // Oxleas Wood
      new THREE.Vector3(0.04, -0.74, -0.671).normalize(), // Crystal Palace Park
      new THREE.Vector3(-0.42, -0.52, -0.743).normalize(),// Richmond Park Royal Oaks
      new THREE.Vector3(-0.54, -0.46, -0.704).normalize(),// Isabella Plantation (Richmond)
      new THREE.Vector3(-0.78, -0.28, -0.552).normalize(),// Old Deer Park
      new THREE.Vector3(-0.88, 0.12, -0.46).normalize(),  // Royal Botanic Gardens Kew
      new THREE.Vector3(-0.74, 0.36, -0.566).normalize(), // Gunnersbury Park
      new THREE.Vector3(-0.22, 0.72, -0.658).normalize(), // Kenwood House Parkland
      new THREE.Vector3(0.18, 0.68, -0.711).normalize(),  // Finsbury Park
      new THREE.Vector3(0.64, 0.48, -0.598).normalize(),  // Wanstead Flats
      new THREE.Vector3(0.92, 0.22, -0.322).normalize(),  // Queen Elizabeth Park
      new THREE.Vector3(-0.74, -0.36, 0.566).normalize(), // Bishop's Park Fulham
      new THREE.Vector3(-0.02, -0.54, 0.841).normalize(), // Brockwell Park
      new THREE.Vector3(0.46, -0.44, 0.771).normalize(),  // Peckham Rye Park
    ];
    oakDirs.forEach((d, i) => {
      const safeD = this.terrain.ensureDryLandDirection(d, 0.044);
      this.placeStaticObject('oak', safeD, i * 1.7, true, false);
    });

    const pineDirs = [
      new THREE.Vector3(-0.34, 0.68, 0.649).normalize(),  // Primrose Hill
      new THREE.Vector3(0.04, 0.86, 0.508).normalize(),   // Hampstead Heath
      new THREE.Vector3(-0.16, 0.82, 0.55).normalize(),   // Parliament Hill
      new THREE.Vector3(0.26, 0.78, 0.569).normalize(),   // Highgate Wood
      new THREE.Vector3(0.35, 0.84, -0.41).normalize(),   // Alexandra Palace Hill
      new THREE.Vector3(-0.26, 0.86, -0.44).normalize(),  // Golders Hill Park
      new THREE.Vector3(0.02, 0.94, -0.34).normalize(),   // Northern Heights Crown
      new THREE.Vector3(-0.58, 0.56, -0.59).normalize(),  // Harrow on the Hill
      new THREE.Vector3(0.58, 0.64, -0.50).normalize(),   // Epping Forest South
      new THREE.Vector3(-0.32, -0.68, -0.66).normalize(), // Wimbledon Common Pines
      new THREE.Vector3(0.28, -0.68, -0.678).normalize(), // Dulwich Upper Wood
      new THREE.Vector3(-0.66, -0.48, -0.576).normalize(),// Petersham Mount
    ];
    pineDirs.forEach((d, i) => {
      const safeD = this.terrain.ensureDryLandDirection(d, 0.044);
      this.placeStaticObject('pine', safeD, i * 2.1, true, false);
    });

    const flowerDirs = [
      new THREE.Vector3(-0.34, 0.18, 0.923).normalize(),  // Buckingham Palace Memorial Gardens
      new THREE.Vector3(-0.28, 0.09, 0.955).normalize(),  // St. James's Rose Walk
      new THREE.Vector3(-0.22, 0.54, 0.812).normalize(),  // Queen Mary's Rose Garden (Regent's Park)
      new THREE.Vector3(0.68, -0.28, 0.673).normalize(),  // Greenwich Park Flower Garden
      new THREE.Vector3(-0.64, 0.22, 0.736).normalize(),  // Kensington Sunken Garden
      new THREE.Vector3(-0.82, 0.18, -0.543).normalize(), // Kew Gardens Rose Pergola
      new THREE.Vector3(-0.58, -0.34, -0.739).normalize(),// Terrace Gardens Richmond
      new THREE.Vector3(0.48, -0.50, -0.72).normalize(),  // Dulwich Park Rose Bed
      new THREE.Vector3(0.78, 0.36, -0.505).normalize(),  // Olympic Park Wildflower Meadow
      new THREE.Vector3(-0.02, 0.78, 0.625).normalize(),  // Hampstead Pergola Gardens
      new THREE.Vector3(0.38, 0.46, 0.802).normalize(),   // Myddelton Square Gardens
      new THREE.Vector3(-0.48, -0.30, 0.824).normalize(), // Chelsea Physic Garden
    ];
    flowerDirs.forEach((d, i) => {
      const safeD = this.terrain.ensureDryLandDirection(d, 0.044);
      this.placeStaticObject('flower', safeD, i * 0.9, true, false);
    });

    // =========================================================================
    // 5. LIVE MOVING ROAD TRAFFIC (12 Red Double-Decker Buses & 12 Black Cabs)
    // =========================================================================
    const initialTrafficSpecs: {
      kind: 'redbus' | 'blackcab';
      from: RoadNodeId;
      to: RoadNodeId;
      t: number;
    }[] = [
      { kind: 'redbus', from: 'palace', to: 'trafalgar', t: 0.35 },
      { kind: 'blackcab', from: 'trafalgar', to: 'palace', t: 0.65 },
      { kind: 'redbus', from: 'trafalgar', to: 'parliament', t: 0.45 },
      { kind: 'blackcab', from: 'parliament', to: 'eye', t: 0.5 },
      { kind: 'redbus', from: 'trafalgar', to: 'stpauls', t: 0.4 },
      { kind: 'blackcab', from: 'stpauls', to: 'gherkin', t: 0.5 },
      { kind: 'redbus', from: 'tower_north', to: 'tower_south', t: 0.48 },
      { kind: 'blackcab', from: 'eye', to: 'shard', t: 0.55 },
      { kind: 'redbus', from: 'parliament', to: 'embankment_mid', t: 0.5 },
      { kind: 'blackcab', from: 'palace', to: 'kensington', t: 0.45 },
      { kind: 'redbus', from: 'trafalgar', to: 'regents', t: 0.52 },
      { kind: 'blackcab', from: 'city_bank', to: 'shard', t: 0.45 },
      { kind: 'redbus', from: 'kensington', to: 'notting_hill', t: 0.4 },
      { kind: 'blackcab', from: 'notting_hill', to: 'paddington', t: 0.5 },
      { kind: 'redbus', from: 'regents', to: 'camden', t: 0.45 },
      { kind: 'blackcab', from: 'camden', to: 'islington', t: 0.5 },
      { kind: 'redbus', from: 'islington', to: 'shoreditch', t: 0.48 },
      { kind: 'blackcab', from: 'tower_north', to: 'canary_wharf', t: 0.52 },
      { kind: 'redbus', from: 'canary_wharf', to: 'greenwich', t: 0.5 },
      { kind: 'blackcab', from: 'eye', to: 'brixton', t: 0.42 },
      { kind: 'redbus', from: 'battersea', to: 'chelsea', t: 0.5 },
      { kind: 'blackcab', from: 'kew_gardens', to: 'richmond', t: 0.48 },
      { kind: 'redbus', from: 'richmond', to: 'wimbledon', t: 0.5 },
      { kind: 'blackcab', from: 'wimbledon', to: 'dulwich', t: 0.45 },
    ];
    for (const spec of initialTrafficSpecs) {
      this.spawnRoadVehicle(spec.kind, spec.from, spec.to, spec.t, false);
    }

    // =========================================================================
    // 6. RIVER THAMES MARITIME LIFE AROUND THE 360° LOOP
    // =========================================================================
    this.spawnSailboat(new THREE.Vector3(-0.34, -0.16, 0.927).normalize(), false);
    this.spawnSailboat(new THREE.Vector3(0.28, 0.00, 0.96).normalize(), false);
    this.spawnSailboat(new THREE.Vector3(0.84, -0.08, 0.53).normalize(), false);
    this.spawnSailboat(new THREE.Vector3(0.32, -0.12, -0.94).normalize(), false);
    this.spawnDuckFlock(new THREE.Vector3(-0.10, -0.08, 0.991).normalize(), false);
    this.spawnDuckFlock(new THREE.Vector3(-0.76, -0.10, -0.64).normalize(), false);

    // =========================================================================
    // 7. POPULATED URBAN LONDON (36 Pedestrians & Royal Foot Guards — Zero Farm Sheep)
    // =========================================================================
    const pedestrianHubs = [
      ROAD_NODES.trafalgar,
      ROAD_NODES.palace,
      ROAD_NODES.parliament,
      ROAD_NODES.eye,
      ROAD_NODES.stpauls,
      ROAD_NODES.shard,
      ROAD_NODES.gherkin,
      ROAD_NODES.tower_north,
      ROAD_NODES.kensington,
      ROAD_NODES.notting_hill,
      ROAD_NODES.regents,
      ROAD_NODES.camden,
      ROAD_NODES.islington,
      ROAD_NODES.shoreditch,
      ROAD_NODES.canary_wharf,
      ROAD_NODES.greenwich,
      ROAD_NODES.brixton,
      ROAD_NODES.chelsea,
      ROAD_NODES.richmond,
      ROAD_NODES.kew_gardens,
      ROAD_NODES.wimbledon,
      ROAD_NODES.dulwich,
      ...initialHouses.map((h) => this.getBuildingEntranceDir(h, 0)),
    ];
    for (let i = 0; i < 36; i++) {
      const baseHub = pedestrianHubs[i % pedestrianHubs.length];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.022,
        (Math.random() - 0.5) * 0.022,
        (Math.random() - 0.5) * 0.015,
      );
      const safePedDir = this.terrain.ensureDryLandDirection(
        baseHub.clone().add(offset).normalize(),
        0.038,
      );
      this.spawnVillager(safePedDir, false);
    }

    // =========================================================================
    // 8. SKY ATMOSPHERE (2 Hot Air Balloons & 5 Drifting London Clouds)
    // =========================================================================
    this.spawnBalloon(new THREE.Vector3(0.32, 0.48, 0.816).normalize(), false);
    this.spawnBalloon(new THREE.Vector3(-0.48, 0.42, -0.77).normalize(), false);

    const cloudDirs = [
      new THREE.Vector3(-0.28, 0.38, 0.88).normalize(),
      new THREE.Vector3(0.68, 0.25, -0.68).normalize(),
      new THREE.Vector3(-0.55, -0.48, -0.68).normalize(),
      new THREE.Vector3(0.75, -0.35, 0.56).normalize(),
      new THREE.Vector3(-0.78, 0.28, 0.56).normalize(),
    ];
    cloudDirs.forEach((d, idx) => {
      this.spawnCloud(d, false, idx === 0 ? 4.5 : 8.0 + idx * 3.5, false);
    });

    // =========================================================================
    // 9. DECEMBER CHRISTMAS FAIRY LIGHTS, GARLANDS & TRAFALGAR TREE
    // =========================================================================
    this.initFestiveChristmasLights();
  }

  private getObjectCollisionRadius(type: PlacedObjectType): number {
    switch (type) {
      case 'palace':
      case 'battersea':
      case 'toweroflondon':
        return 0.068;
      case 'bigben':
      case 'stpauls':
      case 'towerbridge':
      case 'canarywharf':
      case 'greenwich':
      case 'kewpalace':
        return 0.060;
      case 'londoneye':
      case 'shard':
        return 0.054;
      case 'house':
        return 0.048;
      case 'windmill':
        return 0.052;
      case 'lighthouse':
        return 0.052;
      case 'watchtower':
        return 0.052;
      case 'westminsterbridge':
        return 0.048;
      case 'redbus':
      case 'blackcab':
        return 0.032;
      case 'well':
        return 0.032;
      case 'campfire':
        return 0.032;
      case 'beehive':
        return 0.025;
      case 'oak':
        return 0.022;
      case 'pine':
        return 0.019;
      case 'palm':
        return 0.019;
      case 'lantern':
        return 0.016;
      default:
        return 0;
    }
  }

  private computeYawFacingTarget(
    dir: THREE.Vector3,
    targetDir: THREE.Vector3,
  ): number {
    const surface = this.terrain.getSurfacePointAndNormal(dir);
    const tangent = targetDir
      .clone()
      .sub(dir)
      .projectOnPlane(surface.normal)
      .normalize();
    if (tangent.lengthSq() < 1e-6) return 0;
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surface.normal,
    );
    const localTangent = tangent
      .clone()
      .applyQuaternion(alignQuat.clone().invert());
    return Math.atan2(localTangent.x, localTangent.z);
  }

  private getBuildingEntranceDir(
    obj: PlacedObjectEntity,
    lateralOffset = 0,
  ): THREE.Vector3 {
    const surface = this.terrain.getSurfacePointAndNormal(obj.dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surface.normal,
    );
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, obj.yaw);
    const fullQuat = alignQuat.multiply(yawQuat);

    if (obj.type === 'dock' || obj.type === 'bridge') {
      // Approach the landward end of the dock or bridge
      const reach = obj.type === 'dock' ? 0.068 : 0.038;
      const axisZ = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(fullQuat)
        .normalize();
      const endA = obj.dir.clone().addScaledVector(axisZ, -reach).normalize();
      const endB = obj.dir.clone().addScaledVector(axisZ, reach).normalize();
      const surfA = this.terrain.getSurfacePointAndNormal(endA);
      return !surfA.isWater ? endA : endB;
    }

    const frontTangent = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(fullQuat)
      .normalize();
    const rightTangent = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(fullQuat)
      .normalize();
    const clearance = this.getObjectCollisionRadius(obj.type) + 0.022;

    const candidate = obj.dir
      .clone()
      .addScaledVector(frontTangent, clearance)
      .addScaledVector(rightTangent, lateralOffset)
      .normalize();

    // Ensure the entrance point itself isn't underwater
    const candSurf = this.terrain.getSurfacePointAndNormal(candidate);
    if (!candSurf.isWater) {
      return candidate;
    }
    return obj.dir
      .clone()
      .addScaledVector(frontTangent, -clearance)
      .normalize();
  }

  private getFenceSegmentOnSphere(fenceObj: PlacedObjectEntity): {
    segA: THREE.Vector3;
    segB: THREE.Vector3;
    railAxis: THREE.Vector3;
  } {
    const surface = this.terrain.getSurfacePointAndNormal(fenceObj.dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surface.normal,
    );
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      UP_VEC,
      fenceObj.yaw,
    );
    const fullQuat = alignQuat.multiply(yawQuat);
    const railAxis = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(fullQuat)
      .normalize();
    const halfSpan = 0.035;
    const segA = fenceObj.dir
      .clone()
      .addScaledVector(railAxis, -halfSpan)
      .normalize();
    const segB = fenceObj.dir
      .clone()
      .addScaledVector(railAxis, halfSpan)
      .normalize();
    return { segA, segB, railAxis };
  }

  private closestPointOnSphereSegment(
    pt: THREE.Vector3,
    segA: THREE.Vector3,
    segB: THREE.Vector3,
  ): THREE.Vector3 {
    const ab = segB.clone().sub(segA);
    const lenSq = ab.lengthSq();
    if (lenSq < 1e-8) return segA.clone();
    const ap = pt.clone().sub(segA);
    const t = THREE.MathUtils.clamp(ap.dot(ab) / lenSq, 0, 1);
    return segA.clone().addScaledVector(ab, t).normalize();
  }

  private getRainbowFootDirs(
    dir: THREE.Vector3,
    yaw: number,
  ): [THREE.Vector3, THREE.Vector3] {
    const surface = this.terrain.getSurfacePointAndNormal(dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surface.normal,
    );
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw);
    const fullQuat = alignQuat.multiply(yawQuat);
    const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(fullQuat);
    const footA = surface.point.clone().addScaledVector(xAxis, -0.058).normalize();
    const footB = surface.point.clone().addScaledVector(xAxis, 0.058).normalize();
    return [footA, footB];
  }

  private findCollisionFreeRainbowYaw(dir: THREE.Vector3): number {
    let bestYaw = -0.25;
    let bestScore = -999;
    const surf = this.terrain.getSurfacePointAndNormal(dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surf.normal,
    );

    for (let step = 0; step < 24; step++) {
      const candidateYaw = (step / 24) * Math.PI;
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, candidateYaw);
      const q = alignQuat.clone().multiply(yawQuat);
      let minClear = 999;

      for (let aStep = 0; aStep <= 8; aStep++) {
        const a = (aStep / 8) * Math.PI;
        const lx = Math.cos(a) * 0.068;
        const ly = 0.016 + Math.sin(a) * 0.068;
        const pt = new THREE.Vector3(lx, ly, 0).applyQuaternion(q).add(surf.point);
        const ptDir = pt.clone().normalize();

        for (const obj of this.placedObjects) {
          const r = this.getObjectCollisionRadius(obj.type);
          if (r <= 0) continue;
          const d = ptDir.distanceTo(obj.dir) * 0.75 - (r + 0.024);
          if (d < minClear) minClear = d;
        }
      }

      if (minClear > bestScore) {
        bestScore = minClear;
        bestYaw = candidateYaw;
      }
    }
    return bestYaw;
  }

  private isPositionClearOfObstacles(
    dir: THREE.Vector3,
    extraMargin = 0.012,
    allowInsidePasture = false,
  ): boolean {
    const surf = this.terrain.getSurfacePointAndNormal(dir);
    if (surf.isWater || surf.isMountain) return false;
    if (surf.normal.dot(dir) < 0.75) return false;

    if (
      !allowInsidePasture &&
      dir.distanceTo(this.pastureCenter) < this.pastureRadius + extraMargin
    ) {
      return false;
    }

    for (const obj of this.placedObjects) {
      if (obj.type === 'fence') {
        const { segA, segB } = this.getFenceSegmentOnSphere(obj);
        const closest = this.closestPointOnSphereSegment(dir, segA, segB);
        if (dir.distanceTo(closest) < 0.015 + extraMargin) {
          return false;
        }
        continue;
      }
      if (obj.type === 'rainbow') {
        const [footA, footB] = this.getRainbowFootDirs(obj.dir, obj.yaw);
        if (
          dir.distanceTo(footA) < 0.026 + extraMargin ||
          dir.distanceTo(footB) < 0.026 + extraMargin
        ) {
          return false;
        }
        continue;
      }
      const r = this.getObjectCollisionRadius(obj.type);
      if (r > 0 && dir.distanceTo(obj.dir) < r + extraMargin) {
        return false;
      }
    }
    return true;
  }

  private orientObjectOnSurface(
    obj: THREE.Object3D,
    dir: THREE.Vector3,
    yaw: number,
    normalOffset = 0,
    stickToSeaLevel = false,
    useRadialUp = false,
  ) {
    const surface = this.terrain.getSurfacePointAndNormal(dir);
    const normDir = dir.clone().normalize();
    const basePoint = stickToSeaLevel
      ? normDir.clone().multiplyScalar(this.terrain.seaLevel)
      : surface.point;
    const upNormal = stickToSeaLevel || useRadialUp ? normDir : surface.normal;

    const pos = basePoint.clone().addScaledVector(upNormal, normalOffset);
    obj.position.copy(pos);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(UP_VEC, upNormal);
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, yaw);
    obj.quaternion.copy(alignQuat).multiply(yawQuat);
  }

  private resolveTownhouseStyleVariant(info?: BuildingInfo): number {
    if (!info) return this.houseCounter++;
    const text = `${info.title} ${info.style}`.toLowerCase();
    // Variant 0: Bedford Square Georgian Stock-Brick & Coade-Stone Architrave Townhouse
    if (
      text.includes('bedford square') ||
      text.includes('coade-stone') ||
      text.includes('stock-brick') ||
      text.includes('huguenot') ||
      text.includes('georgian')
    ) {
      return 0;
    }
    // Variant 1: Belgravia / Regent's Park White-Stucco Regency Doric Portico Terrace
    if (
      text.includes('regency') ||
      text.includes('belgrave') ||
      text.includes('cumberland') ||
      text.includes('tredegar') ||
      text.includes('paragon')
    ) {
      return 1;
    }
    // Variant 3: Notting Hill / Chelsea Pastel Italianate Townhouse
    if (
      text.includes('pastel') ||
      text.includes('portobello') ||
      text.includes('chalcot') ||
      text.includes('bywater') ||
      text.includes('italianate')
    ) {
      return 3;
    }
    // Variant 2: Kensington / Marylebone Victorian Red-Brick Bay-Window & Dutch Gable Villa
    return 2;
  }

  private ensureClearOfRoadsAndObjects(
    initialDir: THREE.Vector3,
    type: PlacedObjectType,
    initialYaw: number,
  ): { dir: THREE.Vector3; yaw: number } {
    const exempt =
      type === 'well' ||
      type === 'dock' ||
      type === 'bridge' ||
      type === 'towerbridge' ||
      type === 'westminsterbridge' ||
      type === 'path' ||
      type === 'fence' ||
      type === 'rainbow';
    if (exempt) {
      return { dir: initialDir.clone().normalize(), yaw: initialYaw };
    }

    let dir = initialDir.clone().normalize();
    let yaw = initialYaw;
    const objRadius = this.getObjectCollisionRadius(type);
    // Minimum angular clearance from road centerlines so vehicles never clip buildings/trees
    const isBuilding =
      type === 'house' ||
      type === 'bigben' ||
      type === 'palace' ||
      type === 'londoneye' ||
      type === 'stpauls' ||
      type === 'shard' ||
      type === 'battersea' ||
      type === 'toweroflondon' ||
      type === 'canarywharf' ||
      type === 'greenwich' ||
      type === 'kewpalace' ||
      type === 'windmill' ||
      type === 'lighthouse' ||
      type === 'watchtower';

    const minRoadDist = isBuilding
      ? Math.max(0.052, objRadius * 0.86)
      : type === 'lantern'
        ? 0.024
        : 0.032;

    for (let iter = 0; iter < 4; iter++) {
      const roadCheck = getClosestRoadPoint(
        dir,
        (d) => this.terrain.getSurfacePointAndNormal(d),
        this.terrain.seaLevel,
      );
      if (roadCheck.minDist < minRoadDist) {
        const pushVec = dir.clone().sub(roadCheck.closestDir);
        if (pushVec.lengthSq() < 1e-6) {
          pushVec.set(0.1, 0.2, 0.1);
        }
        pushVec.normalize();
        dir = roadCheck.closestDir
          .clone()
          .addScaledVector(pushVec, minRoadDist + 0.004)
          .normalize();
        dir = this.terrain.ensureDryLandDirection(dir, 0.046);
      }

      // Also prevent building-to-building overlap
      if (isBuilding) {
        for (const existing of this.placedObjects) {
          if (
            existing.type === 'well' ||
            existing.type === 'towerbridge' ||
            existing.type === 'westminsterbridge' ||
            existing.type === 'dock' ||
            existing.type === 'bridge'
          ) {
            continue;
          }
          const exR = this.getObjectCollisionRadius(existing.type);
          if (exR <= 0.025) continue;
          const minSep = (objRadius + exR) * 0.78;
          const d = dir.distanceTo(existing.dir);
          if (d < minSep && d > 1e-6) {
            const push = dir.clone().sub(existing.dir).normalize();
            dir = existing.dir
              .clone()
              .addScaledVector(push, minSep + 0.003)
              .normalize();
            dir = this.terrain.ensureDryLandDirection(dir, 0.046);
          }
        }
      }
    }

    // Orient houses so their front facade (+Z) faces the nearest street cleanly
    if (type === 'house') {
      const roadAfter = getClosestRoadPoint(
        dir,
        (d) => this.terrain.getSurfacePointAndNormal(d),
        this.terrain.seaLevel,
      );
      if (roadAfter.minDist < 0.22) {
        yaw = this.computeYawFacingTarget(dir, roadAfter.closestDir);
      }
    }

    return { dir, yaw };
  }

  public placeStaticObject(
    type: PlacedObjectType,
    dir: THREE.Vector3,
    yaw = Math.random() * Math.PI * 2,
    removable = true,
    withSparkles = true,
    customInfo?: BuildingInfo,
  ): PlacedObjectEntity {
    const stickToSea =
      type === 'dock' ||
      type === 'bridge' ||
      type === 'towerbridge' ||
      type === 'westminsterbridge';

    // Ensure no house or land building ever sits on or floats over the River Thames!
    const dryDir = stickToSea
      ? dir.clone().normalize()
      : this.terrain.ensureDryLandDirection(dir.clone().normalize(), 0.046);

    // Ensure no building, house, tree, or lamp post overlaps a road carriageway!
    const cleared = this.ensureClearOfRoadsAndObjects(dryDir, type, yaw);
    const normDir = cleared.dir;
    yaw = cleared.yaw;

    let meshGroup: THREE.Group;
    let windmillRotor: THREE.Object3D | undefined;
    let lighthouseBeamPivot: THREE.Object3D | undefined;
    let lighthouseConeMats: THREE.MeshBasicMaterial[] | undefined;
    let lighthousePointLight: THREE.PointLight | undefined;
    let windowMaterials: THREE.MeshStandardMaterial[] | undefined;
    let campfireFlameGroup: THREE.Group | undefined;
    let campfireEmbers: THREE.Points | undefined;
    let campfireLight: THREE.PointLight | undefined;
    let watchtowerFlag: THREE.Mesh | undefined;
    let butterflySwarm: THREE.Group | undefined;
    let bigBenHourHands: THREE.Object3D[] | undefined;
    let bigBenMinuteHands: THREE.Object3D[] | undefined;

    if (type === 'house') {
      const variantIdx = this.resolveTownhouseStyleVariant(customInfo);
      const res = createPastelHouseMesh(variantIdx);
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'bigben') {
      const res = createBigBenMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
      bigBenHourHands = res.hourHands;
      bigBenMinuteHands = res.minuteHands;
    } else if (type === 'palace') {
      const res = createBuckinghamPalaceMesh();
      meshGroup = res.group;
      watchtowerFlag = res.flagMesh;
      windowMaterials = res.windowMaterials;
    } else if (type === 'battersea') {
      const res = createBatterseaPowerStationMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'toweroflondon') {
      const res = createTowerOfLondonMesh();
      meshGroup = res.group;
      watchtowerFlag = res.flagMesh;
      windowMaterials = res.windowMaterials;
    } else if (type === 'canarywharf') {
      const res = createCanaryWharfMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'greenwich') {
      const res = createGreenwichObservatoryMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'kewpalace') {
      const res = createKewPalaceMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'towerbridge') {
      const res = createTowerBridgeMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'westminsterbridge') {
      const res = createWestminsterBridgeMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'londoneye') {
      const res = createLondonEyeMesh();
      meshGroup = res.group;
      windmillRotor = res.rotor;
      windowMaterials = res.windowMaterials;
    } else if (type === 'stpauls') {
      const res = createStPaulsCathedralMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'shard') {
      const res = createShardOrGherkinMesh(this.shardCounter++);
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'redbus') {
      const res = createRedDoubleDeckerBusMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'blackcab') {
      const res = createBlackCabMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'windmill') {
      const res = createWhiteWindmillMesh();
      meshGroup = res.group;
      windmillRotor = res.rotor;
      windowMaterials = res.windowMaterials;
    } else if (type === 'lighthouse') {
      const res = createStripedLighthouseMesh();
      meshGroup = res.group;
      lighthouseBeamPivot = res.beamPivot;
      lighthouseConeMats = res.coneMats;
      lighthousePointLight = res.pointLight;
      windowMaterials = res.windowMaterials;
    } else if (type === 'well') {
      meshGroup = createStoneWellMesh();
    } else if (type === 'fence') {
      meshGroup = createWoodenFenceMesh();
    } else if (type === 'path') {
      meshGroup = createSteppingPathMesh();
    } else if (type === 'oak') {
      meshGroup = createOakTreeMesh();
    } else if (type === 'pine') {
      const surface = this.terrain.getSurfacePointAndNormal(normDir);
      meshGroup = createPineTreeMesh(surface.isMountain || normDir.y > 0.65);
    } else if (type === 'palm') {
      meshGroup = createPalmTreeMesh();
    } else if (type === 'dock' || type === 'bridge') {
      const res = createWoodenDockMesh(type === 'bridge');
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'campfire') {
      const res = createCampfireMesh();
      meshGroup = res.group;
      campfireFlameGroup = res.flameGroup;
      campfireEmbers = res.embers;
      campfireLight = res.light;
    } else if (type === 'watchtower') {
      const res = createStoneWatchtowerMesh();
      meshGroup = res.group;
      watchtowerFlag = res.flagMesh;
      windowMaterials = res.windowMaterials;
    } else if (type === 'beehive') {
      const res = createBeehiveMesh();
      meshGroup = res.group;
      butterflySwarm = res.butterflySwarm;
    } else if (type === 'lantern') {
      const res = createLanternPostMesh();
      meshGroup = res.group;
      windowMaterials = res.windowMaterials;
    } else if (type === 'rainbow') {
      meshGroup = createRainbowArchMesh();
    } else {
      meshGroup = createFlowerClusterMesh();
    }

    const useRadialUp =
      stickToSea ||
      type === 'lighthouse' ||
      type === 'bigben' ||
      type === 'palace' ||
      type === 'battersea' ||
      type === 'toweroflondon' ||
      type === 'canarywharf' ||
      type === 'greenwich' ||
      type === 'kewpalace' ||
      type === 'londoneye' ||
      type === 'stpauls' ||
      type === 'shard';
    const normalOffset = stickToSea ? 0 : type === 'house' ? -0.002 : -0.001;
    this.orientObjectOnSurface(
      meshGroup,
      normDir,
      yaw,
      normalOffset,
      stickToSea,
      useRadialUp,
    );
    this.objectsGroup.add(meshGroup);

    const isTree = type === 'oak' || type === 'pine' || type === 'palm';
    const initialGrowth = isTree ? 0.82 + Math.random() * 0.22 : 1.0;

    const entity: PlacedObjectEntity = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      dir: normDir,
      yaw,
      mesh: meshGroup,
      baseScale: 1.0,
      growth: initialGrowth,
      targetGrowth: initialGrowth,
      bounceTime: withSparkles ? 0.0 : 10.0,
      bounceActive: withSparkles,
      windmillRotor,
      lighthouseBeamPivot,
      lighthouseConeMats,
      lighthousePointLight,
      windowMaterials,
      bigBenHourHands,
      bigBenMinuteHands,
      campfireFlameGroup,
      campfireEmbers,
      campfireLight,
      watchtowerFlag,
      butterflySwarm,
      info: customInfo,
      removable,
    };

    if (withSparkles) {
      meshGroup.scale.setScalar(0.01);
      this.emitSparklesAtDir(normDir, '#ffe484');
    } else {
      meshGroup.scale.setScalar(initialGrowth);
    }

    this.placedObjects.push(entity);
    return entity;
  }

  private spawnRoadVehicle(
    kind: 'redbus' | 'blackcab',
    fromNode: RoadNodeId,
    toNode: RoadNodeId,
    initialT = 0.2,
    withSparkles = true,
  ) {
    const found = findRoadSegmentBetween(fromNode, toNode);
    const seg = found ? found.seg : ROAD_SEGMENTS[0];
    const reversed = found ? found.reversed : false;

    const res =
      kind === 'redbus' ? createRedDoubleDeckerBusMesh() : createBlackCabMesh();
    this.inhabitantsGroup.add(res.group);

    const entity: RoadVehicleEntity = {
      id: `${kind}_${Date.now()}_${Math.random()}`,
      kind,
      mesh: res.group,
      windowMaterials: res.windowMaterials,
      fromNode: found ? fromNode : seg.from,
      toNode: found ? toNode : seg.to,
      seg,
      reversed,
      t: initialT,
      speed: kind === 'redbus' ? 0.14 + Math.random() * 0.04 : 0.19 + Math.random() * 0.05,
      dir: ROAD_NODES[fromNode].clone(),
      yaw: 0,
    };

    this.positionRoadVehicle(entity);
    if (withSparkles) {
      this.emitSparklesAtDir(entity.dir, kind === 'redbus' ? '#ff6b6b' : '#ffe066');
    }
    this.roadVehicles.push(entity);
  }

  private positionRoadVehicle(v: RoadVehicleEntity) {
    const segT = v.reversed ? 1.0 - v.t : v.t;
    const sample = sampleRoadSegmentPoint(
      v.seg,
      segT,
      (d) => this.terrain.getSurfacePointAndNormal(d),
      this.terrain.seaLevel,
    );
    const travelTangent = v.reversed
      ? sample.tangent.clone().negate()
      : sample.tangent.clone();
    const right = new THREE.Vector3()
      .crossVectors(travelTangent, sample.normal)
      .normalize();

    // UK Left-hand traffic lane offset (-0.0036 to the left of travel direction)
    const laneOffset = -0.0036;
    const pos = sample.point
      .clone()
      .addScaledVector(right, laneOffset)
      .addScaledVector(sample.normal, 0.0005);

    v.dir.copy(sample.dir);
    v.mesh.position.copy(pos);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      sample.normal,
    );
    const localForward = travelTangent
      .clone()
      .applyQuaternion(alignQuat.clone().invert());
    v.yaw = Math.atan2(localForward.x, localForward.z);
    v.mesh.quaternion
      .copy(alignQuat)
      .multiply(new THREE.Quaternion().setFromAxisAngle(UP_VEC, v.yaw));
  }

  private spawnSailboat(dir: THREE.Vector3, withSparkles = true) {
    let waterDir = dir.clone().normalize();
    const surf = this.terrain.getSurfacePointAndNormal(waterDir);
    if (!surf.isWater) {
      const nearestWater = this.terrain.findNearestWaterDirection(waterDir, 0.95);
      if (nearestWater) {
        waterDir = nearestWater;
      } else {
        this.terrain.sculptAtDirection(waterDir, 'lake');
        this.realignAllObjectsToTerrain();
      }
    }

    const { group, hullGroup, lanternMat } = createSailboatMesh(this.boatCounter++);
    const yaw = Math.random() * Math.PI * 2;
    this.orientObjectOnSurface(group, waterDir, yaw, 0, true);
    this.inhabitantsGroup.add(group);

    const targetDir = this.pickRandomWaterTarget(waterDir);
    const entity: SailboatEntity = {
      id: `sailboat_${Date.now()}_${Math.random()}`,
      mesh: group,
      hullGroup,
      lanternMat,
      dir: waterDir,
      targetDir,
      speed: 0.048 + Math.random() * 0.02,
      bobPhase: Math.random() * Math.PI * 2,
      yaw,
    };

    if (withSparkles) {
      this.emitSparklesAtDir(waterDir, '#7ef2e6', this.terrain.seaLevel);
    }

    this.sailboats.push(entity);
  }

  private spawnDuckFlock(dir: THREE.Vector3, withSparkles = true) {
    let waterDir = dir.clone().normalize();
    const surf = this.terrain.getSurfacePointAndNormal(waterDir);
    if (!surf.isWater) {
      const nearestWater = this.terrain.findNearestWaterDirection(waterDir, 0.95);
      if (nearestWater) {
        waterDir = nearestWater;
      } else {
        this.terrain.sculptAtDirection(waterDir, 'lake');
        this.realignAllObjectsToTerrain();
      }
    }

    const { group, rippleRings } = createSwanDuckFlockMesh();
    const yaw = Math.random() * Math.PI * 2;
    this.orientObjectOnSurface(group, waterDir, yaw, 0, true);
    this.inhabitantsGroup.add(group);

    const targetDir = this.pickRandomWaterTarget(waterDir);
    const entity: DuckEntity = {
      id: `duck_${Date.now()}_${Math.random()}`,
      mesh: group,
      rippleRings,
      dir: waterDir,
      targetDir,
      speed: 0.028 + Math.random() * 0.015,
      bobPhase: Math.random() * Math.PI * 2,
      yaw,
    };

    if (withSparkles) {
      this.emitSparklesAtDir(waterDir, '#ffffff', this.terrain.seaLevel);
    }

    this.ducks.push(entity);
  }

  private pickRandomWaterTarget(fromDir: THREE.Vector3): THREE.Vector3 {
    for (let attempt = 0; attempt < 24; attempt++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.36,
        (Math.random() - 0.5) * 0.36,
        (Math.random() - 0.5) * 0.36,
      );
      const candidate = fromDir.clone().add(offset).normalize();
      const surf = this.terrain.getSurfacePointAndNormal(candidate);
      if (surf.isWater) {
        return candidate;
      }
    }
    return this.terrain.findNearestWaterDirection(fromDir, 0.8) || fromDir.clone();
  }

  private spawnBalloon(dir: THREE.Vector3, withSparkles = true) {
    const normDir = dir.clone().normalize();
    const { group, burnerMat } = createHotAirBalloonMesh(this.balloonCounter++);

    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() + 0.5,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const baseAltitude = 1.02 + Math.random() * 0.1;
    group.position.copy(normDir).multiplyScalar(baseAltitude);
    group.quaternion.setFromUnitVectors(UP_VEC, normDir);
    this.atmosphereGroup.add(group);

    const entity: BalloonEntity = {
      id: `balloon_${Date.now()}_${Math.random()}`,
      mesh: group,
      burnerMat,
      orbitAxis,
      currentDir: normDir,
      orbitSpeed: 0.065 + Math.random() * 0.03,
      baseAltitude,
      phase: Math.random() * Math.PI * 2,
    };

    if (withSparkles) {
      this.emitSparklesAtDir(normDir, '#ffb8d1', baseAltitude);
    }

    this.balloons.push(entity);
  }

  private spawnShootingStar(dir: THREE.Vector3) {
    const normDir = dir.clone().normalize();
    const mesh = createShootingStarMesh();

    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const altitude = 1.22;
    mesh.position.copy(normDir).multiplyScalar(altitude);
    this.atmosphereGroup.add(mesh);

    const entity: ShootingStarEntity = {
      id: `star_${Date.now()}_${Math.random()}`,
      mesh,
      orbitAxis,
      currentDir: normDir,
      speed: 1.35,
      altitude,
      age: 0,
      maxAge: 1.65,
      sparkleTimer: 0,
    };

    this.shootingStars.push(entity);
    this.shootingStarGazeTimer = 2.4;
    this.emitSparklesAtDir(normDir, '#fff3a1', altitude);
  }

  private spawnVillager(dir: THREE.Vector3, withSparkles = true) {
    const normDir = dir.clone().normalize();
    const vIdx = this.villagerCounter++;
    const { group, bodyMesh, headGroup, leftLeg, rightLeg, leftArm, rightArm } =
      createVillagerMesh(vIdx);
    const yaw = Math.random() * Math.PI * 2;
    this.orientObjectOnSurface(group, normDir, yaw);
    this.inhabitantsGroup.add(group);

    const headingToWell = vIdx % 4 === 0;
    const targetDir = this.pickNextVillagerTarget(headingToWell, normDir);
    const entity: VillagerEntity = {
      id: `villager_${Date.now()}_${Math.random()}`,
      mesh: group,
      bodyMesh,
      headGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      dir: normDir,
      targetDir,
      speed: 0.082 + Math.random() * 0.032,
      walkPhase: Math.random() * Math.PI * 2,
      pauseTimer: Math.random() * 1.2,
      headingToWell,
      bounceTime: withSparkles ? 0.0 : 10.0,
      yaw,
      stuckTimer: 0,
      steerSign: vIdx % 2 === 0 ? 1 : -1,
    };

    // Immediately resolve any spawn overlap with buildings or fences
    this.resolveVillagerCollisions(entity, []);
    this.orientObjectOnSurface(entity.mesh, entity.dir, entity.yaw);

    if (withSparkles) {
      this.emitSparklesAtDir(entity.dir, '#ffd180');
    }

    this.villagers.push(entity);
  }

  private sampleClearRingAroundHub(
    hubDir: THREE.Vector3,
    minRingRadius: number,
    maxRingRadius: number,
  ): THREE.Vector3 | null {
    const refUp = Math.abs(hubDir.y) < 0.9 ? UP_VEC : new THREE.Vector3(1, 0, 0);
    const ringRight = new THREE.Vector3().crossVectors(refUp, hubDir).normalize();
    const ringUp = new THREE.Vector3().crossVectors(hubDir, ringRight).normalize();

    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r =
        minRingRadius + Math.random() * Math.max(0.005, maxRingRadius - minRingRadius);
      const candidate = hubDir
        .clone()
        .addScaledVector(ringRight, Math.cos(angle) * r)
        .addScaledVector(ringUp, Math.sin(angle) * r)
        .normalize();
      if (this.isPositionClearOfObstacles(candidate, 0.018)) {
        return candidate;
      }
    }
    return null;
  }

  private pickNextVillagerTarget(
    headingToSocialHub: boolean,
    fromDir?: THREE.Vector3,
  ): THREE.Vector3 {
    const isEveningOrNight = this.timeOfDay > 0.42 && this.timeOfDay < 0.9;
    const campfires = this.placedObjects.filter((o) => o.type === 'campfire');

    // Count how many villagers are already near or heading toward the stone well
    const wellVisitorCount = this.villagers.filter(
      (v) =>
        v.dir.distanceTo(this.wellDirection) < 0.14 ||
        v.targetDir.distanceTo(this.wellDirection) < 0.14,
    ).length;

    if (headingToSocialHub) {
      // 1. At dusk and night, villagers gather around the outside ring of cozy campfires
      if (isEveningOrNight && campfires.length > 0 && Math.random() < 0.75) {
        const sortedFires = fromDir
          ? [...campfires].sort(
              (a, b) => a.dir.distanceTo(fromDir) - b.dir.distanceTo(fromDir),
            )
          : campfires;
        const cf = sortedFires[0];
        const baseR = this.getObjectCollisionRadius('campfire');
        const spot = this.sampleClearRingAroundHub(cf.dir, baseR + 0.026, baseR + 0.044);
        if (spot) return spot;
      }

      // 2. Only allow at most 2 villagers at a time to head to the Stone Well, and only if reasonably nearby
      const nearWellHemisphere = !fromDir || fromDir.distanceTo(this.wellDirection) < 0.85;
      if (wellVisitorCount < 2 && nearWellHemisphere && Math.random() < 0.45) {
        const wellBaseR = this.getObjectCollisionRadius('well');
        const wellSpot = this.sampleClearRingAroundHub(
          this.wellDirection,
          wellBaseR + 0.028,
          wellBaseR + 0.048,
        );
        if (wellSpot) return wellSpot;
      }

      // 3. Otherwise visit one of the other scenic London landmarks across the globe
      const communityHubs = this.placedObjects.filter(
        (o) =>
          o.type === 'bigben' ||
          o.type === 'palace' ||
          o.type === 'londoneye' ||
          o.type === 'stpauls' ||
          o.type === 'shard' ||
          o.type === 'campfire' ||
          o.type === 'windmill' ||
          o.type === 'watchtower' ||
          o.type === 'beehive' ||
          o.type === 'dock',
      );
      if (communityHubs.length > 0) {
        const filteredHubs = fromDir
          ? communityHubs.filter((h) => h.dir.distanceTo(fromDir) > 0.08)
          : communityHubs;
        const pool = filteredHubs.length > 0 ? filteredHubs : communityHubs;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        if (
          chosen.type === 'bigben' ||
          chosen.type === 'palace' ||
          chosen.type === 'londoneye' ||
          chosen.type === 'stpauls' ||
          chosen.type === 'shard' ||
          chosen.type === 'windmill' ||
          chosen.type === 'watchtower' ||
          chosen.type === 'dock'
        ) {
          return this.getBuildingEntranceDir(
            chosen,
            (Math.random() - 0.5) * 0.022,
          );
        }
        const hubR = this.getObjectCollisionRadius(chosen.type);
        const hubSpot = this.sampleClearRingAroundHub(
          chosen.dir,
          hubR + 0.026,
          hubR + 0.044,
        );
        if (hubSpot) return hubSpot;
      }
    }

    // Visit a London townhouse, palace, Big Ben, cathedral, watchtower, or pier around the globe
    const destinations = this.placedObjects.filter(
      (o) =>
        o.type === 'house' ||
        o.type === 'bigben' ||
        o.type === 'palace' ||
        o.type === 'londoneye' ||
        o.type === 'stpauls' ||
        o.type === 'shard' ||
        o.type === 'watchtower' ||
        o.type === 'windmill' ||
        o.type === 'dock',
    );
    if (destinations.length > 0) {
      // Exclude the building the villager is currently standing right in front of
      const candidates = fromDir
        ? destinations.filter((d) => d.dir.distanceTo(fromDir) > 0.09)
        : destinations;
      const pool = candidates.length > 0 ? candidates : destinations;

      // 70% of the time pick one of the 4 closest destinations in the villager's region; 30% trek across the globe
      let chosen: PlacedObjectEntity;
      if (fromDir && Math.random() < 0.7 && pool.length > 4) {
        const sorted = [...pool].sort(
          (a, b) => a.dir.distanceTo(fromDir) - b.dir.distanceTo(fromDir),
        );
        const localSlice = sorted.slice(0, 4);
        chosen = localSlice[Math.floor(Math.random() * localSlice.length)];
      } else {
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }

      const lateral = (Math.random() - 0.5) * 0.022;
      // Target the front door threshold / porch outside the building, NEVER the building center!
      return this.getBuildingEntranceDir(chosen, lateral);
    }

    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = this.wellDirection
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.34,
            (Math.random() - 0.5) * 0.34,
            0,
          ),
        )
        .normalize();
      if (this.isPositionClearOfObstacles(candidate, 0.014)) {
        return candidate;
      }
    }
    return this.wellDirection
      .clone()
      .add(new THREE.Vector3(0, 0.068, 0))
      .normalize();
  }

  private spawnSheep(
    dir: THREE.Vector3,
    withSparkles = true,
    forceInPasture?: boolean,
  ) {
    const normDir = dir.clone().normalize();
    const { group, headGroup, legs, tailMesh } = createSheepMesh();
    const yaw = Math.random() * Math.PI * 2;
    this.orientObjectOnSurface(group, normDir, yaw);
    this.inhabitantsGroup.add(group);

    const isInsideCorral =
      forceInPasture !== undefined
        ? forceInPasture
        : normDir.distanceTo(this.pastureCenter) < this.pastureRadius - 0.01;

    const entity: SheepEntity = {
      id: `sheep_${Date.now()}_${Math.random()}`,
      mesh: group,
      headGroup,
      legs,
      tailMesh,
      dir: normDir,
      targetDir: normDir.clone(),
      speed: 0.04 + Math.random() * 0.018,
      walkPhase: Math.random() * Math.PI * 2,
      grazeTimer: 0.8 + Math.random() * 2.4,
      isGrazing: true,
      bounceTime: withSparkles ? 0.0 : 10.0,
      yaw,
      inPasture: isInsideCorral,
    };

    this.resolveSheepCollisions(entity);
    this.orientObjectOnSurface(entity.mesh, entity.dir, entity.yaw);

    if (withSparkles) {
      this.emitSparklesAtDir(entity.dir, '#ffffff');
    }

    this.sheepList.push(entity);
  }

  private spawnCloud(
    dir: THREE.Vector3,
    withSparkles = true,
    initialRainTimer = 4.0,
    isSnow = false,
  ) {
    const normDir = dir.clone().normalize();
    const { group, rainLines, rainMat, snowPoints, snowMat } =
      createPuffyCloudMesh(isSnow);

    // Pick an orbital axis perpendicular to initial direction
    const randVec = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() + 0.4,
      Math.random() - 0.5,
    ).normalize();
    const orbitAxis = new THREE.Vector3()
      .crossVectors(normDir, randVec)
      .normalize();

    const altitude = 1.09 + Math.random() * 0.07; // Suspended inside the 1.50 glass orb above 0.75 planet
    group.position.copy(normDir).multiplyScalar(altitude);
    group.quaternion.setFromUnitVectors(UP_VEC, normDir);
    this.atmosphereGroup.add(group);

    const entity: CloudEntity = {
      id: `cloud_${Date.now()}_${Math.random()}`,
      isSnow,
      mesh: group,
      rainLines,
      rainMat,
      snowPoints,
      snowMat,
      orbitAxis,
      currentDir: normDir,
      orbitSpeed: 0.11 + Math.random() * 0.05,
      altitude,
      rainTimer: initialRainTimer,
      isRaining: isSnow, // Snow clouds begin gently snowing right away
      bounceTime: withSparkles ? 0.0 : 10.0,
    };

    if (withSparkles) {
      this.emitSparklesAtDir(normDir, isSnow ? '#ffffff' : '#cce8ff', altitude);
    }

    this.clouds.push(entity);
  }

  public emitSparklesAtDir(
    dir: THREE.Vector3,
    hexColor = '#ffe57f',
    customRadius?: number,
  ) {
    const surface = this.terrain.getSurfacePointAndNormal(dir);
    const origin = customRadius
      ? dir.clone().normalize().multiplyScalar(customRadius)
      : surface.point.clone().addScaledVector(surface.normal, 0.025);

    const count = 18;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const baseCol = new THREE.Color(hexColor);
    const altCol = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      const c = i % 2 === 0 ? baseCol : altCol;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
      );
      const vel = surface.normal
        .clone()
        .multiplyScalar(0.12 + Math.random() * 0.14)
        .addScaledVector(spread, 0.09);
      velocities.push(vel);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.effectsGroup.add(points);
    this.sparkles.push({
      points,
      velocities,
      age: 0,
      maxAge: 0.75,
    });
  }

  private realignAllObjectsToTerrain() {
    this.roadNetwork.rebuildGeometry();
    for (const obj of this.placedObjects) {
      const stickToSea =
        obj.type === 'dock' ||
        obj.type === 'bridge' ||
        obj.type === 'towerbridge' ||
        obj.type === 'westminsterbridge';
      const useRadialUp =
        stickToSea ||
        obj.type === 'lighthouse' ||
        obj.type === 'bigben' ||
        obj.type === 'palace' ||
        obj.type === 'londoneye' ||
        obj.type === 'stpauls' ||
        obj.type === 'shard';
      const normalOffset = stickToSea
        ? 0
        : obj.type === 'house'
          ? -0.002
          : -0.001;
      this.orientObjectOnSurface(
        obj.mesh,
        obj.dir,
        obj.yaw,
        normalOffset,
        stickToSea,
        useRadialUp,
      );
    }
    for (const v of this.roadVehicles) {
      this.positionRoadVehicle(v);
    }
  }

  public handleSurfaceAction(localDir: THREE.Vector3) {
    const surface = this.terrain.getSurfacePointAndNormal(localDir);
    const tool = this.activeTool;

    if (tool === 'raise' || tool === 'lower' || tool === 'mountain' || tool === 'lake') {
      this.terrain.sculptAtDirection(localDir, tool);
      this.realignAllObjectsToTerrain();
      this.emitSparklesAtDir(
        localDir,
        tool === 'lake' || tool === 'lower' ? '#7ef2e6' : '#c9f29b',
      );
      this.syncWorldStats();
      return;
    }

    if (tool === 'remove') {
      // Find closest removable placed object, sailboat, duck, balloon, or cloud
      let bestIdx = -1;
      let bestDist = 0.16;
      for (let i = 0; i < this.placedObjects.length; i++) {
        const o = this.placedObjects[i];
        if (!o.removable) continue;
        const d = o.dir.distanceTo(localDir);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        const removed = this.placedObjects.splice(bestIdx, 1)[0];
        this.objectsGroup.remove(removed.mesh);
        this.emitSparklesAtDir(removed.dir, '#ffb8b8');
        this.syncWorldStats();
        return;
      }

      for (let i = 0; i < this.sailboats.length; i++) {
        if (this.sailboats[i].dir.distanceTo(localDir) < 0.18) {
          const removed = this.sailboats.splice(i, 1)[0];
          this.inhabitantsGroup.remove(removed.mesh);
          this.emitSparklesAtDir(removed.dir, '#ffb8b8', this.terrain.seaLevel);
          this.syncWorldStats();
          return;
        }
      }

      for (let i = 0; i < this.ducks.length; i++) {
        if (this.ducks[i].dir.distanceTo(localDir) < 0.18) {
          const removed = this.ducks.splice(i, 1)[0];
          this.inhabitantsGroup.remove(removed.mesh);
          this.emitSparklesAtDir(removed.dir, '#ffb8b8', this.terrain.seaLevel);
          this.syncWorldStats();
          return;
        }
      }

      for (let i = 0; i < this.balloons.length; i++) {
        if (this.balloons[i].currentDir.distanceTo(localDir) < 0.24) {
          const removed = this.balloons.splice(i, 1)[0];
          this.atmosphereGroup.remove(removed.mesh);
          this.emitSparklesAtDir(removed.currentDir, '#ffb8b8', removed.baseAltitude);
          this.syncWorldStats();
          return;
        }
      }
      return;
    }

    // Universal London Weather & Sky tools
    if (tool === 'cloud') {
      this.setWeatherMode('rain');
      this.spawnCloud(localDir, true, 1.0, false);
      this.syncWorldStats();
      return;
    }
    if (tool === 'snowcloud') {
      this.setWeatherMode('snow');
      this.spawnCloud(localDir, true, 0.2, true);
      this.syncWorldStats();
      return;
    }
    if (tool === 'fog') {
      this.setWeatherMode('fog');
      this.emitSparklesAtDir(localDir, '#e6dec8', 0.92);
      this.syncWorldStats();
      return;
    }
    if (tool === 'balloon') {
      this.spawnBalloon(localDir, true);
      this.syncWorldStats();
      return;
    }
    if (tool === 'shootingstar') {
      this.spawnShootingStar(localDir);
      this.syncWorldStats();
      return;
    }
    if (tool === 'rainbow') {
      this.setWeatherMode('clear');
      const yaw = this.findCollisionFreeRainbowYaw(localDir);
      this.placeStaticObject('rainbow', localDir, yaw, true, true);
      this.syncWorldStats();
      return;
    }

    // Water & River Thames tools
    if (tool === 'sailboat') {
      this.spawnSailboat(localDir, true);
      this.syncWorldStats();
      return;
    }
    if (tool === 'duck') {
      this.spawnDuckFlock(localDir, true);
      this.syncWorldStats();
      return;
    }
    if (tool === 'towerbridge') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection) + Math.PI / 2;
      this.placeStaticObject('towerbridge', localDir, yaw, true, true);
      this.syncWorldStats();
      return;
    }
    if (tool === 'dock') {
      if (surface.isWater) {
        this.placeStaticObject(
          'bridge',
          localDir,
          Math.random() * Math.PI * 2,
          true,
          true,
        );
      } else {
        const nearestWater = this.terrain.findNearestWaterDirection(localDir, 0.55);
        let yaw = Math.random() * Math.PI * 2;
        if (nearestWater) {
          const tangent = nearestWater
            .clone()
            .sub(localDir)
            .projectOnPlane(surface.normal)
            .normalize();
          yaw = Math.atan2(tangent.x, tangent.z);
        }
        this.placeStaticObject('dock', localDir, yaw, true, true);
      }
      this.syncWorldStats();
      return;
    }

    // Ensure dry land for land-based London landmarks (if underwater, gently raise an embankment patch)
    if (surface.isWater) {
      this.terrain.sculptAtDirection(localDir, 'raise');
      this.realignAllObjectsToTerrain();
    }

    if (tool === 'bigben') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      this.placeStaticObject('bigben', localDir, yaw, true, true);
    } else if (tool === 'palace') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      const pal = this.placeStaticObject('palace', localDir, yaw, true, true);
      this.spawnVillager(this.getBuildingEntranceDir(pal, -0.015), false);
      this.spawnVillager(this.getBuildingEntranceDir(pal, 0.015), false);
    } else if (tool === 'londoneye') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      this.placeStaticObject('londoneye', localDir, yaw, true, true);
    } else if (tool === 'stpauls') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      this.placeStaticObject('stpauls', localDir, yaw, true, true);
    } else if (tool === 'shard') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      this.placeStaticObject('shard', localDir, yaw, true, true);
    } else if (tool === 'redbus' || tool === 'blackcab') {
      // Find nearest road node and spawn a live driving bus or black cab onto the road network
      let bestNode: RoadNodeId = 'trafalgar';
      let bestDist = 999;
      (Object.keys(ROAD_NODES) as RoadNodeId[]).forEach((nid) => {
        const d = ROAD_NODES[nid].distanceTo(localDir);
        if (d < bestDist) {
          bestDist = d;
          bestNode = nid;
        }
      });
      const neighbors = getConnectedRoadNodes(bestNode);
      const nextNode =
        neighbors[Math.floor(Math.random() * neighbors.length)] || 'parliament';
      this.spawnRoadVehicle(tool, bestNode, nextNode, 0.25, true);
    } else if (tool === 'tree') {
      const updated = this.terrain.getSurfacePointAndNormal(localDir);
      let treeType: PlacedObjectType = 'oak';
      if (updated.isBeach) {
        treeType = 'palm';
      } else if (updated.isMountain || localDir.y > 0.58) {
        treeType = 'pine';
      }
      this.placeStaticObject(treeType, localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'house') {
      const houseYaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      const newHouse = this.placeStaticObject('house', localDir, houseYaw, true, true);
      this.spawnVillager(this.getBuildingEntranceDir(newHouse, -0.014), false);
      this.spawnVillager(this.getBuildingEntranceDir(newHouse, 0.014), false);
    } else if (tool === 'watchtower') {
      const yaw = this.computeYawFacingTarget(localDir, this.wellDirection);
      this.placeStaticObject('watchtower', localDir, yaw, true, true);
    } else if (tool === 'lantern') {
      this.placeStaticObject('lantern', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'flower') {
      this.placeStaticObject('flower', localDir, Math.random() * Math.PI * 2, true, true);
    } else if (tool === 'villager') {
      this.spawnVillager(localDir, true);
    }

    // Displace any villagers standing inside a newly placed structure's footprint
    const bridgesAndDocks = this.placedObjects.filter(
      (o) =>
        o.type === 'bridge' ||
        o.type === 'dock' ||
        o.type === 'westminsterbridge' ||
        o.type === 'towerbridge',
    );
    for (const v of this.villagers) {
      this.resolveVillagerCollisions(v, bridgesAndDocks);
    }

    this.syncWorldStats();
  }

  /**
   * "Grow" button advances village development through new homes, paths, and trees,
   * and visibly advances existing trees' growth!
   */
  public triggerGrowVillage() {
    // 1. Mature existing trees with a joyful bounce
    for (const obj of this.placedObjects) {
      if (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') {
        obj.targetGrowth = Math.min(1.42, obj.targetGrowth + 0.18);
        obj.bounceTime = 0;
        obj.bounceActive = true;
      }
    }

    // 2. Find an open meadow spot near the village well for a new pastel cottage + path
    for (let attempt = 0; attempt < 28; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.19 + Math.random() * 0.26;
      const candidate = new THREE.Vector3(
        this.wellDirection.x + Math.cos(angle) * dist,
        this.wellDirection.y + Math.sin(angle) * dist,
        this.wellDirection.z + (Math.random() - 0.5) * 0.2,
      ).normalize();

      if (this.isPositionClearOfObstacles(candidate, 0.068, false)) {
        const houseYaw = this.computeYawFacingTarget(candidate, this.wellDirection);
        const newHouse = this.placeStaticObject('house', candidate, houseYaw, true, true);
        const doorDir = this.getBuildingEntranceDir(newHouse, 0);
        const pathDir = doorDir.clone().lerp(this.wellDirection, 0.5).normalize();
        const pathYaw = this.computeYawFacingTarget(pathDir, this.wellDirection);
        this.placeStaticObject('path', pathDir, pathYaw, true, true);
        this.spawnVillager(this.getBuildingEntranceDir(newHouse, -0.014), false);
        this.spawnVillager(this.getBuildingEntranceDir(newHouse, 0.014), false);
        break;
      }
    }

    // 3. Plant 2 new trees and 1 flower cluster on open land
    for (let t = 0; t < 3; t++) {
      const randDir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() + 0.2,
      ).normalize();
      const surf = this.terrain.getSurfacePointAndNormal(randDir);
      if (!surf.isWater) {
        const kind: PlacedObjectType =
          t === 2
            ? 'flower'
            : surf.isBeach
              ? 'palm'
              : surf.isMountain
                ? 'pine'
                : 'oak';
        this.placeStaticObject(kind, randDir, Math.random() * Math.PI * 2, true, true);
      }
    }

    this.dayCount += 1;
    this.syncWorldStats();
  }

  public setTool(tool: ToolId) {
    this.activeTool = tool;
    // If user clicks a universal weather tool in the dock, immediately apply that universal weather across London!
    if (tool === 'cloud') {
      this.setWeatherMode('rain');
    } else if (tool === 'snowcloud') {
      this.setWeatherMode('snow');
    } else if (tool === 'fog') {
      this.setWeatherMode('fog');
    } else if (tool === 'rainbow') {
      this.setWeatherMode('clear');
    }
    this.onStateChange((prev) => ({ ...prev, activeTool: tool }));
  }

  public setWeatherMode(mode: WeatherMode, disableAuto = true) {
    this.weatherMode = mode;
    if (disableAuto) {
      this.weatherAuto = false;
    }
    const weatherOverlay = this.buildWeatherOverlayState();
    this.onStateChange((prev) => ({
      ...prev,
      weatherMode: mode,
      weatherAuto: this.weatherAuto,
      weatherOverlay,
    }));
  }

  public setWeatherAuto(auto: boolean) {
    this.weatherAuto = auto;
    if (auto) {
      const scheduled = this.resolveAutoWeatherForTimeAndCycle(
        this.timeOfDay,
        this.dayCount,
      );
      this.weatherMode = scheduled.mode;
    }
    const weatherOverlay = this.buildWeatherOverlayState();
    this.onStateChange((prev) => ({
      ...prev,
      weatherMode: this.weatherMode,
      weatherAuto: this.weatherAuto,
      weatherOverlay,
    }));
  }

  public setMonthIndex(monthIdx: number) {
    this.monthIndex = ((monthIdx % 12) + 12) % 12;
    this.festiveLightsGroup.visible = this.monthIndex === 11;
    if (this.weatherAuto) {
      const scheduled = this.resolveAutoWeatherForTimeAndCycle(
        this.timeOfDay,
        this.dayCount,
      );
      this.weatherMode = scheduled.mode;
    }
    this.syncWorldStats();
  }

  public stepMonth(delta: number) {
    const next = this.monthIndex + delta;
    if (next >= 12) {
      this.yearCount += Math.floor(next / 12);
    } else if (next < 0) {
      this.yearCount = Math.max(1, this.yearCount - 1);
    }
    this.setMonthIndex(next);
  }

  private initFestiveChristmasLights() {
    this.festiveLightsGroup.clear();
    this.festiveBulbMats = [];

    const bulbColors = [0xffe066, 0xff4d4d, 0x38d996, 0xfff3bf, 0xff922b];
    for (const hex of bulbColors) {
      this.festiveBulbMats.push(
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 1.8,
          roughness: 0.2,
        }),
      );
    }
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.8,
    });
    const goldStarMat = new THREE.MeshStandardMaterial({
      color: 0xffd43b,
      emissive: 0xffb703,
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });

    const bulbGeo = new THREE.SphereGeometry(0.0016, 6, 6);
    const starGeo = new THREE.OctahedronGeometry(0.0032, 0);

    // 1. Overhead Regent Street / Oxford Street / The Mall / Strand Festive Light Garlands
    //    Suspended at height 0.046 (well above double-decker buses)
    const festiveSegments = ROAD_SEGMENTS.slice(0, 14);
    festiveSegments.forEach((seg, segIdx) => {
      for (const frac of [0.28, 0.52, 0.74]) {
        const sample = sampleRoadSegmentPoint(
          seg,
          frac,
          (d) => this.terrain.getSurfacePointAndNormal(d),
          this.terrain.seaLevel,
        );
        const right = new THREE.Vector3()
          .crossVectors(sample.tangent, sample.normal)
          .normalize();
        const spanHalf = 0.0115;
        const archHeight = 0.046;

        const archGroup = new THREE.Group();
        const count = 7;
        for (let i = 0; i <= count; i++) {
          const u = i / count;
          const xOff = (u - 0.5) * 2 * spanHalf;
          const sag = Math.sin(u * Math.PI) * -0.0035;
          const pt = sample.point
            .clone()
            .addScaledVector(right, xOff)
            .addScaledVector(sample.normal, archHeight + sag);

          const mat =
            this.festiveBulbMats[(segIdx + i) % this.festiveBulbMats.length];
          const bulb = new THREE.Mesh(bulbGeo, mat);
          bulb.position.copy(pt);
          archGroup.add(bulb);

          if (i === Math.floor(count / 2)) {
            const star = new THREE.Mesh(starGeo, goldStarMat);
            star.position.copy(pt).addScaledVector(sample.normal, 0.0022);
            archGroup.add(star);
          }
        }
        this.festiveLightsGroup.add(archGroup);
      }
    });

    // 2. Warm Fairy Light Garlands along London Townhouse & Landmark Rooflines
    this.placedObjects.forEach((obj, objIdx) => {
      if (
        obj.type !== 'house' &&
        obj.type !== 'palace' &&
        obj.type !== 'kewpalace' &&
        obj.type !== 'greenwich'
      ) {
        return;
      }
      const garland = new THREE.Group();
      const width = obj.type === 'house' ? 0.025 : 0.048;
      const eaveY = obj.type === 'house' ? 0.036 : 0.038;
      const frontZ = obj.type === 'house' ? 0.0142 : 0.019;
      const numBulbs = obj.type === 'house' ? 6 : 10;

      const garlandBar = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.0012, 0.0012),
        wireMat,
      );
      garlandBar.position.set(0, eaveY, frontZ);
      garland.add(garlandBar);

      for (let b = 0; b <= numBulbs; b++) {
        const u = b / numBulbs;
        const bx = (u - 0.5) * width;
        const by = eaveY - Math.sin(u * Math.PI * 2) * 0.0012;
        const mat =
          this.festiveBulbMats[(objIdx + b) % this.festiveBulbMats.length];
        const bulb = new THREE.Mesh(bulbGeo, mat);
        bulb.position.set(bx, by, frontZ + 0.0008);
        garland.add(bulb);
      }

      garland.position.copy(obj.mesh.position);
      garland.quaternion.copy(obj.mesh.quaternion);
      this.festiveLightsGroup.add(garland);
    });

    // 3. Iconic Trafalgar Square Norwegian Spruce Christmas Tree (Gifted by Oslo since 1947)
    const trafalgarTreeDir = new THREE.Vector3(-0.075, 0.215, 0.973).normalize();
    const treeSurf = this.terrain.getSurfacePointAndNormal(trafalgarTreeDir);
    const xmasTree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.003, 0.012, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.9 }),
    );
    trunk.position.y = 0.006;
    xmasTree.add(trunk);

    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x1b4d3e,
      roughness: 0.75,
    });
    const tiers = [
      { y: 0.018, r: 0.013, h: 0.022 },
      { y: 0.031, r: 0.010, h: 0.019 },
      { y: 0.042, r: 0.007, h: 0.016 },
    ];
    tiers.forEach((tier, tIdx) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(tier.r, tier.h, 10),
        pineMat,
      );
      cone.position.y = tier.y;
      xmasTree.add(cone);

      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + tIdx * 0.4;
        const rad = tier.r * 0.78;
        const bulb = new THREE.Mesh(
          bulbGeo,
          this.festiveBulbMats[(a + tIdx) % this.festiveBulbMats.length],
        );
        bulb.position.set(
          Math.cos(ang) * rad,
          tier.y - tier.h * 0.22,
          Math.sin(ang) * rad,
        );
        xmasTree.add(bulb);
      }
    });

    const topStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.0042, 0),
      goldStarMat,
    );
    topStar.position.y = 0.052;
    xmasTree.add(topStar);

    xmasTree.position.copy(treeSurf.point);
    xmasTree.quaternion.setFromUnitVectors(UP_VEC, treeSurf.normal);
    this.festiveLightsGroup.add(xmasTree);

    this.festiveLightsGroup.visible = this.monthIndex === 11;
  }

  private updateFestiveLights(elapsed: number, warmGlowFactor: number) {
    const isDec = this.monthIndex === 11;
    this.festiveLightsGroup.visible = isDec;
    if (!isDec) return;

    for (let i = 0; i < this.festiveBulbMats.length; i++) {
      const twinkle = 0.75 + Math.sin(elapsed * 5.2 + i * 1.4) * 0.35;
      this.festiveBulbMats[i].emissiveIntensity =
        (0.95 + warmGlowFactor * 1.85) * twinkle;
    }
  }

  private resolveAutoWeatherForTimeAndCycle(
    t: number,
    day: number,
  ): {
    mode: WeatherMode;
    condition: string;
    focusZone: string;
    phaseLabel: string;
  } {
    // Yearly + Daily London Weather Calendar:
    // - Snow occurs ONCE a year in December (this.monthIndex === 11)
    // - Rain / Drizzle occurs at authentic London frequency across the seasons
    // - Morning & Nocturnal Thames mist transitions occur around dawn and night
    const m = this.monthIndex; // 0 = Jan ... 11 = Dec
    const monthName = MONTH_NAMES[m] || 'December';
    const season = getSeasonForMonth(m);
    const cycleMod = ((day - 1) % 3 + 3) % 3;

    //DECEMBER (m === 11): Festive Christmas Season & Annual London Snowfall
    if (m === 11) {
      if (t >= 0.16 && t < 0.76) {
        return {
          mode: 'snow',
          condition: 'December Christmas Snowfall & Fairy Lights',
          focusZone: 'Regent Street, Trafalgar Square & Hyde Park',
          phaseLabel: `${monthName} Festive Snow`,
        };
      }
      if (t < 0.16) {
        return {
          mode: 'fog',
          condition: 'Frosty December Thames Mist',
          focusZone: 'Westminster Bridge & Victoria Embankment',
          phaseLabel: `${monthName} Dawn Frost`,
        };
      }
      return {
        mode: 'clear',
        condition: 'Crisp Christmas Starlight & Fairy Lights',
        focusZone: 'Covent Garden, Bloomsbury & West End',
        phaseLabel: `${monthName} Festive Night`,
      };
    }

    // 1. Dawn & Early Morning (06:00 – 09:30 GMT | t: 0.00 – 0.145)
    if (t < 0.145) {
      if (m === 9 || m === 10 || m === 0 || m === 1 || cycleMod === 0) {
        return {
          mode: 'fog',
          condition:
            m === 10 ? 'November Pea-Souper River Fog' : 'Thames Morning Mist',
          focusZone: 'Westminster & Victoria Embankment',
          phaseLabel: `${monthName} Dawn Mist`,
        };
      }
      return {
        mode: 'clear',
        condition: `${monthName} Morning Sunshine`,
        focusZone: 'Royal Greenwich & Tower Bridge',
        phaseLabel: `${monthName} Morning`,
      };
    }

    // 2. Late Morning to Mid-Afternoon (09:30 – 15:00 GMT | t: 0.145 – 0.375)
    // Frequent passing London showers in Spring (Mar/Apr), Autumn (Oct/Nov), and Late Winter (Jan/Feb)
    const isRainyMonth =
      m === 1 || m === 2 || m === 3 || m === 9 || m === 10 || (m === 4 && cycleMod === 1);
    if (t < 0.375) {
      if (isRainyMonth && t >= 0.20 && t <= 0.35) {
        return {
          mode: 'rain',
          condition: `${monthName} Passing London Drizzle`,
          focusZone: 'Mayfair, Bloomsbury & Trafalgar Square',
          phaseLabel: `${season} Atlantic Drizzle`,
        };
      }
      return {
        mode: 'clear',
        condition: `${monthName} Royal Parks Sunshine`,
        focusZone: 'Hyde Park, The Mall & St. James’s',
        phaseLabel: `${season} Midday Clear`,
      };
    }

    // 3. Late Afternoon & Dusk Transition (15:00 – 19:45 GMT | t: 0.375 – 0.573)
    // Classic London afternoon rain shower or autumn/winter estuary squall
    if (t < 0.573) {
      if (m === 9 || m === 10 || (m === 2 && cycleMod === 2)) {
        return {
          mode: 'storm',
          condition: `${monthName} Thames Estuary Squall`,
          focusZone: 'Pool of London, Canary Wharf & Tower Bridge',
          phaseLabel: `${season} Dusk Squall`,
        };
      }
      // Summer months (Jun/Jul/Aug) stay clearer; other months get classic afternoon London rain
      if (m !== 5 && m !== 6 && m !== 7) {
        return {
          mode: 'rain',
          condition: `${monthName} Afternoon Thames Shower`,
          focusZone: 'South Bank, Waterloo & City of London',
          phaseLabel: `${season} Afternoon Shower`,
        };
      }
      return {
        mode: 'clear',
        condition: `${monthName} Golden Thames Sunset`,
        focusZone: 'Battersea Reach, Chelsea & Kew Gardens',
        phaseLabel: `${season} Golden Dusk`,
      };
    }

    // 4. Evening & Nighttime (19:45 – 06:00 GMT | t: 0.573 – 1.00)
    if (t >= 0.85 || ((m === 9 || m === 10 || m === 0) && t < 0.72)) {
      return {
        mode: 'fog',
        condition: `${monthName} Nocturnal Embankment Fog`,
        focusZone: 'Chelsea Reach, Lambeth & Canary Wharf',
        phaseLabel: `${season} Night River Fog`,
      };
    }

    return {
      mode: 'clear',
      condition: `${monthName} Starlit Westminster Sky`,
      focusZone: 'Parliament Square & Royal Greenwich',
      phaseLabel: `${season} Night Sky`,
    };
  }

  private buildWeatherOverlayState(): WeatherOverlayState {
    const scheduled = this.resolveAutoWeatherForTimeAndCycle(
      this.timeOfDay,
      this.dayCount,
    );

    const activeMode = this.weatherMode;
    let localizedCondition = scheduled.condition;
    let localizedFocusZone = scheduled.focusZone;
    const cyclePhaseLabel = this.weatherAuto
      ? scheduled.phaseLabel
      : 'Manual Weather Override';

    if (!this.weatherAuto) {
      switch (activeMode) {
        case 'fog':
          localizedCondition = 'London Pea-Souper Fog';
          localizedFocusZone = 'Thames Valley & Embankment Reaches';
          break;
        case 'rain':
          localizedCondition = 'Classic London Drizzle';
          localizedFocusZone = 'Westminster, Soho & South Bank';
          break;
        case 'storm':
          localizedCondition = 'Thames Estuary Squall';
          localizedFocusZone = 'Pool of London & Docklands';
          break;
        case 'snow':
          localizedCondition = 'December London Snowfall';
          localizedFocusZone = 'Hampstead Heath & Royal Parks';
          break;
        case 'clear':
        default:
          localizedCondition =
            this.timeOfDay < 0.5
              ? 'Crisp London Sunshine'
              : 'Starlit London Sky';
          localizedFocusZone = 'Central London & Royal Parks';
          break;
      }
    }

    if (this.selectedObject?.info) {
      localizedFocusZone = this.selectedObject.info.borough;
    }

    // Seasonal baseline temperature for London (°C) from Jan (0) to Dec (11)
    const monthlyMeanTemps = [6, 7, 9, 12, 16, 19, 22, 21, 18, 14, 9, 5];
    const seasonalBase = monthlyMeanTemps[this.monthIndex] ?? 12;
    const diurnalWave = Math.sin((this.timeOfDay - 0.08) * Math.PI * 2);
    let baseTemp = seasonalBase + diurnalWave * 3.2;
    if (activeMode === 'snow') baseTemp = Math.min(1.0, 0.2 + diurnalWave * 1.2);
    else if (activeMode === 'rain') baseTemp -= 1.8;
    else if (activeMode === 'storm') baseTemp -= 2.6;
    else if (activeMode === 'fog') baseTemp -= 1.5;

    const windSpeedKmh =
      activeMode === 'storm'
        ? 38
        : activeMode === 'rain'
          ? 22
          : activeMode === 'snow'
            ? 15
            : activeMode === 'fog'
              ? 9
              : 14;

    return {
      rainIntensity: Number(this.rainBlend.toFixed(3)),
      fogIntensity: Number(this.fogBlend.toFixed(3)),
      snowIntensity: Number(this.snowBlend.toFixed(3)),
      stormIntensity: activeMode === 'storm' ? Number(this.rainBlend.toFixed(3)) : 0,
      windSpeedKmh,
      temperatureC: Math.round(baseTemp),
      localizedCondition,
      localizedFocusZone,
      cyclePhaseLabel,
    };
  }

  private getClockStringAndHands(): {
    clockText: string;
    isDaytime: boolean;
    hourAngle: number;
    minuteAngle: number;
  } {
    // timeOfDay in [0.0, 0.5) => 06:00 to 18:00 GMT (Exact 30.0s Daytime)
    // timeOfDay in [0.5, 1.0) => 18:00 to 06:00 GMT (Exact 30.0s Nighttime)
    const isDaytime = this.timeOfDay < 0.5;
    const totalHours = (this.timeOfDay * 24 + 6) % 24;
    const hoursInt = Math.floor(totalHours);
    const minutesInt = Math.floor((totalHours - hoursInt) * 60);
    const hh = String(hoursInt).padStart(2, '0');
    const mm = String(minutesInt).padStart(2, '0');
    const clockText = `${hh}:${mm} GMT`;

    const hour12 = totalHours % 12;
    const hourAngle = -(hour12 / 12) * Math.PI * 2;
    const minuteAngle = -((totalHours - hoursInt) * Math.PI * 2);

    return { clockText, isDaytime, hourAngle, minuteAngle };
  }

  public setTimeMode(mode: TimeMode) {
    this.timeMode = mode;
    if (mode === 'day') {
      this.timeOfDay = 0.25; // 12:00 Noon GMT
    } else if (mode === 'twilight') {
      this.timeOfDay = 0.5; // 18:00 Sunset GMT
    } else if (mode === 'night') {
      this.timeOfDay = 0.75; // 00:00 Midnight GMT
    }
    const { clockText, isDaytime } = this.getClockStringAndHands();
    this.onStateChange((prev) => ({
      ...prev,
      timeMode: mode,
      timeOfDay: this.timeOfDay,
      clockText,
      isDaytime,
    }));
  }

  public setTimeOfDayManual(val: number) {
    this.timeMode = 'auto';
    this.timeOfDay = ((val % 1) + 1) % 1;
    const { clockText, isDaytime } = this.getClockStringAndHands();
    this.onStateChange((prev) => ({
      ...prev,
      timeOfDay: this.timeOfDay,
      clockText,
      isDaytime,
    }));
  }

  public applyCameraPreset(view: CameraViewId, immediate = false) {
    this.activeView = view;
    if (view !== 'village') {
      this.selectedObject = null;
      this.camTargetUp.set(0, 1, 0);
    }
    if (view === 'orb') {
      this.camTargetPos.set(0.0, 0.16, 2.75);
      this.camTargetLook.set(0.0, 0.0, 0.0);
    } else if (view === 'surface') {
      this.camTargetPos.set(0.48, -0.18, 1.46);
      this.camTargetLook.set(0.08, 0.08, 0.76);
    } else if (view === 'orbit') {
      this.camTargetPos.set(0.0, 0.18, 2.55);
      this.camTargetLook.set(0.0, 0.0, 0.0);
    } else if (view === 'village') {
      this.camTargetPos.set(-0.22, 0.26, 1.38);
      this.camTargetLook.set(-0.04, 0.08, 0.78);
    } else if (view === 'street') {
      this.planetRoot.quaternion.identity();
      this.angularVelocity.set(0, 0);
    }

    if (immediate && view !== 'street') {
      this.camCurrentPos.copy(this.camTargetPos);
      this.camCurrentLook.copy(this.camTargetLook);
      this.camCurrentUp.copy(this.camTargetUp);
      this.camera.up.copy(this.camCurrentUp);
      this.camera.position.copy(this.camCurrentPos);
      this.camera.lookAt(this.camCurrentLook);
    }

    this.onStateChange((prev) => ({
      ...prev,
      activeView: view,
      selectedBuilding: view === 'village' ? prev.selectedBuilding : null,
    }));
  }

  public selectBuildingEntity(obj: PlacedObjectEntity) {
    if (!obj.info) return;
    this.restoreOccludedObjects();
    this.selectedObject = obj;
    this.introSpinActive = false;
    this.angularVelocity.set(0, 0);
    this.activeView = 'village';

    // Compute a target planet rotation that brings this building's position & front facade
    // toward the front camera hemisphere (+Z) with upright local orientation so the globe
    // never blocks the camera and the building is framed upright in front view!
    const surf = this.terrain.getSurfacePointAndNormal(obj.dir);
    const localAlign = new THREE.Quaternion().setFromUnitVectors(
      UP_VEC,
      surf.normal,
    );
    const localYaw = new THREE.Quaternion().setFromAxisAngle(UP_VEC, obj.yaw);
    const buildingLocalQuat = localAlign.multiply(localYaw);

    const localUp = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(buildingLocalQuat)
      .normalize();
    const localFront = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(buildingLocalQuat)
      .normalize();
    const localRight = new THREE.Vector3()
      .crossVectors(localUp, localFront)
      .normalize();

    // Build orthonormal basis for the building in planet-local space:
    // We want localRight -> +X, localUp -> +Y, localFront -> +Z (facing camera)
    const basisMat = new THREE.Matrix4().makeBasis(
      localRight,
      localUp,
      localFront,
    );
    const buildingBasisQuat = new THREE.Quaternion().setFromRotationMatrix(
      basisMat,
    );
    // Tilt slightly (-0.22 rad around X) so the building's ground base and front facade face the viewer cleanly
    const viewTiltQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      0.24,
    );
    this.planetTargetQuat = viewTiltQuat.multiply(
      buildingBasisQuat.clone().invert(),
    );

    // Gentle celebratory bounce and sparkle on the selected building
    obj.bounceTime = 0;
    obj.bounceActive = true;
    this.emitSparklesAtDir(obj.dir, '#ffe484');

    this.updateSelectedBuildingCamera();
    const weatherOverlay = this.buildWeatherOverlayState();
    this.onStateChange((prev) => ({
      ...prev,
      activeView: 'village',
      selectedBuilding: obj.info || null,
      weatherOverlay,
    }));
  }

  private restoreOccludedObjects() {
    for (const o of this.hiddenByOcclusion) {
      o.visible = true;
    }
    this.hiddenByOcclusion.length = 0;
  }

  public clearSelectedBuilding() {
    this.restoreOccludedObjects();
    this.selectedObject = null;
    this.planetTargetQuat = null;
    this.camTargetUp.set(0, 1, 0);
    this.activeView = 'orb';
    this.camTargetPos.set(0.0, 0.16, 2.75);
    this.camTargetLook.set(0.0, 0.0, 0.0);
    const weatherOverlay = this.buildWeatherOverlayState();
    this.onStateChange((prev) => ({
      ...prev,
      activeView: 'orb',
      selectedBuilding: null,
      weatherOverlay,
    }));
  }

  public selectNextBuilding(step: number) {
    const selectable = this.placedObjects.filter((o) => Boolean(o.info));
    if (selectable.length === 0) return;
    let currentIdx = this.selectedObject
      ? selectable.indexOf(this.selectedObject)
      : -1;
    if (currentIdx === -1) currentIdx = 0;
    const nextIdx =
      (currentIdx + step + selectable.length) % selectable.length;
    this.selectBuildingEntity(selectable[nextIdx]);
  }

  public toggleStreetTour() {
    if (this.activeView === 'street') {
      this.clearSelectedBuilding();
    } else {
      this.restoreOccludedObjects();
      this.selectedObject = null;
      this.planetTargetQuat = null;
      this.applyCameraPreset('street', false);
    }
  }

  private updateSelectedBuildingCamera() {
    const obj = this.selectedObject;
    if (!obj) return;

    this.planetRoot.updateMatrixWorld(true);
    obj.mesh.updateMatrixWorld(true);

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    obj.mesh.getWorldPosition(worldPos);
    obj.mesh.getWorldQuaternion(worldQuat);

    const upWorld = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(worldQuat)
      .normalize();
    const frontWorld = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(worldQuat)
      .normalize();

    // Ensure camera distance is strictly outside the building's frontmost exterior facade
    // so we NEVER clip or see inside the building!
    let frontDist = 0.27;
    let camHeight = 0.048;
    let lookHeight = 0.034;
    let facadeOffset = 0.022;

    if (
      obj.type === 'palace' ||
      obj.type === 'battersea' ||
      obj.type === 'toweroflondon' ||
      obj.type === 'kewpalace'
    ) {
      frontDist = 0.33;
      camHeight = 0.062;
      lookHeight = 0.042;
      facadeOffset = 0.032;
    } else if (
      obj.type === 'bigben' ||
      obj.type === 'shard' ||
      obj.type === 'canarywharf' ||
      obj.type === 'londoneye' ||
      obj.type === 'lighthouse'
    ) {
      frontDist = 0.37;
      camHeight = 0.088;
      lookHeight = 0.072;
      facadeOffset = 0.028;
    } else if (
      obj.type === 'stpauls' ||
      obj.type === 'greenwich' ||
      obj.type === 'towerbridge'
    ) {
      frontDist = 0.34;
      camHeight = 0.072;
      lookHeight = 0.052;
      facadeOffset = 0.030;
    } else if (obj.type === 'westminsterbridge' || obj.type === 'bridge') {
      frontDist = 0.30;
      camHeight = 0.062;
      lookHeight = 0.024;
      facadeOffset = 0.018;
    } else if (obj.type === 'house') {
      frontDist = 0.25;
      camHeight = 0.040;
      lookHeight = 0.028;
      facadeOffset = 0.018;
    }

    this.camTargetPos
      .copy(worldPos)
      .addScaledVector(frontWorld, frontDist)
      .addScaledVector(upWorld, camHeight);
    this.camTargetLook
      .copy(worldPos)
      .addScaledVector(frontWorld, facadeOffset)
      .addScaledVector(upWorld, lookHeight);
    this.camTargetUp.copy(upWorld);
  }

  /**
   * Hides any other building, tree, streetlamp, vehicle, villager, cloud, or balloon
   * that sits between the camera and the selected building so the front view is 100% unobstructed.
   */
  private updateFrontViewOcclusion() {
    this.restoreOccludedObjects();
    const target = this.selectedObject;
    if (!target || this.tourActive) return;

    const camPos = this.camera.position;
    const targetPos = new THREE.Vector3();
    target.mesh.getWorldPosition(targetPos);

    const viewSeg = targetPos.clone().sub(camPos);
    const viewDist = viewSeg.length();
    if (viewDist < 1e-4) return;
    const viewDir = viewSeg.clone().divideScalar(viewDist);

    const checkAndHide = (mesh: THREE.Object3D, radius: number) => {
      if (mesh === target.mesh) return;
      const pos = new THREE.Vector3();
      mesh.getWorldPosition(pos);
      const toObj = pos.sub(camPos);
      const proj = toObj.dot(viewDir);
      // Only check objects situated between the camera and slightly behind the selected building's front face
      if (proj <= -0.02 || proj >= viewDist + 0.03) return;
      const perpSq = Math.max(0, toObj.lengthSq() - proj * proj);
      const perpDist = Math.sqrt(perpSq);
      // View corridor cone radius
      const corridorRadius = radius + 0.065;
      if (perpDist < corridorRadius) {
        mesh.visible = false;
        this.hiddenByOcclusion.push(mesh);
      }
    };

    for (const obj of this.placedObjects) {
      if (obj === target) continue;
      const r = Math.max(0.035, this.getObjectCollisionRadius(obj.type));
      checkAndHide(obj.mesh, r);
    }
    for (const rv of this.roadVehicles) {
      checkAndHide(rv.mesh, 0.04);
    }
    for (const v of this.villagers) {
      checkAndHide(v.mesh, 0.03);
    }
    for (const c of this.clouds) {
      checkAndHide(c.mesh, 0.12);
    }
    for (const b of this.balloons) {
      checkAndHide(b.mesh, 0.09);
    }
  }

  private clearPreviousTourSpawns() {
    while (this.tourSpawnedCleanups.length > 0) {
      const fn = this.tourSpawnedCleanups.pop();
      if (fn) fn();
    }
  }

  private trackTourPlacedObject(entity: PlacedObjectEntity) {
    this.tourSpawnedCleanups.push(() => {
      const idx = this.placedObjects.indexOf(entity);
      if (idx !== -1) this.placedObjects.splice(idx, 1);
      this.objectsGroup.remove(entity.mesh);
    });
  }

  public startTour() {
    this.clearPreviousTourSpawns();
    this.tourActive = true;
    this.introSpinActive = false;
    this.tourElapsed = 0;
    this.tourStartTimeMs = performance.now();
    this.lastReportedTourRemaining = 30;
    this.tourStepTriggered.clear();
    this.cursorRing.visible = false;
    this.cursorRing.scale.setScalar(1.0);
    (this.cursorRing.material as THREE.MeshBasicMaterial).color.set('#fff8d6');

    // Reset planet orientation & camera to crisp morning establishing frame
    this.angularVelocity.set(0, 0);
    this.planetRoot.quaternion.identity();
    this.timeMode = 'auto';
    this.timeOfDay = 0.22;
    this.tourCursorDir.set(-0.16, 0.22, 0.96).normalize();

    this.camTargetPos.set(-0.85, 0.65, 4.15);
    this.camTargetLook.set(0.0, -0.10, 0.0);
    this.camCurrentPos.copy(this.camTargetPos);
    this.camCurrentLook.copy(this.camTargetLook);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);

    this.syncWorldStats();
    this.onStateChange((prev) => ({
      ...prev,
      tourActive: true,
      tourElapsed: 0,
      tourPhase: 'Act I: Full Globe Orbit',
    }));
  }

  public stopTour() {
    if (!this.tourActive) return;
    this.tourActive = false;
    this.cursorRing.visible = false;
    this.cursorRing.scale.setScalar(1.0);
    (this.cursorRing.material as THREE.MeshBasicMaterial).color.set('#fff8d6');
    this.applyCameraPreset(this.activeView, false);
    this.onStateChange((prev) => ({
      ...prev,
      tourActive: false,
      tourElapsed: 0,
      tourPhase: '',
    }));
  }

  private updateSimulatedTourCursor(
    t: number,
    fromTime: number,
    clickTime: number,
    fromDir: THREE.Vector3,
    targetDir: THREE.Vector3,
    isWaterTarget = false,
  ) {
    this.cursorRing.visible = true;
    const moveDuration = Math.max(0.15, clickTime - fromTime - 0.12);
    const moveProgress = THREE.MathUtils.clamp(
      (t - fromTime) / moveDuration,
      0,
      1,
    );
    const smoothMove = moveProgress * moveProgress * (3 - 2 * moveProgress);
    this.tourCursorDir.copy(fromDir).lerp(targetDir, smoothMove).normalize();

    this.orientObjectOnSurface(
      this.cursorRing,
      this.tourCursorDir,
      0,
      0.006,
      isWaterTarget,
    );

    // Visual click pulse right around clickTime
    const timeToClick = Math.abs(t - clickTime);
    const ringMat = this.cursorRing.material as THREE.MeshBasicMaterial;
    if (timeToClick < 0.18) {
      const pulse = 1.0 - timeToClick / 0.18;
      this.cursorRing.scale.setScalar(1.35 - pulse * 0.55);
      ringMat.color.set('#ffe066');
      ringMat.opacity = 0.98;
    } else {
      this.cursorRing.scale.setScalar(1.25 + Math.sin(t * 8.0) * 0.08);
      ringMat.color.set('#fff8d6');
      ringMat.opacity = 0.88;
    }
  }

  private updateTour(dt: number) {
    // Use exact wall-clock elapsed time so the tour lasts an exact 30.0 seconds
    this.tourElapsed = (performance.now() - this.tourStartTimeMs) / 1000;
    if (this.tourElapsed >= 30.0) {
      this.tourActive = false;
      this.cursorRing.visible = false;
      this.cursorRing.scale.setScalar(1.0);
      (this.cursorRing.material as THREE.MeshBasicMaterial).color.set('#fff8d6');
      this.applyCameraPreset('orb', false);
      this.onStateChange((prev) => ({
        ...prev,
        tourActive: false,
        tourElapsed: 30,
        tourPhase: '',
      }));
      return;
    }

    const t = this.tourElapsed;
    const remainingSec = Math.max(1, Math.ceil(30.0 - t));
    if (remainingSec !== this.lastReportedTourRemaining) {
      this.lastReportedTourRemaining = remainingSec;
      this.onStateChange((prev) => ({
        ...prev,
        tourElapsed: t,
      }));
    }

    const smoothstep = (val: number) => {
      const c = THREE.MathUtils.clamp(val, 0, 1);
      return c * c * (3 - 2 * c);
    };

    // Waypoint directions for Act III simulated clicks
    const startCursorSpot = new THREE.Vector3(-0.16, 0.22, 0.96).normalize();
    const windmillSpot = new THREE.Vector3(-0.22, 0.44, 0.87).normalize();
    const cottageSpot = new THREE.Vector3(-0.04, -0.02, 0.998).normalize();
    const lighthouseSpot = new THREE.Vector3(0.18, 0.52, 0.835).normalize();
    const sailboatSpot = new THREE.Vector3(0.42, 0.14, 0.896).normalize();
    const villagerSpot = new THREE.Vector3(-0.24, 0.16, 0.957).normalize();
    const sheepSpot = new THREE.Vector3(-0.18, -0.14, 0.974).normalize();
    const campfireSpot = new THREE.Vector3(-0.12, 0.08, 0.99).normalize();
    const snowCloudSpot = new THREE.Vector3(-0.26, 0.42, 0.87).normalize();
    const rainbowSpot = new THREE.Vector3(-0.37, 0.19, 0.95).normalize();
    const balloonSpot = new THREE.Vector3(-0.05, 0.18, 0.98).normalize();

    // =========================================================================
    // ACT I (0.0s – 8.0s): Grand Reveal & Full 360° Globe Orbit
    // =========================================================================
    if (t < 2.0) {
      // 0:00 – 0:02 | Morning Establishing Shot
      const p = smoothstep(t / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.22, 0.24, p);
      this.planetRoot.quaternion.identity();
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.85, -0.45, p),
        THREE.MathUtils.lerp(0.65, 0.52, p),
        THREE.MathUtils.lerp(4.15, 3.85, p),
      );
      this.camTargetLook.set(0.0, -0.10, 0.0);
    } else if (t < 7.0) {
      // 0:02 – 0:07 | Full 360° Planetary Rotation showcasing all 4 neighborhoods & seas
      const p = smoothstep((t - 2.0) / 5.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.24, 0.27, p);
      const spinAngle = p * Math.PI * 2;
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, spinAngle);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.45, 0.0, p),
        THREE.MathUtils.lerp(0.52, 0.42, p),
        THREE.MathUtils.lerp(3.85, 3.45, p),
      );
      this.camTargetLook.set(0.0, -0.06, 0.0);
    } else if (t < 8.0) {
      // 0:07 – 0:08 | Settle Rotation & Zoom-In Transition toward Village
      const p = smoothstep((t - 7.0) / 1.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.27, 0.28, p);
      this.planetRoot.quaternion.identity();
      this.camTargetPos.set(
        THREE.MathUtils.lerp(0.0, -0.28, p),
        THREE.MathUtils.lerp(0.42, 0.36, p),
        THREE.MathUtils.lerp(3.45, 1.52, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(0.0, -0.16, p),
        THREE.MathUtils.lerp(-0.06, 0.22, p),
        THREE.MathUtils.lerp(0.0, 0.72, p),
      );
    }
    // =========================================================================
    // ACT II (8.0s – 15.0s): Close-Up Living World Inspection
    // =========================================================================
    else if (t < 10.5) {
      // 0:08 – 0:10.5 | Focus 1 — Pastel Cottages, Multi-Layered Trees & Walking Villagers
      const p = smoothstep((t - 8.0) / 2.5);
      this.timeOfDay = THREE.MathUtils.lerp(0.28, 0.30, p);
      const yaw = THREE.MathUtils.lerp(0.0, 0.12, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.28, -0.12, p),
        THREE.MathUtils.lerp(0.36, 0.30, p),
        THREE.MathUtils.lerp(1.52, 1.44, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.16, -0.14, p),
        THREE.MathUtils.lerp(0.22, 0.18, p),
        THREE.MathUtils.lerp(0.72, 0.74, p),
      );
    } else if (t < 13.0) {
      // 0:10.5 – 0:13.0 | Focus 2 — Fenced Sheep Pasture & Beehive Meadow
      const p = smoothstep((t - 10.5) / 2.5);
      this.timeOfDay = THREE.MathUtils.lerp(0.30, 0.32, p);
      const yaw = THREE.MathUtils.lerp(0.12, 0.18, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.12, -0.22, p),
        THREE.MathUtils.lerp(0.30, -0.14, p),
        THREE.MathUtils.lerp(1.44, 1.46, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.14, -0.16, p),
        THREE.MathUtils.lerp(0.18, -0.12, p),
        THREE.MathUtils.lerp(0.74, 0.74, p),
      );
    } else if (t < 15.0) {
      // 0:13.0 – 0:15.0 | Focus 3 — Striped Coastal Lighthouse, Timber Pier, Sailboats & Ducks
      const p = smoothstep((t - 13.0) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.32, 0.34, p);
      const yaw = THREE.MathUtils.lerp(0.18, -0.48, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.22, 0.22, p),
        THREE.MathUtils.lerp(-0.14, 0.26, p),
        THREE.MathUtils.lerp(1.46, 1.56, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.16, 0.12, p),
        THREE.MathUtils.lerp(-0.12, 0.16, p),
        THREE.MathUtils.lerp(0.74, 0.72, p),
      );
    }
    // =========================================================================
    // ACT III (15.0s – 23.0s): Simulated Live Building & Interactive Spawning
    // =========================================================================
    else if (t < 17.0) {
      // 0:15.0 – 0:17.0 | Simulated Click 1 — Adding New Windmill & Pastel Cottage
      const p = smoothstep((t - 15.0) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.34, 0.36, p);
      const yaw = THREE.MathUtils.lerp(-0.48, 0.08, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(0.22, -0.18, p),
        THREE.MathUtils.lerp(0.26, 0.32, p),
        THREE.MathUtils.lerp(1.56, 1.68, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(0.12, -0.10, p),
        THREE.MathUtils.lerp(0.16, 0.16, p),
        THREE.MathUtils.lerp(0.72, 0.72, p),
      );

      if (t < 15.7) {
        this.updateSimulatedTourCursor(
          t,
          15.0,
          15.6,
          startCursorSpot,
          windmillSpot,
          false,
        );
      } else {
        this.updateSimulatedTourCursor(
          t,
          15.7,
          16.4,
          windmillSpot,
          cottageSpot,
          false,
        );
      }

      if (t >= 15.6 && !this.tourStepTriggered.has(1)) {
        this.tourStepTriggered.add(1);
        const wmYaw = this.computeYawFacingTarget(windmillSpot, this.wellDirection);
        const wm = this.placeStaticObject('windmill', windmillSpot, wmYaw, true, true);
        this.trackTourPlacedObject(wm);
        this.syncWorldStats();
      }

      if (t >= 16.4 && !this.tourStepTriggered.has(2)) {
        this.tourStepTriggered.add(2);
        const hYaw = this.computeYawFacingTarget(cottageSpot, this.wellDirection);
        const newHouse = this.placeStaticObject('house', cottageSpot, hYaw, true, true);
        this.trackTourPlacedObject(newHouse);
        const doorDir = this.getBuildingEntranceDir(newHouse, 0);
        const pathDir = doorDir.clone().lerp(this.wellDirection, 0.45).normalize();
        const pathYaw = this.computeYawFacingTarget(pathDir, this.wellDirection);
        const newPath = this.placeStaticObject('path', pathDir, pathYaw, true, true);
        this.trackTourPlacedObject(newPath);
        this.spawnVillager(this.getBuildingEntranceDir(newHouse, -0.014), true);
        const v1 = this.villagers[this.villagers.length - 1];
        this.spawnVillager(this.getBuildingEntranceDir(newHouse, 0.014), true);
        const v2 = this.villagers[this.villagers.length - 1];
        this.tourSpawnedCleanups.push(() => {
          for (const v of [v1, v2]) {
            const idx = this.villagers.indexOf(v);
            if (idx !== -1) this.villagers.splice(idx, 1);
            this.inhabitantsGroup.remove(v.mesh);
          }
        });
        this.syncWorldStats();
      }
    } else if (t < 19.0) {
      // 0:17.0 – 0:19.0 | Simulated Click 2 — Adding Second Cliffside Lighthouse & Sailboat
      const p = smoothstep((t - 17.0) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.36, 0.38, p);
      const yaw = THREE.MathUtils.lerp(0.08, -0.35, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.18, 0.24, p),
        THREE.MathUtils.lerp(0.32, 0.34, p),
        THREE.MathUtils.lerp(1.68, 1.72, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.10, 0.10, p),
        THREE.MathUtils.lerp(0.16, 0.22, p),
        THREE.MathUtils.lerp(0.72, 0.72, p),
      );

      if (t < 17.7) {
        this.updateSimulatedTourCursor(
          t,
          17.0,
          17.6,
          cottageSpot,
          lighthouseSpot,
          false,
        );
      } else {
        this.updateSimulatedTourCursor(
          t,
          17.7,
          18.4,
          lighthouseSpot,
          sailboatSpot,
          true,
        );
      }

      if (t >= 17.6 && !this.tourStepTriggered.has(3)) {
        this.tourStepTriggered.add(3);
        const lh = this.placeStaticObject('lighthouse', lighthouseSpot, -0.3, true, true);
        this.trackTourPlacedObject(lh);
        this.syncWorldStats();
      }

      if (t >= 18.4 && !this.tourStepTriggered.has(4)) {
        this.tourStepTriggered.add(4);
        this.spawnSailboat(sailboatSpot, true);
        const boat = this.sailboats[this.sailboats.length - 1];
        this.tourSpawnedCleanups.push(() => {
          const idx = this.sailboats.indexOf(boat);
          if (idx !== -1) this.sailboats.splice(idx, 1);
          this.inhabitantsGroup.remove(boat.mesh);
        });
        this.syncWorldStats();
      }
    } else if (t < 21.0) {
      // 0:19.0 – 0:21.0 | Simulated Click 3 — Spawning Villagers, Sheep, Campfire & Lantern
      const p = smoothstep((t - 19.0) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.38, 0.41, p);
      const yaw = THREE.MathUtils.lerp(-0.35, 0.05, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(0.24, -0.20, p),
        THREE.MathUtils.lerp(0.34, 0.20, p),
        THREE.MathUtils.lerp(1.72, 1.66, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(0.10, -0.14, p),
        THREE.MathUtils.lerp(0.22, 0.10, p),
        THREE.MathUtils.lerp(0.72, 0.74, p),
      );

      if (t < 19.5) {
        this.updateSimulatedTourCursor(
          t,
          19.0,
          19.4,
          sailboatSpot,
          villagerSpot,
          false,
        );
      } else if (t < 20.2) {
        this.updateSimulatedTourCursor(
          t,
          19.5,
          20.1,
          villagerSpot,
          sheepSpot,
          false,
        );
      } else {
        this.updateSimulatedTourCursor(
          t,
          20.2,
          20.7,
          sheepSpot,
          campfireSpot,
          false,
        );
      }

      if (t >= 19.4 && !this.tourStepTriggered.has(5)) {
        this.tourStepTriggered.add(5);
        this.spawnVillager(villagerSpot, true);
        const vA = this.villagers[this.villagers.length - 1];
        this.spawnVillager(
          new THREE.Vector3(-0.10, 0.14, 0.985).normalize(),
          true,
        );
        const vB = this.villagers[this.villagers.length - 1];
        this.tourSpawnedCleanups.push(() => {
          for (const v of [vA, vB]) {
            const idx = this.villagers.indexOf(v);
            if (idx !== -1) this.villagers.splice(idx, 1);
            this.inhabitantsGroup.remove(v.mesh);
          }
        });
        this.syncWorldStats();
      }

      if (t >= 20.1 && !this.tourStepTriggered.has(6)) {
        this.tourStepTriggered.add(6);
        this.spawnSheep(sheepSpot, true, true);
        const sA = this.sheepList[this.sheepList.length - 1];
        this.spawnSheep(
          new THREE.Vector3(-0.28, 0.02, 0.96).normalize(),
          true,
          false,
        );
        const sB = this.sheepList[this.sheepList.length - 1];
        this.tourSpawnedCleanups.push(() => {
          for (const s of [sA, sB]) {
            const idx = this.sheepList.indexOf(s);
            if (idx !== -1) this.sheepList.splice(idx, 1);
            this.inhabitantsGroup.remove(s.mesh);
          }
        });
        this.syncWorldStats();
      }

      if (t >= 20.7 && !this.tourStepTriggered.has(7)) {
        this.tourStepTriggered.add(7);
        const cf = this.placeStaticObject('campfire', campfireSpot, 0.4, true, true);
        this.trackTourPlacedObject(cf);
        const lp = this.placeStaticObject(
          'lantern',
          new THREE.Vector3(-0.24, 0.28, 0.93).normalize(),
          0.0,
          true,
          true,
        );
        this.trackTourPlacedObject(lp);
        this.syncWorldStats();
      }
    } else if (t < 23.0) {
      // 0:21.0 – 0:23.0 | Simulated Click 4 — Weather Magic: Snow/Rain Cloud, Rainbow Arch & Hot Air Balloon
      const p = smoothstep((t - 21.0) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.41, 0.45, p);
      const yaw = THREE.MathUtils.lerp(0.05, 0.0, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.20, -0.16, p),
        THREE.MathUtils.lerp(0.20, 0.34, p),
        THREE.MathUtils.lerp(1.66, 2.15, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.14, -0.08, p),
        THREE.MathUtils.lerp(0.10, 0.18, p),
        THREE.MathUtils.lerp(0.74, 0.55, p),
      );

      if (t < 21.4) {
        this.updateSimulatedTourCursor(
          t,
          21.0,
          21.3,
          campfireSpot,
          snowCloudSpot,
          false,
        );
      } else if (t < 22.0) {
        this.updateSimulatedTourCursor(
          t,
          21.4,
          21.9,
          snowCloudSpot,
          rainbowSpot,
          false,
        );
      } else if (t < 22.75) {
        this.updateSimulatedTourCursor(
          t,
          22.0,
          22.5,
          rainbowSpot,
          balloonSpot,
          false,
        );
      } else {
        this.cursorRing.visible = false;
      }

      if (t >= 21.3 && !this.tourStepTriggered.has(8)) {
        this.tourStepTriggered.add(8);
        this.spawnCloud(snowCloudSpot, true, 5.5, true);
        const snowCloud = this.clouds[this.clouds.length - 1];
        this.tourSpawnedCleanups.push(() => {
          const idx = this.clouds.indexOf(snowCloud);
          if (idx !== -1) this.clouds.splice(idx, 1);
          this.atmosphereGroup.remove(snowCloud.mesh);
        });
        if (this.clouds.length > 0) {
          this.clouds[0].currentDir.set(-0.12, 0.24, 0.96).normalize();
          this.clouds[0].isRaining = true;
          this.clouds[0].rainTimer = 4.5;
        }
        // Nourish existing trees with a joyful growth bounce
        for (const obj of this.placedObjects) {
          if (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') {
            obj.targetGrowth = Math.min(1.38, obj.targetGrowth + 0.16);
            obj.bounceTime = 0;
            obj.bounceActive = true;
          }
        }
        this.syncWorldStats();
      }

      if (t >= 21.9 && !this.tourStepTriggered.has(9)) {
        this.tourStepTriggered.add(9);
        const rb = this.placeStaticObject('rainbow', rainbowSpot, -0.25, true, true);
        this.trackTourPlacedObject(rb);
        this.syncWorldStats();
      }

      if (t >= 22.5 && !this.tourStepTriggered.has(10)) {
        this.tourStepTriggered.add(10);
        this.spawnBalloon(balloonSpot, true);
        const bal = this.balloons[this.balloons.length - 1];
        this.tourSpawnedCleanups.push(() => {
          const idx = this.balloons.indexOf(bal);
          if (idx !== -1) this.balloons.splice(idx, 1);
          this.atmosphereGroup.remove(bal.mesh);
        });
        this.syncWorldStats();
      }
    }
    // =========================================================================
    // ACT IV (23.0s – 30.0s): Golden Twilight, Nighttime Glow & Finale Pull-Back
    // =========================================================================
    else if (t < 26.5) {
      // 0:23.0 – 0:26.5 | Sunset to Blue Twilight & Night Transition (Windows, Campfires, Lighthouses & Fireflies ignite)
      this.cursorRing.visible = false;
      const p = smoothstep((t - 23.0) / 3.5);
      this.timeOfDay = THREE.MathUtils.lerp(0.45, 0.76, p);
      const yaw = THREE.MathUtils.lerp(0.0, -0.18, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.16, 0.18, p),
        THREE.MathUtils.lerp(0.34, 0.32, p),
        THREE.MathUtils.lerp(2.15, 2.35, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.08, -0.04, p),
        THREE.MathUtils.lerp(0.18, 0.12, p),
        THREE.MathUtils.lerp(0.55, 0.42, p),
      );
    } else if (t < 28.5) {
      // 0:26.5 – 0:28.5 | Shooting Star Wonder Moment across the Starry Night Orb
      this.cursorRing.visible = false;
      const p = smoothstep((t - 26.5) / 2.0);
      this.timeOfDay = THREE.MathUtils.lerp(0.76, 0.80, p);
      const yaw = THREE.MathUtils.lerp(-0.18, -0.06, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(0.18, -0.35, p),
        THREE.MathUtils.lerp(0.32, 0.48, p),
        THREE.MathUtils.lerp(2.35, 2.95, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.04, -0.02, p),
        THREE.MathUtils.lerp(0.12, 0.05, p),
        THREE.MathUtils.lerp(0.42, 0.25, p),
      );

      if (t >= 26.6 && !this.tourStepTriggered.has(11)) {
        this.tourStepTriggered.add(11);
        this.spawnShootingStar(new THREE.Vector3(-0.22, 0.52, 0.82).normalize());
      }
      if (t >= 27.4 && !this.tourStepTriggered.has(12)) {
        this.tourStepTriggered.add(12);
        this.spawnShootingStar(new THREE.Vector3(0.25, 0.48, 0.84).normalize());
      }
    } else {
      // 0:28.5 – 0:30.0 | Grand Finale Pull-Back to Full Glass Orb Hero Framing
      this.cursorRing.visible = false;
      const p = smoothstep((t - 28.5) / 1.5);
      this.timeOfDay = THREE.MathUtils.lerp(0.80, 0.82, p);
      const yaw = THREE.MathUtils.lerp(-0.06, 0.0, p);
      this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, yaw);
      this.camTargetPos.set(
        THREE.MathUtils.lerp(-0.35, -1.12, p),
        THREE.MathUtils.lerp(0.48, 0.78, p),
        THREE.MathUtils.lerp(2.95, 4.35, p),
      );
      this.camTargetLook.set(
        THREE.MathUtils.lerp(-0.02, 0.08, p),
        THREE.MathUtils.lerp(0.05, -0.22, p),
        THREE.MathUtils.lerp(0.25, 0.0, p),
      );
    }
  }

  private syncWorldStats() {
    const houses = this.placedObjects.filter((o) => o.type === 'house').length;
    const landmarks = this.placedObjects.filter(
      (o) =>
        o.type === 'bigben' ||
        o.type === 'palace' ||
        o.type === 'battersea' ||
        o.type === 'toweroflondon' ||
        o.type === 'canarywharf' ||
        o.type === 'greenwich' ||
        o.type === 'kewpalace' ||
        o.type === 'towerbridge' ||
        o.type === 'westminsterbridge' ||
        o.type === 'londoneye' ||
        o.type === 'stpauls' ||
        o.type === 'shard' ||
        o.type === 'watchtower',
    ).length;
    const buses =
      this.roadVehicles.length +
      this.placedObjects.filter(
        (o) => o.type === 'redbus' || o.type === 'blackcab',
      ).length;
    const trees = this.placedObjects.filter(
      (o) => o.type === 'oak' || o.type === 'pine' || o.type === 'palm',
    ).length;
    const windmills = this.placedObjects.filter((o) => o.type === 'windmill').length;
    const lighthouses = this.placedObjects.filter(
      (o) => o.type === 'lighthouse' || o.type === 'watchtower',
    ).length;
    const flowers = this.placedObjects.filter(
      (o) => o.type === 'flower' || o.type === 'beehive',
    ).length;
    const rainbows = this.placedObjects.filter((o) => o.type === 'rainbow').length;
    const villagers = this.villagers.length;
    const sheep = this.sheepList.length;
    const clouds = this.clouds.length;
    const boats = this.sailboats.length + this.ducks.length;

    const happiness = Math.min(
      100,
      Math.round(
        82 +
          houses * 1.2 +
          landmarks * 2.2 +
          buses * 1.2 +
          trees * 0.5 +
          flowers * 1.2 +
          rainbows * 4 +
          boats * 1.5,
      ),
    );

    const { clockText, isDaytime } = this.getClockStringAndHands();
    const weatherOverlay = this.buildWeatherOverlayState();
    const monthName = MONTH_NAMES[this.monthIndex] || 'December';
    const seasonName = getSeasonForMonth(this.monthIndex);

    this.onStateChange((prev) => ({
      ...prev,
      population: villagers,
      happiness,
      dayCount: this.dayCount,
      monthIndex: this.monthIndex,
      monthName,
      seasonName,
      yearCount: this.yearCount,
      isDecemberFestive: this.monthIndex === 11,
      clockText,
      isDaytime,
      weatherMode: this.weatherMode,
      weatherAuto: this.weatherAuto,
      weatherOverlay,
      objectCounts: {
        houses,
        landmarks,
        buses,
        trees,
        windmills,
        lighthouses,
        villagers,
        sheep,
        clouds,
        flowers,
        boats,
      },
    }));
  }

  private bindEvents() {
    const dom = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const updateNDC = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getTerrainHit = (e: PointerEvent) => {
      updateNDC(e);
      raycaster.setFromCamera(pointerNDC, this.camera);
      const hits = raycaster.intersectObjects(
        [this.terrain.terrainMesh, this.terrain.waterMesh],
        false,
      );
      if (hits.length > 0) {
        const worldPt = hits[0].point.clone();
        const localPt = this.planetRoot.worldToLocal(worldPt);
        return localPt.normalize();
      }
      return null;
    };

    const getBuildingHit = (e: PointerEvent): PlacedObjectEntity | null => {
      updateNDC(e);
      raycaster.setFromCamera(pointerNDC, this.camera);

      // 1. Direct 3D mesh intersection against all placed objects with BuildingInfo
      const objectHits = raycaster.intersectObjects(
        this.objectsGroup.children,
        true,
      );
      for (const hit of objectHits) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr.parent !== this.objectsGroup) {
          curr = curr.parent;
        }
        if (curr) {
          const found = this.placedObjects.find(
            (o) => o.mesh === curr && Boolean(o.info),
          );
          if (found) return found;
        }
      }

      // 2. Fallback: nearest building with info around terrain hit point
      const hitDir = getTerrainHit(e);
      if (hitDir) {
        let bestObj: PlacedObjectEntity | null = null;
        let bestDist = 0.088;
        for (const o of this.placedObjects) {
          if (!o.info) continue;
          const d = o.dir.distanceTo(hitDir);
          if (d < bestDist) {
            bestDist = d;
            bestObj = o;
          }
        }
        return bestObj;
      }

      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (this.tourActive) return;
      this.isPointerDown = true;
      this.isDraggingSpin = false;
      this.pointerDownPos.set(e.clientX, e.clientY);
      this.lastPointerPos.set(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.tourActive) {
        return;
      }

      if (!this.isDraggingSpin) {
        const hoveredBuilding = getBuildingHit(e);
        if (hoveredBuilding) {
          dom.style.cursor = 'pointer';
          this.cursorRing.visible = true;
          const surf = this.terrain.getSurfacePointAndNormal(hoveredBuilding.dir);
          this.orientObjectOnSurface(
            this.cursorRing,
            hoveredBuilding.dir,
            0,
            0.005,
            surf.isWater,
          );
          this.cursorRing.scale.setScalar(1.35);
          (this.cursorRing.material as THREE.MeshBasicMaterial).color.set('#ffe066');
        } else {
          dom.style.cursor = this.isPointerDown ? 'grabbing' : 'grab';
          this.cursorRing.visible = false;
          this.cursorRing.scale.setScalar(1.0);
        }
      }

      if (!this.isPointerDown) return;

      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      const totalDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y,
      );

      if (totalDist > 5) {
        this.isDraggingSpin = true;
        this.cursorRing.visible = false;
        dom.style.cursor = 'grabbing';
        if (this.selectedObject) {
          this.clearSelectedBuilding();
        }
      }

      if (this.isDraggingSpin) {
        // Spin the planet with gentle inertia
        this.angularVelocity.x = dx * 0.0055;
        this.angularVelocity.y = dy * 0.0055;
        this.applyPlanetSpin(this.angularVelocity.x, this.angularVelocity.y);
      }

      this.lastPointerPos.set(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      dom.style.cursor = 'grab';

      if (!this.isDraggingSpin && e.button === 0) {
        const clickedBuilding = getBuildingHit(e);
        if (clickedBuilding) {
          this.selectBuildingEntity(clickedBuilding);
        } else if (this.selectedObject) {
          this.clearSelectedBuilding();
        }
      }
      this.isDraggingSpin = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (this.tourActive) return;
      const zoomDir = this.camTargetPos
        .clone()
        .sub(this.camTargetLook)
        .normalize();
      const dist = this.camTargetPos.distanceTo(this.camTargetLook);
      const nextDist = THREE.MathUtils.clamp(
        dist + e.deltaY * 0.0022,
        1.15,
        5.6,
      );
      this.camTargetPos
        .copy(this.camTargetLook)
        .addScaledVector(zoomDir, nextDist);
    };

    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(this.container);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.tourActive) {
          this.stopTour();
        } else if (this.selectedObject || this.activeView === 'street') {
          this.clearSelectedBuilding();
        }
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    // Save cleanup reference
    (this as unknown as { _cleanup: () => void })._cleanup = () => {
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
    };
  }

  private applyPlanetSpin(deltaYaw: number, deltaPitch: number) {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      deltaYaw,
    );
    const qPitch = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      deltaPitch,
    );
    this.planetRoot.quaternion.premultiply(qYaw).premultiply(qPitch);
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.shootingStarGazeTimer > 0) {
      this.shootingStarGazeTimer = Math.max(0, this.shootingStarGazeTimer - dt);
    }

    // 1. Tour or Calm Daily + Yearly Cycle (90.0s Daytime + 90.0s Nighttime = 180.0s full day; 12 months per year)
    if (this.tourActive) {
      this.updateTour(dt);
    } else if (this.timeMode === 'auto') {
      const prevTime = this.timeOfDay;
      this.timeOfDay = (this.timeOfDay + dt / FULL_CYCLE_SEC) % 1.0;
      if (this.timeOfDay < prevTime) {
        this.dayCount += 1;
        this.monthIndex = (this.monthIndex + 1) % 12;
        if (this.monthIndex === 0) {
          this.yearCount += 1;
        }
        this.festiveLightsGroup.visible = this.monthIndex === 11;
        this.syncWorldStats();
      }
    }

    // 1B. Automatic Time-of-Day & Yearly Calendar Weather Scheduler
    if (this.weatherAuto && !this.tourActive) {
      const scheduled = this.resolveAutoWeatherForTimeAndCycle(
        this.timeOfDay,
        this.dayCount,
      );
      if (scheduled.mode !== this.weatherMode) {
        this.weatherMode = scheduled.mode;
        const weatherOverlay = this.buildWeatherOverlayState();
        this.onStateChange((prev) => ({
          ...prev,
          weatherMode: this.weatherMode,
          weatherOverlay,
        }));
      }
    }

    // 2. Initial 3-second 360° spin on load, then pause and zoom out a bit
    if (this.introSpinActive) {
      if (this.isDraggingSpin || this.tourActive || this.activeView === 'street') {
        this.introSpinActive = false;
      } else {
        this.introSpinElapsed += dt;
        if (this.introSpinElapsed < 3.0) {
          const progress = this.introSpinElapsed / 3.0;
          const angle = progress * Math.PI * 2;
          this.planetRoot.quaternion.setFromAxisAngle(UP_VEC, angle);
        } else {
          this.introSpinActive = false;
          this.planetRoot.quaternion.identity();
          this.angularVelocity.set(0, 0);

          const zoomDir = this.camTargetPos
            .clone()
            .sub(this.camTargetLook)
            .normalize();
          const currentDist = this.camTargetPos.distanceTo(this.camTargetLook);
          this.camTargetPos
            .copy(this.camTargetLook)
            .addScaledVector(zoomDir, currentDist * 1.14);
        }
      }
    } else if (this.planetTargetQuat && !this.isPointerDown && !this.tourActive) {
      this.planetRoot.quaternion.slerp(
        this.planetTargetQuat,
        1.0 - Math.exp(-dt * 5.2),
      );
    } else if (!this.isPointerDown && !this.tourActive) {
      if (this.angularVelocity.lengthSq() > 1e-7) {
        this.applyPlanetSpin(this.angularVelocity.x, this.angularVelocity.y);
        this.angularVelocity.multiplyScalar(0.94);
      }
    }

    // 3. Selected Building Front-View Camera OR Street-Level Road Tour Camera
    if (this.selectedObject && !this.tourActive) {
      this.updateSelectedBuildingCamera();
    } else if (this.activeView === 'street' && !this.tourActive) {
      const segCount = STREET_TOUR_NODE_SEQUENCE.length - 1;
      this.streetCamProgress = (this.streetCamProgress + dt * 0.14) % segCount;
      const segIdx = Math.floor(this.streetCamProgress);
      const localT = this.streetCamProgress - segIdx;
      const fromNode = STREET_TOUR_NODE_SEQUENCE[segIdx];
      const toNode = STREET_TOUR_NODE_SEQUENCE[segIdx + 1];
      const found = findRoadSegmentBetween(fromNode, toNode);
      if (found) {
        const segT = found.reversed ? 1.0 - localT : localT;
        const sample = sampleRoadSegmentPoint(
          found.seg,
          segT,
          (d) => this.terrain.getSurfacePointAndNormal(d),
          this.terrain.seaLevel,
        );
        const forward = found.reversed
          ? sample.tangent.clone().negate()
          : sample.tangent.clone();
        const camLocalPos = sample.point
          .clone()
          .addScaledVector(sample.normal, 0.052)
          .addScaledVector(forward, -0.045);
        const lookLocalPos = sample.point
          .clone()
          .addScaledVector(sample.normal, 0.042)
          .addScaledVector(forward, 0.14);

        this.planetRoot.updateMatrixWorld(true);
        this.camTargetPos.copy(camLocalPos.applyMatrix4(this.planetRoot.matrixWorld));
        this.camTargetLook.copy(lookLocalPos.applyMatrix4(this.planetRoot.matrixWorld));
        this.camTargetUp.copy(sample.normal);
      }
    }

    // Smooth Camera Position, Look-At & Up-Vector Interpolation
    this.camCurrentPos.lerp(this.camTargetPos, 1.0 - Math.exp(-dt * 5.2));
    this.camCurrentLook.lerp(this.camTargetLook, 1.0 - Math.exp(-dt * 5.2));
    this.camCurrentUp.lerp(this.camTargetUp, 1.0 - Math.exp(-dt * 5.5)).normalize();
    this.camera.up.copy(this.camCurrentUp);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);

    // Ensure zero foreground occlusion when inspecting a selected building's front facade
    this.updateFrontViewOcclusion();

    // 4. Calm Daily Cycle Lighting & Big Ben Clock Synchronization
    const t = this.timeOfDay;
    const { clockText, isDaytime, hourAngle, minuteAngle } =
      this.getClockStringAndHands();
    const currentClockMinute = Math.floor(((t * 24 + 6) % 24) * 60);
    if (currentClockMinute !== this.lastReportedClockMinute) {
      this.lastReportedClockMinute = currentClockMinute;
      const weatherOverlay = this.buildWeatherOverlayState();
      const monthName = MONTH_NAMES[this.monthIndex] || 'December';
      const seasonName = getSeasonForMonth(this.monthIndex);
      this.onStateChange((prev) => ({
        ...prev,
        timeOfDay: this.timeOfDay,
        clockText,
        isDaytime,
        monthIndex: this.monthIndex,
        monthName,
        seasonName,
        yearCount: this.yearCount,
        isDecemberFestive: this.monthIndex === 11,
        weatherMode: this.weatherMode,
        weatherAuto: this.weatherAuto,
        weatherOverlay,
      }));
    }

    // Orbit the Sun & Moon 180° apart:
    // At t = 0.00 (06:00 Sunrise): orbitAngle = -PI/2 (-X East horizon)
    // At t = 0.25 (12:00 Noon):    orbitAngle = 0     (+Z directly illuminating London)
    // At t = 0.50 (18:00 Sunset):  orbitAngle = +PI/2 (+X West horizon)
    // At t = 0.75 (00:00 Midnight):orbitAngle = PI    (-Z illuminating opposite hemisphere; Moon at +Z)
    const orbitAngle = (t - 0.25) * Math.PI * 2;
    const orbitRadius = 1.24;
    const sunPos = new THREE.Vector3(
      Math.sin(orbitAngle) * orbitRadius,
      Math.cos(orbitAngle) * orbitRadius * 0.42 + 0.14,
      Math.cos(orbitAngle) * orbitRadius * 0.9,
    );
    const moonPos = sunPos.clone().negate();

    // True Hemisphere Day/Night factors based on Sun elevation over London (+Z)
    const sunAltitude = Math.cos(orbitAngle); // +1 at Noon, 0 at 06:00 & 18:00, -1 at Midnight
    const dayFactor = THREE.MathUtils.clamp(sunAltitude * 1.45, 0, 1);
    const nightFactor = THREE.MathUtils.clamp(-sunAltitude * 1.45, 0, 1);
    const twilightFactor = THREE.MathUtils.clamp(
      1.0 - Math.abs(sunAltitude) * 2.2,
      0,
      1,
    );

    this.sunGroup.position.copy(sunPos);
    this.sunGroup.lookAt(0, 0, 0);
    const sunRayCrown = this.sunGroup.getObjectByName('sunRayCrown');
    if (sunRayCrown) {
      sunRayCrown.rotation.z = elapsed * 0.45;
    }
    const sunAstrolabeRing = this.sunGroup.getObjectByName('sunAstrolabeRing');
    if (sunAstrolabeRing) {
      sunAstrolabeRing.rotation.x = 0.65 + Math.sin(elapsed * 0.8) * 0.25;
      sunAstrolabeRing.rotation.y = elapsed * 0.6;
    }

    // Keep Sun directional light active at sunPos so whichever hemisphere faces the Sun always reflects daytime!
    this.sunLight.position.copy(sunPos);
    this.moonGroup.position.copy(moonPos);
    const moonBody = this.moonGroup.getObjectByName('moonBody');
    if (moonBody) {
      moonBody.rotation.y = elapsed * 0.22;
    }
    const moonStarlets = this.moonGroup.getObjectByName('moonStarlets');
    if (moonStarlets) {
      moonStarlets.rotation.y = -elapsed * 0.65;
      moonStarlets.rotation.z = Math.sin(elapsed * 0.9) * 0.18;
    }
    this.moonLight.position.copy(moonPos);

    // Universal Weather blending factors (Rain, Snow, London Pea-Souper Fog)
    const targetRain =
      this.weatherMode === 'rain' || this.weatherMode === 'storm' ? 1.0 : 0.0;
    const targetSnow = this.weatherMode === 'snow' ? 1.0 : 0.0;
    const targetFog =
      this.weatherMode === 'fog'
        ? 1.0
        : this.weatherMode === 'rain' || this.weatherMode === 'storm'
          ? 0.25
          : 0.0;

    this.rainBlend = THREE.MathUtils.lerp(this.rainBlend, targetRain, dt * 2.8);
    this.snowBlend = THREE.MathUtils.lerp(this.snowBlend, targetSnow, dt * 2.8);
    this.fogBlend = THREE.MathUtils.lerp(this.fogBlend, targetFog, dt * 2.4);

    const overcastDim = Math.max(
      this.rainBlend * 0.42,
      this.snowBlend * 0.25,
      this.fogBlend * 0.38,
    );

    // Sun always illuminates its facing hemisphere; Moon illuminates the opposite night hemisphere
    this.sunLight.intensity = 2.05 * (1.0 - overcastDim);
    this.sunLight.color.setRGB(
      1.0,
      THREE.MathUtils.lerp(0.95, 0.72, twilightFactor),
      THREE.MathUtils.lerp(0.8, 0.48, twilightFactor),
    );
    this.moonLight.intensity = 0.95;

    this.roomWindowLight.intensity =
      (1.35 * dayFactor + 0.65 * twilightFactor + 0.18 * nightFactor) *
      (1.0 - overcastDim * 0.5);
    this.roomAmbientLight.intensity =
      0.55 * dayFactor + 0.38 * twilightFactor + 0.24 * nightFactor;
    this.roomHemiLight.intensity =
      0.52 * dayFactor + 0.44 * twilightFactor + 0.3 * nightFactor;

    this.roomEnv.updateTimeOfDay(
      dayFactor,
      twilightFactor,
      nightFactor,
      elapsed,
      this.rainBlend,
      this.snowBlend,
      this.fogBlend,
    );
    this.terrain.applyGlobalWeather(this.weatherMode, dt);
    this.terrain.update(elapsed, dt, nightFactor);

    // Animate Universal London Rain, Snow & Fog particles around the entire globe
    this.globalRainMat.opacity = this.rainBlend * (this.weatherMode === 'storm' ? 0.78 : 0.58);
    if (this.rainBlend > 0.01) {
      const rPos = this.globalRainLines.geometry.attributes.position;
      const count = this.globalRainVelocities.length;
      const speedMul = this.weatherMode === 'storm' ? 1.45 : 1.0;
      for (let i = 0; i < count; i++) {
        const vel = this.globalRainVelocities[i];
        let sx = rPos.getX(i * 2) + vel.x * dt * speedMul;
        let sy = rPos.getY(i * 2) + vel.y * dt * speedMul;
        let sz = rPos.getZ(i * 2) + vel.z * dt * speedMul;
        const r = Math.hypot(sx, sy, sz);
        if (r < 0.76) {
          const resetDir = new THREE.Vector3(sx, sy, sz).normalize();
          const newR = 1.24 + (i % 5) * 0.025;
          sx = resetDir.x * newR;
          sy = resetDir.y * newR;
          sz = resetDir.z * newR;
        }
        const dirNorm = new THREE.Vector3(sx, sy, sz).normalize();
        const streak = this.weatherMode === 'storm' ? 0.054 : 0.042;
        rPos.setXYZ(i * 2, sx, sy, sz);
        rPos.setXYZ(
          i * 2 + 1,
          sx - dirNorm.x * streak,
          sy - dirNorm.y * streak,
          sz - dirNorm.z * streak,
        );
      }
      rPos.needsUpdate = true;

      // Universal London rain gently nourishes London's park trees
      for (const obj of this.placedObjects) {
        if (
          (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') &&
          obj.targetGrowth < 1.35
        ) {
          obj.targetGrowth = Math.min(1.35, obj.targetGrowth + dt * 0.025);
        }
      }
    }

    this.globalSnowMat.opacity = this.snowBlend * 0.88;
    if (this.snowBlend > 0.01) {
      const sPos = this.globalSnowPoints.geometry.attributes.position;
      const count = this.globalSnowVelocities.length;
      for (let i = 0; i < count; i++) {
        const vel = this.globalSnowVelocities[i];
        let px = sPos.getX(i) + vel.x * dt;
        let py = sPos.getY(i) + vel.y * dt;
        let pz = sPos.getZ(i) + vel.z * dt;
        const r = Math.hypot(px, py, pz);
        if (r < 0.76) {
          const resetDir = new THREE.Vector3(px, py, pz).normalize();
          const newR = 1.26 + (i % 4) * 0.02;
          px = resetDir.x * newR;
          py = resetDir.y * newR;
          pz = resetDir.z * newR;
        }
        sPos.setXYZ(i, px, py, pz);
      }
      sPos.needsUpdate = true;
    }

    if (this.fogBlend > 0.005) {
      this.globalFogGroup.visible = true;
      this.globalFogGroup.rotation.y = elapsed * 0.055;
      for (let i = 0; i < this.globalFogMats.length; i++) {
        const pulse = 0.85 + Math.sin(elapsed * 0.9 + i * 1.3) * 0.15;
        this.globalFogMats[i].opacity = this.fogBlend * 0.26 * pulse;
      }
    } else {
      this.globalFogGroup.visible = false;
    }

    // 6. Update Placed Objects (Bounce, Windmill/London Eye, Windows, Lighthouse, Campfire, Flag, Butterflies)
    // Also ignite London windows and gas streetlamps during Rain, Storm, or Pea-Souper Fog!
    const weatherGlowBoost = Math.max(
      this.rainBlend * 0.65,
      this.fogBlend * 0.75,
      this.snowBlend * 0.45,
    );
    const warmGlowFactor = Math.min(
      1.0,
      Math.max(twilightFactor * 0.85 + nightFactor * 1.0, weatherGlowBoost),
    );

    for (const obj of this.placedObjects) {
      if (Math.abs(obj.growth - obj.targetGrowth) > 0.001) {
        obj.growth = THREE.MathUtils.lerp(obj.growth, obj.targetGrowth, dt * 3.5);
      }

      let bounceScale = 1.0;
      if (obj.bounceActive) {
        obj.bounceTime += dt;
        if (obj.bounceTime < 0.65) {
          const p = obj.bounceTime / 0.65;
          bounceScale =
            1.0 - Math.exp(-p * 6.0) * Math.cos(p * Math.PI * 3.5) * 0.65;
        } else {
          obj.bounceActive = false;
        }
      }
      obj.mesh.scale.setScalar(obj.growth * bounceScale);

      if (obj.windmillRotor) {
        obj.windmillRotor.rotation.z -= dt * 1.15;
      }

      if (obj.windowMaterials) {
        const emIntensity = 0.15 + warmGlowFactor * 2.1;
        for (const wm of obj.windowMaterials) {
          wm.emissiveIntensity = emIntensity;
        }
      }

      if (obj.lighthouseBeamPivot && obj.lighthouseConeMats && obj.lighthousePointLight) {
        if (this.tourActive && this.tourElapsed >= 27.0) {
          // Smoothly align the lighthouse beam perpendicular to the camera's view ray and tower axis
          // so the searchlight is strictly 90° perpendicular to the lighthouse in both 3D and 2D screen space at 0:29
          obj.mesh.updateMatrixWorld(true);
          const worldQuat = new THREE.Quaternion();
          obj.mesh.getWorldQuaternion(worldQuat);
          const lanternWorldPos = new THREE.Vector3(0, 0.14, 0).applyMatrix4(
            obj.mesh.matrixWorld,
          );
          const viewDir = lanternWorldPos
            .clone()
            .sub(this.camera.position)
            .normalize();
          const towerUpWorld = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(worldQuat)
            .normalize();
          const perpWorld = new THREE.Vector3()
            .crossVectors(towerUpWorld, viewDir)
            .normalize();
          const perpLocal = perpWorld
            .clone()
            .applyQuaternion(worldQuat.clone().invert());
          const targetRotY = Math.atan2(perpLocal.x, perpLocal.z);

          const angleDiff =
            (((targetRotY - obj.lighthouseBeamPivot.rotation.y) % Math.PI) +
              Math.PI * 1.5) %
              Math.PI -
            Math.PI * 0.5;
          obj.lighthouseBeamPivot.rotation.y +=
            angleDiff * Math.min(1.0, dt * 6.5);
        } else {
          obj.lighthouseBeamPivot.rotation.y += dt * 1.25;
        }
        const beamOpacity = warmGlowFactor * 0.42;
        for (const cm of obj.lighthouseConeMats) {
          cm.opacity = beamOpacity;
        }
        obj.lighthousePointLight.intensity = warmGlowFactor * 0.85;
      }

      // Campfire crackling flames, rising ember particles & warm orange glow
      if (obj.campfireFlameGroup && obj.campfireEmbers && obj.campfireLight) {
        const flicker = 1.0 + Math.sin(elapsed * 18.0 + obj.yaw) * 0.16;
        obj.campfireFlameGroup.scale.set(
          1.0 + Math.cos(elapsed * 14.0) * 0.1,
          flicker,
          1.0 + Math.sin(elapsed * 16.0) * 0.1,
        );
        obj.campfireLight.intensity = (0.38 + warmGlowFactor * 0.95) * flicker;

        const emberPos = obj.campfireEmbers.geometry.attributes.position;
        for (let i = 0; i < emberPos.count; i++) {
          let y = emberPos.getY(i) + dt * 0.032;
          if (y > 0.058) y = 0.01;
          const x = Math.sin(elapsed * 5.0 + i * 2.1) * 0.006;
          const z = Math.cos(elapsed * 4.5 + i * 1.7) * 0.006;
          emberPos.setXYZ(i, x, y, z);
        }
        emberPos.needsUpdate = true;
      }

      // Big Ben 4-Sided Clock Hands synchronized to live London GMT time
      if (obj.bigBenHourHands && obj.bigBenMinuteHands) {
        for (const hh of obj.bigBenHourHands) {
          hh.rotation.z = hourAngle;
        }
        for (const mh of obj.bigBenMinuteHands) {
          mh.rotation.z = minuteAngle;
        }
      }

      // Stone Watchtower / Buckingham Palace waving Royal Standard flag
      if (obj.watchtowerFlag) {
        obj.watchtowerFlag.rotation.y =
          Math.sin(elapsed * 5.2 + obj.yaw) * 0.24;
      }

      // Beehive fluttering butterflies & golden bees
      if (obj.butterflySwarm) {
        obj.butterflySwarm.rotation.y = elapsed * 1.4;
        obj.butterflySwarm.children.forEach((bPivot, idx) => {
          bPivot.position.y =
            0.008 + Math.sin(elapsed * 4.2 + idx * 1.6) * 0.008;
          const flap = Math.sin(elapsed * 22.0 + idx) * 0.55;
          if (bPivot.children[0]) bPivot.children[0].rotation.y = 0.4 + flap;
          if (bPivot.children[1]) bPivot.children[1].rotation.y = -0.4 - flap;
        });
      }
    }

    // 6A. Twinkle December Christmas Fairy Lights, Garlands & Trafalgar Square Tree
    this.updateFestiveLights(elapsed, warmGlowFactor);

    // 6B. Update Moving Road Traffic (Red Double-Decker Buses & Black London Cabs)
    //     with vehicle-to-vehicle spacing so vehicles never pass through each other
    for (const rv of this.roadVehicles) {
      let blockedAhead = false;
      for (const other of this.roadVehicles) {
        if (other === rv) continue;
        if (other.seg === rv.seg && other.reversed === rv.reversed) {
          const gap = other.t - rv.t;
          if (gap > 0 && gap < 0.17) {
            blockedAhead = true;
            break;
          }
        }
      }

      const stepSpeed = blockedAhead ? rv.speed * 0.25 : rv.speed;
      rv.t += stepSpeed * dt;
      if (rv.t >= 1.0) {
        rv.t = 0.0;
        const currentHub = rv.toNode;
        const neighbors = getConnectedRoadNodes(currentHub);
        const forwardChoices = neighbors.filter((n) => n !== rv.fromNode);
        const pool = forwardChoices.length > 0 ? forwardChoices : neighbors;
        const nextHub =
          pool[Math.floor(Math.random() * pool.length)] || rv.fromNode;

        const nextFound = findRoadSegmentBetween(currentHub, nextHub);
        if (nextFound) {
          rv.fromNode = currentHub;
          rv.toNode = nextHub;
          rv.seg = nextFound.seg;
          rv.reversed = nextFound.reversed;
        }
      }
      this.positionRoadVehicle(rv);

      const emIntensity = 0.22 + warmGlowFactor * 2.1;
      for (const wm of rv.windowMaterials) {
        wm.emissiveIntensity = emIntensity;
      }
    }
    for (const bm of this.roadNetwork.beaconMaterials) {
      bm.emissiveIntensity =
        0.55 + warmGlowFactor * 1.4 + Math.sin(elapsed * 4.0) * 0.25;
    }

    // 7. Update Villagers traveling between homes, Trafalgar Square, bridges & landmarks
    const bridgesAndDocks = this.placedObjects.filter(
      (o) =>
        o.type === 'bridge' ||
        o.type === 'dock' ||
        o.type === 'westminsterbridge' ||
        o.type === 'towerbridge',
    );
    const villagerRadius = 0.012;

    for (const v of this.villagers) {
      if (this.shootingStarGazeTimer > 0) {
        // Stop, look up at the sky, and wave excitedly while watching the shooting star!
        v.bodyMesh.position.y = Math.abs(Math.sin(elapsed * 10.0)) * 0.0025;
        v.headGroup.rotation.x = THREE.MathUtils.lerp(
          v.headGroup.rotation.x,
          -0.42,
          dt * 6.0,
        );
        v.leftLeg.rotation.x = 0;
        v.rightLeg.rotation.x = 0;
        v.leftArm.rotation.x = 0;
        v.rightArm.rotation.x = -2.4 + Math.sin(elapsed * 14.0) * 0.35;
        continue;
      }

      if (v.pauseTimer > 0) {
        v.pauseTimer -= dt;
        v.bodyMesh.position.y = 0;
        v.leftLeg.rotation.x = THREE.MathUtils.lerp(v.leftLeg.rotation.x, 0, dt * 8);
        v.rightLeg.rotation.x = THREE.MathUtils.lerp(v.rightLeg.rotation.x, 0, dt * 8);
        v.leftArm.rotation.x = THREE.MathUtils.lerp(v.leftArm.rotation.x, 0, dt * 8);
        v.rightArm.rotation.x = THREE.MathUtils.lerp(v.rightArm.rotation.x, 0, dt * 8);
        v.headGroup.rotation.x = THREE.MathUtils.lerp(v.headGroup.rotation.x, 0, dt * 6);
        v.headGroup.rotation.y = Math.sin(elapsed * 2.2 + v.walkPhase) * 0.25;
        continue;
      }

      const distToTarget = v.dir.distanceTo(v.targetDir);
      if (distToTarget < 0.026) {
        v.headingToWell = !v.headingToWell;
        v.targetDir = this.pickNextVillagerTarget(v.headingToWell, v.dir);
        v.pauseTimer = 0.9 + Math.random() * 1.4;
        v.stuckTimer = 0;
        continue;
      }

      const prevDir = v.dir.clone();
      const surfBefore = this.terrain.getSurfacePointAndNormal(v.dir);

      // Desired tangent direction toward target on local surface plane
      const desiredTangent = v.targetDir
        .clone()
        .sub(v.dir)
        .projectOnPlane(surfBefore.normal)
        .normalize();

      // Compute smooth look-ahead obstacle avoidance steering vector around buildings, trees & fences
      const steerVec = desiredTangent.clone();
      const signHint = v.steerSign || 1;

      for (const obj of this.placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB, railAxis } = this.getFenceSegmentOnSphere(obj);
          const closest = this.closestPointOnSphereSegment(v.dir, segA, segB);
          const dFence = v.dir.distanceTo(closest);
          const minClear = 0.015 + villagerRadius;
          const avoidDist = minClear + 0.036;
          if (dFence < avoidDist && dFence > 1e-6) {
            const awayNormal = v.dir
              .clone()
              .sub(closest)
              .projectOnPlane(surfBefore.normal)
              .normalize();
            const alongRail =
              railAxis.dot(desiredTangent) >= 0
                ? railAxis.clone()
                : railAxis.clone().negate();
            const weight = Math.pow(
              1.0 - Math.max(0, dFence - minClear) / (avoidDist - minClear),
              1.35,
            );
            steerVec.addScaledVector(alongRail, weight * 1.65);
            steerVec.addScaledVector(awayNormal, weight * 1.25);
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = this.getRainbowFootDirs(obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const dFoot = v.dir.distanceTo(footDir);
            const minClear = 0.026 + villagerRadius;
            const avoidDist = minClear + 0.042;
            if (dFoot < avoidDist && dFoot > 1e-6) {
              const away = v.dir
                .clone()
                .sub(footDir)
                .projectOnPlane(surfBefore.normal)
                .normalize();
              const weight = Math.pow(
                1.0 - Math.max(0, dFoot - minClear) / (avoidDist - minClear),
                1.35,
              );
              steerVec.addScaledVector(away, weight * 1.5);
            }
          }
          continue;
        }

        const obsR = this.getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const dObs = v.dir.distanceTo(obj.dir);
        const minClear = obsR + villagerRadius;
        const avoidDist = minClear + 0.048;

        if (dObs < avoidDist && dObs > 1e-6) {
          const toObs = obj.dir
            .clone()
            .sub(v.dir)
            .projectOnPlane(surfBefore.normal);
          const toObsNorm = toObs.clone().normalize();
          const approaching = toObsNorm.dot(desiredTangent);

          // Steer around the building if it lies in our forward hemisphere or we are very close
          if (approaching > -0.15 || dObs < minClear + 0.014) {
            const tangentLeft = new THREE.Vector3()
              .crossVectors(surfBefore.normal, toObsNorm)
              .normalize();
            const dotLeft = tangentLeft.dot(desiredTangent);
            const chosenTangent =
              Math.abs(dotLeft) > 0.08
                ? dotLeft >= 0
                  ? tangentLeft
                  : tangentLeft.clone().negate()
                : tangentLeft.clone().multiplyScalar(signHint);
            const awayRadial = toObsNorm.clone().negate();

            const weight = Math.pow(
              1.0 - Math.max(0, dObs - minClear) / (avoidDist - minClear),
              1.35,
            );
            steerVec.addScaledVector(chosenTangent, weight * 1.85);
            steerVec.addScaledVector(awayRadial, weight * 1.15);
          }
        }
      }

      // Also steer around the fenced sheep pasture corral
      const dPasture = v.dir.distanceTo(this.pastureCenter);
      const pastureClear = this.pastureRadius + villagerRadius + 0.008;
      const pastureAvoid = pastureClear + 0.044;
      if (dPasture < pastureAvoid && dPasture > 1e-6) {
        const toPasture = this.pastureCenter
          .clone()
          .sub(v.dir)
          .projectOnPlane(surfBefore.normal)
          .normalize();
        if (toPasture.dot(desiredTangent) > -0.1 || dPasture < pastureClear + 0.01) {
          const tangentLeft = new THREE.Vector3()
            .crossVectors(surfBefore.normal, toPasture)
            .normalize();
          const chosenTangent =
            tangentLeft.dot(desiredTangent) >= 0
              ? tangentLeft
              : tangentLeft.clone().negate();
          const weight = Math.pow(
            1.0 - Math.max(0, dPasture - pastureClear) / (pastureAvoid - pastureClear),
            1.35,
          );
          steerVec.addScaledVector(chosenTangent, weight * 1.85);
          steerVec.addScaledVector(toPasture.clone().negate(), weight * 1.25);
        }
      }

      // Personal-space steering around other villagers
      for (const other of this.villagers) {
        if (other === v) continue;
        const dOther = v.dir.distanceTo(other.dir);
        if (dOther < 0.028 && dOther > 1e-6) {
          const away = v.dir
            .clone()
            .sub(other.dir)
            .projectOnPlane(surfBefore.normal)
            .normalize();
          steerVec.addScaledVector(away, ((0.028 - dOther) / 0.028) * 0.9);
        }
      }

      steerVec.projectOnPlane(surfBefore.normal).normalize();
      if (steerVec.lengthSq() < 1e-6) {
        steerVec.copy(desiredTangent);
      }

      // Advance along steered tangent vector
      v.dir.addScaledVector(steerVec, v.speed * dt).normalize();

      // Enforce hard non-penetration constraints against all buildings, fences, water & cliffs
      this.resolveVillagerCollisions(v, bridgesAndDocks, prevDir);

      // Watchdog: if blocked from making progress for too long, choose a new clear target
      const actualStep = v.dir.distanceTo(prevDir);
      if (actualStep < v.speed * dt * 0.18) {
        v.stuckTimer = (v.stuckTimer || 0) + dt;
        if (v.stuckTimer > 1.1) {
          v.steerSign = -(v.steerSign || 1);
          v.headingToWell = !v.headingToWell;
          v.targetDir = this.pickNextVillagerTarget(v.headingToWell, v.dir);
          v.stuckTimer = 0;
        }
      } else {
        v.stuckTimer = Math.max(0, (v.stuckTimer || 0) - dt * 0.5);
      }

      const surf = this.terrain.getSurfacePointAndNormal(v.dir);
      const bridgeObj = bridgesAndDocks.find(
        (b) => b.dir.distanceTo(v.dir) < 0.056,
      );

      v.walkPhase += dt * 13.5;
      const stride = Math.sin(v.walkPhase);
      const hop = Math.abs(stride) * 0.0032;

      // Swing articulated legs & arms in opposition
      v.leftLeg.rotation.x = stride * 0.58;
      v.rightLeg.rotation.x = -stride * 0.58;
      v.leftArm.rotation.x = -stride * 0.46;
      v.rightArm.rotation.x = stride * 0.46;
      v.headGroup.rotation.x = Math.abs(stride) * 0.08;
      v.headGroup.rotation.y = 0;

      let basePt = surf.point;
      if (bridgeObj) {
        const dRatio = THREE.MathUtils.clamp(
          v.dir.distanceTo(bridgeObj.dir) / 0.048,
          0,
          1,
        );
        const deckHeight =
          bridgeObj.type === 'bridge'
            ? 0.015 + (1.0 - dRatio * dRatio) * 0.017
            : 0.019;
        basePt = v.dir
          .clone()
          .multiplyScalar(Math.max(surf.radius, this.terrain.seaLevel + deckHeight));
      }
      v.mesh.position.copy(basePt).addScaledVector(surf.normal, hop);

      const actualMoveTangent = v.dir
        .clone()
        .sub(prevDir)
        .projectOnPlane(surf.normal);
      const faceTangent =
        actualMoveTangent.lengthSq() > 1e-7
          ? actualMoveTangent.normalize()
          : steerVec;

      if (faceTangent.lengthSq() > 1e-5) {
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(
          UP_VEC,
          surf.normal,
        );
        const invAlign = alignQuat.clone().invert();
        const localTangent = faceTangent.clone().applyQuaternion(invAlign);
        const targetYaw = Math.atan2(localTangent.x, localTangent.z);
        // Smooth angular turn so villagers don't snap-spin around corners
        let diff = targetYaw - v.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.yaw += diff * Math.min(1.0, dt * 10.0);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, v.yaw);
        v.mesh.quaternion.copy(alignQuat).multiply(yawQuat);
      }
    }

    // 8. Update White Sheep grazing inside the fenced pasture & respecting all fences/structures
    const pRight = new THREE.Vector3()
      .crossVectors(UP_VEC, this.pastureCenter)
      .normalize();
    const pUp = new THREE.Vector3()
      .crossVectors(this.pastureCenter, pRight)
      .normalize();

    for (const s of this.sheepList) {
      s.grazeTimer -= dt;
      if (s.grazeTimer <= 0) {
        s.isGrazing = !s.isGrazing;
        s.grazeTimer = s.isGrazing
          ? 2.0 + Math.random() * 2.5
          : 2.2 + Math.random() * 2.0;
        if (!s.isGrazing) {
          if (s.inPasture) {
            // Pick a random grazing spot strictly inside the fenced sheep pasture corral
            const maxR = this.pastureRadius - 0.025;
            for (let attempt = 0; attempt < 12; attempt++) {
              const angle = Math.random() * Math.PI * 2;
              const r = (0.15 + Math.random() * 0.85) * maxR;
              const candidate = this.pastureCenter
                .clone()
                .addScaledVector(pRight, Math.cos(angle) * r)
                .addScaledVector(pUp, Math.sin(angle) * r)
                .normalize();
              if (this.isPositionClearOfObstacles(candidate, 0.012, true)) {
                s.targetDir.copy(candidate);
                break;
              }
            }
          } else {
            // Free-range sheep placed outside the pasture corral
            for (let attempt = 0; attempt < 12; attempt++) {
              const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.14,
                (Math.random() - 0.5) * 0.14,
                (Math.random() - 0.5) * 0.14,
              );
              const candidate = s.dir.clone().add(offset).normalize();
              if (this.isPositionClearOfObstacles(candidate, 0.014, false)) {
                s.targetDir.copy(candidate);
                break;
              }
            }
          }
        }
      }

      // Cute wagging woolly tail
      s.tailMesh.rotation.y = Math.sin(elapsed * 8.5 + s.walkPhase) * 0.32;

      if (s.isGrazing) {
        s.headGroup.rotation.x =
          0.48 + Math.sin(elapsed * 7.0 + s.walkPhase) * 0.14;
        for (const leg of s.legs) {
          leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, dt * 8);
        }
      } else {
        s.headGroup.rotation.x = THREE.MathUtils.lerp(
          s.headGroup.rotation.x,
          0.0,
          dt * 6.0,
        );
        const dist = s.dir.distanceTo(s.targetDir);
        if (dist > 0.008) {
          const prevSheepDir = s.dir.clone();
          s.dir
            .lerp(s.targetDir, (s.speed * dt) / Math.max(dist, 0.01))
            .normalize();

          // Enforce fence rail collision, pasture containment, building collision & flock separation
          const hitBoundary = this.resolveSheepCollisions(s, prevSheepDir);
          if (hitBoundary) {
            // Pick a fresh grazing point away from the fence/obstacle
            s.targetDir.copy(
              s.inPasture ? this.pastureCenter : prevSheepDir,
            );
          }

          s.walkPhase += dt * 12.0;
          const stride = Math.sin(s.walkPhase);
          const hop = Math.abs(stride) * 0.0025;

          // Quadruped diagonal trot leg swing
          if (s.legs.length === 4) {
            s.legs[0].rotation.x = stride * 0.45;
            s.legs[1].rotation.x = -stride * 0.45;
            s.legs[2].rotation.x = -stride * 0.45;
            s.legs[3].rotation.x = stride * 0.45;
          }

          const surf = this.terrain.getSurfacePointAndNormal(s.dir);
          s.mesh.position.copy(surf.point).addScaledVector(surf.normal, hop);

          const moveTangent = s.targetDir
            .clone()
            .sub(s.dir)
            .projectOnPlane(surf.normal)
            .normalize();
          const alignQuat = new THREE.Quaternion().setFromUnitVectors(
            UP_VEC,
            surf.normal,
          );
          if (moveTangent.lengthSq() > 1e-5) {
            const invAlign = alignQuat.clone().invert();
            const localTangent = moveTangent.clone().applyQuaternion(invAlign);
            const targetYaw = Math.atan2(localTangent.x, localTangent.z);
            let diff = targetYaw - s.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            s.yaw += diff * Math.min(1.0, dt * 8.0);
          }
          const yawQuat = new THREE.Quaternion().setFromAxisAngle(UP_VEC, s.yaw);
          s.mesh.quaternion.copy(alignQuat).multiply(yawQuat);
        } else {
          s.isGrazing = true;
          s.grazeTimer = 1.8 + Math.random() * 2.2;
        }
      }
    }

    // 9. Update Sailboats bobbing & sailing across turquoise seas (avoiding docks, bridges & shorelines)
    for (const b of this.sailboats) {
      b.lanternMat.emissiveIntensity = 0.2 + warmGlowFactor * 2.3;

      const dist = b.dir.distanceTo(b.targetDir);
      if (dist < 0.03) {
        b.targetDir = this.pickRandomWaterTarget(b.dir);
      } else {
        const nextDir = b.dir
          .clone()
          .lerp(b.targetDir, (b.speed * dt) / Math.max(dist, 0.01))
          .normalize();
        const surf = this.terrain.getSurfacePointAndNormal(nextDir);
        const hitsPier = bridgesAndDocks.some(
          (pier) => pier.dir.distanceTo(nextDir) < 0.052,
        );
        const hitsOtherBoat = this.sailboats.some(
          (other) => other !== b && other.dir.distanceTo(nextDir) < 0.048,
        );

        if (surf.isWater && !hitsPier && !hitsOtherBoat) {
          const tangent = b.targetDir
            .clone()
            .sub(b.dir)
            .projectOnPlane(nextDir)
            .normalize();
          if (tangent.lengthSq() > 1e-5) {
            b.yaw = Math.atan2(tangent.x, tangent.z);
          }
          b.dir.copy(nextDir);
        } else {
          b.targetDir = this.pickRandomWaterTarget(b.dir);
        }
      }

      const bobOffset = Math.sin(elapsed * 2.6 + b.bobPhase) * 0.0022;
      this.orientObjectOnSurface(b.mesh, b.dir, b.yaw, bobOffset, true);
      b.hullGroup.rotation.z = Math.sin(elapsed * 2.1 + b.bobPhase) * 0.085;
      b.hullGroup.rotation.x = Math.cos(elapsed * 1.8 + b.bobPhase) * 0.05;
    }

    // 10. Update Paddling Swans & Ducks with expanding water ripple rings (avoiding docks & boats)
    for (const d of this.ducks) {
      const dist = d.dir.distanceTo(d.targetDir);
      if (dist < 0.025) {
        d.targetDir = this.pickRandomWaterTarget(d.dir);
      } else {
        const nextDir = d.dir
          .clone()
          .lerp(d.targetDir, (d.speed * dt) / Math.max(dist, 0.01))
          .normalize();
        const surf = this.terrain.getSurfacePointAndNormal(nextDir);
        const hitsPier = bridgesAndDocks.some(
          (pier) => pier.dir.distanceTo(nextDir) < 0.044,
        );
        const hitsBoat = this.sailboats.some(
          (boat) => boat.dir.distanceTo(nextDir) < 0.045,
        );

        if (surf.isWater && !hitsPier && !hitsBoat) {
          const tangent = d.targetDir
            .clone()
            .sub(d.dir)
            .projectOnPlane(nextDir)
            .normalize();
          if (tangent.lengthSq() > 1e-5) {
            d.yaw = Math.atan2(tangent.x, tangent.z);
          }
          d.dir.copy(nextDir);
        } else {
          d.targetDir = this.pickRandomWaterTarget(d.dir);
        }
      }

      const bobOffset = Math.sin(elapsed * 3.4 + d.bobPhase) * 0.0012;
      this.orientObjectOnSurface(d.mesh, d.dir, d.yaw, bobOffset, true);

      d.rippleRings.forEach((ring, idx) => {
        const rippleCycle = (elapsed * 0.85 + idx * 0.5 + d.bobPhase) % 1.0;
        const scale = 0.8 + rippleCycle * 1.45;
        ring.scale.setScalar(scale);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          (1.0 - rippleCycle) * 0.45;
      });
    }

    // 11. Update Hot Air Balloons floating in the upper atmosphere
    for (const bal of this.balloons) {
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        bal.orbitAxis,
        bal.orbitSpeed * dt,
      );
      bal.currentDir.applyQuaternion(qStep).normalize();
      const alt =
        bal.baseAltitude + Math.sin(elapsed * 1.2 + bal.phase) * 0.018;
      bal.mesh.position.copy(bal.currentDir).multiplyScalar(alt);
      bal.mesh.quaternion.setFromUnitVectors(UP_VEC, bal.currentDir);

      // Periodic golden burner flame puff
      const burnerPulse =
        Math.max(0, Math.sin(elapsed * 2.4 + bal.phase * 2.0)) * 1.8;
      bal.burnerMat.emissiveIntensity = 0.7 + burnerPulse + warmGlowFactor * 1.1;
    }

    // 12. Update Puffy Rain Clouds & Frosty Snow Clouds
    for (const c of this.clouds) {
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        c.orbitAxis,
        c.orbitSpeed * dt,
      );
      c.currentDir.applyQuaternion(qStep).normalize();
      c.mesh.position.copy(c.currentDir).multiplyScalar(c.altitude);
      c.mesh.quaternion.setFromUnitVectors(UP_VEC, c.currentDir);

      c.rainTimer -= dt;
      if (c.rainTimer <= 0) {
        c.isRaining = !c.isRaining;
        c.rainTimer = c.isRaining
          ? 5.2 + Math.random() * 2.5
          : 6.5 + Math.random() * 4.5;
      }

      if (c.isSnow && c.snowPoints && c.snowMat) {
        const targetSnowOpacity = c.isRaining ? 0.88 : 0.0;
        c.snowMat.opacity = THREE.MathUtils.lerp(
          c.snowMat.opacity,
          targetSnowOpacity,
          dt * 4.0,
        );
        if (c.isRaining) {
          c.snowPoints.position.y = -((elapsed * 0.14) % 0.06);
          c.snowPoints.rotation.y = elapsed * 0.8;
          this.terrain.applySnowAtDirection(c.currentDir, dt);
        }
      } else {
        const targetRainOpacity = c.isRaining ? 0.65 : 0.0;
        c.rainMat.opacity = THREE.MathUtils.lerp(
          c.rainMat.opacity,
          targetRainOpacity,
          dt * 4.0,
        );

        if (c.isRaining) {
          c.rainLines.position.y = -((elapsed * 0.38) % 0.06);
          this.terrain.applyRainAtDirection(c.currentDir, dt);

          for (const obj of this.placedObjects) {
            if (obj.type === 'oak' || obj.type === 'pine' || obj.type === 'palm') {
              if (obj.dir.distanceTo(c.currentDir) < 0.28 && obj.targetGrowth < 1.38) {
                obj.targetGrowth = Math.min(1.38, obj.targetGrowth + dt * 0.09);
              }
            }
          }
        }
      }
    }

    // 13. Update Shooting Stars streaking across the upper orb sky
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const st = this.shootingStars[i];
      st.age += dt;
      if (st.age >= st.maxAge) {
        this.atmosphereGroup.remove(st.mesh);
        this.shootingStars.splice(i, 1);
        continue;
      }

      const prevPos = st.currentDir.clone().multiplyScalar(st.altitude);
      const qStep = new THREE.Quaternion().setFromAxisAngle(
        st.orbitAxis,
        st.speed * dt,
      );
      st.currentDir.applyQuaternion(qStep).normalize();
      const nextPos = st.currentDir.clone().multiplyScalar(st.altitude);

      st.mesh.position.copy(nextPos);
      const velDir = nextPos.clone().sub(prevPos).normalize();
      if (velDir.lengthSq() > 1e-5) {
        const targetLook = nextPos.clone().add(velDir);
        st.mesh.lookAt(targetLook);
      }

      const fade = 1.0 - Math.pow(st.age / st.maxAge, 2.0);
      st.mesh.scale.setScalar(Math.max(0.01, fade));

      st.sparkleTimer += dt;
      if (st.sparkleTimer > 0.09) {
        st.sparkleTimer = 0;
        this.emitSparklesAtDir(st.currentDir, '#fff4b8', st.altitude);
      }
    }

    // 14. Update Drifting Fireflies inside the glass orb in Night / Twilight mode
    const fireflyAlpha = Math.max(0, nightFactor * 0.92 + twilightFactor * 0.35);
    this.firefliesMat.opacity = fireflyAlpha;
    if (fireflyAlpha > 0.01) {
      const posAttr = this.firefliesPoints.geometry.attributes.position;
      for (let i = 0; i < this.firefliesBasePositions.length; i++) {
        const base = this.firefliesBasePositions[i];
        const x = base.x + Math.sin(elapsed * 1.1 + i * 1.7) * 0.055;
        const y = base.y + Math.cos(elapsed * 0.9 + i * 2.3) * 0.055;
        const z = base.z + Math.sin(elapsed * 1.3 + i * 0.9) * 0.055;
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 15. Update Sparkle Bursts
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const b = this.sparkles[i];
      b.age += dt;
      if (b.age >= b.maxAge) {
        this.effectsGroup.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.sparkles.splice(i, 1);
        continue;
      }
      const posAttr = b.points.geometry.attributes.position;
      for (let k = 0; k < b.velocities.length; k++) {
        const vx = posAttr.getX(k) + b.velocities[k].x * dt;
        const vy = posAttr.getY(k) + b.velocities[k].y * dt;
        const vz = posAttr.getZ(k) + b.velocities[k].z * dt;
        posAttr.setXYZ(k, vx, vy, vz);
      }
      posAttr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity =
        1.0 - b.age / b.maxAge;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private resolveVillagerCollisions(
    v: VillagerEntity,
    bridgesAndDocks: PlacedObjectEntity[],
    fallbackDir?: THREE.Vector3,
  ) {
    const villagerRadius = 0.012;

    // 3-pass position-based non-penetration constraint solver
    for (let pass = 0; pass < 3; pass++) {
      // 1. Solid Buildings, Trees, Wells, Campfires, Beehives, Lanterns & Fences
      for (const obj of this.placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB } = this.getFenceSegmentOnSphere(obj);
          const closest = this.closestPointOnSphereSegment(v.dir, segA, segB);
          const minFenceDist = 0.015 + villagerRadius;
          const dist = v.dir.distanceTo(closest);
          if (dist < minFenceDist) {
            const pushDir =
              dist > 1e-6
                ? v.dir.clone().sub(closest).normalize()
                : v.dir.clone().sub(this.pastureCenter).normalize();
            v.dir
              .copy(closest)
              .addScaledVector(pushDir, minFenceDist + 0.001)
              .normalize();
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = this.getRainbowFootDirs(obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const minFootDist = 0.028 + villagerRadius;
            const dFoot = v.dir.distanceTo(footDir);
            if (dFoot < minFootDist) {
              const pushDir =
                dFoot > 1e-6
                  ? v.dir.clone().sub(footDir).normalize()
                  : new THREE.Vector3(1, 0, 0);
              v.dir
                .copy(footDir)
                .addScaledVector(pushDir, minFootDist + 0.001)
                .normalize();
            }
          }
          continue;
        }

        const obsR = this.getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const minDist = obsR + villagerRadius;
        const dist = v.dir.distanceTo(obj.dir);
        if (dist < minDist) {
          const pushDir =
            dist > 1e-6
              ? v.dir.clone().sub(obj.dir).normalize()
              : new THREE.Vector3(1, 0, 0);
          v.dir
            .copy(obj.dir)
            .addScaledVector(pushDir, minDist + 0.001)
            .normalize();
        }
      }

      // 2. Keep villagers outside the fenced sheep pasture corral
      const dPasture = v.dir.distanceTo(this.pastureCenter);
      const minPastureDist = this.pastureRadius + villagerRadius + 0.006;
      if (dPasture < minPastureDist) {
        const pushOut =
          dPasture > 1e-6
            ? v.dir.clone().sub(this.pastureCenter).normalize()
            : new THREE.Vector3(0, 1, 0);
        v.dir
          .copy(this.pastureCenter)
          .addScaledVector(pushOut, minPastureDist + 0.001)
          .normalize();
      }

      // 3. Villager-to-Villager personal space separation
      for (const other of this.villagers) {
        if (other === v) continue;
        const minSep = 0.020;
        const d = v.dir.distanceTo(other.dir);
        if (d < minSep && d > 1e-6) {
          const push = v.dir.clone().sub(other.dir).normalize();
          const overlap = (minSep - d) * 0.5;
          v.dir.addScaledVector(push, overlap).normalize();
        }
      }

      // 4. Villager-to-Sheep separation
      for (const s of this.sheepList) {
        const minSep = 0.022;
        const d = v.dir.distanceTo(s.dir);
        if (d < minSep && d > 1e-6) {
          const push = v.dir.clone().sub(s.dir).normalize();
          v.dir.addScaledVector(push, minSep - d).normalize();
        }
      }
    }

    // 5. Enforce water & sheer cliff constraints
    const surf = this.terrain.getSurfacePointAndNormal(v.dir);
    const onBridge = bridgesAndDocks.some(
      (b) => b.dir.distanceTo(v.dir) < 0.058,
    );
    const isTooSteep = surf.normal.dot(v.dir) < 0.74;

    if ((surf.isWater && !onBridge) || surf.isMountain || isTooSteep) {
      if (fallbackDir) {
        v.dir.copy(fallbackDir);
      }
      v.targetDir = this.pickNextVillagerTarget(true);
    }
  }

  private resolveSheepCollisions(
    s: SheepEntity,
    fallbackDir?: THREE.Vector3,
  ): boolean {
    const sheepRadius = 0.013;
    let hitBoundary = false;

    for (let pass = 0; pass < 3; pass++) {
      // 1. Continuous Pasture Corral Containment for pasture sheep
      if (s.inPasture) {
        const maxInsideDist = this.pastureRadius - sheepRadius - 0.008;
        const dCenter = s.dir.distanceTo(this.pastureCenter);
        if (dCenter > maxInsideDist && dCenter > 1e-6) {
          const fromCenter = s.dir
            .clone()
            .sub(this.pastureCenter)
            .normalize();
          s.dir
            .copy(this.pastureCenter)
            .addScaledVector(fromCenter, maxInsideDist)
            .normalize();
          hitBoundary = true;
        }
      } else {
        // Free-range sheep outside the corral cannot walk through the fence into the corral
        const minOutsideDist = this.pastureRadius + sheepRadius + 0.008;
        const dCenter = s.dir.distanceTo(this.pastureCenter);
        if (dCenter < minOutsideDist && dCenter > 1e-6) {
          const fromCenter = s.dir
            .clone()
            .sub(this.pastureCenter)
            .normalize();
          s.dir
            .copy(this.pastureCenter)
            .addScaledVector(fromCenter, minOutsideDist)
            .normalize();
          hitBoundary = true;
        }
      }

      // 2. Individual Fence Segment Capsule Colliders & Solid Buildings/Trees
      for (const obj of this.placedObjects) {
        if (obj.type === 'fence') {
          const { segA, segB } = this.getFenceSegmentOnSphere(obj);
          const closest = this.closestPointOnSphereSegment(s.dir, segA, segB);
          const minFenceDist = 0.015 + sheepRadius;
          const dist = s.dir.distanceTo(closest);
          if (dist < minFenceDist) {
            const pushDir =
              dist > 1e-6
                ? s.dir.clone().sub(closest).normalize()
                : this.pastureCenter.clone().sub(closest).normalize();
            s.dir
              .copy(closest)
              .addScaledVector(pushDir, minFenceDist + 0.001)
              .normalize();
            hitBoundary = true;
          }
          continue;
        }

        if (obj.type === 'rainbow') {
          const [footA, footB] = this.getRainbowFootDirs(obj.dir, obj.yaw);
          for (const footDir of [footA, footB]) {
            const minFootDist = 0.028 + sheepRadius;
            const dFoot = s.dir.distanceTo(footDir);
            if (dFoot < minFootDist) {
              const pushDir =
                dFoot > 1e-6
                  ? s.dir.clone().sub(footDir).normalize()
                  : new THREE.Vector3(1, 0, 0);
              s.dir
                .copy(footDir)
                .addScaledVector(pushDir, minFootDist + 0.001)
                .normalize();
              hitBoundary = true;
            }
          }
          continue;
        }

        const obsR = this.getObjectCollisionRadius(obj.type);
        if (obsR <= 0) continue;

        const minDist = obsR + sheepRadius;
        const dist = s.dir.distanceTo(obj.dir);
        if (dist < minDist) {
          const pushDir =
            dist > 1e-6
              ? s.dir.clone().sub(obj.dir).normalize()
              : new THREE.Vector3(1, 0, 0);
          s.dir
            .copy(obj.dir)
            .addScaledVector(pushDir, minDist + 0.001)
            .normalize();
          hitBoundary = true;
        }
      }

      // 3. Sheep-to-Sheep flock separation
      for (const other of this.sheepList) {
        if (other === s) continue;
        const minSep = 0.024;
        const d = s.dir.distanceTo(other.dir);
        if (d < minSep && d > 1e-6) {
          const push = s.dir.clone().sub(other.dir).normalize();
          s.dir.addScaledVector(push, (minSep - d) * 0.5).normalize();
        }
      }
    }

    // 4. Prevent sheep from entering water or steep mountain cliffs
    const surf = this.terrain.getSurfacePointAndNormal(s.dir);
    if (surf.isWater || surf.isMountain || surf.normal.dot(s.dir) < 0.75) {
      if (fallbackDir) {
        s.dir.copy(fallbackDir);
      }
      hitBoundary = true;
    }

    return hitBoundary;
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    const cleanup = (this as unknown as { _cleanup?: () => void })._cleanup;
    if (cleanup) cleanup();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
