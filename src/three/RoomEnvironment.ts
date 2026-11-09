import * as THREE from 'three';

export interface RoomEnvironmentHandles {
  group: THREE.Group;
  skyMaterial: THREE.ShaderMaterial;
  updateTimeOfDay: (
    dayFactor: number,
    twilightFactor: number,
    nightFactor: number,
    elapsedTime: number,
    rainFactor?: number,
    snowFactor?: number,
    fogFactor?: number,
  ) => void;
}

export function createRoomEnvironment(
  _envMap: THREE.Texture,
): RoomEnvironmentHandles {
  const group = new THREE.Group();

  // ---------------------------------------------------------------------------
  // LONDON SKY BACKDROP (Standalone Globe in Open Sky: Day -> Twilight -> Night)
  // ---------------------------------------------------------------------------
  const skyGeo = new THREE.SphereGeometry(28, 48, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uDayFactor: { value: 1.0 },
      uTwilightFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uRainFactor: { value: 0.0 },
      uSnowFactor: { value: 0.0 },
      uFogFactor: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      uniform float uDayFactor;
      uniform float uTwilightFactor;
      uniform float uNightFactor;
      uniform float uRainFactor;
      uniform float uSnowFactor;
      uniform float uFogFactor;
      uniform float uTime;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

        // Crisp London Daylight Sky
        vec3 dayBottom = vec3(0.84, 0.88, 0.94);
        vec3 dayMid    = vec3(0.62, 0.74, 0.90);
        vec3 dayTop    = vec3(0.38, 0.54, 0.78);
        vec3 dayCol = mix(dayBottom, dayMid, smoothstep(0.0, 0.48, h));
        dayCol = mix(dayCol, dayTop, smoothstep(0.48, 1.0, h));

        // Blue Twilight Sky over the Thames
        vec3 twiBottom = vec3(0.58, 0.44, 0.62);
        vec3 twiMid    = vec3(0.22, 0.30, 0.52);
        vec3 twiTop    = vec3(0.10, 0.14, 0.28);
        vec3 twiCol = mix(twiBottom, twiMid, smoothstep(0.0, 0.45, h));
        twiCol = mix(twiCol, twiTop, smoothstep(0.45, 1.0, h));

        // Deep London Night Sky
        vec3 nightBottom = vec3(0.09, 0.11, 0.22);
        vec3 nightMid    = vec3(0.05, 0.07, 0.15);
        vec3 nightTop    = vec3(0.02, 0.03, 0.08);
        vec3 nightCol = mix(nightBottom, nightMid, smoothstep(0.0, 0.45, h));
        nightCol = mix(nightCol, nightTop, smoothstep(0.45, 1.0, h));

        vec3 sky = dayCol * uDayFactor + twiCol * uTwilightFactor + nightCol * uNightFactor;

        // Universal Weather Sky Tints (Rain, Snow, London Pea-Souper Fog)
        float lightLevel = uDayFactor + uTwilightFactor * 0.55 + 0.2;
        vec3 rainSky = mix(vec3(0.32, 0.37, 0.45), vec3(0.20, 0.24, 0.32), h) * lightLevel;
        vec3 snowSky = mix(vec3(0.72, 0.77, 0.85), vec3(0.48, 0.55, 0.66), h) * lightLevel;
        vec3 fogSky  = mix(vec3(0.68, 0.64, 0.56), vec3(0.48, 0.46, 0.43), h) * lightLevel;

        sky = mix(sky, rainSky, clamp(uRainFactor * 0.78, 0.0, 1.0));
        sky = mix(sky, snowSky, clamp(uSnowFactor * 0.72, 0.0, 1.0));
        sky = mix(sky, fogSky,  clamp(uFogFactor * 0.84, 0.0, 1.0));

        // Twinkling stars across the night sky
        float overcast = clamp(uRainFactor + uSnowFactor + uFogFactor, 0.0, 1.0);
        float starVisibility = clamp((uNightFactor + uTwilightFactor * 0.4) * (1.0 - overcast * 0.85), 0.0, 1.0);
        if (starVisibility > 0.01) {
          vec2 grid = floor(vUv * vec2(260.0, 130.0));
          float n = hash(grid);
          if (n > 0.991) {
            float twinkle = 0.6 + 0.4 * sin(uTime * 2.5 + n * 80.0);
            sky += vec3(0.92, 0.95, 1.0) * twinkle * starVisibility;
          }
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
  group.add(skyMesh);

  const updateTimeOfDay = (
    dayFactor: number,
    twilightFactor: number,
    nightFactor: number,
    elapsedTime: number,
    rainFactor = 0.0,
    snowFactor = 0.0,
    fogFactor = 0.0,
  ) => {
    skyMaterial.uniforms.uDayFactor.value = dayFactor;
    skyMaterial.uniforms.uTwilightFactor.value = twilightFactor;
    skyMaterial.uniforms.uNightFactor.value = nightFactor;
    skyMaterial.uniforms.uRainFactor.value = rainFactor;
    skyMaterial.uniforms.uSnowFactor.value = snowFactor;
    skyMaterial.uniforms.uFogFactor.value = fogFactor;
    skyMaterial.uniforms.uTime.value = elapsedTime;
  };

  return {
    group,
    skyMaterial,
    updateTimeOfDay,
  };
}
