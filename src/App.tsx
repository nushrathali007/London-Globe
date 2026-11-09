import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Compass,
  Landmark,
  MapPin,
  Moon,
  Sparkles,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import { LondonWeatherOverlay } from './components/LondonWeatherOverlay';
import { PocketWorldController } from './three/PocketWorldScene';
import { WeatherMode, WorldState } from './types/world';

const WEATHER_PRESETS: { mode: WeatherMode; label: string }[] = [
  { mode: 'fog', label: 'Mist' },
  { mode: 'rain', label: 'Drizzle' },
  { mode: 'clear', label: 'Clear' },
  { mode: 'snow', label: 'Flurry' },
  { mode: 'storm', label: 'Squall' },
];

function renderWeatherIcon(mode: WeatherMode, isDaytime: boolean) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  switch (mode) {
    case 'fog':
      return <CloudFog className={`${cls} text-[#b45309]`} />;
    case 'rain':
      return <CloudRain className={`${cls} text-[#2563eb]`} />;
    case 'storm':
      return <CloudLightning className={`${cls} text-[#4f46e5]`} />;
    case 'snow':
      return <CloudSnow className={`${cls} text-[#0284c7]`} />;
    case 'clear':
    default:
      return isDaytime ? (
        <Sun className={`${cls} text-[#d97706]`} />
      ) : (
        <Moon className={`${cls} text-[#3b82f6]`} />
      );
  }
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PocketWorldController | null>(null);

  const [worldState, setWorldState] = useState<WorldState>({
    planetName: 'Mini London',
    population: 36,
    happiness: 98,
    dayCount: 1,
    monthIndex: 11,
    monthName: 'December',
    seasonName: 'Winter',
    yearCount: 1,
    isDecemberFestive: true,
    activeTool: 'bigben',
    activeView: 'orb',
    timeMode: 'auto',
    timeOfDay: 0.25,
    clockText: '12:00 GMT',
    isDaytime: true,
    weatherMode: 'snow',
    weatherAuto: true,
    weatherOverlay: {
      rainIntensity: 0,
      fogIntensity: 0,
      snowIntensity: 0.85,
      stormIntensity: 0,
      windSpeedKmh: 15,
      temperatureC: 1,
      localizedCondition: 'December Christmas Snowfall & Fairy Lights',
      localizedFocusZone: 'Regent Street, Trafalgar Square & Hyde Park',
      cyclePhaseLabel: 'December Festive Snow',
    },
    tourActive: false,
    tourElapsed: 0,
    tourPhase: '',
    selectedBuilding: null,
    objectCounts: {
      houses: 44,
      landmarks: 21,
      buses: 24,
      trees: 44,
      villagers: 36,
      clouds: 5,
      flowers: 12,
      boats: 6,
    },
  });

  useEffect(() => {
    if (!mountRef.current) return;
    const ctrl = new PocketWorldController(mountRef.current, setWorldState);
    controllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, []);

  const selected = worldState.selectedBuilding;
  const { weatherOverlay } = worldState;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Full-Viewport 3D Standalone London Globe Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Localized London Weather Overlay System (Subtle Rain Streaks, Lens Droplets & Thames Fog Transitions) */}
      <LondonWeatherOverlay worldState={worldState} />

      {/* Top-Left Time Tracker, Yearly Calendar & Localized London Weather Telemetry */}
      <div className="pointer-events-none fixed top-5 left-5 z-20 flex flex-col gap-2 max-w-[405px]">
        <div className="pointer-events-auto flex flex-col gap-2.5 px-4 py-3 rounded-2xl bg-[#f5efe6]/90 backdrop-blur-md border border-[#d6cbb9] shadow-[0_12px_32px_rgba(18,16,24,0.28)] text-[#2c251e]">
          {/* Row 1: GMT Clock, Calm Daily + Yearly Calendar & Temperature / Wind */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  worldState.isDaytime
                    ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                    : 'bg-[#1e293b] text-[#93c5fd] border border-[#334155]'
                }`}
              >
                {worldState.isDaytime ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-['JetBrains_Mono',monospace] text-sm font-semibold tabular-nums tracking-tight text-[#231d18]">
                    {worldState.clockText}
                  </span>
                  <span className="text-[#9c8d7c]">·</span>
                  <span className="text-[11px] font-medium text-[#5c4f42] whitespace-nowrap">
                    {worldState.isDaytime ? 'Daytime (90s)' : 'Nighttime (90s)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#6e6256] tabular-nums">
                  <Clock className="w-3 h-3 text-[#8c7d6e] shrink-0" />
                  <span>
                    {worldState.monthName} · {worldState.seasonName} (Yr {worldState.yearCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end text-right font-['JetBrains_Mono',monospace] tabular-nums shrink-0">
              <span className="text-xs font-semibold text-[#231d18]">
                {weatherOverlay.temperatureC}°C
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#6e6256]">
                <Wind className="w-2.5 h-2.5 text-[#8c7d6e]" />
                {weatherOverlay.windSpeedKmh} km/h
              </span>
            </div>
          </div>

          {/* Row 2: Yearly Calendar Month Stepper & Festive December Christmas Badge */}
          <div className="pt-2 border-t border-[#ded3c1] flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => controllerRef.current?.stepMonth(-1)}
                className="w-5 h-5 rounded-md bg-[#e8dfd1]/85 hover:bg-[#dcd0be] text-[#3d342b] flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Month in Yearly Cycle"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => controllerRef.current?.setMonthIndex(11)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  worldState.isDecemberFestive
                    ? 'bg-[#9e2a2b] text-[#fff8eb]'
                    : 'bg-[#e8dfd1]/85 hover:bg-[#dcd0be] text-[#4a3f35]'
                }`}
                title="Jump to December Festive Christmas Lights & Annual Snowfall"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>
                  {worldState.isDecemberFestive
                    ? 'December · Christmas Lights Active'
                    : `${worldState.monthName} (${worldState.seasonName})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => controllerRef.current?.stepMonth(1)}
                className="w-5 h-5 rounded-md bg-[#e8dfd1]/85 hover:bg-[#dcd0be] text-[#3d342b] flex items-center justify-center transition-colors cursor-pointer"
                title="Next Month in Yearly Cycle"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <span className="text-[10px] text-[#6e6256] truncate">
              {weatherOverlay.cyclePhaseLabel}
            </span>
          </div>

          {/* Row 3: Localized London Weather Condition & Active Micro-Climate Sector */}
          <div className="pt-2 border-t border-[#ded3c1] flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-[#231d18] truncate">
                {renderWeatherIcon(worldState.weatherMode, worldState.isDaytime)}
                <span className="truncate">{weatherOverlay.localizedCondition}</span>
              </div>
              <span className="text-[10px] text-[#6e6256] truncate">
                {weatherOverlay.localizedFocusZone}
              </span>
            </div>

            {/* Single-line interactive Auto Cycle / Weather Override selector */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => controllerRef.current?.setWeatherAuto(true)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  worldState.weatherAuto
                    ? 'bg-[#2c251e] text-[#f7f2e9]'
                    : 'bg-[#e8dfd1]/80 hover:bg-[#dcd0be] text-[#52463b]'
                }`}
                title="Automatically trigger seasonal London weather by time of day and yearly calendar"
              >
                Auto Cycle
              </button>

              {WEATHER_PRESETS.map((preset) => {
                const isActive =
                  !worldState.weatherAuto && worldState.weatherMode === preset.mode;
                return (
                  <button
                    key={preset.mode}
                    type="button"
                    onClick={() =>
                      controllerRef.current?.setWeatherMode(preset.mode, true)
                    }
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#8c6d46] text-[#fffaf2]'
                        : 'bg-[#e8dfd1]/70 hover:bg-[#dcd0be] text-[#52463b]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subtle interaction prompt when no building is selected */}
        {!selected && (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#1e1b26]/70 backdrop-blur-md border border-white/10 text-[#f5efe6]/85 text-[11px] flex items-center gap-2 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-[#eab949] shrink-0" />
            <span>
              Click any London building for front view & history · Drag to spin globe
            </span>
          </div>
        )}
      </div>

      {/* Floating Square Building Information Card (Shown when a building is clicked) */}
      {selected && (
        <div className="pointer-events-none fixed inset-y-0 right-6 z-30 flex items-center justify-end p-4">
          <div
            key={selected.id}
            className="pointer-events-auto w-[390px] sm:w-[415px] max-h-[86vh] aspect-square flex flex-col justify-between rounded-2xl bg-[#f7f2e9]/95 backdrop-blur-xl border border-[#d6c8b4] shadow-[0_24px_60px_rgba(12,10,18,0.45)] text-[#2c251e] p-6 overflow-hidden transition-all duration-300"
          >
            {/* Top Header: Borough Location & Close Button */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-[#5c4f42] text-xs font-medium tracking-wide truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#9e3b24] shrink-0" />
                  <span className="truncate">{selected.borough}</span>
                  <span className="text-[#a89987]">·</span>
                  <span className="text-[11px] text-[#7a6c5d] truncate">
                    {weatherOverlay.localizedCondition}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => controllerRef.current?.clearSelectedBuilding()}
                  className="w-7 h-7 rounded-lg bg-[#e8dfd1]/80 hover:bg-[#dcd0be] text-[#4a3f35] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Return to full globe view (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Building Title */}
              <h2 className="font-['Fraunces',serif] text-xl sm:text-[22px] font-semibold leading-snug text-[#1f1914]">
                {selected.title}
              </h2>

              {/* Metadata Grid: Year Built, Style & Architect */}
              <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#ede5d8]/90 border border-[#ded3c1] text-[11px]">
                <div className="flex items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8c6d46] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7a6c5d]">
                      Built / Era
                    </div>
                    <div className="font-semibold text-[#2c251e]">
                      {selected.yearBuilt} · {selected.style}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#8c6d46] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7a6c5d]">
                      Architect
                    </div>
                    <div className="font-semibold text-[#2c251e]">
                      {selected.architect}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Historical Narrative & Highlights */}
            <div className="my-3 flex-1 overflow-y-auto pr-1 space-y-2.5 text-xs leading-relaxed text-[#3d342b]">
              <p className="font-medium text-[#29221c]">{selected.summary}</p>
              <p className="text-[#52463b]">{selected.history}</p>

              {selected.highlights.length > 0 && (
                <div className="pt-1.5 border-t border-[#dfd5c5]">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7a6c5d] mb-1.5">
                    <Sparkles className="w-3 h-3 text-[#b45309]" />
                    <span>Architectural & Historical Details</span>
                  </div>
                  <ul className="space-y-1">
                    {selected.highlights.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] text-[#453a30]"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#9e3b24] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Navigation along Connected London Roads */}
            <div className="pt-2.5 border-t border-[#dfd5c5] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => controllerRef.current?.selectNextBuilding(-1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#e8dfd1] hover:bg-[#dcd0be] text-[#2c251e] text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => controllerRef.current?.selectNextBuilding(1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#e8dfd1] hover:bg-[#dcd0be] text-[#2c251e] text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <span>Next Place</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => controllerRef.current?.clearSelectedBuilding()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2c251e] hover:bg-[#3f352b] text-[#f7f2e9] text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Landmark className="w-3.5 h-3.5 text-[#eab949]" />
                <span>Full Globe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
