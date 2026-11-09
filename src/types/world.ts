export type ToolId =
  | 'bigben'
  | 'palace'
  | 'towerbridge'
  | 'londoneye'
  | 'stpauls'
  | 'shard'
  | 'watchtower'
  | 'house'
  | 'redbus'
  | 'blackcab'
  | 'lantern'
  | 'tree'
  | 'flower'
  | 'villager'
  | 'sailboat'
  | 'dock'
  | 'duck'
  | 'balloon'
  | 'cloud'
  | 'snowcloud'
  | 'fog'
  | 'rainbow'
  | 'shootingstar'
  | 'mountain'
  | 'lake'
  | 'raise'
  | 'lower'
  | 'remove';

export type ToolCategory =
  | 'all'
  | 'village'
  | 'water'
  | 'nature'
  | 'weather'
  | 'sculpt';

export type CameraViewId = 'orb' | 'street' | 'surface' | 'orbit' | 'village';

export type TimeMode = 'auto' | 'day' | 'twilight' | 'night';

export type WeatherMode = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';

export interface ToolDefinition {
  id: ToolId;
  label: string;
  shortLabel: string;
  category: Exclude<ToolCategory, 'all'>;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export interface BuildingInfo {
  id: string;
  title: string;
  borough: string;
  yearBuilt: string;
  style: string;
  architect: string;
  summary: string;
  history: string;
  highlights: string[];
}

export interface WeatherOverlayState {
  rainIntensity: number; // 0..1 smooth blend
  fogIntensity: number; // 0..1 smooth blend
  snowIntensity: number; // 0..1 smooth blend
  stormIntensity: number; // 0..1 smooth blend
  windSpeedKmh: number;
  temperatureC: number;
  localizedCondition: string; // e.g., "Thames Morning Mist", "West End Passing Drizzle"
  localizedFocusZone: string; // e.g., "Westminster & Embankment Reach" or selected building borough
  cyclePhaseLabel: string; // e.g., "Dawn Mist Window", "Midday Atlantic Front", "Dusk Thames Shower", "Nocturnal Fog Bank"
}

export interface WorldState {
  planetName: string;
  population: number;
  happiness: number;
  dayCount: number;
  monthIndex: number; // 0..11 (0 = January .. 11 = December)
  monthName: string; // e.g., "December"
  seasonName: 'Winter' | 'Spring' | 'Summer' | 'Autumn';
  yearCount: number;
  isDecemberFestive: boolean;
  activeTool: ToolId;
  activeView: CameraViewId;
  timeMode: TimeMode;
  timeOfDay: number; // 0..1 (0.0 = 06:00 Sunrise, 0.25 = 12:00 Noon, 0.50 = 18:00 Sunset, 0.75 = 00:00 Midnight)
  clockText: string; // e.g., "12:00 GMT"
  isDaytime: boolean; // true during exact 90s Daytime (06:00-18:00), false during exact 90s Nighttime (18:00-06:00)
  weatherMode: WeatherMode;
  weatherAuto: boolean;
  weatherOverlay: WeatherOverlayState;
  selectedBuilding: BuildingInfo | null;
  tourActive: boolean;
  tourElapsed: number;
  tourPhase: string;
  objectCounts: {
    houses: number;
    landmarks: number;
    buses: number;
    trees: number;
    villagers: number;
    clouds: number;
    flowers: number;
    boats: number;
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // 1. LONDON MONUMENTS, BUILDINGS & TRAFFIC
  {
    id: 'bigben',
    label: 'Big Ben & Parliament',
    shortLabel: 'Big Ben',
    category: 'village',
    description: 'Elizabeth Tower with synchronized 4-face GMT clock & Palace of Westminster',
    accentBg: 'bg-[#f5ebd6]',
    accentBorder: 'border-[#d4b475]',
    accentText: 'text-[#59431b]',
  },
  {
    id: 'palace',
    label: 'Buckingham Palace',
    shortLabel: 'Palace',
    category: 'village',
    description: 'Neoclassical royal residence, Victoria Memorial & scarlet-tunic Foot Guards',
    accentBg: 'bg-[#f7e4e1]',
    accentBorder: 'border-[#d99b91]',
    accentText: 'text-[#63241c]',
  },
  {
    id: 'towerbridge',
    label: 'Tower Bridge',
    shortLabel: 'Bridge',
    category: 'water',
    description: 'Twin Victorian Gothic towers with turquoise suspension chains & bascules',
    accentBg: 'bg-[#dff0f5]',
    accentBorder: 'border-[#8cc3d4]',
    accentText: 'text-[#1d4e5e]',
  },
  {
    id: 'londoneye',
    label: 'The London Eye',
    shortLabel: 'London Eye',
    category: 'village',
    description: 'Rotating South Bank observation wheel with 12 glass passenger capsules',
    accentBg: 'bg-[#e6edf7]',
    accentBorder: 'border-[#9ab4db]',
    accentText: 'text-[#223c63]',
  },
  {
    id: 'stpauls',
    label: "St. Paul's Cathedral",
    shortLabel: "St. Paul's",
    category: 'village',
    description: 'Sir Christopher Wren Baroque cathedral with colonnaded dome & golden cross',
    accentBg: 'bg-[#f2ece1]',
    accentBorder: 'border-[#c7b89d]',
    accentText: 'text-[#4a3f2d]',
  },
  {
    id: 'shard',
    label: 'The Shard & Gherkin',
    shortLabel: 'Skyscraper',
    category: 'village',
    description: 'Alternates between The Shard glass pyramid and 30 St Mary Axe (The Gherkin)',
    accentBg: 'bg-[#e1f0f7]',
    accentBorder: 'border-[#8ec2db]',
    accentText: 'text-[#1c495e]',
  },
  {
    id: 'watchtower',
    label: 'Tower of London',
    shortLabel: 'White Tower',
    category: 'village',
    description: 'Norman medieval White Tower fortress with four corner turrets & royal banner',
    accentBg: 'bg-[#ebe6de]',
    accentBorder: 'border-[#bfb5a6]',
    accentText: 'text-[#423b32]',
  },
  {
    id: 'house',
    label: 'London Townhouse',
    shortLabel: 'Townhouse',
    category: 'village',
    description: 'Belgravia, Kensington & Notting Hill terraced townhouse (adds 2 Londoners)',
    accentBg: 'bg-[#f7e8d0]',
    accentBorder: 'border-[#dfb885]',
    accentText: 'text-[#573a18]',
  },
  {
    id: 'redbus',
    label: 'Red Double-Decker Bus',
    shortLabel: 'Red Bus',
    category: 'village',
    description: 'Iconic scarlet Routemaster bus driving continuously along London roads',
    accentBg: 'bg-[#fce0de]',
    accentBorder: 'border-[#e68a83]',
    accentText: 'text-[#6e1c17]',
  },
  {
    id: 'blackcab',
    label: 'Black London Taxi Cab',
    shortLabel: 'Black Cab',
    category: 'village',
    description: 'Classic Hackney Carriage black cab with glowing amber TAXI sign on roads',
    accentBg: 'bg-[#e8e8ec]',
    accentBorder: 'border-[#a8a8b5]',
    accentText: 'text-[#282833]',
  },
  {
    id: 'lantern',
    label: 'Red Phone Box & Gas Lamp',
    shortLabel: 'Phone Box',
    category: 'village',
    description: 'K6 scarlet telephone kiosk paired with a Victorian cast-iron gas streetlamp',
    accentBg: 'bg-[#faebd4]',
    accentBorder: 'border-[#deb678]',
    accentText: 'text-[#593c14]',
  },

  // 2. RIVER THAMES & BRIDGES
  {
    id: 'sailboat',
    label: 'Thames River Clipper',
    shortLabel: 'Clipper',
    category: 'water',
    description: 'Riverboat cruising along the meandering River Thames channel',
    accentBg: 'bg-[#dcf2f0]',
    accentBorder: 'border-[#8cd4cd]',
    accentText: 'text-[#1f544f]',
  },
  {
    id: 'dock',
    label: 'Thames Bridge / Pier',
    shortLabel: 'Pier',
    category: 'water',
    description: 'Spans an arched bridge on the Thames or builds an embankment pier',
    accentBg: 'bg-[#ede4d8]',
    accentBorder: 'border-[#c7b297]',
    accentText: 'text-[#4f3d27]',
  },
  {
    id: 'duck',
    label: 'Royal Thames Swans',
    shortLabel: 'Swans',
    category: 'water',
    description: "Mute swans gliding with expanding water ripples along the Thames",
    accentBg: 'bg-[#e8f4f2]',
    accentBorder: 'border-[#9dd1c9]',
    accentText: 'text-[#224f49]',
  },

  // 3. ROYAL PARKS & LONDONERS
  {
    id: 'tree',
    label: 'Royal Park Trees',
    shortLabel: 'Park Tree',
    category: 'nature',
    description: "Plants London plane trees, Hyde Park oaks, and Hampstead Heath pines",
    accentBg: 'bg-[#dff0d8]',
    accentBorder: 'border-[#9bc98a]',
    accentText: 'text-[#274d1b]',
  },
  {
    id: 'flower',
    label: 'Kew Gardens Rose Bed',
    shortLabel: 'Roses',
    category: 'nature',
    description: 'Blooming English garden rose beds for Hyde Park, St. James & Regent’s Park',
    accentBg: 'bg-[#fae0eb]',
    accentBorder: 'border-[#e09ab8]',
    accentText: 'text-[#61223d]',
  },
  {
    id: 'villager',
    label: 'Londoner / Foot Guard',
    shortLabel: 'Londoner',
    category: 'nature',
    description: 'Spawns a London pedestrian strolling along the Yorkstone sidewalks & crossings',
    accentBg: 'bg-[#fae6d4]',
    accentBorder: 'border-[#deb087]',
    accentText: 'text-[#593516]',
  },
  {
    id: 'balloon',
    label: 'Royal Regatta Balloon',
    shortLabel: 'Balloon',
    category: 'weather',
    description: 'Drifting hot air balloon floating above the London skyline',
    accentBg: 'bg-[#fce3ec]',
    accentBorder: 'border-[#e69eb8]',
    accentText: 'text-[#63243b]',
  },

  // 4. UNIVERSAL LONDON WEATHER & SKY
  {
    id: 'cloud',
    label: 'Universal London Rain',
    shortLabel: 'Rain',
    category: 'weather',
    description: 'Blankets all of London in classic British rain & spawns a rain cloud',
    accentBg: 'bg-[#e1edf7]',
    accentBorder: 'border-[#96bde0]',
    accentText: 'text-[#214463]',
  },
  {
    id: 'fog',
    label: 'London Pea-Souper Fog',
    shortLabel: 'Fog',
    category: 'weather',
    description: 'Wraps the entire London globe in atmospheric amber-grey Thames mist',
    accentBg: 'bg-[#ebe8df]',
    accentBorder: 'border-[#bfb8a4]',
    accentText: 'text-[#474234]',
  },
  {
    id: 'snowcloud',
    label: 'Universal Winter Snow',
    shortLabel: 'Snow',
    category: 'weather',
    description: 'Blankets all of London in crisp winter snowfall & frosty rooftops',
    accentBg: 'bg-[#e8f2fa]',
    accentBorder: 'border-[#a0c6e8]',
    accentText: 'text-[#224769]',
  },
  {
    id: 'rainbow',
    label: 'Clear Sky & Thames Rainbow',
    shortLabel: 'Rainbow',
    category: 'weather',
    description: 'Clears London weather to sunshine and arches a rainbow over the Thames',
    accentBg: 'bg-[#fcf0d9]',
    accentBorder: 'border-[#e3c281]',
    accentText: 'text-[#594114]',
  },
  {
    id: 'shootingstar',
    label: 'Night Shooting Star',
    shortLabel: 'Star',
    category: 'weather',
    description: 'Launches a glowing meteor across the London night sky',
    accentBg: 'bg-[#f7efd4]',
    accentBorder: 'border-[#dec678]',
    accentText: 'text-[#574511]',
  },

  // 5. SCULPT & CLEAR
  {
    id: 'mountain',
    label: 'Raise Hampstead Hill',
    shortLabel: 'Hill',
    category: 'sculpt',
    description: 'Raises a green London hill or Primrose Hill overlook',
    accentBg: 'bg-[#e8e4dc]',
    accentBorder: 'border-[#bdb5a6]',
    accentText: 'text-[#423d33]',
  },
  {
    id: 'lake',
    label: 'Carve Thames Channel',
    shortLabel: 'Channel',
    category: 'sculpt',
    description: 'Carves a River Thames canal or Serpentine park lake',
    accentBg: 'bg-[#d9f0f2]',
    accentBorder: 'border-[#88ccd1]',
    accentText: 'text-[#1d5054]',
  },
  {
    id: 'raise',
    label: 'Raise Embankment',
    shortLabel: 'Raise',
    category: 'sculpt',
    description: 'Gently elevates terrain facets into a level Yorkstone terrace',
    accentBg: 'bg-[#e4f0dc]',
    accentBorder: 'border-[#a2c78d]',
    accentText: 'text-[#2c4a1d]',
  },
  {
    id: 'lower',
    label: 'Lower Terrain',
    shortLabel: 'Lower',
    category: 'sculpt',
    description: 'Gently lowers terrain facets toward river level',
    accentBg: 'bg-[#e0ecf2]',
    accentBorder: 'border-[#96bccf]',
    accentText: 'text-[#234354]',
  },
  {
    id: 'remove',
    label: 'Clear Landmark / Item',
    shortLabel: 'Clear',
    category: 'sculpt',
    description: 'Removes the nearest placed landmark, building, or vehicle',
    accentBg: 'bg-[#fae1e1]',
    accentBorder: 'border-[#e09696]',
    accentText: 'text-[#612020]',
  },
];
