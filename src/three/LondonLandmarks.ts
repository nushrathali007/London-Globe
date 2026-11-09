import * as THREE from 'three';

/**
 * 1. BIG BEN (ELIZABETH TOWER) & PALACE OF WESTMINSTER
 */
export function createBigBenMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  hourHands: THREE.Object3D[];
  minuteHands: THREE.Object3D[];
  flagMesh?: THREE.Mesh;
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];
  const hourHands: THREE.Object3D[] = [];
  const minuteHands: THREE.Object3D[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#e8d09c',
    roughness: 0.78,
    flatShading: true,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: '#c4a974',
    roughness: 0.84,
    flatShading: true,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#8f897e',
    roughness: 0.88,
    flatShading: true,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: '#36414f',
    roughness: 0.62,
    metalness: 0.15,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ecc054',
    metalness: 0.72,
    roughness: 0.26,
  });
  const clockHandMat = new THREE.MeshStandardMaterial({
    color: '#1e242b',
    roughness: 0.4,
    metalness: 0.5,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c7',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });
  const clockDialMat = new THREE.MeshStandardMaterial({
    color: '#fffdf5',
    emissive: new THREE.Color('#ffe28a'),
    emissiveIntensity: 0.45,
    roughness: 0.18,
  });
  windowMaterials.push(winMat, clockDialMat);

  // Embankment Stone Terrace Foundation
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(0.088, 0.016, 0.056),
    plinthMat,
  );
  terrace.position.set(-0.012, 0.006, 0);
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  group.add(terrace);

  // -------------------------------------------------------------------------
  // A. ELIZABETH TOWER (BIG BEN) on the right (+X = 0.016)
  // -------------------------------------------------------------------------
  const towerX = 0.016;
  const towerGroup = new THREE.Group();
  towerGroup.position.set(towerX, 0, 0);

  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.024, 0.032),
    darkStoneMat,
  );
  towerBase.position.y = 0.022;
  towerBase.castShadow = true;
  towerGroup.add(towerBase);

  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.027, 0.078, 0.027),
    stoneMat,
  );
  shaft.position.y = 0.068;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  towerGroup.add(shaft);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(0.0045, 0.098, 0.0045),
        darkStoneMat,
      );
      buttress.position.set(sx * 0.0135, 0.061, sz * 0.0135);
      buttress.castShadow = true;
      towerGroup.add(buttress);

      const pinnacle = new THREE.Mesh(
        new THREE.ConeGeometry(0.0028, 0.011, 4),
        goldMat,
      );
      pinnacle.position.set(sx * 0.0155, 0.138, sz * 0.0155);
      pinnacle.rotation.y = Math.PI / 4;
      towerGroup.add(pinnacle);
    }
  }

  for (const sy of [0.048, 0.072, 0.096]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.0305, 0.0032, 0.0305),
      sy === 0.096 ? goldMat : darkStoneMat,
    );
    band.position.y = sy;
    towerGroup.add(band);
  }

  for (const sy of [0.038, 0.06, 0.084]) {
    for (const side of [-1, 1]) {
      const slitZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.012, 0.0282),
        winMat,
      );
      slitZ.position.set(side * 0.004, sy, 0);
      towerGroup.add(slitZ);
    }
  }

  const clockStage = new THREE.Mesh(
    new THREE.BoxGeometry(0.033, 0.028, 0.033),
    stoneMat,
  );
  clockStage.position.y = 0.118;
  clockStage.castShadow = true;
  towerGroup.add(clockStage);

  const clockFrameBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.0345, 0.0035, 0.0345),
    goldMat,
  );
  clockFrameBorder.position.y = 0.132;
  towerGroup.add(clockFrameBorder);

  for (let face = 0; face < 4; face++) {
    const dialPivot = new THREE.Group();
    dialPivot.position.y = 0.118;
    dialPivot.rotation.y = (face * Math.PI) / 2;

    const goldSquare = new THREE.Mesh(
      new THREE.BoxGeometry(0.023, 0.023, 0.0018),
      goldMat,
    );
    goldSquare.position.z = 0.0166;
    dialPivot.add(goldSquare);

    const dialDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0096, 0.0096, 0.0022, 18),
      clockDialMat,
    );
    dialDisk.rotation.x = Math.PI / 2;
    dialDisk.position.z = 0.017;
    dialPivot.add(dialDisk);

    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.0098, 0.0011, 6, 18),
      goldMat,
    );
    bezel.position.z = 0.018;
    dialPivot.add(bezel);

    const minutePivot = new THREE.Group();
    minutePivot.position.set(0, 0, 0.0186);
    const minuteHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.0011, 0.0076, 0.001),
      clockHandMat,
    );
    minuteHand.position.y = 0.0034;
    minutePivot.add(minuteHand);
    dialPivot.add(minutePivot);
    minuteHands.push(minutePivot);

    const hourPivot = new THREE.Group();
    hourPivot.position.set(0, 0, 0.0188);
    const hourHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.0015, 0.0052, 0.001),
      goldMat,
    );
    hourHand.position.y = 0.0022;
    hourPivot.add(hourHand);
    dialPivot.add(hourPivot);
    hourHands.push(hourPivot);

    towerGroup.add(dialPivot);
  }

  const belfry = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.015, 0.025),
    darkStoneMat,
  );
  belfry.position.y = 0.139;
  towerGroup.add(belfry);

  const belfryGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.008, 0.026),
    winMat,
  );
  belfryGlow.position.y = 0.139;
  towerGroup.add(belfryGlow);

  const lowerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.024, 4),
    slateRoofMat,
  );
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.position.y = 0.156;
  lowerRoof.castShadow = true;
  towerGroup.add(lowerRoof);

  const lanternStage = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.009, 0.012),
    goldMat,
  );
  lanternStage.position.y = 0.168;
  towerGroup.add(lanternStage);

  const upperSpire = new THREE.Mesh(
    new THREE.ConeGeometry(0.011, 0.026, 4),
    slateRoofMat,
  );
  upperSpire.rotation.y = Math.PI / 4;
  upperSpire.position.y = 0.184;
  upperSpire.castShadow = true;
  towerGroup.add(upperSpire);

  const spireFinial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0005, 0.0015, 0.014, 6),
    goldMat,
  );
  spireFinial.position.y = 0.201;
  towerGroup.add(spireFinial);

  group.add(towerGroup);

  // -------------------------------------------------------------------------
  // B. ADJOINING PALACE OF WESTMINSTER / HOUSES OF PARLIAMENT WING (-X)
  // -------------------------------------------------------------------------
  const wingGroup = new THREE.Group();
  wingGroup.position.set(-0.022, 0, 0);

  const hallBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.044, 0.036),
    stoneMat,
  );
  hallBody.position.y = 0.034;
  hallBody.castShadow = true;
  hallBody.receiveShadow = true;
  wingGroup.add(hallBody);

  const hallRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.052, 3),
    slateRoofMat,
  );
  hallRoof.rotation.z = Math.PI / 2;
  hallRoof.scale.set(0.65, 1.0, 1.0);
  hallRoof.position.y = 0.062;
  hallRoof.castShadow = true;
  wingGroup.add(hallRoof);

  const roofCrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.003, 0.0025),
    goldMat,
  );
  roofCrest.position.y = 0.069;
  wingGroup.add(roofCrest);

  for (let b = -2; b <= 2; b++) {
    const bx = b * 0.011;
    for (const sz of [-1, 1]) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.0028, 0.048, 0.004),
        darkStoneMat,
      );
      rib.position.set(bx, 0.036, sz * 0.0185);
      wingGroup.add(rib);

      const pin = new THREE.Mesh(
        new THREE.ConeGeometry(0.002, 0.008, 4),
        goldMat,
      );
      pin.rotation.y = Math.PI / 4;
      pin.position.set(bx, 0.063, sz * 0.0185);
      wingGroup.add(pin);

      if (b < 2) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.0055, 0.022, 0.002),
          winMat,
        );
        win.position.set(bx + 0.0055, 0.036, sz * 0.0182);
        wingGroup.add(win);
      }
    }
  }

  const octSpireBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.012, 0.062, 8),
    darkStoneMat,
  );
  octSpireBase.position.set(-0.026, 0.043, 0);
  octSpireBase.castShadow = true;
  wingGroup.add(octSpireBase);

  const octSpireCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.0115, 0.024, 8),
    slateRoofMat,
  );
  octSpireCone.position.set(-0.026, 0.085, 0);
  wingGroup.add(octSpireCone);

  group.add(wingGroup);

  return { group, windowMaterials, hourHands, minuteHands };
}

/**
 * 2. BUCKINGHAM PALACE
 */
export function createBuckinghamPalaceMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  flagMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const portlandStoneMat = new THREE.MeshStandardMaterial({
    color: '#f4eee1',
    roughness: 0.72,
    flatShading: true,
  });
  const warmAshlarMat = new THREE.MeshStandardMaterial({
    color: '#dfd5c3',
    roughness: 0.78,
    flatShading: true,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#aba294',
    roughness: 0.85,
    flatShading: true,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: '#465263',
    roughness: 0.65,
    flatShading: true,
  });
  const royalCrimsonMat = new THREE.MeshStandardMaterial({
    color: '#bd1e2c',
    roughness: 0.55,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#edc053',
    metalness: 0.75,
    roughness: 0.25,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: '#1f2329',
    metalness: 0.55,
    roughness: 0.4,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.28,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  const forecourt = new THREE.Mesh(
    new THREE.BoxGeometry(0.112, 0.014, 0.082),
    plinthMat,
  );
  forecourt.position.set(0, 0.005, 0.006);
  forecourt.castShadow = true;
  forecourt.receiveShadow = true;
  group.add(forecourt);

  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.098, 0.052, 0.044),
    portlandStoneMat,
  );
  mainBlock.position.set(0, 0.036, -0.008);
  mainBlock.castShadow = true;
  mainBlock.receiveShadow = true;
  group.add(mainBlock);

  const rusticatedBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.101, 0.016, 0.047),
    warmAshlarMat,
  );
  rusticatedBase.position.set(0, 0.018, -0.008);
  group.add(rusticatedBase);

  for (const side of [-1, 1]) {
    const px = side * 0.038;
    const pavilion = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.056, 0.05),
      portlandStoneMat,
    );
    pavilion.position.set(px, 0.038, -0.006);
    pavilion.castShadow = true;
    pavilion.receiveShadow = true;
    group.add(pavilion);

    for (const cx of [-0.008, 0.008]) {
      const pilaster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0024, 0.034, 8),
        warmAshlarMat,
      );
      pilaster.position.set(px + cx, 0.043, 0.0195);
      group.add(pilaster);
    }

    const sidePediment = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.01, 4),
      warmAshlarMat,
    );
    sidePediment.rotation.y = Math.PI / 4;
    sidePediment.scale.set(1.15, 1.0, 0.45);
    sidePediment.position.set(px, 0.07, 0.016);
    group.add(sidePediment);
  }

  const centerPavilion = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.058, 0.051),
    portlandStoneMat,
  );
  centerPavilion.position.set(0, 0.039, -0.005);
  centerPavilion.castShadow = true;
  group.add(centerPavilion);

  for (const cx of [-0.012, -0.004, 0.004, 0.012]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0025, 0.035, 10),
      warmAshlarMat,
    );
    col.position.set(cx, 0.044, 0.0215);
    col.castShadow = true;
    group.add(col);
  }

  const centerPediment = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.013, 4),
    portlandStoneMat,
  );
  centerPediment.rotation.y = Math.PI / 4;
  centerPediment.scale.set(1.15, 1.0, 0.45);
  centerPediment.position.set(0, 0.073, 0.018);
  group.add(centerPediment);

  const royalCrest = new THREE.Mesh(
    new THREE.SphereGeometry(0.0038, 8, 8),
    goldMat,
  );
  royalCrest.scale.set(1.3, 0.9, 0.5);
  royalCrest.position.set(0, 0.071, 0.0235);
  group.add(royalCrest);

  const balconySlab = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.0035, 0.008),
    warmAshlarMat,
  );
  balconySlab.position.set(0, 0.036, 0.023);
  group.add(balconySlab);

  const crimsonDrape = new THREE.Mesh(
    new THREE.BoxGeometry(0.019, 0.0065, 0.0085),
    royalCrimsonMat,
  );
  crimsonDrape.position.set(0, 0.0395, 0.0235);
  group.add(crimsonDrape);

  const goldFringe = new THREE.Mesh(
    new THREE.BoxGeometry(0.0195, 0.0016, 0.0088),
    goldMat,
  );
  goldFringe.position.set(0, 0.0428, 0.0236);
  group.add(goldFringe);

  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(0.102, 0.0045, 0.049),
    warmAshlarMat,
  );
  cornice.position.set(0, 0.064, -0.007);
  group.add(cornice);

  const mansardRoof = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.011, 0.038),
    slateRoofMat,
  );
  mansardRoof.position.set(0, 0.071, -0.008);
  mansardRoof.castShadow = true;
  group.add(mansardRoof);

  for (const dx of [-0.007, 0, 0.007]) {
    const archDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.0048, 0.012, 0.003),
      ironMat,
    );
    archDoor.position.set(dx, 0.018, 0.0205);
    group.add(archDoor);
  }

  const winXPositions = [-0.041, -0.034, -0.024, -0.017, -0.008, 0, 0.008, 0.017, 0.024, 0.034, 0.041];
  for (const wx of winXPositions) {
    const isPavilion = Math.abs(wx) > 0.03 || Math.abs(wx) < 0.012;
    const wz = isPavilion ? 0.0205 : 0.0145;
    for (const wy of [0.031, 0.048]) {
      if (Math.abs(wx) < 0.012 && wy < 0.04) continue;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.0046, 0.0095, 0.002),
        winMat,
      );
      win.position.set(wx, wy, wz);
      group.add(win);
    }
  }

  for (const side of [-1, 1]) {
    const railBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.013, 0.002),
      ironMat,
    );
    railBar.position.set(side * 0.031, 0.017, 0.042);
    group.add(railBar);

    const goldTopRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.002, 0.0024),
      goldMat,
    );
    goldTopRail.position.set(side * 0.031, 0.024, 0.042);
    group.add(goldTopRail);

    for (const px of [side * 0.011, side * 0.05]) {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(0.0055, 0.019, 0.0055),
        portlandStoneMat,
      );
      pier.position.set(px, 0.02, 0.042);
      pier.castShadow = true;
      group.add(pier);

      const crownOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.0026, 8, 8),
        goldMat,
      );
      crownOrb.position.set(px, 0.031, 0.042);
      group.add(crownOrb);
    }

    const sentryX = side * 0.02;
    const sentryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.0068, 0.016, 0.0062),
      ironMat,
    );
    sentryBox.position.set(sentryX, 0.019, 0.033);
    sentryBox.castShadow = true;
    group.add(sentryBox);

    const sentryRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.0055, 0.005, 4),
      ironMat,
    );
    sentryRoof.rotation.y = Math.PI / 4;
    sentryRoof.position.set(sentryX, 0.0295, 0.033);
    group.add(sentryRoof);

    const guardGroup = new THREE.Group();
    guardGroup.position.set(sentryX, 0.012, 0.0385);
    guardGroup.scale.setScalar(0.72);

    const legs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0014, 0.0014, 0.005, 6),
      ironMat,
    );
    legs.position.y = 0.0025;
    guardGroup.add(legs);

    const scarletTunic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.002, 0.0055, 8),
      royalCrimsonMat,
    );
    scarletTunic.position.y = 0.0072;
    guardGroup.add(scarletTunic);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.0016, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#f7d2b5', roughness: 0.65 }),
    );
    head.position.y = 0.011;
    guardGroup.add(head);

    const bearskin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0019, 0.0036, 4, 8),
      new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.95 }),
    );
    bearskin.position.y = 0.0145;
    guardGroup.add(bearskin);

    group.add(guardGroup);
  }

  const flagpole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.001, 0.028, 6),
    goldMat,
  );
  flagpole.position.set(0, 0.088, -0.004);
  group.add(flagpole);

  const flagMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.009, 0.0012),
    goldMat,
  );
  flagMesh.position.set(0.008, 0.097, -0.004);
  group.add(flagMesh);

  const memorialGroup = new THREE.Group();
  memorialGroup.position.set(0, 0.006, 0.052);

  const memBasin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.005, 14),
    portlandStoneMat,
  );
  memBasin.position.y = 0.0025;
  memBasin.receiveShadow = true;
  memorialGroup.add(memBasin);

  const memPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0044, 0.0058, 0.017, 10),
    portlandStoneMat,
  );
  memPillar.position.y = 0.0115;
  memPillar.castShadow = true;
  memorialGroup.add(memPillar);

  const wingedVictory = new THREE.Mesh(
    new THREE.ConeGeometry(0.003, 0.008, 6),
    goldMat,
  );
  wingedVictory.position.y = 0.0235;
  memorialGroup.add(wingedVictory);

  const victoryWings = new THREE.Mesh(
    new THREE.BoxGeometry(0.007, 0.002, 0.0012),
    goldMat,
  );
  victoryWings.position.y = 0.024;
  memorialGroup.add(victoryWings);

  group.add(memorialGroup);

  return { group, windowMaterials, flagMesh };
}

/**
 * 3. TOWER BRIDGE (With Open Arch Portal & Unobstructed Roadway for Live Traffic)
 */
export function createTowerBridgeMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#ddd3c2',
    roughness: 0.78,
    flatShading: true,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    color: '#918d86',
    roughness: 0.88,
    flatShading: true,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: '#3c4c5e',
    roughness: 0.65,
    flatShading: true,
  });
  const bridgeBlueMat = new THREE.MeshStandardMaterial({
    color: '#34a1c4',
    roughness: 0.45,
    metalness: 0.25,
  });
  const bridgeWhiteMat = new THREE.MeshStandardMaterial({
    color: '#f2f6fa',
    roughness: 0.5,
    metalness: 0.15,
  });
  const roadMat = new THREE.MeshStandardMaterial({
    color: '#32363e',
    roughness: 0.85,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ebc155',
    metalness: 0.75,
    roughness: 0.26,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c4',
    emissive: new THREE.Color('#ffba42'),
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  // Two Twin Neo-Gothic Bridge Towers at z = -0.028 and z = +0.028
  // Built with open roadway portals (left & right stone piers + upper lintel) so buses & cabs drive cleanly through!
  for (const side of [-1, 1]) {
    const tz = side * 0.028;
    const towerGroup = new THREE.Group();
    towerGroup.position.set(0, 0, tz);

    const pier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.022, 0.022, 8),
      graniteMat,
    );
    pier.scale.set(1.4, 1.0, 0.78);
    pier.position.y = 0.008;
    pier.castShadow = true;
    pier.receiveShadow = true;
    towerGroup.add(pier);

    // Left & Right Portal Columns flanking the roadway so vehicles pass through the arch
    for (const sx of [-1, 1]) {
      const portalLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.0068, 0.032, 0.02),
        stoneMat,
      );
      portalLeg.position.set(sx * 0.0115, 0.034, 0);
      portalLeg.castShadow = true;
      towerGroup.add(portalLeg);
    }

    // Upper Tower Shaft above the roadway portal arch (y = 0.048..0.088)
    const upperShaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.042, 0.02),
      stoneMat,
    );
    upperShaft.position.y = 0.068;
    upperShaft.castShadow = true;
    upperShaft.receiveShadow = true;
    towerGroup.add(upperShaft);

    // 4 Corner Octagonal Turrets & Conical Slate Spires
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0038, 0.004, 0.074, 8),
          stoneMat,
        );
        turret.position.set(sx * 0.0135, 0.057, sz * 0.0095);
        turret.castShadow = true;
        towerGroup.add(turret);

        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.0046, 0.018, 8),
          slateMat,
        );
        spire.position.set(sx * 0.0135, 0.102, sz * 0.0095);
        spire.castShadow = true;
        towerGroup.add(spire);

        const finial = new THREE.Mesh(
          new THREE.SphereGeometry(0.0014, 6, 6),
          goldMat,
        );
        finial.position.set(sx * 0.0135, 0.112, sz * 0.0095);
        towerGroup.add(finial);
      }
    }

    const centralRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.022, 4),
      slateMat,
    );
    centralRoof.rotation.y = Math.PI / 4;
    centralRoof.scale.set(1.15, 1.0, 0.85);
    centralRoof.position.y = 0.098;
    towerGroup.add(centralRoof);

    for (const wy of [0.058, 0.074]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.029, 0.007, 0.008),
        winMat,
      );
      win.position.y = wy;
      towerGroup.add(win);
    }

    group.add(towerGroup);
  }

  // Twin High-Level Horizontal Walkways connecting the two towers
  for (const wx of [-0.0095, 0.0095]) {
    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(0.0042, 0.0065, 0.056),
      bridgeWhiteMat,
    );
    walkway.position.set(wx, 0.078, 0);
    walkway.castShadow = true;
    group.add(walkway);

    const walkwayTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.0048, 0.002, 0.056),
      bridgeBlueMat,
    );
    walkwayTrim.position.set(wx, 0.0745, 0);
    group.add(walkwayTrim);
  }

  // Continuous Bascule & Approach Roadway Deck + Turquoise Parapet Railings
  const roadDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.0035, 0.132),
    roadMat,
  );
  roadDeck.position.y = 0.02;
  roadDeck.castShadow = true;
  roadDeck.receiveShadow = true;
  group.add(roadDeck);

  for (const rx of [-0.0115, 0.0115]) {
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(0.0022, 0.0045, 0.132),
      bridgeBlueMat,
    );
    parapet.position.set(rx, 0.0235, 0);
    group.add(parapet);
  }

  // Shoreward Side Buttress Piers & Sweeping Suspension Chains
  for (const side of [-1, 1]) {
    for (const sx of [-0.0115, 0.0115]) {
      const abutmentPier = new THREE.Mesh(
        new THREE.BoxGeometry(0.0055, 0.03, 0.012),
        graniteMat,
      );
      abutmentPier.position.set(sx, 0.015, side * 0.062);
      abutmentPier.castShadow = true;
      group.add(abutmentPier);

      const startVec = new THREE.Vector3(sx, 0.076, side * 0.034);
      const midVec = new THREE.Vector3(sx, 0.042, side * 0.049);
      const endVec = new THREE.Vector3(sx, 0.028, side * 0.062);
      const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
      const chainGeo = new THREE.TubeGeometry(curve, 12, 0.0018, 6, false);
      const chainMesh = new THREE.Mesh(chainGeo, bridgeBlueMat);
      chainMesh.castShadow = true;
      group.add(chainMesh);

      const upperCurve = new THREE.QuadraticBezierCurve3(
        startVec.clone().add(new THREE.Vector3(0, 0.0022, 0)),
        midVec.clone().add(new THREE.Vector3(0, 0.0022, 0)),
        endVec.clone().add(new THREE.Vector3(0, 0.0022, 0)),
      );
      const whiteChord = new THREE.Mesh(
        new THREE.TubeGeometry(upperCurve, 12, 0.0011, 6, false),
        bridgeWhiteMat,
      );
      group.add(whiteChord);

      for (let r = 1; r <= 3; r++) {
        const t = r / 4;
        const pt = curve.getPoint(t);
        const rodH = pt.y - 0.022;
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0006, 0.0006, rodH, 5),
          bridgeWhiteMat,
        );
        rod.position.set(sx, 0.022 + rodH * 0.5, pt.z);
        group.add(rod);
      }
    }
  }

  return { group, windowMaterials };
}

/**
 * 4. THE LONDON EYE
 */
export function createLondonEyeMesh(): {
  group: THREE.Group;
  rotor: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#9e988e',
    roughness: 0.86,
    flatShading: true,
  });
  const whiteSteelMat = new THREE.MeshStandardMaterial({
    color: '#f2f6fa',
    roughness: 0.35,
    metalness: 0.35,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: '#b0bac4',
    roughness: 0.4,
    metalness: 0.6,
  });
  const redAccentMat = new THREE.MeshStandardMaterial({
    color: '#d9383a',
    roughness: 0.5,
  });

  const capsuleGlowMat = new THREE.MeshStandardMaterial({
    color: '#e3f6ff',
    emissive: new THREE.Color('#70d6ff'),
    emissiveIntensity: 0.4,
    roughness: 0.15,
    metalness: 0.1,
  });
  windowMaterials.push(capsuleGlowMat);

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.042, 0.016, 12),
    stoneMat,
  );
  plaza.position.y = 0.006;
  plaza.castShadow = true;
  plaza.receiveShadow = true;
  group.add(plaza);

  const boardingStep = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.006, 0.018),
    stoneMat,
  );
  boardingStep.position.set(0, 0.015, 0.014);
  group.add(boardingStep);

  for (const bx of [-0.015, 0.015]) {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.002, 0.007, 6),
      redAccentMat,
    );
    bollard.position.set(bx, 0.019, 0.021);
    group.add(bollard);
  }

  const hubY = 0.096;
  const hubZ = 0.014;
  for (const sx of [-1, 1]) {
    const legStart = new THREE.Vector3(sx * 0.024, 0.01, -0.012);
    const legEnd = new THREE.Vector3(0, hubY, hubZ - 0.004);
    const legVec = legEnd.clone().sub(legStart);
    const legLen = legVec.length();

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0032, legLen, 8),
      whiteSteelMat,
    );
    leg.position.copy(legStart).addScaledVector(legVec, 0.5);
    leg.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      legVec.clone().normalize(),
    );
    leg.castShadow = true;
    group.add(leg);
  }

  for (const sx of [-0.01, 0.01]) {
    const cStart = new THREE.Vector3(sx, 0.012, -0.032);
    const cEnd = new THREE.Vector3(0, hubY, hubZ - 0.006);
    const cVec = cEnd.clone().sub(cStart);
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0007, 0.0007, cVec.length(), 5),
      cableMat,
    );
    cable.position.copy(cStart).addScaledVector(cVec, 0.5);
    cable.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      cVec.clone().normalize(),
    );
    group.add(cable);
  }

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0052, 0.026, 12),
    whiteSteelMat,
  );
  spindle.rotation.x = Math.PI / 2;
  spindle.position.set(0, hubY, hubZ + 0.002);
  group.add(spindle);

  const rotor = new THREE.Group();
  rotor.position.set(0, hubY, hubZ + 0.011);

  const wheelRadius = 0.068;

  const outerRim = new THREE.Mesh(
    new THREE.TorusGeometry(wheelRadius, 0.0024, 8, 36),
    whiteSteelMat,
  );
  outerRim.castShadow = true;
  rotor.add(outerRim);

  const innerRim = new THREE.Mesh(
    new THREE.TorusGeometry(wheelRadius * 0.86, 0.0016, 6, 36),
    whiteSteelMat,
  );
  rotor.add(innerRim);

  const hubCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.0065, 10, 10),
    capsuleGlowMat,
  );
  rotor.add(hubCap);

  const capsuleCount = 12;
  for (let i = 0; i < capsuleCount; i++) {
    const angle = (i / capsuleCount) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0006, 0.0006, wheelRadius, 5),
      cableMat,
    );
    spoke.position.set(cosA * wheelRadius * 0.5, sinA * wheelRadius * 0.5, 0);
    spoke.rotation.z = angle - Math.PI / 2;
    rotor.add(spoke);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.0016, wheelRadius * 0.14, 0.003),
      whiteSteelMat,
    );
    tie.position.set(cosA * wheelRadius * 0.93, sinA * wheelRadius * 0.93, 0);
    tie.rotation.z = angle - Math.PI / 2;
    rotor.add(tie);

    const capX = cosA * (wheelRadius + 0.0052);
    const capY = sinA * (wheelRadius + 0.0052);

    const capsuleGroup = new THREE.Group();
    capsuleGroup.position.set(capX, capY, 0.002);

    const pod = new THREE.Mesh(
      new THREE.SphereGeometry(0.0046, 10, 8),
      capsuleGlowMat,
    );
    pod.scale.set(1.35, 0.88, 0.95);
    pod.castShadow = true;
    capsuleGroup.add(pod);

    const podRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.0044, 0.0008, 5, 10),
      whiteSteelMat,
    );
    podRing.rotation.y = Math.PI / 2;
    capsuleGroup.add(podRing);

    rotor.add(capsuleGroup);
  }

  group.add(rotor);
  return { group, rotor, windowMaterials };
}

/**
 * 5. ST. PAUL'S CATHEDRAL
 */
export function createStPaulsCathedralMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const portlandMat = new THREE.MeshStandardMaterial({
    color: '#efe7d8',
    roughness: 0.75,
    flatShading: true,
  });
  const stoneShadeMat = new THREE.MeshStandardMaterial({
    color: '#d4cab8',
    roughness: 0.82,
    flatShading: true,
  });
  const leadDomeMat = new THREE.MeshStandardMaterial({
    color: '#4c5969',
    roughness: 0.58,
    metalness: 0.22,
    flatShading: true,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#f0c451',
    metalness: 0.78,
    roughness: 0.24,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff3c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, 0.016, 0.088),
    stoneShadeMat,
  );
  plinth.position.y = 0.006;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const nave = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.038, 0.076),
    portlandMat,
  );
  nave.position.y = 0.031;
  nave.castShadow = true;
  nave.receiveShadow = true;
  group.add(nave);

  const naveRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.076, 3),
    leadDomeMat,
  );
  naveRoof.rotation.x = Math.PI / 2;
  naveRoof.rotation.z = Math.PI;
  naveRoof.scale.set(1.0, 1.0, 0.45);
  naveRoof.position.y = 0.054;
  group.add(naveRoof);

  const transept = new THREE.Mesh(
    new THREE.BoxGeometry(0.064, 0.038, 0.032),
    portlandMat,
  );
  transept.position.set(0, 0.031, -0.004);
  transept.castShadow = true;
  group.add(transept);

  const porticoPediment = new THREE.Mesh(
    new THREE.ConeGeometry(0.021, 0.012, 4),
    stoneShadeMat,
  );
  porticoPediment.rotation.y = Math.PI / 4;
  porticoPediment.scale.set(1.1, 1.0, 0.4);
  porticoPediment.position.set(0, 0.055, 0.038);
  group.add(porticoPediment);

  for (const cx of [-0.009, -0.003, 0.003, 0.009]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.002, 0.032, 8),
      stoneShadeMat,
    );
    col.position.set(cx, 0.03, 0.039);
    group.add(col);
  }

  for (const sx of [-1, 1]) {
    const tx = sx * 0.019;
    const tz = 0.034;
    const bellTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.062, 0.013),
      portlandMat,
    );
    bellTower.position.set(tx, 0.043, tz);
    bellTower.castShadow = true;
    group.add(bellTower);

    const belfryStage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0062, 0.016, 8),
      stoneShadeMat,
    );
    belfryStage.position.set(tx, 0.08, tz);
    group.add(belfryStage);

    const spireCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.0058, 0.016, 8),
      leadDomeMat,
    );
    spireCap.position.set(tx, 0.095, tz);
    group.add(spireCap);

    const pineappleFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.002, 6, 6),
      goldMat,
    );
    pineappleFinial.position.set(tx, 0.104, tz);
    group.add(pineappleFinial);
  }

  const drumZ = -0.004;
  const lowerDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.025, 0.028, 16),
    portlandMat,
  );
  lowerDrum.position.set(0, 0.06, drumZ);
  lowerDrum.castShadow = true;
  group.add(lowerDrum);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pCol = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0016, 0.0018, 0.022, 6),
      stoneShadeMat,
    );
    pCol.position.set(Math.cos(a) * 0.0245, 0.061, drumZ + Math.sin(a) * 0.0245);
    group.add(pCol);
  }

  const upperDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.023, 0.014, 16),
    stoneShadeMat,
  );
  upperDrum.position.set(0, 0.079, drumZ);
  group.add(upperDrum);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.0215, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    leadDomeMat,
  );
  dome.position.set(0, 0.084, drumZ);
  dome.castShadow = true;
  group.add(dome);

  const goldenGallery = new THREE.Mesh(
    new THREE.TorusGeometry(0.0068, 0.0014, 6, 14),
    goldMat,
  );
  goldenGallery.rotation.x = Math.PI / 2;
  goldenGallery.position.set(0, 0.105, drumZ);
  group.add(goldenGallery);

  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0042, 0.0052, 0.015, 8),
    portlandMat,
  );
  lantern.position.set(0, 0.112, drumZ);
  group.add(lantern);

  const goldenOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.0032, 8, 8),
    goldMat,
  );
  goldenOrb.position.set(0, 0.122, drumZ);
  group.add(goldenOrb);

  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.0014, 0.009, 0.0014),
    goldMat,
  );
  crossV.position.set(0, 0.127, drumZ);
  group.add(crossV);

  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.0055, 0.0014, 0.0014),
    goldMat,
  );
  crossH.position.set(0, 0.128, drumZ);
  group.add(crossH);

  for (const wz of [-0.024, -0.01, 0.008, 0.022]) {
    const winRow = new THREE.Mesh(
      new THREE.BoxGeometry(0.0372, 0.013, 0.005),
      winMat,
    );
    winRow.position.set(0, 0.032, wz);
    group.add(winRow);
  }

  return { group, windowMaterials };
}

/**
 * 6. THE SHARD & THE GHERKIN
 */
export function createShardOrGherkinMesh(variantIdx: number): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#899099',
    roughness: 0.82,
    flatShading: true,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff6d1',
    emissive: new THREE.Color('#ffca57'),
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });
  windowMaterials.push(winMat);

  if (variantIdx % 2 === 0) {
    const shardGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#a3d3f2',
      roughness: 0.16,
      metalness: 0.25,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      flatShading: true,
    });
    const shardLightGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#ccebff',
      roughness: 0.14,
      metalness: 0.3,
      clearcoat: 0.9,
      flatShading: true,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.034, 0.016, 8),
      plinthMat,
    );
    base.position.y = 0.006;
    base.castShadow = true;
    group.add(base);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0045, 0.025, 0.168, 8),
      shardGlassMat,
    );
    core.position.y = 0.094;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    const shardHeights = [0.188, 0.178, 0.184, 0.174];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const h = shardHeights[i];
      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.015, h, 4),
        i % 2 === 0 ? shardLightGlassMat : shardGlassMat,
      );
      blade.position.set(Math.cos(a) * 0.0035, h * 0.5 + 0.008, Math.sin(a) * 0.0035);
      blade.rotation.y = a;
      blade.castShadow = true;
      group.add(blade);
    }

    for (let f = 0; f < 7; f++) {
      const fy = 0.028 + f * 0.021;
      const t = f / 7;
      const r = THREE.MathUtils.lerp(0.022, 0.0065, t);
      const floorBand = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.96, r, 0.0038, 8),
        winMat,
      );
      floorBand.position.y = fy;
      group.add(floorBand);
    }
  } else {
    const gherkinGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#2c597a',
      roughness: 0.2,
      metalness: 0.35,
      clearcoat: 0.8,
      flatShading: true,
    });
    const steelDiagridMat = new THREE.MeshStandardMaterial({
      color: '#e1ebf5',
      roughness: 0.32,
      metalness: 0.5,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.03, 0.016, 12),
      plinthMat,
    );
    base.position.y = 0.006;
    base.castShadow = true;
    group.add(base);

    const profilePoints: THREE.Vector2[] = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = 0.012 + t * 0.132;
      const radius =
        t < 0.92
          ? Math.sin(Math.pow(t, 0.68) * Math.PI * 0.86) * 0.024 + (1 - t) * 0.006
          : Math.cos(((t - 0.92) / 0.08) * (Math.PI * 0.5)) * 0.0085;
      profilePoints.push(new THREE.Vector2(Math.max(0.0001, radius), y));
    }
    const gherkinGeo = new THREE.LatheGeometry(profilePoints, 16);
    const gherkinBody = new THREE.Mesh(gherkinGeo, gherkinGlassMat);
    gherkinBody.castShadow = true;
    gherkinBody.receiveShadow = true;
    group.add(gherkinBody);

    for (let ring = 1; ring <= 6; ring++) {
      const t = ring / 7;
      const ry = 0.012 + t * 0.132;
      const rad =
        Math.sin(Math.pow(t, 0.68) * Math.PI * 0.86) * 0.024 + (1 - t) * 0.006;

      const diagridRing = new THREE.Mesh(
        new THREE.TorusGeometry(rad * 1.01, 0.0011, 6, 16),
        steelDiagridMat,
      );
      diagridRing.rotation.x = Math.PI / 2;
      diagridRing.position.y = ry;
      group.add(diagridRing);

      if (ring % 2 === 1) {
        const glowBand = new THREE.Mesh(
          new THREE.CylinderGeometry(rad * 0.99, rad * 0.99, 0.004, 16),
          winMat,
        );
        glowBand.position.y = ry + 0.005;
        group.add(glowBand);
      }
    }

    const apexLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.0075, 12, 8),
      winMat,
    );
    apexLens.position.y = 0.139;
    group.add(apexLens);
  }

  return { group, windowMaterials };
}

/**
 * 7. ICONIC RED LONDON ROUTEMASTER DOUBLE-DECKER BUS
 */
export function createRedDoubleDeckerBusMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const redPaintMat = new THREE.MeshStandardMaterial({
    color: '#d62424',
    roughness: 0.42,
    metalness: 0.12,
  });
  const creamBandMat = new THREE.MeshStandardMaterial({
    color: '#fcf6e6',
    roughness: 0.6,
  });
  const darkTireMat = new THREE.MeshStandardMaterial({
    color: '#1c1e22',
    roughness: 0.85,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: '#dce2e8',
    metalness: 0.7,
    roughness: 0.25,
  });

  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff5c8',
    emissive: new THREE.Color('#ffba3b'),
    emissiveIntensity: 0.4,
    roughness: 0.18,
  });
  windowMaterials.push(winMat);

  const busBody = new THREE.Group();
  busBody.position.y = 0;

  const lowerDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.013, 0.042),
    redPaintMat,
  );
  lowerDeck.position.set(0, 0.011, -0.002);
  lowerDeck.castShadow = true;
  busBody.add(lowerDeck);

  const creamStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.0186, 0.0022, 0.0425),
    creamBandMat,
  );
  creamStripe.position.set(0, 0.0178, -0.002);
  busBody.add(creamStripe);

  const upperDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.0178, 0.013, 0.045),
    redPaintMat,
  );
  upperDeck.position.set(0, 0.025, 0.0);
  upperDeck.castShadow = true;
  busBody.add(upperDeck);

  const roofCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0088, 0.0088, 0.044, 10),
    redPaintMat,
  );
  roofCap.rotation.x = Math.PI / 2;
  roofCap.scale.set(1.0, 0.38, 1.0);
  roofCap.position.set(0, 0.0315, 0.0);
  busBody.add(roofCap);

  const bonnet = new THREE.Mesh(
    new THREE.BoxGeometry(0.0085, 0.0095, 0.008),
    redPaintMat,
  );
  bonnet.position.set(-0.004, 0.009, 0.022);
  busBody.add(bonnet);

  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.007, 0.0015),
    silverMat,
  );
  grille.position.set(-0.004, 0.009, 0.0262);
  busBody.add(grille);

  const rearPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(0.017, 0.002, 0.006),
    darkTireMat,
  );
  rearPlatform.position.set(0, 0.0055, -0.0215);
  busBody.add(rearPlatform);

  const brassPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0006, 0.0006, 0.013, 6),
    new THREE.MeshStandardMaterial({ color: '#e5bc57', metalness: 0.7, roughness: 0.25 }),
  );
  brassPole.position.set(0.0075, 0.012, -0.023);
  busBody.add(brassPole);

  for (const wy of [0.0125, 0.025]) {
    for (let w = 0; w < 4; w++) {
      const wz = -0.015 + w * 0.0095;
      const winPane = new THREE.Mesh(
        new THREE.BoxGeometry(0.0188, 0.0058, 0.0068),
        winMat,
      );
      winPane.position.set(0, wy, wz);
      busBody.add(winPane);
    }
  }

  const upperFrontWin = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.0055, 0.002),
    winMat,
  );
  upperFrontWin.position.set(0, 0.0255, 0.0222);
  busBody.add(upperFrontWin);

  const routeBlind = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.0026, 0.0022),
    winMat,
  );
  routeBlind.position.set(0, 0.0195, 0.0224);
  busBody.add(routeBlind);

  for (const side of [-1, 1]) {
    for (const wz of [-0.013, 0.014]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0046, 0.0046, 0.0032, 12),
        darkTireMat,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.0092, 0.0046, wz);
      busBody.add(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, 0.0036, 8),
        silverMat,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(side * 0.0092, 0.0046, wz);
      busBody.add(hub);
    }

    const headlamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.0016, 6, 6),
      winMat,
    );
    headlamp.position.set(side * 0.0065, 0.0075, 0.0255);
    busBody.add(headlamp);
  }

  group.add(busBody);
  return { group, windowMaterials };
}

/**
 * 8. ICONIC LONDON BLACK CAB (HACKNEY CARRIAGE TAXI)
 */
export function createBlackCabMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const blackPaintMat = new THREE.MeshStandardMaterial({
    color: '#181a1f',
    roughness: 0.26,
    metalness: 0.35,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#121316',
    roughness: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#dde3eb',
    metalness: 0.78,
    roughness: 0.2,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c8',
    emissive: new THREE.Color('#ffba3b'),
    emissiveIntensity: 0.38,
    roughness: 0.16,
  });
  const taxiSignMat = new THREE.MeshStandardMaterial({
    color: '#ffe066',
    emissive: new THREE.Color('#ffaa00'),
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: '#ff3b30',
    emissive: new THREE.Color('#ff2211'),
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  windowMaterials.push(winMat, taxiSignMat, tailLightMat);

  const cabBody = new THREE.Group();
  cabBody.position.y = 0;

  const lowerChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.0155, 0.0068, 0.031),
    blackPaintMat,
  );
  lowerChassis.position.set(0, 0.0058, 0);
  lowerChassis.castShadow = true;
  cabBody.add(lowerChassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.0138, 0.0072, 0.0185),
    blackPaintMat,
  );
  cabin.position.set(0, 0.0122, -0.0025);
  cabin.castShadow = true;
  cabBody.add(cabin);

  const sideWin = new THREE.Mesh(
    new THREE.BoxGeometry(0.0144, 0.0044, 0.014),
    winMat,
  );
  sideWin.position.set(0, 0.0124, -0.0022);
  cabBody.add(sideWin);

  const windscreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.0045, 0.0192),
    winMat,
  );
  windscreen.position.set(0, 0.0122, -0.0025);
  cabBody.add(windscreen);

  const taxiSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.0062, 0.0022, 0.0024),
    taxiSignMat,
  );
  taxiSign.position.set(0, 0.0168, 0.0045);
  cabBody.add(taxiSign);

  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(0.0058, 0.0054, 0.0014),
    chromeMat,
  );
  grille.position.set(0, 0.0062, 0.0158);
  cabBody.add(grille);

  for (const bz of [-0.0158, 0.0158]) {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.0158, 0.0016, 0.0014),
      chromeMat,
    );
    bumper.position.set(0, 0.0032, bz);
    cabBody.add(bumper);
  }

  for (const side of [-1, 1]) {
    for (const wz of [-0.0095, 0.0098]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0036, 0.0036, 0.0026, 10),
        tireMat,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.0078, 0.0036, wz);
      cabBody.add(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0018, 0.0018, 0.003, 8),
        chromeMat,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(side * 0.0078, 0.0036, wz);
      cabBody.add(hub);
    }

    const headlamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.0015, 6, 6),
      winMat,
    );
    headlamp.position.set(side * 0.0054, 0.0068, 0.0156);
    cabBody.add(headlamp);

    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.0018, 0.0024, 0.0012),
      tailLightMat,
    );
    tailLight.position.set(side * 0.0058, 0.0065, -0.0156);
    cabBody.add(tailLight);
  }

  group.add(cabBody);
  return { group, windowMaterials };
}

/**
 * 9. WESTMINSTER BRIDGE (Iconic 7-Arch Westminster Green Iron Bridge with Victorian Lamps)
 */
export function createWestminsterBridgeMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const westminsterGreenMat = new THREE.MeshStandardMaterial({
    color: '#3d7059',
    roughness: 0.48,
    metalness: 0.32,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    color: '#9c968b',
    roughness: 0.85,
    flatShading: true,
  });
  const roadMat = new THREE.MeshStandardMaterial({
    color: '#343840',
    roughness: 0.86,
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: '#d8cfc0',
    roughness: 0.8,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: '#fff6cc',
    emissive: new THREE.Color('#ffbe42'),
    emissiveIntensity: 0.45,
    roughness: 0.15,
  });
  windowMaterials.push(lampGlowMat);

  const deckLength = 0.128;
  const roadDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.0038, deckLength),
    roadMat,
  );
  roadDeck.position.y = 0.0195;
  roadDeck.castShadow = true;
  roadDeck.receiveShadow = true;
  group.add(roadDeck);

  for (const sx of [-0.0108, 0.0108]) {
    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(0.0038, 0.0044, deckLength),
      sidewalkMat,
    );
    walk.position.set(sx, 0.020, 0);
    group.add(walk);

    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(0.0022, 0.0052, deckLength),
      westminsterGreenMat,
    );
    parapet.position.set(sx * 1.18, 0.0235, 0);
    group.add(parapet);
  }

  for (const pz of [-0.042, -0.014, 0.014, 0.042]) {
    const pier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.018, 8),
      graniteMat,
    );
    pier.scale.set(1.18, 1.0, 0.42);
    pier.position.set(0, 0.009, pz);
    group.add(pier);
  }

  for (const az of [-0.028, 0.0, 0.028]) {
    for (const sx of [-0.0125, 0.0125]) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.012, 0.0018, 6, 12, Math.PI),
        westminsterGreenMat,
      );
      arch.rotation.y = Math.PI / 2;
      arch.scale.set(1.1, 0.65, 1.0);
      arch.position.set(sx, 0.011, az);
      group.add(arch);
    }
  }

  for (const lz of [-0.042, -0.014, 0.014, 0.042]) {
    for (const sx of [-0.0128, 0.0128]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0008, 0.0011, 0.011, 6),
        westminsterGreenMat,
      );
      post.position.set(sx, 0.0295, lz);
      group.add(post);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.0022, 8, 8),
        lampGlowMat,
      );
      globe.position.set(sx, 0.0355, lz);
      group.add(globe);
    }
  }

  return { group, windowMaterials };
}

/**
 * 10. BATTERSEA POWER STATION (Art Deco Brick Cathedral of Power & 4 Iconic White Fluted Chimneys)
 */
export function createBatterseaPowerStationMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const brickMat = new THREE.MeshStandardMaterial({
    color: '#9c4334',
    roughness: 0.82,
    flatShading: true,
  });
  const darkBrickMat = new THREE.MeshStandardMaterial({
    color: '#7a3125',
    roughness: 0.86,
    flatShading: true,
  });
  const concretePlinthMat = new THREE.MeshStandardMaterial({
    color: '#dcd4c6',
    roughness: 0.72,
    flatShading: true,
  });
  const whiteChimneyMat = new THREE.MeshStandardMaterial({
    color: '#f7f4eb',
    roughness: 0.48,
  });
  const steelRoofMat = new THREE.MeshStandardMaterial({
    color: '#3f4b59',
    roughness: 0.52,
    metalness: 0.35,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff3c4',
    emissive: new THREE.Color('#ffaa33'),
    emissiveIntensity: 0.38,
    roughness: 0.18,
  });
  windowMaterials.push(winMat);

  // Riverside Jetty & Embankment Plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.016, 0.076),
    concretePlinthMat,
  );
  plinth.position.y = 0.006;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Central Boiler House & Twin Stepped Art Deco Turbine Halls
  const boilerHouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.054, 0.058),
    brickMat,
  );
  boilerHouse.position.y = 0.038;
  boilerHouse.castShadow = true;
  boilerHouse.receiveShadow = true;
  group.add(boilerHouse);

  // Rooftop glass sky-atrium & steel clerestory
  const roofAtrium = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.008, 0.048),
    steelRoofMat,
  );
  roofAtrium.position.y = 0.068;
  group.add(roofAtrium);

  for (const sideX of [-1, 1]) {
    const turbineWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.042, 0.054),
      darkBrickMat,
    );
    turbineWing.position.set(sideX * 0.034, 0.032, 0);
    turbineWing.castShadow = true;
    group.add(turbineWing);
  }

  // Tall Vertical Art Deco Multipane Industrial Windows on Front (+Z) and Back (-Z)
  for (let w = -3; w <= 3; w++) {
    const wx = w * 0.0068;
    for (const sz of [-1, 1]) {
      const winStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.0034, 0.034, 0.002),
        winMat,
      );
      winStrip.position.set(wx, 0.038, sz * 0.0295);
      group.add(winStrip);
    }
  }

  // 4 Iconic Corner Fluted White Art Deco Chimneys on Stepped Concrete Pedestals
  for (const cx of [-0.031, 0.031]) {
    for (const cz of [-0.028, 0.028]) {
      // Brick corner tower base
      const cornerTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.017, 0.058, 0.017),
        darkBrickMat,
      );
      cornerTower.position.set(cx, 0.040, cz);
      cornerTower.castShadow = true;
      group.add(cornerTower);

      // Fluted concrete pedestal
      const ped = new THREE.Mesh(
        new THREE.BoxGeometry(0.0145, 0.012, 0.0145),
        concretePlinthMat,
      );
      ped.position.set(cx, 0.074, cz);
      group.add(ped);

      // Towering White Tapered Fluted Chimney (16 segments for classical fluting)
      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0044, 0.0062, 0.062, 16),
        whiteChimneyMat,
      );
      chimney.position.set(cx, 0.110, cz);
      chimney.castShadow = true;
      group.add(chimney);

      // Dark soot-ring rim at chimney crown
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0048, 0.0046, 0.004, 16),
        steelRoofMat,
      );
      rim.position.set(cx, 0.141, cz);
      group.add(rim);
    }
  }

  return { group, windowMaterials };
}

/**
 * 11. TOWER OF LONDON — NORMAN WHITE TOWER FORTRESS
 *     (Authentic 3 Square Turrets + 1 Round Observatory Turret, Whitewashed Caen Stone & Curtain Wall)
 */
export function createTowerOfLondonMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  flagMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const caenStoneMat = new THREE.MeshStandardMaterial({
    color: '#ede5d5',
    roughness: 0.78,
    flatShading: true,
  });
  const dressedQuoinMat = new THREE.MeshStandardMaterial({
    color: '#c4b8a3',
    roughness: 0.85,
    flatShading: true,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: '#3b4856',
    roughness: 0.62,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#e8bd4b',
    metalness: 0.75,
    roughness: 0.25,
  });
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: '#b8232c',
    roughness: 0.55,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff2c2',
    emissive: new THREE.Color('#ffaa33'),
    emissiveIntensity: 0.32,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  // Outer Concentric Bastion Wall & Tower Green Plinth
  const bastion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.018, 12),
    dressedQuoinMat,
  );
  bastion.position.y = 0.007;
  bastion.castShadow = true;
  bastion.receiveShadow = true;
  group.add(bastion);

  // Main Norman White Tower Keep
  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.056, 0.048),
    caenStoneMat,
  );
  keep.position.y = 0.042;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  // St. John's Chapel Apse projection on the East side (+X)
  const apse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.048, 10),
    caenStoneMat,
  );
  apse.position.set(0.026, 0.038, -0.006);
  apse.castShadow = true;
  group.add(apse);

  // Crenellated Battlements & Pilaster Buttresses
  for (let b = -2; b <= 2; b++) {
    const bx = b * 0.011;
    for (const sz of [-1, 1]) {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(0.0032, 0.056, 0.0035),
        dressedQuoinMat,
      );
      buttress.position.set(bx, 0.042, sz * 0.0245);
      group.add(buttress);

      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(0.0052, 0.006, 0.004),
        dressedQuoinMat,
      );
      merlon.position.set(bx, 0.072, sz * 0.023);
      group.add(merlon);
    }
  }

  // Norman Round-Arched Windows across two tiers
  for (const wx of [-0.015, 0, 0.015]) {
    for (const wy of [0.034, 0.052]) {
      for (const sz of [-1, 1]) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.0052, 0.011, 0.0022),
          winMat,
        );
        win.position.set(wx, wy, sz * 0.0245);
        group.add(win);
      }
    }
  }

  // 4 Iconic Corner Turrets (3 Square Turrets + 1 Round NE Observatory Turret) with Ogee Lead Cupolas
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = sx * 0.025;
      const tz = sz * 0.023;
      const isRoundTurret = sx === 1 && sz === -1;

      const turret = new THREE.Mesh(
        isRoundTurret
          ? new THREE.CylinderGeometry(0.0085, 0.009, 0.078, 12)
          : new THREE.BoxGeometry(0.014, 0.078, 0.014),
        caenStoneMat,
      );
      turret.position.set(tx, 0.052, tz);
      turret.castShadow = true;
      group.add(turret);

      // Lead-sheathed Tudor Ogee Onion Cupola Cap
      const cupola = new THREE.Mesh(
        new THREE.SphereGeometry(0.0082, 10, 8),
        slateMat,
      );
      cupola.scale.set(1.0, 1.35, 1.0);
      cupola.position.set(tx, 0.095, tz);
      group.add(cupola);

      const spirelet = new THREE.Mesh(
        new THREE.ConeGeometry(0.004, 0.012, 8),
        slateMat,
      );
      spirelet.position.set(tx, 0.106, tz);
      group.add(spirelet);

      const vane = new THREE.Mesh(
        new THREE.SphereGeometry(0.0018, 6, 6),
        goldMat,
      );
      vane.position.set(tx, 0.114, tz);
      group.add(vane);
    }
  }

  // Central Flagpole & Royal Banner
  const flagpole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.001, 0.032, 6),
    goldMat,
  );
  flagpole.position.set(0, 0.084, 0);
  group.add(flagpole);

  const flagMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.009, 0.0012),
    crimsonMat,
  );
  flagMesh.position.set(0.0075, 0.095, 0);
  group.add(flagMesh);

  return { group, windowMaterials, flagMesh };
}

/**
 * 12. ONE CANADA SQUARE — CANARY WHARF (Stainless-Steel Obelisk & Illuminated Pyramid Roof)
 */
export function createCanaryWharfMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const steelCladMat = new THREE.MeshStandardMaterial({
    color: '#d8e2ec',
    metalness: 0.68,
    roughness: 0.24,
    flatShading: true,
  });
  const darkMullionMat = new THREE.MeshStandardMaterial({
    color: '#34495e',
    metalness: 0.45,
    roughness: 0.3,
  });
  const pyramidGlowMat = new THREE.MeshStandardMaterial({
    color: '#fff9e6',
    emissive: new THREE.Color('#ffd97d'),
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.3,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff6d1',
    emissive: new THREE.Color('#ffca57'),
    emissiveIntensity: 0.4,
    roughness: 0.15,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: '#ff4d4d',
    emissive: new THREE.Color('#ff1a1a'),
    emissiveIntensity: 0.95,
  });
  windowMaterials.push(winMat, pyramidGlowMat, beaconMat);

  // Docklands Canary Wharf Plaza Plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.016, 0.056),
    darkMullionMat,
  );
  plinth.position.y = 0.006;
  plinth.castShadow = true;
  group.add(plinth);

  // Main 50-Story Brushed Stainless-Steel Obelisk Shaft with notched corners
  const mainShaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.132, 0.036),
    steelCladMat,
  );
  mainShaft.position.y = 0.078;
  mainShaft.castShadow = true;
  mainShaft.receiveShadow = true;
  group.add(mainShaft);

  const innerCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.039, 0.128, 0.028),
    steelCladMat,
  );
  innerCore.position.y = 0.078;
  group.add(innerCore);

  const crossCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.128, 0.039),
    steelCladMat,
  );
  crossCore.position.y = 0.078;
  group.add(crossCore);

  // Horizontal Illuminated Banking Floor Window Bands
  for (let f = 0; f < 9; f++) {
    const fy = 0.024 + f * 0.013;
    const winBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.0396, 0.0045, 0.027),
      winMat,
    );
    winBand.position.y = fy;
    group.add(winBand);

    const winBandZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.027, 0.0045, 0.0396),
      winMat,
    );
    winBandZ.position.y = fy;
    group.add(winBandZ);
  }

  // Iconic 130-Foot Pyramidal Roof Crown + Aircraft Warning Beacon
  const pyramidRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.027, 0.032, 4),
    pyramidGlowMat,
  );
  pyramidRoof.rotation.y = Math.PI / 4;
  pyramidRoof.position.y = 0.159;
  pyramidRoof.castShadow = true;
  group.add(pyramidRoof);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.0024, 8, 8),
    beaconMat,
  );
  beacon.position.y = 0.176;
  group.add(beacon);

  return { group, windowMaterials };
}

/**
 * 13. ROYAL OBSERVATORY & OLD ROYAL NAVAL COLLEGE, GREENWICH
 *     (Wren's Flamsteed House, Octagon Room, Red Time Ball & Prime Meridian 0° Line)
 */
export function createGreenwichObservatoryMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const wrenBrickMat = new THREE.MeshStandardMaterial({
    color: '#b84a39',
    roughness: 0.78,
    flatShading: true,
  });
  const portlandMat = new THREE.MeshStandardMaterial({
    color: '#efe7d6',
    roughness: 0.74,
    flatShading: true,
  });
  const leadDomeMat = new THREE.MeshStandardMaterial({
    color: '#3f4e5e',
    roughness: 0.58,
    metalness: 0.25,
  });
  const timeBallRedMat = new THREE.MeshStandardMaterial({
    color: '#e62229',
    roughness: 0.35,
    emissive: new THREE.Color('#991115'),
    emissiveIntensity: 0.25,
  });
  const meridianBrassMat = new THREE.MeshStandardMaterial({
    color: '#ffd25a',
    emissive: new THREE.Color('#ffae22'),
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c4',
    emissive: new THREE.Color('#ffae38'),
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  windowMaterials.push(winMat, meridianBrassMat);

  // Greenwich Hill Stone Terrace
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(0.084, 0.016, 0.068),
    portlandMat,
  );
  terrace.position.y = 0.006;
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  group.add(terrace);

  // Glowing Brass Prime Meridian 0°00'00" Line running straight out the front courtyard (+Z)
  const meridianStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.0024, 0.0015, 0.068),
    meridianBrassMat,
  );
  meridianStrip.position.set(0, 0.0145, 0.002);
  group.add(meridianStrip);

  // Wren's Flamsteed House Main Block with White Portland Stone Quoins
  const flamsteedBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.042, 0.036),
    wrenBrickMat,
  );
  flamsteedBody.position.set(0, 0.034, -0.006);
  flamsteedBody.castShadow = true;
  group.add(flamsteedBody);

  // Octagonal Star-Gazing Room ("Octagon Room") Rising Above the Main Block
  const octagonRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.022, 8),
    wrenBrickMat,
  );
  octagonRoom.position.set(0, 0.060, -0.006);
  octagonRoom.castShadow = true;
  group.add(octagonRoom);

  const octagonCornice = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0175, 0.0175, 0.0035, 8),
    portlandMat,
  );
  octagonCornice.position.set(0, 0.071, -0.006);
  group.add(octagonCornice);

  // Twin Turret Cupolas + Iconic Bright Red Flamsteed Time Ball on East Turret (+X)
  for (const side of [-1, 1]) {
    const tx = side * 0.013;
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0065, 0.007, 0.016, 10),
      portlandMat,
    );
    turret.position.set(tx, 0.078, -0.004);
    group.add(turret);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.0068, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      leadDomeMat,
    );
    dome.position.set(tx, 0.086, -0.004);
    group.add(dome);

    if (side === 1) {
      // Mast & Bright Scarlet 13:00 GMT Time Ball
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0007, 0.0009, 0.026, 6),
        meridianBrassMat,
      );
      mast.position.set(tx, 0.104, -0.004);
      group.add(mast);

      const timeBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.0044, 10, 10),
        timeBallRedMat,
      );
      timeBall.position.set(tx, 0.108, -0.004);
      timeBall.castShadow = true;
      group.add(timeBall);
    }
  }

  // Great Equatorial Onion-Dome Telescope Pavilion on the West Wing (-X)
  const eqDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.013, 0.024, 12),
    portlandMat,
  );
  eqDrum.position.set(-0.028, 0.026, 0.006);
  group.add(eqDrum);

  const eqDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.0125, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    leadDomeMat,
  );
  eqDome.position.set(-0.028, 0.038, 0.006);
  group.add(eqDome);

  // Tall Baroque Observatory Windows
  for (const wx of [-0.014, 0, 0.014]) {
    for (const wy of [0.026, 0.043]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.0058, 0.011, 0.0022),
        winMat,
      );
      win.position.set(wx, wy, 0.0125);
      group.add(win);
    }
  }

  return { group, windowMaterials };
}

/**
 * 14. KEW PALACE & ROYAL BOTANIC GARDENS PALM HOUSE
 *     (1631 Red-Brick Dutch Gable Royal Villa + Curving Glass & Iron Palm House Conservatory)
 */
export function createKewPalaceMesh(): {
  group: THREE.Group;
  windowMaterials: THREE.MeshStandardMaterial[];
  flagMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const windowMaterials: THREE.MeshStandardMaterial[] = [];

  const dutchBrickMat = new THREE.MeshStandardMaterial({
    color: '#b54534',
    roughness: 0.78,
    flatShading: true,
  });
  const trimStoneMat = new THREE.MeshStandardMaterial({
    color: '#f2ead9',
    roughness: 0.72,
  });
  const slateMat = new THREE.MeshStandardMaterial({
    color: '#3f4c5c',
    roughness: 0.62,
  });
  const palmGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#9be8d8',
    roughness: 0.15,
    metalness: 0.15,
    clearcoat: 0.9,
    flatShading: true,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#fff4c4',
    emissive: new THREE.Color('#ffba42'),
    emissiveIntensity: 0.32,
    roughness: 0.2,
  });
  windowMaterials.push(winMat);

  // Botanical Garden Terrace
  const terrace = new THREE.Mesh(
    new THREE.BoxGeometry(0.094, 0.014, 0.068),
    trimStoneMat,
  );
  terrace.position.y = 0.005;
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  group.add(terrace);

  // A. Kew Palace (Dutch-Gable Flemish-Bond Red Brick Villa on Left -X)
  const palaceGroup = new THREE.Group();
  palaceGroup.position.set(-0.016, 0, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.044, 0.036),
    dutchBrickMat,
  );
  body.position.y = 0.032;
  body.castShadow = true;
  palaceGroup.add(body);

  // 3 Iconic Shaped Dutch Pediment Gables along the front roofline
  for (const gx of [-0.015, 0, 0.015]) {
    const dutchGable = new THREE.Mesh(
      new THREE.ConeGeometry(0.0085, 0.016, 4),
      dutchBrickMat,
    );
    dutchGable.rotation.y = Math.PI / 4;
    dutchGable.scale.set(1.0, 1.0, 0.45);
    dutchGable.position.set(gx, 0.061, 0.015);
    palaceGroup.add(dutchGable);

    const pedimentCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.0024, 6, 6),
      trimStoneMat,
    );
    pedimentCap.position.set(gx, 0.069, 0.015);
    palaceGroup.add(pedimentCap);
  }

  for (const wx of [-0.015, 0, 0.015]) {
    for (const wy of [0.025, 0.041]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.0055, 0.01, 0.0025),
        winMat,
      );
      win.position.set(wx, wy, 0.0182);
      palaceGroup.add(win);
    }
  }
  group.add(palaceGroup);

  // B. Victorian Wrought-Iron & Turquoise Glass Palm House Conservatory on Right (+X)
  const palmHouse = new THREE.Group();
  palmHouse.position.set(0.026, 0.012, -0.002);

  const centerNave = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.013, 0.024, 8, 12),
    palmGlassMat,
  );
  centerNave.rotation.x = Math.PI / 2;
  centerNave.scale.set(1.15, 0.85, 1.0);
  centerNave.position.y = 0.011;
  centerNave.castShadow = true;
  palmHouse.add(centerNave);

  const centralDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.0145, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    palmGlassMat,
  );
  centralDome.position.y = 0.014;
  palmHouse.add(centralDome);

  group.add(palmHouse);

  const flagMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.007, 0.001),
    new THREE.MeshStandardMaterial({ color: '#ecc054', metalness: 0.7, roughness: 0.25 }),
  );
  flagMesh.position.set(-0.01, 0.078, 0);
  group.add(flagMesh);

  return { group, windowMaterials, flagMesh };
}
