import React, { useEffect, useRef } from 'react';
import { WorldState } from '../types/world';

interface LondonWeatherOverlayProps {
  worldState: WorldState;
}

interface RainParticle {
  x: number; // 0..1 normalized viewport X
  y: number; // 0..1 normalized viewport Y
  layer: 0 | 1 | 2; // 0 = distant mist-rain, 1 = mid-street drizzle, 2 = foreground slant
  speed: number;
  length: number;
  alpha: number;
}

interface LensDroplet {
  x: number; // 0..1 normalized X (weighted toward viewport periphery)
  y: number; // 0..1 normalized Y
  radius: number;
  life: number;
  maxLife: number;
  slideSpeed: number;
}

interface SnowFlake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftPhase: number;
  driftAmp: number;
  alpha: number;
}

interface FogBank {
  x: number; // -0.5..1.5 normalized center X
  y: number; // 0..1 normalized center Y
  rx: number; // horizontal radius fraction
  ry: number; // vertical radius fraction
  speedX: number;
  bobPhase: number;
  alpha: number;
  band: 'upper' | 'thames' | 'lower';
}

export const LondonWeatherOverlay: React.FC<LondonWeatherOverlayProps> = ({
  worldState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<WorldState>(worldState);

  // Keep latest worldState accessible inside the 60fps requestAnimationFrame loop without re-initializing particles
  useEffect(() => {
    stateRef.current = worldState;
  }, [worldState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // 1. Initialize Multi-Layer Subtle London Rain Streaks (145 particles across 3 parallax layers)
    const rainParticles: RainParticle[] = Array.from({ length: 145 }, (_, i) => {
      const layer = (i % 3) as 0 | 1 | 2;
      return {
        x: Math.random(),
        y: Math.random(),
        layer,
        speed:
          layer === 0
            ? 0.58 + Math.random() * 0.22
            : layer === 1
              ? 0.88 + Math.random() * 0.28
              : 1.25 + Math.random() * 0.35,
        length:
          layer === 0
            ? 14 + Math.random() * 8
            : layer === 1
              ? 24 + Math.random() * 12
              : 36 + Math.random() * 16,
        alpha:
          layer === 0
            ? 0.14 + Math.random() * 0.08
            : layer === 1
              ? 0.22 + Math.random() * 0.12
              : 0.30 + Math.random() * 0.14,
      };
    });

    // 2. Initialize Peripheral Lens Condensation Micro-Droplets (28 subtle droplets near frame edges)
    const makePeripheralCoord = (): { x: number; y: number } => {
      // Bias droplets toward outer 28% border of the viewport so center monument view stays crisp
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) return { x: Math.random(), y: Math.random() * 0.24 };
      if (edge === 1) return { x: Math.random(), y: 0.76 + Math.random() * 0.24 };
      if (edge === 2) return { x: Math.random() * 0.24, y: Math.random() };
      return { x: 0.76 + Math.random() * 0.24, y: Math.random() };
    };

    const droplets: LensDroplet[] = Array.from({ length: 28 }, () => {
      const pos = makePeripheralCoord();
      const maxLife = 3.5 + Math.random() * 4.5;
      return {
        x: pos.x,
        y: pos.y,
        radius: 1.6 + Math.random() * 2.8,
        life: Math.random() * maxLife,
        maxLife,
        slideSpeed: 0.004 + Math.random() * 0.008,
      };
    });

    // 3. Initialize Winter Snowflakes (95 soft drifting flakes)
    const snowFlakes: SnowFlake[] = Array.from({ length: 95 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 1.2 + Math.random() * 2.6,
      speedY: 0.055 + Math.random() * 0.085,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmp: 0.015 + Math.random() * 0.025,
      alpha: 0.28 + Math.random() * 0.45,
    }));

    // 4. Initialize Localized London Fog & Thames Mist Banks (14 rolling vapor banks)
    const fogBanks: FogBank[] = Array.from({ length: 14 }, (_, i) => {
      const band: FogBank['band'] =
        i < 4 ? 'upper' : i < 10 ? 'thames' : 'lower';
      const baseY =
        band === 'upper'
          ? 0.12 + Math.random() * 0.18
          : band === 'thames'
            ? 0.44 + Math.random() * 0.22
            : 0.78 + Math.random() * 0.18;
      return {
        x: (i / 14) * 1.4 - 0.2,
        y: baseY,
        rx: 0.26 + Math.random() * 0.22,
        ry: band === 'thames' ? 0.13 + Math.random() * 0.08 : 0.16 + Math.random() * 0.09,
        speedX: (0.014 + Math.random() * 0.018) * (i % 2 === 0 ? 1 : -0.75),
        bobPhase: Math.random() * Math.PI * 2,
        alpha: 0.16 + Math.random() * 0.14,
        band,
      };
    });

    // Smoothed internal overlay intensities so transitions are buttery even between React state ticks
    let smoothRain = stateRef.current.weatherOverlay.rainIntensity;
    let smoothFog = stateRef.current.weatherOverlay.fogIntensity;
    let smoothSnow = stateRef.current.weatherOverlay.snowIntensity;
    let smoothStorm = stateRef.current.weatherOverlay.stormIntensity;
    let lightningFlash = 0;
    let nextLightningCheck = 3.2;

    let lastTime = performance.now();
    let animId = 0;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now / 1000;

      const ws = stateRef.current;
      const targetOverlay = ws.weatherOverlay;

      // Determine raw targets from weatherMode so transitions start the exact millisecond weather changes
      const modeRainTarget =
        ws.weatherMode === 'storm'
          ? 1.0
          : ws.weatherMode === 'rain'
            ? 0.78
            : targetOverlay.rainIntensity;
      const modeFogTarget =
        ws.weatherMode === 'fog'
          ? 0.95
          : ws.weatherMode === 'rain'
            ? 0.36
            : ws.weatherMode === 'storm'
              ? 0.48
              : targetOverlay.fogIntensity;
      const modeSnowTarget =
        ws.weatherMode === 'snow' ? 0.92 : targetOverlay.snowIntensity;
      const modeStormTarget =
        ws.weatherMode === 'storm' ? 1.0 : targetOverlay.stormIntensity;

      smoothRain += (modeRainTarget - smoothRain) * Math.min(1, dt * 2.2);
      smoothFog += (modeFogTarget - smoothFog) * Math.min(1, dt * 1.8);
      smoothSnow += (modeSnowTarget - smoothSnow) * Math.min(1, dt * 2.2);
      smoothStorm += (modeStormTarget - smoothStorm) * Math.min(1, dt * 2.5);

      ctx.clearRect(0, 0, width, height);

      // Compute Time-of-Day atmospheric tint (Dawn/Dusk warm "Pea-Souper" amber vs Day silver vs Night slate-blue)
      const t = ws.timeOfDay; // 0.0 = 06:00, 0.25 = 12:00, 0.50 = 18:00, 0.75 = 00:00
      const orbitAngle = (t - 0.25) * Math.PI * 2;
      const sunAlt = Math.cos(orbitAngle);
      const isTwilight = Math.abs(sunAlt) < 0.38;
      const isNight = sunAlt < -0.1;

      // Localized street-view intensification when inspecting a building close-up
      const streetFocusBoost = ws.selectedBuilding ? 1.18 : 1.0;

      // =======================================================================
      // A. LOCALIZED LONDON FOG & THAMES MIST TRANSITIONS
      // =======================================================================
      if (smoothFog > 0.008) {
        const fogR = isTwilight ? 228 : isNight ? 148 : 216;
        const fogG = isTwilight ? 204 : isNight ? 164 : 214;
        const fogB = isTwilight ? 168 : isNight ? 192 : 204;

        // 1. Soft horizon & lower-embankment atmospheric wash
        const washGrad = ctx.createLinearGradient(0, 0, 0, height);
        const topAlpha = smoothFog * 0.22 * streetFocusBoost;
        const midAlpha = smoothFog * 0.08 * streetFocusBoost;
        const botAlpha = smoothFog * 0.28 * streetFocusBoost;
        washGrad.addColorStop(0, `rgba(${fogR}, ${fogG}, ${fogB}, ${topAlpha})`);
        washGrad.addColorStop(0.48, `rgba(${fogR}, ${fogG}, ${fogB}, ${midAlpha})`);
        washGrad.addColorStop(1, `rgba(${fogR}, ${fogG}, ${fogB}, ${botAlpha})`);
        ctx.fillStyle = washGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Drifting localized multi-layer Thames & street mist plumes
        for (const bank of fogBanks) {
          bank.x += bank.speedX * dt;
          if (bank.x > 1.35) bank.x = -0.35;
          if (bank.x < -0.35) bank.x = 1.35;

          const cx = bank.x * width;
          const cy =
            (bank.y + Math.sin(elapsed * 0.45 + bank.bobPhase) * 0.025) * height;
          const rx = bank.rx * width;
          const ry = bank.ry * height;

          const bankAlpha =
            bank.alpha *
            smoothFog *
            streetFocusBoost *
            (0.85 + Math.sin(elapsed * 0.7 + bank.bobPhase) * 0.15);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, ry / Math.max(1, rx));
          const radGrad = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
          radGrad.addColorStop(0, `rgba(${fogR}, ${fogG}, ${fogB}, ${bankAlpha})`);
          radGrad.addColorStop(
            0.55,
            `rgba(${fogR}, ${fogG}, ${fogB}, ${bankAlpha * 0.45})`,
          );
          radGrad.addColorStop(1, `rgba(${fogR}, ${fogG}, ${fogB}, 0)`);
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // =======================================================================
      // B. SUBTLE LONDON RAIN PARTICLES & PERIPHERAL LENS CONDENSATION
      // =======================================================================
      if (smoothRain > 0.008) {
        // Wind slant angle (stronger tilt during Atlantic squalls / storms)
        const windTiltX = (0.14 + smoothStorm * 0.16) * width;
        const speedBoost = 1.0 + smoothStorm * 0.42;

        const rainColorR = isNight ? 168 : isTwilight ? 235 : 205;
        const rainColorG = isNight ? 202 : isTwilight ? 222 : 228;
        const rainColorB = isNight ? 245 : isTwilight ? 210 : 250;

        ctx.lineCap = 'round';

        for (const p of rainParticles) {
          p.y += p.speed * speedBoost * dt;
          p.x += (windTiltX / Math.max(1, width)) * p.speed * dt * 0.28;

          if (p.y > 1.06) {
            p.y = -0.05;
            p.x = Math.random();
          }
          if (p.x > 1.05) p.x -= 1.1;
          if (p.x < -0.05) p.x += 1.1;

          const x1 = p.x * width;
          const y1 = p.y * height;
          const slantRatio = 0.15 + smoothStorm * 0.12;
          const dx = p.length * slantRatio;
          const dy = p.length;

          const streakAlpha =
            p.alpha * smoothRain * streetFocusBoost;

          const strokeGrad = ctx.createLinearGradient(x1, y1, x1 + dx, y1 + dy);
          strokeGrad.addColorStop(
            0,
            `rgba(${rainColorR}, ${rainColorG}, ${rainColorB}, 0)`,
          );
          strokeGrad.addColorStop(
            0.45,
            `rgba(${rainColorR}, ${rainColorG}, ${rainColorB}, ${streakAlpha * 0.7})`,
          );
          strokeGrad.addColorStop(
            1,
            `rgba(${rainColorR}, ${rainColorG}, ${rainColorB}, ${streakAlpha})`,
          );

          ctx.strokeStyle = strokeGrad;
          ctx.lineWidth = p.layer === 2 ? 1.35 : p.layer === 1 ? 1.0 : 0.75;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + dx, y1 + dy);
          ctx.stroke();
        }

        // Subtle peripheral lens micro-droplets with specular highlight
        for (const d of droplets) {
          d.life += dt;
          d.y += d.slideSpeed * smoothRain * dt;
          if (d.life >= d.maxLife || d.y > 1.02) {
            const nextPos = makePeripheralCoord();
            d.x = nextPos.x;
            d.y = nextPos.y;
            d.life = 0;
          }

          const lifeNorm = d.life / d.maxLife;
          const fade =
            lifeNorm < 0.2
              ? lifeNorm / 0.2
              : lifeNorm > 0.75
                ? (1 - lifeNorm) / 0.25
                : 1.0;
          const dropAlpha = fade * smoothRain * 0.34;
          if (dropAlpha <= 0.01) continue;

          const dx = d.x * width;
          const dy = d.y * height;

          // Soft water bead body
          ctx.fillStyle = `rgba(${rainColorR}, ${rainColorG}, ${rainColorB}, ${dropAlpha * 0.45})`;
          ctx.beginPath();
          ctx.ellipse(dx, dy, d.radius * 0.85, d.radius * 1.15, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tiny upper-left specular glint
          ctx.fillStyle = `rgba(255, 252, 240, ${dropAlpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(
            dx - d.radius * 0.28,
            dy - d.radius * 0.32,
            Math.max(0.6, d.radius * 0.28),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      // =======================================================================
      // C. HAMPSTEAD & ROYAL PARKS WINTER SNOW FLURRIES
      // =======================================================================
      if (smoothSnow > 0.008) {
        for (const f of snowFlakes) {
          f.y += f.speedY * dt;
          const sway =
            Math.sin(elapsed * 1.4 + f.driftPhase) * f.driftAmp * dt * 2.5;
          f.x += sway;

          if (f.y > 1.04) {
            f.y = -0.04;
            f.x = Math.random();
          }
          if (f.x > 1.04) f.x -= 1.08;
          if (f.x < -0.04) f.x += 1.08;

          const fx = f.x * width;
          const fy = f.y * height;
          const flakeAlpha = f.alpha * smoothSnow * streetFocusBoost;

          const flakeGrad = ctx.createRadialGradient(
            fx,
            fy,
            0,
            fx,
            fy,
            f.radius * 1.8,
          );
          flakeGrad.addColorStop(0, `rgba(255, 255, 255, ${flakeAlpha})`);
          flakeGrad.addColorStop(
            0.55,
            `rgba(232, 244, 255, ${flakeAlpha * 0.55})`,
          );
          flakeGrad.addColorStop(1, 'rgba(232, 244, 255, 0)');

          ctx.fillStyle = flakeGrad;
          ctx.beginPath();
          ctx.arc(fx, fy, f.radius * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // =======================================================================
      // D. ATLANTIC SQUALL HIGH-ALTITUDE SHEET LIGHTNING
      // =======================================================================
      if (smoothStorm > 0.25) {
        nextLightningCheck -= dt;
        if (nextLightningCheck <= 0) {
          nextLightningCheck = 4.5 + Math.random() * 6.5;
          lightningFlash = 0.22 + Math.random() * 0.16;
        }
      }
      if (lightningFlash > 0.004) {
        ctx.fillStyle = `rgba(225, 238, 255, ${lightningFlash})`;
        ctx.fillRect(0, 0, width, height);
        lightningFlash *= Math.exp(-dt * 7.5);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 w-full h-full"
    />
  );
};
