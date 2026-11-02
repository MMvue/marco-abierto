/* =========================================================
   Marco Abierto — escenas 3D de la portada (Three.js)
   1. casa(): una casa moderna en un lote con jardín y piscina. Al bajar,
      el día pasa en time-lapse: nubes, atardecer, noche con estrellas
      y estrellas fugaces; la casa se enciende por dentro.
   2. valle(): el Valle de Aburrá de noche, con la ciudad (edificios con
      ventanas, calles, tráfico y metro). Al tocar una zona, la cámara hace
      zoom sobre ella y lleva a la página con sus inmuebles.
   Si el navegador no puede con 3D, la portada conserva sus versiones planas.
   ========================================================= */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = matchMedia("(pointer: coarse)").matches;
const acotar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const suavizar = (t) => 1 - Math.pow(1 - t, 3);                                 // sale rápido, llega suave
const enIdaYVuelta = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // arranca y frena suave
const mezclar = (a, b, t) => a + (b - a) * t;
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

function crearRender(caja, { sombras = false, alfa = true } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: alfa, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, tactil ? 1.5 : 1.75));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  if (sombras) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
  r.domElement.className = "escena3d__lienzo";
  r.domElement.setAttribute("aria-hidden", "true");
  caja.append(r.domElement);
  return r;
}

// El primer cuadro de una escena compila shaders y sube texturas: congela la página casi un segundo.
// Se hace antes, cuando el navegador está libre (después de la entrada de la portada), y no al llegar con el scroll.
function precalentar(render, escena, camara, dibujar) {
  const esperar = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
  setTimeout(() => esperar(async () => {
    try {
      if (render.compileAsync) await render.compileAsync(escena, camara);
      else render.compile(escena, camara);
    } catch { /* si falla, se compila en el primer cuadro como antes */ }
    esperar(() => dibujar());
  }), 2600);
}

// Solo dibuja mientras la escena está en pantalla
function cuandoVisible(el, alCambiar, margen = "200px") {
  const io = new IntersectionObserver((e) => alCambiar(e[0].isIntersecting), { rootMargin: margen });
  io.observe(el);
}

// Ruido suave (montañas, manchas del pasto)
function ruido(semilla = 7) {
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + semilla * 74.7) * 43758.5453; return s - Math.floor(s); };
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += amp * n(x * f, y * f); amp *= 0.5; f *= 2.03; } return s; };
}

/* ---------- Texturas dibujadas en el momento (sin descargar imágenes) ---------- */
function textura(ancho, alto, dibujar, color = true) {
  const c = document.createElement("canvas");
  c.width = ancho; c.height = alto;
  dibujar(c.getContext("2d"), ancho, alto);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const al = (a, b) => a + Math.random() * (b - a);
const motas = (g, w, h, base, tonos, n, tam = 2) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = tonos[i % tonos.length];
    g.globalAlpha = al(0.15, 0.6);
    g.fillRect(Math.random() * w, Math.random() * h, al(0.6, tam), al(0.6, tam));
  }
  g.globalAlpha = 1;
};

// Valor que cambia con el avance siguiendo puntos clave: [[avance, valor], ...]
function claves(lista) {
  const esColor = typeof lista[0][1] === "string";
  const pts = lista.map(([p, v]) => [p, esColor ? new THREE.Color(v) : v]);
  const salida = new THREE.Color();
  return (p) => {
    let i = 1;
    while (i < pts.length - 1 && p > pts[i][0]) i++;
    const [p0, v0] = pts[i - 1], [p1, v1] = pts[i];
    let t = acotar((p - p0) / (p1 - p0));
    t = t * t * (3 - 2 * t);
    return esColor ? salida.copy(v0).lerp(v1, t) : mezclar(v0, v1, t);
  };
}

/* =========================================================
   1. LA CASA Y EL TIME-LAPSE
   ========================================================= */
export function casa(caja) {
  let render;
  try { render = crearRender(caja, { sombras: true, alfa: false }); } catch { return false; }
  caja.classList.add("con-3d");

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog("#bcd0e2", 80, 520);
  const camara = new THREE.PerspectiveCamera(38, 1, 0.3, 3000);

  /* ---------- Texturas ---------- */
  const tPasto = textura(512, 512, (g, w, h) => {
    g.fillStyle = "#4d6b37"; g.fillRect(0, 0, w, h);
    const verdes = ["#5d7e41", "#456232", "#6a8a4a", "#3d572c", "#76935a", "#53723a"];
    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = al(2, 6), a = al(-0.5, 0.5);
      g.strokeStyle = verdes[i % verdes.length]; g.globalAlpha = al(0.35, 0.9); g.lineWidth = al(0.6, 1.4);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
  });
  tPasto.repeat.set(90, 90);
  const tPiedra = textura(512, 512, (g, w, h) => {
    g.fillStyle = "#5d5850"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h;) {
      const fh = al(20, 44);
      for (let x = -al(0, 40); x < w;) {
        const fw = al(36, 110);
        g.fillStyle = `hsl(${al(28, 42)}, ${al(6, 16)}%, ${al(48, 70)}%)`;
        g.fillRect(x + 2, y + 2, fw - 4, fh - 4);
        for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${al(0.03, 0.1)})`; g.fillRect(x + Math.random() * fw, y + Math.random() * fh, al(2, 6), al(2, 5)); }
        x += fw;
      }
      y += fh;
    }
  });
  const tMadera = textura(512, 512, (g, w, h) => {
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = `hsl(${al(22, 30)}, ${al(40, 52)}%, ${al(30, 40)}%)`; g.fillRect(x, 0, 32, h);
      for (let k = 0; k < 22; k++) {
        g.strokeStyle = `rgba(${Math.random() < 0.6 ? "50,25,10" : "255,210,160"},${al(0.05, 0.16)})`; g.lineWidth = al(0.5, 1.5);
        g.beginPath(); const x0 = x + al(2, 30); g.moveTo(x0, 0);
        for (let y = 0; y <= h; y += 32) g.lineTo(x0 + Math.sin(y * 0.02 + k) * al(0.5, 2), y);
        g.stroke();
      }
      g.fillStyle = "rgba(30,15,6,.7)"; g.fillRect(x + 31, 0, 1, h);
    }
  });
  const tDeck = textura(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 42) {
      g.fillStyle = `hsl(${al(24, 32)}, ${al(30, 42)}%, ${al(36, 46)}%)`; g.fillRect(0, y, w, 42);
      for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(60,30,10,${al(0.04, 0.12)})`; g.fillRect(0, y + al(2, 40), w, al(0.5, 1.5)); }
      g.fillStyle = "rgba(25,12,4,.8)"; g.fillRect(0, y + 40, w, 2);
    }
  });
  const tEstuco = textura(256, 256, (g, w, h) => motas(g, w, h, "#efece6", ["#e4e0d8", "#f7f5f0", "#dcd7cd"], 9000, 2));
  const tConcreto = textura(512, 512, (g, w, h) => {
    motas(g, w, h, "#a7a39b", ["#9a968e", "#b5b1a8", "#8f8b83", "#c0bcb3"], 30000, 2.5);
    g.strokeStyle = "rgba(60,58,54,.35)"; g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  });
  const tHoja = textura(256, 256, (g, w, h) => motas(g, w, h, "#5a8044", ["#6c9450", "#47683a", "#7fa65e", "#3b5a30", "#8db46a"], 14000, 4));
  // Interior visto desde afuera: techo iluminado, cortinas y siluetas de muebles
  const tCuarto = textura(1024, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#ffd9a6"); gr.addColorStop(0.35, "#e8a868"); gr.addColorStop(1, "#5a3a22");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 60; x < w; x += 190) {
      const r = g.createRadialGradient(x, 6, 2, x, 6, 120);
      r.addColorStop(0, "rgba(255,248,230,.95)"); r.addColorStop(1, "rgba(255,230,190,0)");
      g.fillStyle = r; g.fillRect(x - 130, 0, 260, 140);
    }
    for (let x = 0; x < w; x += al(120, 260)) { g.fillStyle = `rgba(240,225,200,${al(0.35, 0.6)})`; g.fillRect(x, 0, al(30, 70), h); }
    g.fillStyle = "rgba(40,24,14,.75)";
    for (let x = 30; x < w; x += al(140, 260)) { const ancho = al(50, 120), alto = al(30, 90); g.fillRect(x, h - alto, ancho, alto); }
  });

  /* ---------- Materiales ---------- */
  const est = (o, tile = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, ...o }); m.userData.tile = tile; return m; };
  const M = {
    piedra: est({ map: tPiedra, bumpMap: tPiedra, bumpScale: 3, roughness: 0.92 }, 2.6),
    estuco: est({ map: tEstuco, bumpMap: tEstuco, bumpScale: 0.6, roughness: 0.9 }, 3),
    madera: est({ map: tMadera, bumpMap: tMadera, bumpScale: 1.2, roughness: 0.62 }, 2.4),
    deck: est({ map: tDeck, bumpMap: tDeck, bumpScale: 1, roughness: 0.7 }, 2.4),
    piso: est({ map: tDeck, roughness: 0.4 }, 2.4),
    concreto: est({ map: tConcreto, bumpMap: tConcreto, bumpScale: 0.8, roughness: 0.95 }, 4),
    borde: est({ map: tConcreto, color: "#e9e5dc", roughness: 0.8 }, 2),
    aluminio: est({ color: "#26292d", roughness: 0.32, metalness: 0.85 }),
    techo: est({ color: "#3b3e43", roughness: 0.75 }),
    tela: est({ color: "#8e8478", roughness: 1 }),
    maderaOscura: est({ color: "#3d2a1c", roughness: 0.5 }),
    blanco: est({ color: "#f2f0ec", roughness: 0.6 }),
    azulejo: est({ color: "#5fb7d4", roughness: 0.3 }),
    seto: est({ map: tHoja, bumpMap: tHoja, bumpScale: 3, roughness: 1 }, 1.6),
    hoja: new THREE.MeshStandardMaterial({ map: tHoja, bumpMap: tHoja, bumpScale: 2, roughness: 0.95 }),
    tronco: est({ color: "#4a3a2c", roughness: 1 }),
    cuarto: est({ map: tCuarto, color: "#3c342e", emissive: "#ffffff", emissiveMap: tCuarto, emissiveIntensity: 0, roughness: 0.9 }),
    interiorPared: est({ color: "#d8cdbd", roughness: 0.9 }),
    vidrio: new THREE.MeshPhysicalMaterial({ color: "#a8bccb", roughness: 0.02, metalness: 0, transparent: true, opacity: 0.28, envMapIntensity: 1.6, depthWrite: false }),
    agua: new THREE.MeshPhysicalMaterial({ color: "#2f9fcf", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.78, envMapIntensity: 1.5, emissive: "#1fb4e8", emissiveIntensity: 0 }),
    led: new THREE.MeshStandardMaterial({ color: "#fff3df", emissive: "#ffd8a0", emissiveIntensity: 0 }),
    bombillo: new THREE.MeshStandardMaterial({ color: "#fff3df", emissive: "#ffcf8a", emissiveIntensity: 0 })
  };

  // Ajusta las coordenadas de textura al tamaño real de cada cara (las piedras no se estiran)
  function uvCaja(g, w, h, d, tile) {
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  }
  // Caja dada por sus extremos (en metros)
  function caja3(x1, x2, y1, y2, z1, z2, m) {
    const w = x2 - x1, h = y2 - y1, d = z2 - z1;
    const g = new THREE.BoxGeometry(w, h, d);
    if (m.userData.tile) uvCaja(g, w, h, d, m.userData.tile);
    const o = new THREE.Mesh(g, m);
    o.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    o.castShadow = !m.transparent;
    o.receiveShadow = true;
    escena.add(o);
    return o;
  }

  /* ---------- Terreno y montañas lejanas ---------- */
  const fbm = ruido(5);
  const geoSuelo = new THREE.PlaneGeometry(420, 420, 84, 84);
  geoSuelo.rotateX(-Math.PI / 2);
  const cs = new Float32Array(geoSuelo.attributes.position.count * 3);
  for (let i = 0; i < geoSuelo.attributes.position.count; i++) {
    const x = geoSuelo.attributes.position.getX(i), z = geoSuelo.attributes.position.getZ(i);
    const v = 0.78 + fbm(x * 0.05 + 10, z * 0.05) * 0.45;
    cs[i * 3] = v * 1.02; cs[i * 3 + 1] = v; cs[i * 3 + 2] = v * 0.9;
  }
  geoSuelo.setAttribute("color", new THREE.BufferAttribute(cs, 3));
  const suelo = new THREE.Mesh(geoSuelo, new THREE.MeshStandardMaterial({ map: tPasto, vertexColors: true, roughness: 1 }));
  suelo.receiveShadow = true;
  escena.add(suelo);

  // Cordillera alrededor, como las montañas que rodean el valle
  const geoMonte = new THREE.RingGeometry(150, 460, 160, 14);
  geoMonte.rotateX(-Math.PI / 2);
  const pm = geoMonte.attributes.position;
  for (let i = 0; i < pm.count; i++) {
    const x = pm.getX(i), z = pm.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    const sube = acotar((r - 150) / 120);
    pm.setY(i, sube * sube * (14 + 34 * fbm(a * 2.4 + 3, r * 0.006)) - 0.5);
  }
  geoMonte.computeVertexNormals();
  escena.add(new THREE.Mesh(geoMonte, new THREE.MeshStandardMaterial({ color: "#3d5a3a", roughness: 1 })));

  /* ---------- La casa ---------- */
  // Base y planta baja: ala en piedra y sala de vidrio
  caja3(-7, 5, 0, 0.3, -5, 2.6, M.concreto);
  caja3(-6.6, -2.2, 0.3, 3.5, -4.6, 2.2, M.piedra);
  caja3(-3.6, -2.6, 0.3, 2.75, 2.2, 2.27, M.maderaOscura);                 // puerta
  caja3(-2.82, -2.76, 1.2, 2.0, 2.27, 2.33, M.aluminio);
  caja3(-5.8, -4.8, 0.9, 3.0, 2.19, 2.21, M.cuarto);                     // ventana alta del ala de piedra
  caja3(-5.8, -4.8, 0.9, 3.0, 2.22, 2.25, M.vidrio);
  [[-5.86, -5.8], [-4.8, -4.74]].forEach(([a, b]) => caja3(a, b, 0.86, 3.04, 2.18, 2.27, M.aluminio));

  caja3(-2.2, 4.4, 0.3, 0.36, -4.6, 2.2, M.piso);
  caja3(-2.2, 4.4, 0.36, 3.5, -4.6, -4.4, M.interiorPared);
  caja3(-2.2, -2.0, 0.36, 3.5, -4.4, 2.1, M.interiorPared);
  caja3(-2.2, 4.4, 3.38, 3.5, -4.6, 2.1, M.interiorPared);                 // cielo raso
  caja3(-2.0, 4.4, 0.36, 3.38, 2.12, 2.16, M.vidrio);
  caja3(4.32, 4.36, 0.36, 3.38, -4.4, 2.12, M.vidrio);
  [-2.2, -0.55, 1.1, 2.75, 4.36].forEach((x) => caja3(x - 0.04, x + 0.04, 0.3, 3.5, 2.08, 2.2, M.aluminio));
  [-4.4, -2.2, 0, 2.16].forEach((z) => caja3(4.3, 4.4, 0.3, 3.5, z - 0.04, z + 0.04, M.aluminio));
  caja3(-2.2, 4.4, 0.3, 0.4, 2.08, 2.2, M.aluminio);
  caja3(-2.2, 4.4, 3.4, 3.5, 2.08, 2.2, M.aluminio);
  // Sala: sofá, tapete, mesa de centro, comedor y lámparas
  caja3(-0.2, 2.8, 0.36, 0.38, -1.6, 0.8, M.blanco);
  caja3(0, 2.6, 0.36, 0.78, -2.3, -1.4, M.tela);
  caja3(0, 2.6, 0.78, 1.25, -2.3, -2.05, M.tela);
  caja3(-0.15, 0.05, 0.36, 0.95, -2.3, -1.4, M.tela);
  caja3(2.55, 2.75, 0.36, 0.95, -2.3, -1.4, M.tela);
  caja3(0.7, 1.9, 0.38, 0.72, -0.5, 0.3, M.maderaOscura);
  caja3(2.9, 4.1, 1.02, 1.08, -3.9, -2.9, M.maderaOscura);
  caja3(3.45, 3.55, 0.36, 1.02, -3.45, -3.35, M.aluminio);
  [3.15, 3.85].forEach((x) => {
    caja3(x - 0.01, x + 0.01, 2.5, 3.38, -3.41, -3.39, M.aluminio);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), M.bombillo);
    l.position.set(x, 2.45, -3.4);
    escena.add(l);
  });
  caja3(-1.5, -1.46, 0.36, 2.0, -3.9, -3.86, M.aluminio);
  const lampara = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.38, 20, 1, true), M.bombillo);
  lampara.position.set(-1.48, 2.1, -3.88);
  escena.add(lampara);

  // Entrepiso con alero sobre la sala
  caja3(-7, 5.2, 3.5, 3.8, -5, 3.0, M.estuco);
  caja3(-7, 5.2, 3.46, 3.5, 2.88, 2.94, M.led);

  // Segundo piso: volumen blanco y voladizo en madera, con ventanal corrido y celosía
  caja3(-4.4, 3.2, 3.8, 6.9, -4.6, 1.6, M.estuco);
  caja3(3.2, 7.2, 3.8, 6.9, -4.6, 1.6, M.madera);
  caja3(-3.6, 6.6, 4.3, 6.4, 1.6, 1.63, M.cuarto);
  caja3(-3.6, 6.6, 4.3, 6.4, 1.66, 1.69, M.vidrio);
  for (let x = -3.6; x <= 6.61; x += 1.275) caja3(x - 0.035, x + 0.035, 4.26, 6.44, 1.6, 1.72, M.aluminio);
  caja3(-3.64, 6.64, 4.24, 4.3, 1.6, 1.72, M.aluminio);
  caja3(-3.64, 6.64, 6.4, 6.46, 1.6, 1.72, M.aluminio);
  const LISTONES = 26;
  const liston = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 3.0, 0.1), M.maderaOscura, LISTONES);
  const ml = new THREE.Matrix4();
  for (let i = 0; i < LISTONES; i++) { ml.makeTranslation(4.05 + i * 0.12, 5.35, 1.83); liston.setMatrixAt(i, ml); }
  liston.castShadow = true; liston.receiveShadow = true;
  escena.add(liston);
  // Terraza sobre el ala de piedra
  caja3(-7, -4.4, 3.8, 4.85, 2.9, 2.94, M.vidrio);
  caja3(-7, -6.96, 3.8, 4.85, -4.9, 2.94, M.vidrio);
  caja3(-7.02, -4.4, 4.85, 4.9, 2.88, 2.96, M.aluminio);
  caja3(-6.7, -5.6, 3.8, 4.3, -4.6, -3.9, M.concreto);
  // Cubierta con alero y franja de luz
  caja3(-4.8, 7.6, 6.9, 7.15, -5, 2.25, M.techo);
  caja3(-4.7, 7.5, 6.86, 6.9, 2.12, 2.18, M.led);

  // Deck, piscina y asoleadoras
  caja3(-2.2, 9, 0, 0.2, 2.6, 9.4, M.deck);
  caja3(0, 7, 0.2, 0.3, 3.9, 7.3, M.azulejo);
  caja3(0, 7, 0.32, 0.38, 3.9, 7.3, M.agua);
  caja3(-0.4, 0, 0.2, 0.44, 3.5, 7.7, M.borde);
  caja3(7, 7.4, 0.2, 0.44, 3.5, 7.7, M.borde);
  caja3(0, 7, 0.2, 0.44, 3.5, 3.9, M.borde);
  caja3(0, 7, 0.2, 0.44, 7.3, 7.7, M.borde);
  [1.0, 2.3].forEach((x) => {
    caja3(x, x + 0.75, 0.2, 0.48, 8.1, 9.2, M.blanco);
    caja3(x + 0.04, x + 0.71, 0.48, 0.56, 8.4, 9.18, M.tela);
    const r = caja3(x + 0.04, x + 0.71, 0.5, 0.58, 7.75, 8.45, M.tela);
    r.rotation.x = -0.6; r.position.y += 0.22;
  });

  // Entrada de carros y camino de piedras hasta la puerta
  caja3(-11, -7.4, 0, 0.04, -4, 30, M.concreto);
  for (let i = 0; i < 7; i++) caja3(-3.65 + (i % 2) * 0.15, -2.55 + (i % 2) * 0.15, 0, 0.05, 2.9 + i * 1.15, 3.6 + i * 1.15, M.borde);

  // Setos que cierran el lote
  caja3(-12, 13, 0, 1.5, -9, -8.1, M.seto);
  caja3(12.2, 13, 0, 1.5, -8.1, 14, M.seto);
  caja3(-15, -12.2, 0, 1.2, -9, 10, M.seto);

  /* ---------- Vegetación: follaje hecho de muchas masas de hojas ---------- */
  const masas = [];
  const tallos = [];
  const arbol = (x, z, s) => {
    const alto = 3.4 * s;
    tallos.push([x, z, s, alto]);
    for (let k = 0; k < 46; k++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.cbrt(al(0.35, 1));
      const sx = Math.sqrt(1 - u * u) * Math.cos(a), sz = Math.sqrt(1 - u * u) * Math.sin(a);
      masas.push([x + sx * r * 2.3 * s, alto + 0.9 * s + u * r * 1.5 * s, z + sz * r * 2.3 * s, al(0.55, 0.95) * s]);
    }
  };
  const cipres = (x, z, s) => {
    for (let k = 0; k < 18; k++) {
      const y = al(0.6, 6.4) * s, rr = 0.85 * (1 - y / (7.2 * s)) * s, a = Math.random() * Math.PI * 2;
      masas.push([x + Math.cos(a) * rr * 0.6, y, z + Math.sin(a) * rr * 0.6, al(0.45, 0.7) * s * (1.1 - y / (8 * s))]);
    }
  };
  const arbusto = (x, z, s = 1) => { for (let k = 0; k < 6; k++) masas.push([x + al(-0.5, 0.5) * s, al(0.25, 0.6) * s, z + al(-0.5, 0.5) * s, al(0.35, 0.55) * s]); };
  [[-10.5, -5, 1.25], [10, -5.5, 1.15], [10.6, 5.2, 0.95], [-17, 4, 1.3], [17, -3, 1.4], [-20, -12, 1.5], [22, 10, 1.3], [-24, 14, 1.2]].forEach(([x, z, s]) => arbol(x, z, s));
  [[6.4, -7], [7.6, -7], [8.8, -7]].forEach(([x, z]) => cipres(x, z, 1));
  [[-6.2, 3], [-5.2, 3.2], [-4.5, 2.9], [-1.4, 2.9], [8.6, 3.2], [8.2, 4.4], [-6.1, -3.6]].forEach(([x, z]) => arbusto(x, z));
  const follaje = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), M.hoja, masas.length);
  const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), cc = new THREE.Color();
  const VERDES = ["#d4e6c0", "#c4dcaa", "#e2eed2", "#b6cf98", "#cfe3b2"].map((c) => new THREE.Color(c));
  masas.forEach(([x, y, z, s], i) => {
    qq.setFromEuler(ee.set(Math.random() * 3, Math.random() * 3, 0));
    mm.compose(new THREE.Vector3(x, y, z), qq, new THREE.Vector3(s, s * 0.85, s));
    follaje.setMatrixAt(i, mm);
    follaje.setColorAt(i, cc.copy(VERDES[i % VERDES.length]).multiplyScalar(al(0.8, 1.15)));
  });
  follaje.castShadow = true; follaje.receiveShadow = true;
  escena.add(follaje);
  tallos.forEach(([x, z, s, alto]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.24 * s, alto + 0.6 * s, 10), M.tronco);
    t.position.set(x, (alto + 0.6 * s) / 2, z); t.castShadow = true;
    escena.add(t);
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.8 * s, 6), M.tronco);
      const a = k * 2.1 + x;
      r.position.set(x + Math.cos(a) * 0.5 * s, alto * 0.8, z + Math.sin(a) * 0.5 * s);
      r.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      r.castShadow = true;
      escena.add(r);
    }
  });

  // Luces de jardín
  [[-4.3, 3.6], [-4.3, 6.2], [-4.3, 8.8], [-7.1, 4], [-7.1, 9], [-7.1, 14], [8.8, 2.4]].forEach(([x, z]) => {
    caja3(x - 0.06, x + 0.06, 0, 0.62, z - 0.06, z + 0.06, M.aluminio);
    caja3(x - 0.07, x + 0.07, 0.5, 0.58, z - 0.07, z + 0.07, M.bombillo);
  });

  /* ---------- Cielo, nubes, estrellas y luna ---------- */
  // Cielo: degradado del horizonte al cénit, resplandor alrededor del sol, franja de atardecer y el disco solar
  const matCielo = new THREE.ShaderMaterial({
    uniforms: {
      uZenit: { value: new THREE.Color() }, uHorizonte: { value: new THREE.Color() }, uSol: { value: new THREE.Color() },
      uDirSol: { value: new THREE.Vector3(0, 1, 0) }, uBanda: { value: 0 }, uHalo: { value: 0 }, uDisco: { value: 1 }, uEscala: { value: 1 }
    },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uZenit; uniform vec3 uHorizonte; uniform vec3 uSol; uniform vec3 uDirSol;
      uniform float uBanda; uniform float uHalo; uniform float uDisco; uniform float uEscala;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHorizonte, uZenit, pow(h, 0.4));
        float c = max(dot(d, normalize(uDirSol)), 0.0);
        col += uSol * uHalo * (pow(c, 6.0) * 0.45 + pow(c, 60.0) * 0.9);
        col += uSol * uBanda * pow(1.0 - h, 5.0) * (0.3 + 0.7 * pow(c, 3.0));
        col += uSol * smoothstep(0.99945, 0.9997, c) * 18.0 * uDisco;
        gl_FragColor = vec4(col * uEscala, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(1600, 48, 24), matCielo);
  cielo.renderOrder = -1;
  escena.add(cielo);

  // Estrellas que titilan
  const NE = tactil ? 1200 : 2200;
  const pe = new Float32Array(NE * 3), te = new Float32Array(NE), fe = new Float32Array(NE);
  for (let i = 0; i < NE; i++) {
    const a = Math.random() * Math.PI * 2, el = Math.asin(al(0.03, 1));
    pe.set([Math.cos(el) * Math.sin(a) * 1400, Math.sin(el) * 1400, Math.cos(el) * Math.cos(a) * 1400], i * 3);
    te[i] = Math.pow(Math.random(), 3) * 2.4 + 0.8;
    fe[i] = Math.random();
  }
  const geoEst = new THREE.BufferGeometry();
  geoEst.setAttribute("position", new THREE.BufferAttribute(pe, 3));
  geoEst.setAttribute("aTam", new THREE.BufferAttribute(te, 1));
  geoEst.setAttribute("aFase", new THREE.BufferAttribute(fe, 1));
  const matEst = new THREE.ShaderMaterial({
    uniforms: { uNoche: { value: 0 }, uTiempo: { value: 0 }, uPixel: { value: render.getPixelRatio() } },
    vertexShader: `attribute float aTam; attribute float aFase; uniform float uTiempo; uniform float uPixel; varying float vBrillo;
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vBrillo = 0.55 + 0.45 * sin(uTiempo * (1.2 + aFase * 2.5) + aFase * 40.0);
        gl_PointSize = aTam * uPixel; }`,
    fragmentShader: `uniform float uNoche; varying float vBrillo;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * 1.8, a * vBrillo * uNoche); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const estrellas = new THREE.Points(geoEst, matEst);
  estrellas.renderOrder = 2;
  escena.add(estrellas);

  // Luna
  const luna = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), new THREE.MeshBasicMaterial({ color: "#fff4dc", transparent: true, opacity: 0, fog: false }));
  luna.renderOrder = 2;
  escena.add(luna);

  // Nubes: una capa alta con ruido, iluminada según el sol (blancas, doradas, rosadas o azul noche)
  const matNubes = new THREE.ShaderMaterial({
    uniforms: { uDesp: { value: 0 }, uLuz: { value: new THREE.Color() }, uSombra: { value: new THREE.Color() }, uAlfa: { value: 1 }, uDirSol: { value: new THREE.Vector3(0, 1, 0) }, uCobertura: { value: 0.63 } },
    vertexShader: "varying vec3 vMundo; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform float uDesp; uniform vec3 uLuz; uniform vec3 uSombra; uniform float uAlfa; uniform vec3 uDirSol; uniform float uCobertura;
      varying vec3 vMundo;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main(){
        vec2 p = vMundo.xz * 0.0042 + vec2(uDesp, uDesp * 0.3);
        float forma = fbm(p * 0.45 + 7.0);
        float d0 = fbm(p) * 0.7 + forma * 0.5;
        float d = smoothstep(uCobertura, uCobertura + 0.2, d0);
        d *= smoothstep(1.0, 0.5, length(vMundo.xz) / 1200.0);
        vec2 haciaSol = normalize(uDirSol.xz + vec2(1e-4));
        float d1 = fbm(p + haciaSol * 0.05) * 0.7 + forma * 0.5;
        float sombra = clamp((d1 - d0) * 5.0 + 0.45, 0.0, 1.0);
        vec3 col = mix(uLuz, uSombra, sombra * 0.85);
        vec3 v = normalize(vMundo - cameraPosition);
        col += uLuz * pow(max(dot(v, normalize(uDirSol)), 0.0), 6.0) * 0.8 * (1.0 - d * 0.6);
        gl_FragColor = vec4(col, d * uAlfa);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  const nubes = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, 1, 1), matNubes);
  nubes.rotation.x = Math.PI / 2;
  nubes.position.y = 170;
  nubes.renderOrder = 3;
  escena.add(nubes);

  // Estrellas fugaces: estelas que cruzan el cielo de vez en cuando
  const geoFugaz = new THREE.CylinderGeometry(1.4, 0, 110, 6, 1, true);
  geoFugaz.translate(0, -55, 0);
  const fugaces = Array.from({ length: 3 }, () => {
    const m = new THREE.Mesh(geoFugaz, new THREE.ShaderMaterial({
      uniforms: { uOp: { value: 0 } },
      vertexShader: "varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uOp; varying float vT; void main(){ gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * 3.0, pow(vT, 2.2) * uOp); }",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    m.visible = false; m.renderOrder = 4; m.frustumCulled = false;
    escena.add(m);
    return { m, vida: 0, dur: 1, desde: new THREE.Vector3(), dir: new THREE.Vector3() };
  });
  let proximaFugaz = 0;
  const dirDe = (az, el, r = 1) => new THREE.Vector3(Math.cos(el) * Math.sin(az) * r, Math.sin(el) * r, Math.cos(el) * Math.cos(az) * r);
  function lanzarFugaz(ahora, azVista) {
    const f = fugaces.find((x) => !x.m.visible);
    if (!f) return;
    const az = azVista + al(-0.45, 0.45), el = al(0.12, 0.32), lado = Math.random() < 0.5 ? -1 : 1;
    f.desde.copy(dirDe(az, el, 1000));
    f.dir.copy(dirDe(az + lado * al(0.12, 0.22), el - al(0.06, 0.12), 1000)).sub(f.desde);
    f.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.dir.clone().normalize());
    f.vida = ahora; f.dur = al(700, 1100);
    f.m.visible = true;
  }

  /* ---------- Luces ---------- */
  const hemi = new THREE.HemisphereLight("#cfe3ff", "#3a4a2a", 1.2);
  escena.add(hemi);
  const sol = new THREE.DirectionalLight("#fff4e6", 7);
  sol.castShadow = true;
  const res = tactil ? 1024 : 2048;
  sol.shadow.mapSize.set(res, res);
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 160 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.04;
  escena.add(sol, sol.target);
  const sala = new THREE.PointLight("#ffbf7a", 0, 0, 2);
  sala.position.set(1.2, 2.8, -1.4);
  const fachada = new THREE.PointLight("#ffbf7a", 0, 0, 2);
  fachada.position.set(1.5, 5.3, 2.6);
  const piscina = new THREE.PointLight("#3fc8ff", 0, 0, 2);
  piscina.position.set(3.5, 0.26, 5.6);
  escena.add(sala, fachada, piscina);
  // Bañadores que suben por la pared de piedra y por el árbol de la izquierda
  const banadores = [[-5.6, 2.9], [-3.9, 2.9], [-10.5, -3.4]].map(([x, z]) => {
    const s = new THREE.SpotLight("#ffcf94", 0, 12, 0.55, 0.9, 2);
    s.position.set(x, 0.2, z);
    s.target.position.set(x, 4, z - 0.6);
    escena.add(s, s.target);
    return s;
  });

  /* ---------- Posproceso: resplandor de luces, sol y estrellas ---------- */
  const compositor = new EffectComposer(render);
  compositor.addPass(new RenderPass(escena, camara));
  const brillo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.2, 0.6, 0.9);
  compositor.addPass(brillo);
  compositor.addPass(new OutputPass());

  // Reflejos: el cielo del momento se usa como entorno (vidrios y agua lo reflejan)
  const pmrem = new THREE.PMREMGenerator(render);
  const escenaEnv = new THREE.Scene();
  escenaEnv.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), matCielo));
  let envRT = null, pEnv = -1;
  const actualizarEntorno = (p) => {
    if (Math.abs(p - pEnv) < 0.05) return;   // regenerarlo cuesta: solo cuando el cielo cambió de verdad
    pEnv = p;
    const nuevo = pmrem.fromScene(escenaEnv, 0, 0.1, 100);
    escena.environment = nuevo.texture;
    envRT?.dispose();
    envRT = nuevo;
  };

  /* ---------- El día en puntos clave (0 = mediodía · 0,6 = atardecer · 1 = noche) ---------- */
  const T = {
    elev: claves([[0, 50], [0.3, 28], [0.5, 11], [0.58, 5.5], [0.63, 2], [0.68, -4], [0.8, -12], [1, -18]]),
    az: claves([[0, -1.2], [0.58, -3.12], [1, -3.3]]),
    expo: claves([[0, 0.36], [0.45, 0.38], [0.58, 0.34], [0.64, 0.46], [0.75, 0.68], [1, 0.8]]),
    zenit: claves([[0, "#2a68bd"], [0.45, "#3570b8"], [0.57, "#41629a"], [0.64, "#2f4176"], [0.72, "#1a2552"], [0.84, "#071232"], [1, "#040b20"]]),
    horizonte: claves([[0, "#b5d3ef"], [0.42, "#cddff0"], [0.53, "#f2cfa6"], [0.6, "#ffa463"], [0.65, "#f27d6a"], [0.72, "#7c5079"], [0.84, "#18284c"], [1, "#0f1e3e"]]),
    solCielo: claves([[0, "#fff4dc"], [0.5, "#ffd49a"], [0.6, "#ff9446"], [0.66, "#ff683a"], [0.72, "#b84a5e"], [0.82, "#000000"]]),
    banda: claves([[0, 0], [0.45, 0.12], [0.58, 0.85], [0.66, 0.65], [0.76, 0.12], [0.86, 0]]),
    halo: claves([[0, 0.55], [0.55, 1], [0.66, 0.8], [0.74, 0]]),
    disco: claves([[0, 1], [0.62, 1], [0.665, 0]]),
    noche: claves([[0, 0], [0.64, 0], [0.84, 1], [1, 1]]),
    luces: claves([[0, 0], [0.55, 0], [0.72, 1], [1, 1]]),
    solI: claves([[0, 9.5], [0.42, 8.5], [0.56, 5], [0.63, 0.8], [0.67, 0]]),
    solC: claves([[0, "#fff4e6"], [0.4, "#ffe6c2"], [0.54, "#ffb874"], [0.62, "#ff7d45"], [0.67, "#ff5a30"]]),
    lunaI: claves([[0, 0], [0.68, 0], [0.85, 0.9], [1, 1.1]]),
    hemiI: claves([[0, 1.6], [0.5, 1.3], [0.65, 0.6], [0.8, 0.28], [1, 0.25]]),
    hemiC: claves([[0, "#cfe3ff"], [0.5, "#f2d2b0"], [0.62, "#e8a080"], [0.7, "#6d6a9c"], [0.85, "#1e3560"], [1, "#183058"]]),
    nubeLuz: claves([[0, "#ffffff"], [0.42, "#fff2de"], [0.55, "#ffbe86"], [0.61, "#ff8a60"], [0.67, "#e0607a"], [0.74, "#7a5480"], [0.84, "#25324e"], [1, "#1c2842"]]),
    nubeSombra: claves([[0, "#c2cddb"], [0.42, "#bcb0a8"], [0.58, "#90687e"], [0.66, "#5a4466"], [0.76, "#2a2a48"], [0.86, "#0f1828"], [1, "#0c1424"]]),
    nubeAlfa: claves([[0, 0.92], [0.55, 0.72], [0.68, 0.7], [0.8, 0.82], [1, 0.5]]),
    brilloF: claves([[0, 0.15], [0.6, 0.3], [0.75, 0.42], [1, 0.48]]),
    brilloU: claves([[0, 1.6], [0.6, 1.5], [0.72, 0.95], [1, 0.85]]),
    vidrioO: claves([[0, 0.3], [0.6, 0.28], [0.75, 0.14], [1, 0.12]]),
    lunaEl: claves([[0, -0.1], [0.7, -0.02], [1, 0.12]])
  };
  const dirSol = new THREE.Vector3();
  const dirLuna = dirDe(Math.PI + 0.35, 0.75);
  const LUNA_C = new THREE.Color("#a9c2ec");

  /* ---------- Aplicar el avance ---------- */
  const objetivo = new THREE.Vector3(0.6, 6.4, 0);
  let azVista = Math.PI;
  function aplicar(p, seg) {
    dirSol.copy(dirDe(T.az(p), THREE.MathUtils.degToRad(T.elev(p))));
    const noche = T.noche(p), luces = T.luces(p);
    const expo = T.expo(p), escala = 0.8 / expo;     // el cielo se ve igual sin importar la exposición de la escena
    render.toneMappingExposure = expo;
    const uc = matCielo.uniforms;
    uc.uZenit.value.copy(T.zenit(p));
    uc.uHorizonte.value.copy(T.horizonte(p));
    uc.uSol.value.copy(T.solCielo(p));
    uc.uDirSol.value.copy(dirSol);
    uc.uBanda.value = T.banda(p);
    uc.uHalo.value = T.halo(p);
    uc.uDisco.value = T.disco(p);
    uc.uEscala.value = escala;
    matEst.uniforms.uNoche.value = acotar((noche - 0.35) / 0.65);
    // La niebla toma el color del horizonte: las montañas lejanas se funden con el cielo
    escena.fog.color.copy(T.horizonte(p)).multiplyScalar(escala);
    escena.fog.near = mezclar(80, 50, noche);
    escena.fog.far = mezclar(520, 360, noche);

    // Una sola luz direccional: es el sol de día y la luna de noche
    const sI = T.solI(p);
    if (sI > 0.01) { sol.position.copy(dirSol).multiplyScalar(80); sol.color.copy(T.solC(p)); sol.intensity = sI; }
    else { sol.position.copy(dirLuna).multiplyScalar(80); sol.color.copy(LUNA_C); sol.intensity = T.lunaI(p); }
    hemi.intensity = T.hemiI(p);
    hemi.color.copy(T.hemiC(p));

    // Nubes que corren con el scroll (el time-lapse) y un poco con el tiempo
    matNubes.uniforms.uDesp.value = p * 6 + seg * 0.004;
    matNubes.uniforms.uLuz.value.copy(T.nubeLuz(p));
    matNubes.uniforms.uSombra.value.copy(T.nubeSombra(p));
    matNubes.uniforms.uAlfa.value = T.nubeAlfa(p);
    matNubes.uniforms.uDirSol.value.copy(dirSol);

    // Luna que sale en la noche
    luna.position.copy(dirDe(azVista - 0.32, T.lunaEl(p) + 0.06, 1200));
    luna.material.opacity = acotar((noche - 0.4) / 0.4);

    // La casa se enciende
    M.cuarto.emissiveIntensity = luces * 1.2;
    M.led.emissiveIntensity = luces * 2.4;
    M.bombillo.emissiveIntensity = luces * 3.2;
    M.agua.emissiveIntensity = luces * 0.45;
    M.vidrio.opacity = T.vidrioO(p);
    sala.intensity = luces * 20;
    fachada.intensity = luces * 7;
    piscina.intensity = luces * 4;
    banadores.forEach((s) => { s.intensity = luces * 32; });
    brillo.strength = T.brilloF(p);
    brillo.threshold = T.brilloU(p);

    // Cámara: rodea la casa despacio mientras pasa el día
    const e = suavizar(p);
    const lejos = Math.max(1, 1.2 / Math.max(0.5, camara.aspect));
    const az = mezclar(-0.5, 0.36, e) + Math.sin(seg * 0.15) * 0.01;
    const radio = mezclar(29, 25.5, e) * lejos;
    camara.position.set(objetivo.x + radio * Math.sin(az), mezclar(4.2, 3.4, e) * (lejos > 1 ? 1.15 : 1), objetivo.z + radio * Math.cos(az));
    camara.lookAt(objetivo);
    azVista = az + Math.PI;

    actualizarEntorno(p);
  }

  /* ---------- Tamaño, avance suave y bucle de dibujo ---------- */
  const medir = () => {
    const w = caja.clientWidth, h = caja.clientHeight;
    if (!w || !h) return;
    render.setSize(w, h, false);
    compositor.setPixelRatio(render.getPixelRatio());
    compositor.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  const fijo = 0.6;   // con movimiento reducido se queda en el atardecer
  let meta = reducido ? fijo : (window.__armaProgreso ?? 0);
  let actual = meta;
  new ResizeObserver(medir).observe(caja);
  medir();
  addEventListener("arma:progreso", (e) => { meta = reducido ? fijo : e.detail; });

  let visible = false, corriendo = false;
  const cuadro = (ahora) => {
    if (!visible) { corriendo = false; return; }
    actual += (meta - actual) * 0.08;
    const seg = ahora / 1000;
    aplicar(actual, seg);
    matEst.uniforms.uTiempo.value = seg;

    // Estrellas fugaces solo de noche
    if (!reducido && T.noche(actual) > 0.7 && ahora > proximaFugaz) { lanzarFugaz(ahora, azVista); proximaFugaz = ahora + al(1400, 4200); }
    fugaces.forEach((f) => {
      if (!f.m.visible) return;
      const t = (ahora - f.vida) / f.dur;
      if (t >= 1) { f.m.visible = false; return; }
      f.m.position.copy(f.desde).addScaledVector(f.dir, t);
      f.m.material.uniforms.uOp.value = Math.min(1, t * 6) * (1 - Math.max(0, (t - 0.6) / 0.4)) * T.noche(actual);
    });

    compositor.render();
    requestAnimationFrame(cuadro);
  };
  cuandoVisible(caja, (si) => { visible = si; if (si && !corriendo) { corriendo = true; requestAnimationFrame(cuadro); } });
  // Primer cuadro por adelantado (shaders, sombras, reflejos y resplandor listos antes de llegar)
  precalentar(render, escena, camara, () => { if (!corriendo) { aplicar(actual, performance.now() / 1000); compositor.render(); } });
  return true;
}

/* =========================================================
   2. EL VALLE DE ABURRÁ
   ========================================================= */
export async function valle(caja) {
  // Espera a que la portada tenga lista la lista de zonas y el detalle
  if (!window.VALLE) await new Promise((ok) => addEventListener("valle:listo", ok, { once: true }));
  const V = window.VALLE;

  let render;
  try { render = crearRender(caja); } catch { return false; }
  caja.classList.add("con-3d");
  render.setClearColor("#0a2540", 1);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog("#0a2540", 30, 66);
  const camara = new THREE.PerspectiveCamera(34, 1, 0.05, 200);

  // Coordenadas reales a unidades de la escena (1 unidad ≈ 1,1 km)
  const X = (lng) => (lng + 75.585) * 100;
  const Z = (lat) => (6.215 - lat) * 100;
  const RIO = [[6.37, -75.545], [6.345, -75.552], [6.31, -75.561], [6.27, -75.568], [6.245, -75.571], [6.215, -75.578], [6.19, -75.588], [6.17, -75.603], [6.155, -75.614], [6.135, -75.629], [6.1, -75.637], [6.06, -75.641]];
  const ANCHO = [1.3, 1.5, 1.9, 2.8, 3.4, 3.4, 3.1, 2.7, 2.3, 1.8, 1.4, 1.2];
  const rio = RIO.map(([la, ln]) => [X(ln), Z(la)]);

  // Distancia de un punto al río, ancho del valle en ese tramo y dirección del valle
  const alRio = (x, z) => {
    let mejor = 1e9, ancho = 2, tx = 0, tz = 1;
    for (let i = 0; i < rio.length - 1; i++) {
      const [ax, az] = rio[i], [bx, bz] = rio[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = acotar(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
      const d = Math.hypot(ax + t * dx - x, az + t * dz - z);
      if (d < mejor) { mejor = d; ancho = mezclar(ANCHO[i], ANCHO[i + 1], t); const l = Math.hypot(dx, dz); tx = dx / l; tz = dz / l; }
    }
    return [mejor, ancho, tx, tz];
  };
  const fbm = ruido(11), fbm2 = ruido(29);
  // Relieve: junto a la ciudad, un piedemonte suave; más atrás, la cordillera con filos, picos y cañadas
  const filo = (f) => { const r = 1 - Math.abs(f * 2 - 1); return r * r; };   // convierte ruido en crestas afiladas
  const altura = (x, z) => {
    const [d, w] = alRio(x, z);
    const t = acotar((d / w - 0.85) / 3.2);
    const subida = t * t * (3 - 2 * t);
    const atras = acotar((d / w - 2.4) / 4);                                    // las cumbres lejanas son más altas
    const cordillera = 1.3 + 1.7 * fbm(x * 0.17 + 3, z * 0.17)
      + 1.7 * filo(fbm2(x * 0.26 + 7, z * 0.26))
      + 0.6 * filo(fbm(x * 0.75 + 2, z * 0.75 + 9));
    const quebrada = fbm(x * 0.6 + 11, z * 0.6);                                // cañadas que bajan al valle
    return 0.03 * fbm(x * 0.9, z * 0.9)
      + subida * cordillera * (1 + 0.7 * atras)
      - 0.45 * subida * (1 - subida) * quebrada
      + 0.25 * subida * fbm2(x * 1.4, z * 1.4);
  };

  // Cuadrícula de calles (va casi norte-sur) y centros de las zonas
  const GIRO = 0.1;
  const cosG = Math.cos(GIRO), sinG = Math.sin(GIRO);
  const MANZANA = 0.16, CALLE = 0.035;
  const zonasXZ = window.ZONAS.map((z) => [X(z.lng), Z(z.lat)]);

  /* ---------- Relieve ---------- */
  // La ciudad ocupa 30 × 40 unidades; el terreno llega mucho más lejos para que las montañas
  // se pierdan en la neblina y nunca se vea dónde terminan. La malla es fina cerca y gruesa lejos.
  const ANCHO_T = 30, LARGO_T = 40, SEG_X = tactil ? 120 : 170, SEG_Z = tactil ? 150 : 215;
  const geo = new THREE.PlaneGeometry(2, 2, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colores = new Float32Array(pos.count * 3);
  const urbano = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getZ(i);
    const x = u * 17 + u * u * u * 33, z = v * 22 + v * v * v * 33;   // mitad: 50 × 55 unidades
    pos.setXYZ(i, x, altura(x, z), z);
    // Qué tan urbano es el suelo: el fondo del valle cerca de las zonas
    const [d, w] = alRio(x, z);
    const cercaZ = Math.min(...zonasXZ.map(([zx, zz]) => Math.hypot(zx - x, zz - z)));
    urbano[i] = acotar((0.98 - d / w) / 0.2) * acotar(0.25 + Math.exp(-cercaZ / 2.6)) * (d > 0.14 ? 1 : 0);
  }
  geo.computeVertexNormals();
  // Color de noche: el valle oscuro (para que brille la ciudad), las cumbres más claras como con luna,
  // las laderas empinadas más oscuras y los filos un poco más claros: así se leen como montañas
  const TONOS = [[0, "#0e2744"], [0.5, "#12304f"], [1.3, "#173a5e"], [2.4, "#1d446c"], [3.6, "#26527f"], [5.2, "#33638f"], [7, "#4073a0"]].map(([h, c]) => [h, new THREE.Color(c)]);
  const c = new THREE.Color();
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), h = pos.getY(i), z = pos.getZ(i);
    let k = 1;
    while (k < TONOS.length - 1 && h > TONOS[k][0]) k++;
    c.copy(TONOS[k - 1][1]).lerp(TONOS[k][1], acotar((h - TONOS[k - 1][0]) / (TONOS[k][0] - TONOS[k - 1][0])));
    const plano = nor.getY(i);                                 // 1 = plano, menos = empinado
    c.multiplyScalar((0.62 + 0.45 * plano * plano) * (0.9 + 0.2 * fbm2(x * 1.6 + 5, z * 1.6)));
    colores[i * 3] = c.r; colores[i * 3 + 1] = c.g; colores[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  geo.setAttribute("aUrbano", new THREE.BufferAttribute(urbano, 1));
  // El suelo de la ciudad: asfalto oscuro con la cuadrícula de calles iluminada por el alumbrado
  const matSuelo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  matSuelo.onBeforeCompile = (s) => {
    s.vertexShader = "attribute float aUrbano;\nvarying float vUrbano;\nvarying vec3 vMundo;\n" + s.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vUrbano = aUrbano;
      vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = "varying float vUrbano;\nvarying vec3 vMundo;\n" + s.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      vec2 cuad = vec2(vMundo.x * ${cosG.toFixed(5)} + vMundo.z * ${sinG.toFixed(5)}, -vMundo.x * ${sinG.toFixed(5)} + vMundo.z * ${cosG.toFixed(5)}) / ${MANZANA.toFixed(3)};
      vec2 fc = fract(cuad);
      vec2 fwc = fwidth(cuad);
      float limC = ${(CALLE / MANZANA).toFixed(4)};
      float calle = max(1.0 - smoothstep(limC, limC + fwc.x, fc.x), 1.0 - smoothstep(limC, limC + fwc.y, fc.y));
      calle = mix(limC * 1.6, calle, clamp(1.2 - max(fwc.x, fwc.y) * 2.5, 0.0, 1.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.035, 0.05), vUrbano * 0.9);
      totalEmissiveRadiance += vec3(1.0, 0.5, 0.18) * calle * vUrbano * 0.07;`);
  };
  escena.add(new THREE.Mesh(geo, matSuelo));

  /* ---------- La ciudad ---------- */
  const zonas = window.ZONAS.map((z) => ({ ...z, x: X(z.lng), z: Z(z.lat) }));
  const azar = (() => { let a = 12345; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const CENTRO = [X(-75.567), Z(6.247)], POBLADO = [X(-75.567), Z(6.208)];

  // Edificios: cada uno con su tamaño, color (mucho ladrillo, como Medellín) y ventanas encendidas
  const geoEd = new THREE.BoxGeometry(1, 1, 1);
  geoEd.translate(0, 0.5, 0);
  const matEd = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, metalness: 0.05 });
  const uVentanas = { uEncendidas: { value: 0.38 }, uBrillo: { value: 2.4 } };
  matEd.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uVentanas);
    s.vertexShader = "varying vec3 vLocal;\nvarying vec3 vNorm;\nvarying vec2 vSemilla;\n" + s.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec3 escalaEd = vec3(1.0);
      vSemilla = vec2(0.0);
      #ifdef USE_INSTANCING
        escalaEd = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vSemilla = instanceMatrix[3].xz;
      #endif
      vLocal = position * escalaEd;
      vNorm = normal;`);
    s.fragmentShader = "uniform float uEncendidas;\nuniform float uBrillo;\nvarying vec3 vLocal;\nvarying vec3 vNorm;\nvarying vec2 vSemilla;\n" + s.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float ladoEd = abs(vNorm.x) > 0.5 ? vLocal.z : vLocal.x;
      vec2 celda = vec2(ladoEd * 44.0, vLocal.y * 40.0);
      float bordeEd = max(fwidth(celda.x), fwidth(celda.y));
      float nitidez = clamp(1.4 - bordeEd * 1.6, 0.0, 1.0);
      vec2 idV = floor(celda), fV = fract(celda);
      if (abs(vNorm.y) < 0.5) {
        float ventana = step(0.2, fV.x) * step(fV.x, 0.8) * step(0.25, fV.y) * step(fV.y, 0.8);
        float azarV = fract(sin(dot(idV + floor(vSemilla * 97.0) + vNorm.xz * 7.0, vec2(12.9898, 78.233))) * 43758.5453);
        float prendida = step(1.0 - uEncendidas, azarV);
        vec3 tonoV = azarV > 0.96 ? vec3(0.7, 0.85, 1.0) : mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.84, 0.58), fract(azarV * 7.0));
        float lejosV = 0.12 * uEncendidas;
        totalEmissiveRadiance += tonoV * mix(lejosV, ventana * prendida, nitidez) * uBrillo * step(0.01, vLocal.y);
        diffuseColor.rgb *= 1.0 - 0.4 * ventana * nitidez;
      } else {
        diffuseColor.rgb *= 0.32;
      }`);
  };
  const N = tactil ? 9000 : 17000;
  const ciudad = new THREE.InstancedMesh(geoEd, matEd, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), col = new THREE.Color(), eje = new THREE.Vector3(0, 1, 0);
  const LADRILLO = ["#9a5640", "#8a4a36", "#a8664c", "#7d4432", "#b07256"].map((c) => new THREE.Color(c));
  const CONCRETO = ["#a3a7ae", "#b9b3a6", "#858d99", "#c9c4b8"].map((c) => new THREE.Color(c));
  const VIDRIO = ["#5d7d9c", "#6e8aa6", "#4f6b88"].map((c) => new THREE.Color(c));
  let n = 0;
  const poner = (x, z, ancho, fondo, alto, giro, paleta) => {
    if (n >= N) return;
    q.setFromAxisAngle(eje, giro);
    p3.set(x, altura(x, z) - 0.02, z);
    s3.set(ancho, alto + 0.02, fondo);
    m4.compose(p3, q, s3);
    ciudad.setMatrixAt(n, m4);
    ciudad.setColorAt(n, col.copy(paleta[Math.floor(azar() * paleta.length)]).multiplyScalar(0.26 + azar() * 0.12));   // de noche las fachadas se ven oscuras
    n++;
  };
  // Manzanas del fondo del valle: cada una partida en lotes, con edificios, torres y algún lote vacío
  const LOTE = (MANZANA - CALLE) / 2;
  const R = Math.ceil(26 / MANZANA);
  const densidad = tactil ? 0.55 : 1;
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    const uc = i * MANZANA + CALLE + LOTE, vc = j * MANZANA + CALLE + LOTE;
    const cx = uc * cosG - vc * sinG, cz = uc * sinG + vc * cosG;
    if (Math.abs(cx) > ANCHO_T * 0.46 || Math.abs(cz) > LARGO_T * 0.46) continue;
    const [d, w] = alRio(cx, cz);
    if (d / w > 0.97 || d < 0.2) continue;
    const cerca = Math.min(...zonasXZ.map(([zx, zz]) => Math.hypot(zx - cx, zz - cz)));
    if (azar() > (0.12 + 0.88 * Math.exp(-cerca / 2.4)) * densidad) continue;
    const dc = Math.hypot(CENTRO[0] - cx, CENTRO[1] - cz), dp = Math.hypot(POBLADO[0] - cx, POBLADO[1] - cz);
    const torre = 0.08 + 0.55 * Math.exp(-dc / 1.6) + 0.5 * Math.exp(-dp / 1.2) + 0.12 * Math.exp(-cerca / 1.2);
    for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) {
      if (azar() < 0.12) continue;                       // lote vacío o parque
      const lu = uc + a * LOTE, lv = vc + b * LOTE;
      const x = lu * cosG - lv * sinG, z = lu * sinG + lv * cosG;
      const alto = 0.03 + Math.pow(azar(), 2.4) * torre;
      const esTorre = alto > 0.22;
      const paleta = esTorre && azar() > 0.35 ? VIDRIO : azar() > 0.4 ? LADRILLO : CONCRETO;
      const lado = LOTE * (esTorre ? 0.62 + azar() * 0.2 : 0.78 + azar() * 0.16);
      poner(x, z, lado, LOTE * (0.7 + azar() * 0.25), alto, GIRO, paleta);
    }
  }
  // Barrios que suben por las laderas: casas bajas de ladrillo, sin cuadrícula
  const EN_LADERA = tactil ? 1800 : 3500;
  for (let k = 0, puestas = 0; puestas < EN_LADERA && k < EN_LADERA * 30; k++) {
    const x = (azar() - 0.5) * ANCHO_T * 0.92, z = (azar() - 0.5) * LARGO_T * 0.92;
    const [d, w] = alRio(x, z);
    const r = d / w;
    if (r < 0.97 || r > 1.8 || azar() > 0.7 * (1.8 - r)) continue;
    poner(x, z, 0.03 + azar() * 0.03, 0.03 + azar() * 0.03, 0.02 + azar() * 0.035, azar() * 3, LADRILLO);
    puestas++;
  }
  ciudad.count = n;
  ciudad.instanceMatrix.needsUpdate = true;
  escena.add(ciudad);

  // Alumbrado público: puntos de luz que dibujan las calles y suben por las laderas
  const punto = textura(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  });
  const NL = tactil ? 5000 : 9000;
  const pl = [], cl = [];
  const SODIO = new THREE.Color("#ffb05a"), LED = new THREE.Color("#dfeaff");
  for (let i = 0, k = 0; i < NL && k < NL * 30; k++) {
    let x = (azar() - 0.5) * ANCHO_T * 0.92, z = (azar() - 0.5) * LARGO_T * 0.92;
    const [d, w] = alRio(x, z);
    const r = d / w;
    if (r > 1.75 || d < 0.12) continue;
    if (r > 0.95 && azar() > 0.55 * (1.75 - r)) continue;
    if (r <= 0.95) {
      // Se pega al eje de una calle
      let u = x * cosG + z * sinG, v = -x * sinG + z * cosG;
      if (azar() < 0.5) u = Math.round(u / MANZANA) * MANZANA + CALLE / 2; else v = Math.round(v / MANZANA) * MANZANA + CALLE / 2;
      x = u * cosG - v * sinG; z = u * sinG + v * cosG;
    }
    pl.push(x, altura(x, z) + 0.012, z);
    const c = azar() < 0.7 ? SODIO : LED;
    cl.push(c.r, c.g, c.b);
    i++;
  }
  const geoL = new THREE.BufferGeometry();
  geoL.setAttribute("position", new THREE.Float32BufferAttribute(pl, 3));
  geoL.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3));
  escena.add(new THREE.Points(geoL, new THREE.PointsMaterial({ size: 0.05, map: punto, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  /* ---------- Río, autopista con tráfico y metro ---------- */
  const curva = (pts, alto) => new THREE.CatmullRomCurve3(pts.map(([la, ln]) => { const x = X(ln), z = Z(la); return new THREE.Vector3(x, altura(x, z) + alto, z); }));
  const curvaRio = curva(RIO, 0.03);
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(curvaRio, 260, 0.032, 6, false), new THREE.MeshStandardMaterial({ color: "#2f5f86", emissive: "#4f8fbf", emissiveIntensity: 0.35, roughness: 0.2 })));

  // Autopistas a lado y lado del río: carros que van y vienen
  const MUESTRAS = 700;
  const carril = (lado) => {
    const t = [];
    for (let i = 0; i <= MUESTRAS; i++) {
      const u = i / MUESTRAS, pt = curvaRio.getPointAt(u), tg = curvaRio.getTangentAt(u);
      const x = pt.x - tg.z * lado, z = pt.z + tg.x * lado;
      t.push(new THREE.Vector3(x, altura(x, z) + 0.02, z));
    }
    return t;
  };
  const carriles = [carril(0.13), carril(-0.13)];
  const NC = tactil ? 220 : 380;
  const carros = Array.from({ length: NC }, (_, i) => ({ l: i % 2, u: azar(), v: (0.008 + azar() * 0.006) * (i % 2 ? -1 : 1) }));
  const pc = new Float32Array(NC * 3), cc2 = new Float32Array(NC * 3);
  const FARO = new THREE.Color("#fff4dc"), STOP = new THREE.Color("#ff3b2e");
  carros.forEach((c, i) => { const k = c.l ? STOP : FARO; cc2.set([k.r, k.g, k.b], i * 3); });
  const geoC = new THREE.BufferGeometry();
  geoC.setAttribute("position", new THREE.BufferAttribute(pc, 3));
  geoC.setAttribute("color", new THREE.BufferAttribute(cc2, 3));
  const trafico = new THREE.Points(geoC, new THREE.PointsMaterial({ size: 0.06, map: punto, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trafico.frustumCulled = false;
  escena.add(trafico);
  const moverCarros = (dt) => {
    carros.forEach((c, i) => {
      c.u = (c.u + c.v * dt + 1) % 1;
      const p = carriles[c.l][Math.floor(c.u * MUESTRAS)];
      pc[i * 3] = p.x; pc[i * 3 + 1] = p.y; pc[i * 3 + 2] = p.z;
    });
    geoC.attributes.position.needsUpdate = true;
  };
  moverCarros(0);

  // Metro elevado: el viaducto y dos trenes en movimiento
  const METRO = [[6.338, -75.543], [6.30, -75.559], [6.27, -75.566], [6.247, -75.568], [6.212, -75.576], [6.19, -75.585], [6.175, -75.599], [6.164, -75.607], [6.153, -75.612], [6.152, -75.626]];
  const metroCurva = curva(METRO, 0.12);
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(metroCurva, 240, 0.014, 5, false), new THREE.MeshStandardMaterial({ color: "#8a9aaa", emissive: "#9fcbe6", emissiveIntensity: 0.3 })));
  const sig = new THREE.Vector3();
  const trenes = [0, 0.5].map((u, i) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.38), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f4ff", emissiveIntensity: 1.4 }));
    escena.add(t);
    return { t, u, v: i ? -0.02 : 0.02 };
  });
  const moverTrenes = (dt) => trenes.forEach((tr) => {
    tr.u = (tr.u + tr.v * dt + 1) % 1;
    metroCurva.getPointAt(tr.u, tr.t.position);
    tr.t.position.y += 0.03;
    metroCurva.getPointAt(Math.min(0.999, tr.u + 0.001), sig);
    tr.t.lookAt(sig.x, sig.y + 0.03, sig.z);
  });
  moverTrenes(0);

  /* ---------- Pines de las zonas ---------- */
  const pines = new Map();
  const cabezas = [];
  const matPin = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35, roughness: 0.4 });
  const matPinVacio = new THREE.MeshStandardMaterial({ color: "#6f8fb4", roughness: 0.6 });
  const matPinElegido = new THREE.MeshStandardMaterial({ color: "#9fcbe6", emissive: "#9fcbe6", emissiveIntensity: 1.2, roughness: 0.3 });
  zonas.forEach((z) => {
    const cuantos = V.cuenta[z.nombre] || 0;
    const largo = cuantos ? 1.6 : 1.1;
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, largo, 6), cuantos ? matPin : matPinVacio);
    palo.position.y = largo / 2;
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(cuantos ? 0.2 : 0.13, 20, 14), cuantos ? matPin : matPinVacio);
    cabeza.position.y = largo;
    cabeza.userData.zona = z.nombre;
    const aro = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 32), new THREE.MeshBasicMaterial({ color: "#9fcbe6", transparent: true, opacity: 0, side: THREE.DoubleSide }));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.08;
    const g = new THREE.Group();
    g.add(palo, cabeza, aro);
    g.position.set(z.x, altura(z.x, z.z), z.z);
    escena.add(g);
    cabezas.push(cabeza);
    pines.set(z.nombre, { g, cabeza, aro, n: cuantos, alto: largo, zona: z });
  });

  /* ---------- Etiquetas: botones reales sobre el lienzo ---------- */
  const capa = document.createElement("div");
  capa.className = "valle3d__etiquetas";
  caja.append(capa);
  const etiquetas = new Map();
  zonas.forEach((z) => {
    const { n: cuantos } = pines.get(z.nombre);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "valle3d__etiqueta" + (cuantos ? "" : " is-vacia");
    b.dataset.zona = z.nombre;
    b.setAttribute("aria-label", `Ver inmuebles en ${z.nombre}: ${cuantos} ${cuantos === 1 ? "publicado" : "publicados"}`);
    b.innerHTML = `${z.nombre}${cuantos ? `<b>${cuantos}</b>` : ""}`;
    capa.append(b);
    etiquetas.set(z.nombre, b);
    b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !saliendo) V.elegir(z.nombre); });
    b.addEventListener("click", () => volarA(z.nombre));
  });

  // Tocar un pin en el lienzo también entra a la zona
  const rayo = new THREE.Raycaster(), puntero = new THREE.Vector2();
  render.domElement.addEventListener("click", (e) => {
    if (saliendo) return;
    const r = render.domElement.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    const hit = rayo.intersectObjects(cabezas)[0];
    if (hit) volarA(hit.object.userData.zona);
  });

  let elegida = V.elegida;
  addEventListener("valle:elegida", (e) => { elegida = e.detail; });
  // Los botones de zona de la página también hacen el zoom
  addEventListener("valle:volar", (e) => volarA(e.detail));

  /* ---------- Luz ---------- */
  // Luna baja y de lado: marca las sombras de los filos y las cañadas
  escena.add(new THREE.HemisphereLight("#9fcbe6", "#061528", 0.75));
  const luna = new THREE.DirectionalLight("#cfe5ff", 2.6);
  luna.position.set(-18, 9, -8);
  escena.add(luna);

  /* ---------- Cámara: vista del valle y zoom a cada zona ---------- */
  const centro = new THREE.Vector3(X(-75.581), 0.4, Z(6.215));
  const VISTA = () => ({ objetivo: centro.clone(), radio: camara.aspect < 0.8 ? 40 : 32, pol: 0.9, az: -0.38 });
  let actual = { objetivo: centro.clone(), radio: 48, pol: 0.15, az: -0.1 };   // arranca casi desde arriba
  let vuelo = null;
  let saliendo = null;
  let tiltMeta = 0, tilt = 0;
  const ESTILOS = ["espiral", "picada", "planeo", "barrido"];
  const salida = document.createElement("div");
  salida.className = "valle3d__salida";
  salida.setAttribute("aria-hidden", "true");
  document.body.append(salida);

  // Cada zona tiene su propio vuelo; todos terminan mirando la ciudad desde arriba, a lo largo del valle
  function volarA(nombre) {
    const pin = pines.get(nombre);
    if (!pin || saliendo) return;
    V.elegir(nombre);
    saliendo = nombre;
    const url = `buscar.html?zona=${encodeURIComponent(nombre)}`;
    if (reducido) { location.href = url; return; }
    const z = pin.zona;
    const h = hash(nombre);
    const [, , tx, tz] = alRio(z.x, z.z);
    const hasta = {
      objetivo: new THREE.Vector3(z.x, altura(z.x, z.z) + 0.05, z.z),
      radio: (camara.aspect < 0.8 ? 6.5 : 5.2) + h * 1.2,
      pol: 0.72 + h * 0.14,
      az: Math.atan2(tx, tz) + (h > 0.5 ? 0 : Math.PI) + (h - 0.5) * 0.7
    };
    const estilo = ESTILOS[zonas.indexOf(z) % ESTILOS.length];
    const dur = { espiral: 2300, picada: 2000, planeo: 2200, barrido: 2000 }[estilo] * (0.9 + h * 0.25);
    vuelo = { desde: { ...actual, objetivo: actual.objetivo.clone() }, hasta, t0: performance.now(), dur, estilo, signo: h > 0.5 ? 1 : -1 };
    // Al final del zoom, un fundido con el nombre de la zona y la página de sus inmuebles
    setTimeout(() => {
      salida.innerHTML = `<p><span>Inmuebles en</span><strong>${MA.esc(nombre)}</strong></p>`;
      salida.classList.add("is-visible");
    }, dur * 0.8);
    setTimeout(() => { location.href = url; }, dur + 380);
  }
  // Al volver con el botón atrás, el valle queda como estaba
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    saliendo = null; vuelo = null;
    salida.classList.remove("is-visible");
  });

  // La cámara no sigue al mouse: así las etiquetas se quedan quietas mientras uno apunta para hacer clic
  const medirScroll = () => {
    const r = caja.getBoundingClientRect();
    tiltMeta = reducido ? 1 : acotar((innerHeight - r.top) / (innerHeight * 0.9 + r.height * 0.4));
  };
  addEventListener("scroll", medirScroll, { passive: true });
  medirScroll();
  tilt = tiltMeta;

  const medir = () => {
    const w = caja.clientWidth, h = caja.clientHeight;
    if (!w || !h) return;
    render.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  new ResizeObserver(medir).observe(caja);
  medir();

  const v = new THREE.Vector3();
  let antes = performance.now();
  function cuadro(ahora) {
    if (!visible) { corriendo = false; return; }
    const dt = Math.min(0.1, (ahora - antes) / 1000);
    antes = ahora;

    if (vuelo) {
      const t = acotar((ahora - vuelo.t0) / vuelo.dur);
      const e = enIdaYVuelta(t), s = Math.sin(Math.PI * e);
      const { desde: a, hasta: b, estilo, signo } = vuelo;
      let dAz = b.az - a.az;
      dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
      let az = a.az + dAz * e, radio = mezclar(a.radio, b.radio, e), pol = mezclar(a.pol, b.pol, e);
      if (estilo === "espiral") { az += signo * Math.PI * 2 * e; radio += s * 5; }           // baja dando una vuelta completa
      else if (estilo === "picada") { radio += s * 14; pol -= s * 0.55; }                    // sube y cae en picada
      else if (estilo === "planeo") { pol += s * 0.3; radio += s * 2; az += signo * 0.9 * s; } // planea bajo sobre el valle
      else { radio += s * 7; az += signo * 1.3 * s; pol += s * 0.15; }                        // barre de lado a lado
      actual = { objetivo: a.objetivo.clone().lerp(b.objetivo, e), radio, pol: acotar(pol, 0.05, 1.3), az };
      if (t >= 1) vuelo = null;
    } else if (saliendo) {
      actual.radio *= 0.993;                       // sigue entrando mientras aparece el fundido
    } else {
      // En la vista general, la inclinación sigue al scroll
      tilt += (tiltMeta - tilt) * 0.08;
      const e = suavizar(tilt);
      const vista = VISTA();
      actual = { objetivo: centro.clone(), radio: mezclar(48, vista.radio, e), pol: mezclar(0.15, vista.pol, e), az: mezclar(-0.1, vista.az, e) };
    }
    const { pol, az } = actual;
    const o = actual.objetivo;
    camara.position.set(o.x + actual.radio * Math.sin(pol) * Math.sin(az), o.y + actual.radio * Math.cos(pol), o.z + actual.radio * Math.sin(pol) * Math.cos(az));
    // Nunca por debajo de las montañas
    const piso = altura(camara.position.x, camara.position.z) + 0.6;
    if (camara.position.y < piso) camara.position.y = piso;
    camara.lookAt(o);

    if (!reducido) { moverCarros(dt); moverTrenes(dt); }

    // Pin elegido: más grande, celeste y con un aro que respira
    const seg = ahora / 1000;
    pines.forEach((pin, nombre) => {
      const si = nombre === elegida;
      pin.cabeza.material = si ? matPinElegido : pin.n ? matPin : matPinVacio;
      const meta = saliendo ? 0.001 : si ? 1.45 : 1;
      pin.g.scale.setScalar(Math.max(0.001, pin.g.scale.x + (meta - pin.g.scale.x) * 0.12));
      pin.aro.material.opacity = si && !saliendo ? 0.55 + (reducido ? 0 : 0.25 * Math.sin(seg * 3)) : 0;
      pin.aro.scale.setScalar(si && !reducido ? 1.2 + 0.35 * (0.5 + 0.5 * Math.sin(seg * 3)) : 1.3);
    });

    render.render(escena, camara);

    // Etiquetas sobre los pines (se esconden durante el zoom).
    // Su lugar no depende de cuál está elegida: altura fija (la del pin crecido) y orden fijo al repartirlas,
    // para que pasar el mouse por una no mueva a las demás.
    const w = caja.clientWidth, h = caja.clientHeight;
    const puestas = [];
    [...pines.entries()]
      .map(([nombre, pin], i) => {
        v.set(pin.g.position.x, pin.g.position.y + pin.alto * 1.45 + 0.35, pin.g.position.z).project(camara);
        return { nombre, i, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z, n: pin.n };
      })
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .forEach((p) => {
        const el = etiquetas.get(p.nombre);
        if (saliendo || (!p.n && p.nombre !== elegida)) { el.style.opacity = 0; el.style.pointerEvents = "none"; return; }
        el.style.pointerEvents = "";
        // El tamaño se mide una sola vez: leerlo en cada cuadro forzaba al navegador a recalcular la página
        if (!el._ancho) { el._ancho = el.offsetWidth || 0; el._alto = el.offsetHeight || 0; }
        const ew = el._ancho || 80, eh = el._alto || 26;
        const x = acotar(p.x - ew / 2, 6, w - ew - 6);
        const base = p.y - eh;
        let y = base;
        const choca = (yy) => puestas.some((r) => x < r.x + r.w + 4 && x + ew + 4 > r.x && yy < r.y + r.h + 2 && yy + eh + 2 > r.y);
        for (const d of [0, -1, 1, -2, 2, -3]) { if (!choca(base + d * eh * 0.9)) { y = base + d * eh * 0.9; break; } }
        const fuera = p.z > 1 || p.x < -40 || p.x > w + 40 || p.y < -20 || p.y > h + 20;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.opacity = fuera ? 0 : 1;
        el.classList.toggle("is-elegida", p.nombre === elegida);
        puestas.push({ x, y, w: ew, h: eh });
      });

    requestAnimationFrame(cuadro);
  }
  let visible = false, corriendo = false;
  cuandoVisible(caja, (si) => { visible = si; if (si && !corriendo) { corriendo = true; antes = performance.now(); requestAnimationFrame(cuadro); } }, "1000px");
  // Primer cuadro por adelantado, para que el valle no congele la página al llegar con el scroll
  precalentar(render, escena, camara, () => { if (!corriendo) render.render(escena, camara); });
  return true;
}
