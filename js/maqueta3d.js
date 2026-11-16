/* =========================================================
   Marco Abierto — maqueta 3D de las tarjetas (Three.js)

   Dibuja cada apartamento como una maqueta cortada a media altura:
   muros, puertas, ventanas, muebles, pisos y sombras suaves.
   La distribución es ILUSTRATIVA: sale del número de habitaciones,
   baños y del área. Cuando haya medidas reales se reemplaza.

   Un solo motor para toda la página: se dibuja en un lienzo oculto y
   la imagen se copia a cada tarjeta. Una tarjeta quieta no gasta nada;
   solo se vuelve a dibujar mientras gira o se encienden sus luces.

   Uso:
     import { montarMaqueta } from "./maqueta3d.js";
     const m = montarMaqueta(caja, inmueble, { estilo: "real", angulo: 35 });
     m.ir({ luz: 1, zoom: 1 }, 600);   // encender y acercar
   ========================================================= */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const ALTO = 1.1;                 // altura a la que se cortan los muros (m)
const G_EXT = 0.18, G_INT = 0.1;  // grosor de muros
const RAD = Math.PI / 180;
const acotar = (x, a, b) => Math.max(a, Math.min(b, x));
const mezclar = (a, b, t) => a + (b - a) * t;
const reducido = matchMedia("(prefers-reduced-motion: reduce)");

function azar(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* =========================================================
   Distribución: de habitaciones, baños y área a un plano en metros
   x crece a la derecha, z hacia el frente (la fachada del balcón).
   Zona social a la izquierda; alcobas a la derecha sobre un pasillo.
   ========================================================= */
export function distribuir(p) {
  const n = acotar(Math.round(Number(p.habitaciones) || 1), 1, 5);
  const b = acotar(Math.round(Number(p.banos) || 1), 1, 3);
  const A = acotar(Number(p.area) || 26 + n * 20, 30, 240);
  const D = Math.sqrt(A / 1.45), W = A / D;
  const R = W * [0, 0.45, 0.6, 0.66, 0.67, 0.69][n];
  const Ls = W - R;
  const cuartos = [], muros = [];
  const C = (tipo, nombre, x0, z0, x1, z1, extra = {}) => { const c = { tipo, nombre, x0, z0, x1, z1, ...extra }; cuartos.push(c); return c; };
  const M = (eje, c, a, b2, vanos = [], g = G_INT) => { if (b2 - a > 0.05) muros.push({ eje, c, a, b: b2, g, vanos }); };
  const atras = [], frente = [], derecha = [];   // ventanas de cada fachada
  let xk, zc;

  if (n === 1) {
    // Apartaestudio: alcoba al frente y baño atrás, sin pasillo
    zc = D * 0.36; xk = Ls * 0.64;
    const eb = acotar(D * 0.4, 1.7, 2.1);
    const zd = Math.max(zc, eb) + 0.15;
    C("bano", "Baño", Ls, 0, W, eb, { puerta: [Ls + 1.15, Ls + 1.95] });
    C("principal", "Alcoba", Ls, eb, W, D, { puertaZ: [zd, zd + 0.85], unica: true });
    M("z", Ls, 0, D, [{ t: "puerta", a: zd, b: zd + 0.85, lado: 1, bis: "a" }]);
    M("x", eb, Ls, W, [{ t: "puerta", a: Ls + 1.15, b: Ls + 1.95, lado: -1, bis: "a" }]);
    frente.push([(Ls + W) / 2 - 0.7, (Ls + W) / 2 + 0.7]);
  } else {
    const pas = 1.05;
    const zh0 = (D - pas) * 0.44, zh1 = zh0 + pas;
    zc = Math.min(D * 0.36, zh0 - 0.05);
    const suite = b >= 2;
    const pw = acotar(R * 0.5, 2.9, 3.6), xp = W - pw;
    const eb = Math.min(zh0, 2.3);
    const resto = n - 1;
    const [nf, nb] = resto === 1 ? (suite ? [1, 0] : [0, 1]) : resto === 2 ? [1, 1] : resto === 3 ? [2, 1] : [2, 2];
    const xB1 = suite ? xp : W;
    let bw = acotar((xB1 - Ls) * 0.3, 1.45, 2.0);
    if (!suite) bw = Math.min(bw, xp - Ls - 1.0);   // la puerta de la alcoba de atrás debe caber en el pasillo
    const puertasAtras = [], puertasFrente = [];
    xk = Ls * 0.64;

    // Fila de atrás: baño social y luego alcobas (o la zona de ropas)
    if (nb === 0) {
      if (xB1 - Ls - bw >= 1.2) {
        xk = Ls;
        C("ropas", "Ropas", Ls + bw, 0, xB1, zh0);
        puertasAtras.push({ t: "puerta", a: Ls + bw + 0.15, b: Ls + bw + 0.95, lado: -1, bis: "a" });
        M("z", Ls + bw, 0, zh0);
      } else bw = xB1 - Ls;
    } else {
      const xs = [];
      for (let i = 0; i <= nb; i++) xs.push(Ls + bw + ((xB1 - Ls - bw) * i) / nb);
      if (!suite && nb > 1) xs[nb - 1] = Math.min(xs[nb - 1], xp - 1.05);
      for (let i = 0; i < nb; i++) {
        C("alcoba", "Alcoba", xs[i], 0, xs[i + 1], zh0, { zPuerta: zh0, zVentana: 0 });
        puertasAtras.push({ t: "puerta", a: xs[i] + 0.12, b: xs[i] + 0.92, lado: -1, bis: "a" });
        M("z", xs[i], 0, zh0);
        const cx = (xs[i] + Math.min(xs[i + 1], W)) / 2;
        atras.push([cx - 0.6, cx + 0.6]);
      }
      if (!suite) derecha.push([zh0 / 2 - 0.6, zh0 / 2 + 0.6]);
    }
    C("bano", "Baño", Ls, 0, Ls + bw, zh0, { puerta: [Ls + 0.12, Ls + 0.92] });
    puertasAtras.push({ t: "puerta", a: Ls + 0.12, b: Ls + 0.92, lado: -1, bis: "b" });

    // Fila del frente
    if (nf === 0) {
      C("estudio", "Estudio", Ls, zh1, xp, D);
      frente.push([(Ls + xp) / 2 - 0.6, (Ls + xp) / 2 + 0.6]);
    } else {
      for (let i = 0; i < nf; i++) {
        const xa = Ls + ((xp - Ls) * i) / nf, xb = Ls + ((xp - Ls) * (i + 1)) / nf;
        C("alcoba", "Alcoba", xa, zh1, xb, D, { zPuerta: zh1, zVentana: D });
        puertasFrente.push({ t: "puerta", a: xa + 0.12, b: xa + 0.92, lado: 1, bis: "a" });
        if (i) M("z", xa, zh1, D);
        frente.push([(xa + xb) / 2 - 0.7, (xa + xb) / 2 + 0.7]);
      }
      M("x", zh1, Ls, xp, puertasFrente);
    }

    C("pasillo", "Pasillo", Ls, zh0, xp, zh1);
    C("principal", "Alcoba principal", xp, suite ? eb : zh0, W, D, { puertaZ: [zh0 + 0.1, zh0 + 0.95], suite });
    frente.push([(xp + W) / 2 - 0.8, (xp + W) / 2 + 0.8]);
    if (suite) {
      C("bano", "Baño", xp, 0, W, eb, { puerta: [W - 0.95, W - 0.15] });
      M("x", eb, xp, W, [{ t: "puerta", a: W - 0.95, b: W - 0.15, lado: -1, bis: "b" }]);
    }
    M("z", Ls, 0, zh0);
    M("z", Ls, zh1, D);
    M("x", zh0, Ls, xB1, puertasAtras);
    M("z", xp, suite ? 0 : zh0, D, [{ t: "puerta", a: zh0 + 0.1, b: zh0 + 0.95, lado: 1, bis: "a" }]);
  }

  // Zona social (igual para todos)
  C("cocina", "Cocina", 0, 0, xk, zc);
  if (xk < Ls) {
    C("ropas", "Ropas", xk, 0, Ls, zc);
    M("z", xk, 0, zc - 1.0);
    M("x", zc, xk, Ls);
  }
  C("social", "Sala-comedor", 0, zc, Ls, D);
  if (xk >= 2.2) { const cx = (0.05 + xk - 0.75) / 2; atras.push([cx - 0.6, cx + 0.6]); }
  const mc = Math.min(1.2, Ls / 2 - 0.8);
  const corrediza = [Ls / 2 - mc, Ls / 2 + mc];

  // Fachadas
  const e = G_EXT;
  const V = (lista) => lista.map(([a, b2]) => ({ t: "ventana", a, b: b2 }));
  M("x", -e / 2, -e, W + e, V(atras), e);
  M("x", D + e / 2, -e, W + e, [{ t: "corrediza", a: corrediza[0], b: corrediza[1] }, ...V(frente)], e);
  M("z", -e / 2, -e, D + e, [{ t: "puerta", a: zc + 0.2, b: zc + 1.1, lado: 1, bis: "a", principal: true }], e);
  M("z", W + e / 2, -e, D + e, V(derecha), e);

  return { W, D, n, b, Ls, xk, zc, cuartos, muros, corrediza };
}

/* =========================================================
   Texturas dibujadas (sin archivos): madera y baldosa
   ========================================================= */
function lienzo(w, h = w) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function textura(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const tinte = (a, b, t) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// 512 px = 1,6 m: listones de 20 cm
function texMadera(claro, oscuro, semilla = 7) {
  const c = lienzo(512), x = c.getContext("2d"), r = azar(semilla);
  const filas = 8, h = 512 / filas;
  for (let i = 0; i < filas; i++) {
    let px = 0;
    const corte = 80 + r() * 300;
    const tramos = [corte, 512 - corte];
    for (const largo of tramos) {
      x.fillStyle = tinte(claro, oscuro, r());
      x.fillRect(px, i * h, largo, h);
      x.strokeStyle = oscuro;
      x.globalAlpha = 0.07;
      for (let k = 0; k < 7; k++) {
        const y = i * h + 4 + r() * (h - 8);
        x.beginPath(); x.moveTo(px, y); x.bezierCurveTo(px + largo * 0.3, y + (r() - 0.5) * 5, px + largo * 0.7, y + (r() - 0.5) * 5, px + largo, y); x.stroke();
      }
      x.globalAlpha = 1;
      x.fillStyle = "rgba(40,25,10,0.3)";
      x.fillRect(px, i * h, 1.5, h);
      px += largo;
    }
    x.fillStyle = "rgba(40,25,10,0.32)";
    x.fillRect(0, i * h, 512, 1.5);
  }
  return textura(c);
}

// n × n baldosas en 256 px
function texBaldosa(base, junta, n = 2, semilla = 3) {
  const c = lienzo(256), x = c.getContext("2d"), r = azar(semilla), s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    x.fillStyle = tinte(base, junta, r() * 0.14);
    x.fillRect(i * s, j * s, s, s);
  }
  x.fillStyle = junta;
  for (let i = 0; i < n; i++) { x.fillRect(i * s, 0, 2, 256); x.fillRect(0, i * s, 256, 2); }
  return textura(c);
}

/* =========================================================
   Estilos: tres maneras de vestir la misma maqueta
   ========================================================= */
const ESTILOS = {
  // Materiales de verdad: madera, baldosa, telas
  real: {
    muro: "#f3f0ea", corte: "#30333a", base: "#111215",
    pisos: () => {
      const madera = { map: texMadera("#cfa97e", "#a47c54"), k: 1 / 1.6, color: "#ffffff" };
      return { social: madera, alcoba: madera, servicio: { map: texBaldosa("#dedad3", "#b8b2a8", 2), k: 1 / 1.2 }, bano: { map: texBaldosa("#d3d7d8", "#a4aaad", 4), k: 1 / 1.2 }, balcon: { map: texMadera("#8f8c87", "#76736e", 11), k: 1 / 1.6 } };
    },
    blanco: "#f7f5f1", cuarzo: "#ebe8e3", mueble: "#9c7652", gabinete: "#eeebe5", cabecero: "#b9ab99",
    sofa: "#8c9097", cojin: "#a9acb1", acento: "#e3a183", colchas: ["#dbcfbf", "#aab4ae", "#cbb8a6", "#929da6"],
    tapete: "#d9d0c3", negro: "#1b1c1f", metal: "#b4b7bb", planta: "#5f7c50", maceta: "#dad5cd", puerta: "#e6dfd4", pantalla: "#f6e9d8"
  },
  // Maqueta de arquitecto: toda blanca, con la luz de la marca como único acento
  blanca: {
    muro: "#f5f3ef", corte: "#f5f3ef", base: "#1d2026",
    pisos: () => ({ social: { color: "#e4e1db" }, alcoba: { color: "#e4e1db" }, servicio: { color: "#dcd9d3" }, bano: { color: "#d8d5cf" }, balcon: { color: "#cfccc6" } }),
    blanco: "#fbfaf8", cuarzo: "#f1efeb", mueble: "#f4f2ee", gabinete: "#f7f5f2", cabecero: "#efece7",
    sofa: "#f0ede8", cojin: "#f8f6f3", acento: "#ff9f7a", colchas: ["#ffd3bf", "#ffd3bf", "#ffd3bf", "#ffd3bf"],
    tapete: "#ebe8e2", negro: "#c9c6c0", metal: "#e2e0dc", planta: "#e8ebe2", maceta: "#f1efeb", puerta: "#efece7", pantalla: "#fff3e6"
  },
  // La de hoy, crecida: grafito con el filo de luz, ahora con muebles y sombras
  marca: {
    muro: "#2b2f37", corte: "#ff9f7a", corteBrilla: 0.3, base: "#0e0f12",
    pisos: () => ({ social: { color: "#ffd9c7" }, alcoba: { color: "#f3ece6" }, servicio: { color: "#e6e1db" }, bano: { color: "#eadfd8" }, balcon: { color: "#c9c4be" } }),
    blanco: "#ffffff", cuarzo: "#f5f5f3", mueble: "#3a3f49", gabinete: "#ffffff", cabecero: "#2b2f37",
    sofa: "#2b2f37", cojin: "#3a3f49", acento: "#ff9f7a", colchas: ["#ffffff", "#ffd3bf", "#ffffff", "#ffd3bf"],
    tapete: "#f6ece6", negro: "#16181d", metal: "#c9ccd1", planta: "#7f9483", maceta: "#ffffff", puerta: "#3a3f49", pantalla: "#fff0e2"
  }
};

const cacheMat = new Map();
function materiales(nombre) {
  if (cacheMat.has(nombre)) return cacheMat.get(nombre);
  const E = ESTILOS[nombre] || ESTILOS.real;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...o });
  const pisos = E.pisos();
  const piso = (d) => { const m = std(d.color || "#ffffff", { map: d.map || null, roughness: d.map ? 0.62 : 0.8 }); m.userData.k = d.k || 0; return m; };
  const M = {
    muro: std(E.muro, { roughness: 0.92 }),
    corte: std(E.corte, E.corteBrilla ? { emissive: E.corte, emissiveIntensity: E.corteBrilla } : {}),
    base: std(E.base, { roughness: 0.7 }),
    social: piso(pisos.social), alcoba: pisos.alcoba === pisos.social ? null : piso(pisos.alcoba),
    servicio: piso(pisos.servicio), bano: piso(pisos.bano), balcon: piso(pisos.balcon),
    blanco: std(E.blanco, { roughness: 0.78 }),
    cuarzo: std(E.cuarzo, { roughness: 0.35 }),
    mueble: std(E.mueble, { roughness: 0.6 }),
    gabinete: std(E.gabinete, { roughness: 0.55 }),
    cabecero: std(E.cabecero),
    sofa: std(E.sofa, { roughness: 0.95 }),
    cojin: std(E.cojin, { roughness: 0.95 }),
    acento: std(E.acento, { roughness: 0.9 }),
    colchas: E.colchas.map((c) => std(c, { roughness: 0.95 })),
    tapete: std(E.tapete, { roughness: 1 }),
    negro: std(E.negro, { roughness: 0.4 }),
    metal: std(E.metal, { roughness: 0.35, metalness: 0.25 }),
    planta: std(E.planta, { roughness: 0.9, flatShading: true }),
    maceta: std(E.maceta, { roughness: 0.6 }),
    puerta: std(E.puerta, { roughness: 0.6 }),
    pantalla: std(E.pantalla, { emissive: "#ffb074", emissiveIntensity: 0, roughness: 0.9 }),
    vidrio: std("#cfe3ee", { transparent: true, opacity: 0.22, roughness: 0.08, depthWrite: false })
  };
  if (!M.alcoba) M.alcoba = M.social;
  M.vidrio.userData.sinSombra = true;
  M.corteBrilla = E.corteBrilla || 0;
  cacheMat.set(nombre, M);
  return M;
}

/* =========================================================
   Obra: junta todas las piezas y las funde por material
   ========================================================= */
const _m = new THREE.Matrix4();

/* Piezas repetidas: cada forma se crea una vez y luego se copia (crearlas era lo más lento) */
const cacheGeo = new Map();
function deCache(clave, crear) {
  let g = cacheGeo.get(clave);
  if (!g) { g = crear(); if (g.index) g = g.toNonIndexed(); cacheGeo.set(clave, g); }
  return g.clone();
}
// Caja redondeada de cualquier tamaño a partir de una sola por radio: las esquinas se quedan
// iguales y solo se estiran las caras planas (así el radio no se deforma)
const signo = (v) => (v > 1e-6 ? 1 : v < -1e-6 ? -1 : 0);
function cajaRedondeada(w, h, d, r) {
  const rr = Math.round(r * 1000) / 1000, b = 2 * rr + 0.004;
  const g = deCache(`rb${rr}`, () => new RoundedBoxGeometry(b, b, b, 2, rr));
  const p = g.attributes.position.array;
  const ex = (w - b) / 2, ey = (h - b) / 2, ez = (d - b) / 2;
  for (let i = 0; i < p.length; i += 3) {
    p[i] += signo(p[i]) * ex; p[i + 1] += signo(p[i + 1]) * ey; p[i + 2] += signo(p[i + 2]) * ez;
  }
  return g;
}

class Obra {
  constructor() { this.porMat = new Map(); this.pila = [new THREE.Matrix4()]; }
  get marco() { return this.pila[this.pila.length - 1]; }
  // Todo lo que se dibuje dentro queda puesto en (x, z) y girado ry
  en(x, z, ry, fn) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
    this.pila.push(this.marco.clone().multiply(m));
    fn();
    this.pila.pop();
  }
  geo(mat, g, x, y, z, ry = 0) {
    if (g.index) g = g.toNonIndexed();
    _m.makeRotationY(ry).setPosition(x, y, z).premultiply(this.marco);
    // Solo hay giros sobre el eje vertical y traslados: se aplica a mano, mucho más rápido que applyMatrix4
    const e = _m.elements, pa = g.attributes.position.array, na = g.attributes.normal.array;
    for (let i = 0; i < pa.length; i += 3) {
      const px = pa[i], py = pa[i + 1], pz = pa[i + 2], nx = na[i], nz = na[i + 2];
      pa[i] = e[0] * px + e[4] * py + e[8] * pz + e[12];
      pa[i + 1] = py + e[13];
      pa[i + 2] = e[2] * px + e[6] * py + e[10] * pz + e[14];
      na[i] = e[0] * nx + e[8] * nz;
      na[i + 2] = e[2] * nx + e[10] * nz;
    }
    const k = mat.userData.k;
    if (k) {
      const uv = g.attributes.uv.array;
      for (let i = 0, j = 0; i < pa.length; i += 3, j += 2) { uv[j] = pa[i] * k; uv[j + 1] = pa[i + 2] * k; }
    }
    if (!this.porMat.has(mat)) this.porMat.set(mat, []);
    this.porMat.get(mat).push(g);
  }
  // y es la base de la pieza
  caja(mat, w, h, d, x, y, z, { r = 0, ry = 0 } = {}) {
    const rr = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
    const g = rr > 0.004 ? cajaRedondeada(w, h, d, rr) : new THREE.BoxGeometry(w, h, d);
    this.geo(mat, g, x, y + h / 2, z, ry);
  }
  cil(mat, r1, r2, h, x, y, z, { seg = 18, sx = 1, sz = 1, acostado = false, ry = 0 } = {}) {
    const g = deCache(`c${r1},${r2},${h},${seg},${sx},${sz},${acostado}`, () => {
      const c = new THREE.CylinderGeometry(r1, r2, h, seg);
      if (acostado) c.rotateX(Math.PI / 2);
      if (sx !== 1 || sz !== 1) c.scale(sx, 1, sz);
      return c;
    });
    this.geo(mat, g, x, acostado ? y : y + h / 2, z, ry);
  }
  bola(mat, r, x, y, z) { this.geo(mat, deCache(`b${r}`, () => new THREE.IcosahedronGeometry(r, 1)), x, y, z); }
  piso(mat, x0, z0, x1, z1, y = 0) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    this.geo(mat, g, (x0 + x1) / 2, y, (z0 + z1) / 2);
  }
  malla() {
    const grupo = new THREE.Group();
    for (const [mat, lista] of this.porMat) {
      const m = new THREE.Mesh(mergeGeometries(lista, false), mat);
      m.castShadow = !mat.userData.sinSombra;
      m.receiveShadow = true;
      if (mat.transparent) m.renderOrder = 2;
      grupo.add(m);
    }
    return grupo;
  }
}

/* =========================================================
   Muebles
   Cada mueble se dibuja en su propio marco: el frente mira a +z.
   ========================================================= */
// Cabecera en -z, pies en +z
function cama(o, M, x, z, ry, ancho, colcha) {
  o.en(x, z, ry, () => {
    o.caja(M.mueble, ancho + 0.06, 0.2, 2.02, 0, 0.05, 0, { r: 0.02 });
    o.caja(M.blanco, ancho, 0.2, 1.96, 0, 0.25, 0.01, { r: 0.06 });
    o.caja(colcha, ancho + 0.05, 0.09, 1.25, 0, 0.385, 0.37, { r: 0.04 });
    o.caja(M.blanco, ancho + 0.05, 0.095, 0.2, 0, 0.385, -0.33, { r: 0.04 });
    const na = ancho < 1.2 ? 1 : 2;
    for (let i = 0; i < na; i++) {
      const px = na === 1 ? 0 : (i ? 1 : -1) * ancho * 0.24;
      o.caja(M.blanco, na === 1 ? ancho - 0.25 : ancho / 2 - 0.12, 0.13, 0.36, px, 0.44, -0.72, { r: 0.06 });
    }
    o.caja(M.cabecero, ancho + 0.1, 0.92, 0.07, 0, 0, -1.035, { r: 0.03 });
  });
}

function mesaNoche(o, M, x, z) {
  o.caja(M.mueble, 0.42, 0.42, 0.38, x, 0, z, { r: 0.015 });
  o.cil(M.metal, 0.05, 0.06, 0.02, x, 0.42, z);
  o.cil(M.metal, 0.01, 0.01, 0.18, x, 0.44, z, { seg: 8 });
  o.cil(M.pantalla, 0.075, 0.1, 0.14, x, 0.6, z);
}

function closet(o, M, x0, z0, x1, z1) {
  o.caja(M.gabinete, x1 - x0, ALTO - 0.03, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { r: 0.012 });
}

// Espaldar en -z; se sienta mirando a +z
function sofa(o, M, x, z, ry, largo) {
  o.en(x, z, ry, () => {
    o.caja(M.sofa, largo, 0.3, 0.88, 0, 0.07, 0, { r: 0.06 });
    o.caja(M.sofa, largo, 0.42, 0.2, 0, 0.34, -0.34, { r: 0.08 });
    for (const s of [-1, 1]) o.caja(M.sofa, 0.18, 0.5, 0.88, s * (largo / 2 - 0.09), 0.07, 0, { r: 0.08 });
    const n = largo > 1.9 ? 3 : 2, w = (largo - 0.4) / n;
    for (let i = 0; i < n; i++) o.caja(M.cojin, w - 0.02, 0.14, 0.6, -largo / 2 + 0.2 + w * (i + 0.5), 0.36, 0.1, { r: 0.05 });
    o.caja(M.acento, 0.36, 0.34, 0.12, -largo / 2 + 0.42, 0.5, -0.16, { r: 0.05, ry: 0.25 });
    o.caja(M.blanco, 0.34, 0.32, 0.12, largo / 2 - 0.42, 0.5, -0.16, { r: 0.05, ry: -0.3 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.cil(M.negro, 0.02, 0.015, 0.07, sx * (largo / 2 - 0.08), 0, sz * 0.36, { seg: 8 });
  });
}

function silla(o, M, x, z, ry) {
  o.en(x, z, ry, () => {
    o.caja(M.blanco, 0.42, 0.05, 0.42, 0, 0.42, 0, { r: 0.02 });
    o.caja(M.blanco, 0.42, 0.4, 0.045, 0, 0.45, -0.19, { r: 0.02 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.cil(M.mueble, 0.016, 0.013, 0.42, sx * 0.17, 0, sz * 0.17, { seg: 8 });
  });
}

function comedor(o, M, x, z, largo, puestos) {
  o.caja(M.mueble, largo, 0.045, 0.88, x, 0.71, z, { r: 0.015 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.cil(M.mueble, 0.03, 0.022, 0.71, x + sx * (largo / 2 - 0.1), 0, z + sz * 0.34, { seg: 10 });
  const lado = puestos >= 6 ? 3 : 2, paso = (largo - 0.3) / lado;
  for (let i = 0; i < lado; i++) {
    const px = x - largo / 2 + 0.15 + paso * (i + 0.5);
    silla(o, M, px, z - 0.6, 0);
    silla(o, M, px, z + 0.6, Math.PI);
  }
  // Centro de mesa
  o.cil(M.maceta, 0.07, 0.05, 0.12, x, 0.755, z, { seg: 12 });
  o.bola(M.planta, 0.09, x, 0.93, z);
}

function mesaRedonda(o, M, x, z) {
  o.cil(M.mueble, 0.42, 0.42, 0.04, x, 0.7, z, { seg: 28 });
  o.cil(M.mueble, 0.05, 0.05, 0.7, x, 0, z, { seg: 10 });
  o.cil(M.mueble, 0.24, 0.26, 0.025, x, 0, z, { seg: 20 });
  silla(o, M, x - 0.66, z, Math.PI / 2);
  silla(o, M, x + 0.66, z, -Math.PI / 2);
}

function planta(o, M, x, z, rnd, alta = false) {
  o.cil(M.maceta, 0.15, 0.11, 0.28, x, 0, z, { seg: 14 });
  if (alta) {
    o.cil(M.mueble, 0.018, 0.022, 0.6, x, 0.26, z, { seg: 6 });
    for (let i = 0; i < 6; i++) o.bola(M.planta, 0.15 + rnd() * 0.1, x + (rnd() - 0.5) * 0.36, 0.86 + rnd() * 0.36, z + (rnd() - 0.5) * 0.36);
  } else {
    for (let i = 0; i < 5; i++) o.bola(M.planta, 0.11 + rnd() * 0.09, x + (rnd() - 0.5) * 0.24, 0.4 + rnd() * 0.24, z + (rnd() - 0.5) * 0.24);
  }
}

function lamparaPie(o, M, x, z) {
  o.cil(M.negro, 0.13, 0.14, 0.02, x, 0, z, { seg: 16 });
  o.cil(M.negro, 0.012, 0.012, 1.2, x, 0.02, z, { seg: 8 });
  o.cil(M.pantalla, 0.14, 0.19, 0.24, x, 1.2, z);
}

function taburete(o, M, x, z) {
  o.cil(M.mueble, 0.17, 0.17, 0.04, x, 0.62, z, { seg: 16 });
  o.cil(M.negro, 0.02, 0.02, 0.62, x, 0, z, { seg: 8 });
  o.cil(M.negro, 0.15, 0.16, 0.015, x, 0, z, { seg: 16 });
}

/* ---------- Cuartos ---------- */
function amoblarSocial(o, M, d, c, rnd, luces) {
  const { Ls, D, zc, xk } = d;
  const fondo = D - zc;
  // Sala: sofá contra el muro izquierdo, televisor al frente
  const largo = fondo > 4.2 ? 2.1 : 1.7;
  const zs = D - 0.5 - largo / 2 - 0.25;
  sofa(o, M, 0.5, zs, Math.PI / 2, largo);
  const xr = Math.min(Ls - 0.6, 3.3);
  o.caja(M.tapete, xr - 0.7, 0.014, largo + 0.5, (0.7 + xr) / 2, 0.002, zs, { r: 0.005 });
  o.caja(M.mueble, 0.5, 0.04, 0.95, 1.5, 0.32, zs, { r: 0.015 });
  o.caja(M.negro, 0.42, 0.3, 0.8, 1.5, 0.02, zs, { r: 0.02 });
  o.caja(M.blanco, 0.16, 0.03, 0.22, 1.5, 0.36, zs - 0.2, { ry: 0.3 });
  if (Ls >= 3.3) {
    o.caja(M.mueble, 0.38, 0.4, 1.6, Ls - 0.27, 0.06, zs, { r: 0.015 });
    o.caja(M.negro, 0.035, 0.6, 1.15, Ls - 0.2, 0.48, zs, { r: 0.01 });
    planta(o, M, Ls - 0.4, D - 0.42, rnd, true);
  }
  lamparaPie(o, M, 0.36, D - 0.36);
  // Comedor, hacia la cocina
  if (fondo >= 4.6 && Ls >= 3.6) {
    const seis = Ls >= 4.6;
    comedor(o, M, acotar(Ls * 0.56, 1.75, Ls - 1.35), zc + 1.85, seis ? 1.9 : 1.45, seis ? 6 : 4);
  } else if (fondo >= 3.4 && Ls >= 3.6) mesaRedonda(o, M, Ls - 1.25, zc + 1.2);
  // Tapete de la entrada
  o.caja(M.tapete, 0.5, 0.012, 0.75, 0.42, 0.002, zc + 0.65);
  luces.push({ x: Ls * 0.45, z: zs, i: 1.25 }, { x: Ls * 0.55, z: zc + 1.4, i: 0.9 });
}

function amoblarCocina(o, M, d, c, luces) {
  const { xk, zc } = d;
  const x1 = xk - 0.78;
  // Mesón del fondo con lavaplatos
  o.caja(M.gabinete, x1 - 0.05, 0.86, 0.6, (0.05 + x1) / 2, 0, 0.33, { r: 0.01 });
  o.caja(M.cuarzo, x1 - 0.03, 0.04, 0.63, (0.05 + x1) / 2, 0.86, 0.335);
  const xs = (0.05 + x1) / 2;
  o.caja(M.metal, 0.5, 0.012, 0.36, xs, 0.9, 0.34, { r: 0.004 });
  o.caja(M.negro, 0.42, 0.006, 0.28, xs, 0.912, 0.34);
  o.cil(M.metal, 0.012, 0.012, 0.2, xs, 0.9, 0.1, { seg: 8 });
  o.caja(M.metal, 0.02, 0.02, 0.14, xs, 1.08, 0.16);
  // Nevera
  o.caja(M.metal, 0.68, ALTO - 0.04, 0.66, xk - 0.42, 0, 0.38, { r: 0.02 });
  o.caja(M.negro, 0.02, 0.5, 0.02, xk - 0.7, 0.4, 0.725);
  // Mesón lateral con estufa
  if (zc >= 2.6) {
    const z1 = zc - 1.1;
    o.caja(M.gabinete, 0.6, 0.86, z1 - 0.63, 0.33, 0, (0.63 + z1) / 2, { r: 0.01 });
    o.caja(M.cuarzo, 0.63, 0.04, z1 - 0.61, 0.335, 0.86, (0.63 + z1) / 2);
    const ze = (0.63 + z1) / 2;
    o.caja(M.negro, 0.5, 0.012, 0.56, 0.34, 0.9, ze, { r: 0.004 });
    for (const a of [-1, 1]) for (const b of [-1, 1]) o.cil(M.metal, 0.075, 0.075, 0.008, 0.34 + a * 0.12, 0.912, ze + b * 0.14, { seg: 16 });
  } else {
    o.caja(M.negro, 0.5, 0.012, 0.48, Math.max(0.4, xs - 0.75), 0.9, 0.34, { r: 0.004 });
  }
  // Barra con taburetes, abierta a la sala
  const b1 = xk - 0.2, b0 = Math.max(1.3, b1 - 1.9);
  if (b1 - b0 >= 1.0) {
    o.caja(M.gabinete, b1 - b0, 0.96, 0.4, (b0 + b1) / 2, 0, zc - 0.05, { r: 0.01 });
    o.caja(M.cuarzo, b1 - b0 + 0.08, 0.045, 0.6, (b0 + b1) / 2, 0.96, zc + 0.02, { r: 0.012 });
    const nt = b1 - b0 > 1.6 ? 3 : 2;
    for (let i = 0; i < nt; i++) taburete(o, M, b0 + ((b1 - b0) * (i + 0.5)) / nt, zc + 0.5);
  }
  luces.push({ x: xk * 0.5, z: zc * 0.55, i: 0.85 });
}

function amoblarRopas(o, M, c) {
  const x = c.x1 - 0.42, z = c.z0 + 0.4;
  o.caja(M.blanco, 0.6, 0.85, 0.6, x, 0, z, { r: 0.03 });
  o.cil(M.negro, 0.2, 0.2, 0.02, x, 0.48, z + 0.305, { acostado: true, seg: 20 });
  o.cil(M.vidrio, 0.15, 0.15, 0.03, x, 0.48, z + 0.31, { acostado: true, seg: 20 });
  if (c.x1 - c.x0 >= 1.5) {
    o.caja(M.blanco, 0.55, 0.85, 0.5, x - 0.68, 0, z - 0.04, { r: 0.02 });
    o.caja(M.metal, 0.42, 0.012, 0.36, x - 0.68, 0.85, z - 0.04);
  }
}

// Todos los baños tienen la puerta en el muro del frente (z1); la ducha va al fondo o a un extremo
function amoblarBano(o, M, c, luces) {
  const w = c.x1 - c.x0, f = c.z1 - c.z0;
  const pc = (c.puerta[0] + c.puerta[1]) / 2;
  const puertaIzq = pc < (c.x0 + c.x1) / 2;
  const inodoro = (x, z, ry) => o.en(x, z, ry, () => {
    o.caja(M.blanco, 0.38, 0.42, 0.17, 0, 0.36, -0.26, { r: 0.03 });
    o.cil(M.blanco, 0.19, 0.15, 0.4, 0, 0, 0.02, { sz: 1.3, seg: 20 });
    o.cil(M.cuarzo, 0.195, 0.195, 0.03, 0, 0.4, 0.02, { sz: 1.3, seg: 20 });
  });
  const lavamanos = (x, z, ry, ancho) => o.en(x, z, ry, () => {
    o.caja(M.mueble, ancho, 0.5, 0.44, 0, 0.3, 0, { r: 0.012 });
    o.caja(M.cuarzo, ancho + 0.02, 0.035, 0.46, 0, 0.8, 0);
    o.cil(M.blanco, 0.17, 0.13, 0.07, 0, 0.835, 0.02, { seg: 20 });
    o.cil(M.metal, 0.011, 0.011, 0.16, 0, 0.835, -0.17, { seg: 8 });
  });
  if (w > 2.4) {
    // Baño ancho: ducha en el extremo lejano a la puerta, aparatos contra el muro del fondo
    const s = puertaIzq ? 1 : -1;
    const xd = puertaIzq ? c.x1 : c.x0;
    o.caja(M.blanco, 0.9, 0.04, f - 0.14, xd - s * 0.52, 0.001, (c.z0 + c.z1) / 2, { r: 0.01 });
    o.caja(M.vidrio, 0.016, ALTO - 0.12, f - 0.14, xd - s * 0.98, 0.04, (c.z0 + c.z1) / 2);
    o.cil(M.metal, 0.09, 0.09, 0.012, xd - s * 0.5, ALTO - 0.05, c.z0 + 0.3, { seg: 16 });
    inodoro(xd - s * 1.5, c.z0 + 0.42, 0);
    const xo = puertaIzq ? c.x0 : c.x1, borde = xd - s * 1.85;
    const anchoL = Math.min(1.0, Math.abs(xo - borde) - 0.3);
    if (anchoL >= 0.5) lavamanos((borde + xo) / 2, c.z0 + 0.3, 0, anchoL);
  } else {
    // Baño angosto: ducha al fondo, aparatos contra el muro opuesto a la puerta
    const s = puertaIzq ? 1 : -1;
    const xm = puertaIzq ? c.x1 : c.x0;
    const zd = c.z0 + 0.92;
    o.caja(M.blanco, w - 0.14, 0.04, 0.84, (c.x0 + c.x1) / 2, 0.001, c.z0 + 0.5, { r: 0.01 });
    o.caja(M.vidrio, w - 0.14, ALTO - 0.12, 0.016, (c.x0 + c.x1) / 2, 0.04, zd);
    o.cil(M.metal, 0.09, 0.09, 0.012, (c.x0 + c.x1) / 2, ALTO - 0.05, c.z0 + 0.3, { seg: 16 });
    const libre = c.z1 - zd;
    inodoro(xm - s * 0.42, zd + Math.min(0.5, libre * 0.3), -s * Math.PI / 2);
    if (libre >= 1.35) lavamanos(xm - s * 0.3, c.z1 - 0.5, -s * Math.PI / 2, Math.min(0.7, libre - 0.85));
  }
  luces.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, i: 0.45 });
}

function amoblarAlcoba(o, M, c, rnd, luces) {
  const w = c.x1 - c.x0, f = Math.abs(c.zVentana - c.zPuerta);
  const dz = Math.sign(c.zVentana - c.zPuerta);
  const Z = (t) => c.zPuerta + dz * t;   // t = distancia desde el muro de la puerta
  const colcha = M.colchas[Math.floor(rnd() * M.colchas.length)];
  // Clóset contra el muro izquierdo, pasando la puerta
  const lc = Math.min(1.9, f - 1.55);
  if (lc >= 0.9) closet(o, M, c.x0 + 0.06, Math.min(Z(f - 0.12), Z(f - 0.12 - lc)), c.x0 + 0.62, Math.max(Z(f - 0.12), Z(f - 0.12 - lc)));
  if (w >= 3.4) {
    // Cama con la cabecera en el muro derecho
    const ancho = w >= 3.6 ? 1.5 : 1.4;
    const t = f - 0.6 - ancho / 2;
    cama(o, M, c.x1 - 1.1, Z(t), -Math.PI / 2, ancho, colcha);
    mesaNoche(o, M, c.x1 - 0.3, Z(t + ancho / 2 + 0.3));
    if (t - ancho / 2 - 0.55 > 0.9) mesaNoche(o, M, c.x1 - 0.3, Z(t - ancho / 2 - 0.3));
    o.caja(M.tapete, 1.5, 0.012, ancho + 0.7, c.x1 - 1.75, 0.002, Z(t), { r: 0.004 });
  } else {
    // Cuarto angosto: cama a lo largo, cabecera hacia la ventana
    const ancho = w >= 2.9 ? 1.4 : w >= 2.5 ? 1.2 : 1.0;
    const x = c.x1 - 0.1 - ancho / 2;
    cama(o, M, x, Z(f - 1.12), dz > 0 ? Math.PI : 0, ancho, colcha);
    if (w - ancho - 0.75 >= 0.5) mesaNoche(o, M, x - ancho / 2 - 0.3, Z(f - 0.3));
  }
  luces.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, i: 0.7 });
}

function amoblarPrincipal(o, M, d, c, rnd, luces) {
  const { W, D } = d;
  const w = c.x1 - c.x0;
  const ancho = c.unica ? 1.4 : w >= 3.3 ? 1.8 : 1.5;
  const zb = Math.max(D - 0.9 - ancho / 2, c.z0 + ancho / 2 + 0.2);
  cama(o, M, W - 1.1, zb, -Math.PI / 2, ancho, M.colchas[Math.floor(rnd() * M.colchas.length)]);
  mesaNoche(o, M, W - 0.3, zb + ancho / 2 + 0.3);
  if (zb - ancho / 2 - 0.55 > c.z0 + 0.7) mesaNoche(o, M, W - 0.3, zb - ancho / 2 - 0.3);
  o.caja(M.tapete, 1.7, 0.012, ancho + 0.8, W - 1.85, 0.002, zb, { r: 0.004 });
  if (c.unica) {
    // Apartaestudio: clóset contra el muro de la entrada, pasando la puerta
    const z0 = c.puertaZ[1] + 0.35, z1 = D - 0.14;
    if (z1 - z0 >= 0.9) closet(o, M, c.x0 + 0.06, z0, c.x0 + 0.62, z1);
  } else {
    // Clóset contra el muro del fondo, sin estorbar las puertas
    const x0 = c.z0 + 0.75 > c.puertaZ[0] ? c.x0 + 1.0 : c.x0 + 0.1;
    const x1 = c.suite ? W - 1.15 : W - 0.1;
    if (x1 - x0 >= 0.9 && zb - ancho / 2 - c.z0 >= 1.5) closet(o, M, x0, c.z0 + 0.06, x1, c.z0 + 0.64);
    if (w >= 3.3) o.caja(M.cojin, 0.4, 0.4, Math.min(1.3, ancho - 0.2), W - 2.42, 0.03, zb, { r: 0.06 });
    planta(o, M, c.x0 + 0.42, D - 0.42, rnd, true);
  }
  luces.push({ x: (c.x0 + c.x1) / 2, z: zb, i: 0.85 });
}

function amoblarEstudio(o, M, c, rnd, luces) {
  const x = c.x1 - 0.36, z = c.z0 + 1.25;
  o.caja(M.mueble, 0.6, 0.04, 1.3, x, 0.72, z, { r: 0.012 });
  for (const s of [-1, 1]) o.caja(M.negro, 0.5, 0.72, 0.03, x, 0, z + s * 0.6);
  o.caja(M.negro, 0.02, 0.3, 0.5, x + 0.18, 0.78, z);
  silla(o, M, x - 0.55, z, -Math.PI / 2);
  o.caja(M.tapete, 1.4, 0.012, 1.8, c.x0 + 1.0, 0.002, z + 0.2, { r: 0.004 });
  planta(o, M, c.x0 + 0.4, c.z1 - 0.4, rnd, true);
  luces.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, i: 0.6 });
}

function balcon(o, M, d, rnd) {
  const x0 = 0.25, x1 = d.Ls - 0.25, z0 = d.D + G_EXT, z1 = z0 + 1.15;
  o.caja(M.base, x1 - x0 + 0.1, 0.14, z1 - z0 + 0.05, (x0 + x1) / 2, -0.15, (z0 + z1) / 2);
  o.piso(M.balcon, x0, z0, x1, z1, -0.008);
  o.caja(M.vidrio, x1 - x0, 0.9, 0.016, (x0 + x1) / 2, 0, z1 - 0.02);
  o.caja(M.negro, x1 - x0 + 0.04, 0.03, 0.045, (x0 + x1) / 2, 0.9, z1 - 0.02);
  for (const x of [x0, x1]) {
    o.caja(M.vidrio, 0.016, 0.9, z1 - z0 - 0.02, x, 0, (z0 + z1) / 2);
    o.caja(M.negro, 0.045, 0.03, z1 - z0, x, 0.9, (z0 + z1) / 2);
  }
  if (x1 - x0 >= 2.4) {
    const cx = x0 + 0.95, cz = (z0 + z1) / 2 - 0.05;
    o.cil(M.mueble, 0.26, 0.26, 0.03, cx, 0.5, cz, { seg: 20 });
    o.cil(M.negro, 0.02, 0.02, 0.5, cx, 0, cz, { seg: 8 });
    silla(o, M, cx - 0.55, cz, Math.PI / 2);
    silla(o, M, cx + 0.55, cz, -Math.PI / 2);
    planta(o, M, x1 - 0.35, cz, rnd);
  }
}

/* =========================================================
   Muros, puertas y ventanas
   ========================================================= */
function levantarMuro(o, M, m) {
  const tramo = (a, b, y0, y1, mat = M.muro, tapa = true) => {
    if (b - a < 0.01) return;
    const l = b - a, c = (a + b) / 2;
    if (m.eje === "x") o.caja(mat, l, y1 - y0, m.g, c, y0, m.c);
    else o.caja(mat, m.g, y1 - y0, l, m.c, y0, c);
    // El corte del muro (la tapa) lleva su propio color
    if (tapa && M.corte !== M.muro && y1 >= ALTO) {
      if (m.eje === "x") o.caja(M.corte, l, 0.012, m.g, c, ALTO, m.c);
      else o.caja(M.corte, m.g, 0.012, l, m.c, ALTO, c);
    }
  };
  const vanos = [...m.vanos].sort((p, q) => p.a - q.a);
  let x = m.a;
  for (const v of vanos) {
    tramo(x, v.a, 0, ALTO);
    if (v.t === "ventana") {
      tramo(v.a, v.b, 0, 0.72, M.muro, false);
      tramo(v.a, v.b, 0.72, 0.75, M.blanco, false);
      const l = v.b - v.a, c = (v.a + v.b) / 2;
      if (m.eje === "x") o.caja(M.vidrio, l, ALTO - 0.75, 0.02, c, 0.75, m.c);
      else o.caja(M.vidrio, 0.02, ALTO - 0.75, l, m.c, 0.75, c);
    } else if (v.t === "corrediza") {
      const l = v.b - v.a, c = (v.a + v.b) / 2;
      o.caja(M.negro, l, 0.03, 0.08, c, 0, m.c);
      o.caja(M.vidrio, l * 0.52, ALTO - 0.03, 0.016, c - l * 0.24, 0.03, m.c - 0.02);
      o.caja(M.vidrio, l * 0.52, ALTO - 0.03, 0.016, c + l * 0.24, 0.03, m.c + 0.02);
      for (const px of [v.a + 0.015, c, v.b - 0.015]) o.caja(M.negro, 0.03, ALTO - 0.03, 0.05, px, 0.03, m.c);
    } else if (v.t === "puerta") {
      // Hoja abierta, girada sobre su bisagra
      const l = v.b - v.a, h = v.bis === "a" ? v.a : v.b, dir = v.bis === "a" ? 1 : -1;
      const ang = (v.principal ? 62 : 78) * RAD;
      const dx = m.eje === "x" ? dir * Math.cos(ang) : v.lado * Math.sin(ang);
      const dz = m.eje === "x" ? v.lado * Math.sin(ang) : dir * Math.cos(ang);
      const hx = m.eje === "x" ? h : m.c, hz = m.eje === "x" ? m.c : h;
      o.en(hx, hz, Math.atan2(-dz, dx), () => o.caja(M.puerta, l - 0.03, ALTO - 0.02, 0.04, l / 2, 0, 0, { r: 0.006 }));
    }
    x = v.b;
  }
  tramo(x, m.b, 0, ALTO);
}

/* =========================================================
   Construcción de una maqueta completa
   ========================================================= */
const TIPO_PISO = { social: "social", estudio: "social", pasillo: "social", alcoba: "alcoba", principal: "alcoba", cocina: "servicio", ropas: "servicio", bano: "bano" };
const CON_MEDIDA = new Set(["social", "cocina", "alcoba", "principal", "estudio"]);

// Cada apartamento se arma una sola vez por estilo: la tarjeta, la vista rápida y el visor comparten la misma maqueta
const cacheModelos = new Map();
function construir(p, estilo) {
  const clave = [estilo, p.id, p.habitaciones, p.banos, p.area].join("|");
  if (!cacheModelos.has(clave)) cacheModelos.set(clave, armar(p, estilo));
  return cacheModelos.get(clave);
}

function armar(p, estilo) {
  const M = materiales(estilo);
  const d = distribuir(p);
  const o = new Obra();
  const rnd = azar(hash(p.id || "ma"));
  const luces = [];

  // Base de la maqueta
  const e = G_EXT;
  o.caja(M.base, d.W + e * 2 + 0.36, 0.16, d.D + e * 2 + 0.36, d.W / 2, -0.17, d.D / 2, { r: 0.03 });
  for (const c of d.cuartos) o.piso(M[TIPO_PISO[c.tipo]], c.x0, c.z0, c.x1, c.z1);
  // Franja de piso bajo los muros (se ve en los vanos de las puertas)
  o.piso(M.base, -e, -e, d.W + e, d.D + e, -0.006);
  for (const m of d.muros) levantarMuro(o, M, m);

  for (const c of d.cuartos) {
    if (c.tipo === "social") amoblarSocial(o, M, d, c, rnd, luces);
    else if (c.tipo === "cocina") amoblarCocina(o, M, d, c, luces);
    else if (c.tipo === "ropas") amoblarRopas(o, M, c);
    else if (c.tipo === "bano") amoblarBano(o, M, c, luces);
    else if (c.tipo === "alcoba") amoblarAlcoba(o, M, c, rnd, luces);
    else if (c.tipo === "principal") amoblarPrincipal(o, M, d, c, rnd, luces);
    else if (c.tipo === "estudio") amoblarEstudio(o, M, c, rnd, luces);
    else if (c.tipo === "pasillo") luces.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, i: 0.4 });
  }
  balcon(o, M, d, rnd);

  // Centrado: el giro es sobre el centro del apartamento
  const cx = d.W / 2, cz = (d.D + 0.6) / 2;
  const cuerpo = o.malla();
  cuerpo.position.set(-cx, 0, -cz);
  const grupo = new THREE.Group();
  grupo.add(cuerpo);
  luces.sort((a, b) => b.i - a.i);
  // Esquinas de la caja que envuelve la maqueta: con ellas se encuadra la cámara
  const env = new THREE.Box3().setFromObject(grupo);
  const esquinas = [];
  for (const x of [env.min.x, env.max.x]) for (const y of [env.min.y, env.max.y]) for (const z of [env.min.z, env.max.z]) esquinas.push([x, y, z]);
  return {
    grupo, M, esquinas,
    radio: 0.5 * Math.hypot(d.W + 0.8, d.D + 1.9),
    luces: luces.slice(0, FOCOS).map((l) => ({ x: l.x - cx, z: l.z - cz, i: l.i })),
    medidas: d.cuartos.filter((c) => CON_MEDIDA.has(c.tipo)).map((c) => ({
      x: (c.x0 + c.x1) / 2 - cx, z: (c.z0 + c.z1) / 2 - cz,
      texto: `${Math.round((c.x1 - c.x0) * (c.z1 - c.z0))} m²`, nombre: c.nombre
    }))
  };
}

/* =========================================================
   Taller: el único motor de dibujo, compartido por todas las tarjetas
   ========================================================= */
const FOCOS = 6;
const FOV = 26, ELEVACION = 52 * RAD;
let taller = null;

function crearTaller() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 4 / 3, 0.5, 300);
  const cielo = new THREE.HemisphereLight(0xffffff, 0x8d919b, 1);
  const sol = new THREE.DirectionalLight(0xfff2e2, 2.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  const relleno = new THREE.DirectionalLight(0xcdd7ff, 0.5);
  const focos = [];
  for (let i = 0; i < FOCOS; i++) { const f = new THREE.PointLight(0xffb27a, 0, 10, 1.7); focos.push(f); escena.add(f); }
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.5 }));
  sombra.receiveShadow = true;
  sombra.position.y = -0.172;
  escena.add(cielo, sol, sol.target, relleno, sombra);
  return { r, escena, camara, cielo, sol, relleno, focos, sombra, dia: new THREE.Color(0xfff2e2), noche: new THREE.Color(0x8fa6ff) };
}

/* Encuadre: la distancia justa para que la maqueta llene la tarjeta sin cortarse,
   en todos los ángulos por los que va a pasar. Se calcula una vez por tamaño. */
const MIRA = 0.25, MARGEN_X = 0.86, MARGEN_Y = 0.82;
function encuadrar(t, aspecto) {
  const clave = Math.round(aspecto * 200);
  if (t.encuadre && t.encuadre.clave === clave) return t.encuadre;
  const tv = Math.tan((FOV / 2) * RAD), th = tv * aspecto;
  const sE = Math.sin(ELEVACION), cE = Math.cos(ELEVACION);
  const angulos = [];
  if (t.libre) for (let a = 0; a < 360; a += 20) angulos.push(a);
  else angulos.push(t.base - 26, t.base - 13, t.base);
  const puntos = [];
  for (const g of angulos) {
    const c = Math.cos(g * RAD), s = Math.sin(g * RAD);
    for (const [x, y, z] of t.modelo.esquinas) puntos.push([x * c + z * s, y - MIRA, -x * s + z * c]);
  }
  const limites = (dist) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y, z] of puntos) {
      // Coordenadas vistas desde la cámara (mira al origen desde arriba y al frente)
      const vy = y - dist * sE, vz = z - dist * cE;
      const hondo = -(vy * sE) - vz * cE;
      const nx = x / (hondo * th), ny = (vy * cE - vz * sE) / (hondo * tv);
      if (nx < x0) x0 = nx; if (nx > x1) x1 = nx; if (ny < y0) y0 = ny; if (ny > y1) y1 = ny;
    }
    return { x0, x1, y0, y1 };
  };
  let dist = t.modelo.radio * 3.2, l = limites(dist);
  for (let i = 0; i < 5; i++) {
    dist *= Math.max((l.x1 - l.x0) / 2 / MARGEN_X, (l.y1 - l.y0) / 2 / MARGEN_Y);
    l = limites(dist);
  }
  t.encuadre = { clave, dist: dist * t.ajuste, cx: (l.x0 + l.x1) / 2, cy: (l.y0 + l.y1) / 2 };
  return t.encuadre;
}

const _v = new THREE.Vector3();
function dibujar(t) {
  if (!t.modelo || t.w < 2 || t.h < 2) return;
  const T = taller, mod = t.modelo, L = t.luz;
  const lienzoGL = T.r.domElement;
  // Mientras gira o se encienden las luces se dibuja con menos puntos (no se nota en movimiento);
  // el último cuadro, ya quieto, sale con toda la nitidez
  const moviendo = t.arrastrando || Object.keys(t.tramos).length > 0;
  const k = moviendo ? Math.min(1, 1.25 / t.dpr) : 1;
  const rw = Math.max(2, Math.round(t.w * k)), rh = Math.max(2, Math.round(t.h * k));
  if (lienzoGL.width !== rw || lienzoGL.height !== rh) T.r.setSize(rw, rh, false);
  // Cámara: se aleja lo justo para que quepa la maqueta; el zoom la acerca un poco
  const aspecto = t.w / t.h;
  const enc = encuadrar(t, aspecto);
  const acerca = mezclar(1, 0.9, t.zoom);
  const dist = enc.dist * acerca;
  T.camara.aspect = aspecto;
  T.camara.position.set(0, MIRA + dist * Math.sin(ELEVACION), dist * Math.cos(ELEVACION));
  T.camara.lookAt(0, MIRA, 0);
  T.camara.updateProjectionMatrix();
  // Centra la maqueta en la tarjeta (un poco a la izquierda: a la derecha va la franja de luz)
  const pe = T.camara.projectionMatrix.elements;
  pe[8] += enc.cx / acerca / t.ajuste + t.corrimiento;
  pe[9] += enc.cy / acerca / t.ajuste;
  // Luz de día que baja cuando se encienden las luces de la casa
  T.cielo.intensity = mezclar(1.0, 0.2, L);
  T.sol.intensity = mezclar(2.5, 0.42, L);
  T.sol.color.copy(T.dia).lerp(T.noche, L);
  T.relleno.intensity = mezclar(0.5, 0.12, L);
  const R = mod.radio;
  T.sol.position.set(-R * 1.5, R * 2.6, R * 1.1);
  const sc = T.sol.shadow.camera;
  sc.left = sc.bottom = -R * 1.25; sc.right = sc.top = R * 1.25; sc.near = 0.5; sc.far = R * 8;
  sc.updateProjectionMatrix();
  T.sombra.scale.set(R * 6, 1, R * 6);
  const a = t.ang * RAD, c = Math.cos(a), s = Math.sin(a);
  mod.grupo.rotation.y = a;
  T.focos.forEach((f, i) => {
    const l = mod.luces[i];
    if (!l) { f.intensity = 0; return; }
    f.position.set(l.x * c + l.z * s, 1.55, -l.x * s + l.z * c);
    f.intensity = L * l.i * 5.2;
  });
  mod.M.pantalla.emissiveIntensity = L * 2.4;
  if (mod.M.corteBrilla) mod.M.corte.emissiveIntensity = mod.M.corteBrilla + L * 0.55;
  T.escena.add(mod.grupo);
  T.r.render(T.escena, T.camara);
  t.ctx.clearRect(0, 0, t.w, t.h);
  t.ctx.drawImage(lienzoGL, 0, 0, rw, rh, 0, 0, t.w, t.h);
  // Medidas: cada una sigue a su cuarto
  if (t.medidas) {
    mod.grupo.updateMatrixWorld();
    const cw = t.w / t.dpr, ch = t.h / t.dpr;
    t.etiquetas.forEach((m, i) => {
      _v.set(m.x, 0.05, m.z).applyMatrix4(mod.grupo.matrixWorld).project(T.camara);
      t.medidas.children[i].style.transform = `translate(${((_v.x * 0.5 + 0.5) * cw).toFixed(1)}px, ${((-_v.y * 0.5 + 0.5) * ch).toFixed(1)}px) translate(-50%, -50%)`;
    });
  }
  T.escena.remove(mod.grupo);
  if (!t.listo) { t.listo = true; t.caja.classList.add("is-lista"); if (t.alListo) t.alListo(); }
}

const compilados = new Set();

/* ---------- Primer dibujo de cada maqueta: una por cuadro, para no trabar la página ---------- */
const cola = [];
let colaCorre = false;
function encolar(t) {
  if (cola.includes(t)) return;
  cola.push(t);
  if (colaCorre) return;
  colaCorre = true;
  const siguiente = () => {
    const t2 = cola.shift();
    if (t2 && t2.vivo && t2.visible) { t2.preparar(); t2.sucio = false; dibujar(t2); }
    if (cola.length) requestAnimationFrame(siguiente); else colaCorre = false;
  };
  requestAnimationFrame(siguiente);
}

/* ---------- Medidas: las reales si las hay; si se piden, las de la maqueta ----------
   medidas: false (ninguna), true (calculadas de la maqueta) o un objeto con las reales:
   { "Sala-comedor": 22, "Cocina": 7.5, "Alcoba principal": 14, "Alcoba": [10, 9] } */
function elegirMedidas(lista, medidas) {
  if (!medidas) return [];
  if (medidas === true) return lista;
  const usadas = {};
  const fmt = (n) => `${Number(n).toLocaleString("es-CO", { maximumFractionDigits: 1 })} m²`;
  return lista.flatMap((m) => {
    let v = medidas[m.nombre] ?? (m.nombre === "Alcoba principal" ? medidas["Alcoba ppal."] : undefined);
    if (Array.isArray(v)) { const i = usadas[m.nombre] = (usadas[m.nombre] ?? -1) + 1; v = v[i]; }
    return Number(v) > 0 ? [{ ...m, texto: fmt(v) }] : [];
  });
}

/* ---------- Animación: solo corre mientras algo cambia ---------- */
const activas = new Set();
let cuadro = 0;
const curva = { ang: (x) => 1 - Math.pow(1 - x, 4), luz: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2), zoom: (x) => 1 - Math.pow(1 - x, 3) };
function latido(ahora) {
  cuadro = 0;
  for (const t of activas) {
    let sigue = false;
    for (const k in t.tramos) {
      const tr = t.tramos[k];
      const x = Math.min(1, (ahora - tr.t0) / tr.ms);
      t[k] = mezclar(tr.de, tr.a, curva[k](x));
      if (x < 1) sigue = true; else delete t.tramos[k];
    }
    if (t.visible) dibujar(t); else t.sucio = true;
    if (!sigue) activas.delete(t);
  }
  if (activas.size) cuadro = requestAnimationFrame(latido);
}
function pedir(t) { activas.add(t); if (!cuadro) cuadro = requestAnimationFrame(latido); }

export function hay3D() {
  if (taller) return true;
  try { taller = crearTaller(); return true; } catch { return false; }
}

/* =========================================================
   Montar una maqueta dentro de una caja
   ========================================================= */
export function montarMaqueta(caja, p, { estilo = "real", angulo = 35, base = angulo, medidas = true, ajuste = 1, arrastrar = false, corrimiento = 0.035, alListo = null } = {}) {
  if (!hay3D()) return null;
  const lienzo2d = document.createElement("canvas");
  lienzo2d.className = "maqueta__lienzo";
  lienzo2d.setAttribute("role", "img");
  lienzo2d.setAttribute("aria-label", `Maqueta ilustrativa de la distribución: ${p.habitaciones} habitaciones y ${p.banos} baños`);
  caja.classList.add("maqueta");
  caja.append(lienzo2d);
  const t = {
    caja, p, estilo, ajuste, base, corrimiento, alListo, libre: arrastrar, encuadre: null, ctx: lienzo2d.getContext("2d"),
    ang: angulo, luz: 0, zoom: 0, tramos: {}, vivo: true, arrastrando: false, etiquetas: [],
    w: 0, h: 0, dpr: 1, visible: false, sucio: true, listo: false, modelo: null, medidas: null
  };
  if (medidas) {
    t.medidas = document.createElement("div");
    t.medidas.className = "maqueta__medidas";
    t.medidas.setAttribute("aria-hidden", "true");
    caja.append(t.medidas);
  }
  const preparar = t.preparar = () => {
    if (t.modelo) return;
    t.modelo = construir(p, estilo);
    t.etiquetas = elegirMedidas(t.modelo.medidas, medidas);
    if (t.medidas) t.medidas.innerHTML = t.etiquetas.map((m) => `<span>${m.texto}</span>`).join("");
  };
  // Se arma por adelantado cuando el navegador está libre, no justo cuando aparece al bajar.
  // La primera maqueta de cada estilo también deja listos sus sombreados (compilarlos al bajar trababa)
  const libre = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  libre(() => {
    if (!t.vivo) return;
    preparar();
    if (!compilados.has(estilo)) {
      compilados.add(estilo);
      const T = taller;
      // Un dibujo diminuto (2 × 2 puntos) prepara también las sombras y las luces
      T.escena.add(t.modelo.grupo);
      T.r.setSize(2, 2, false);
      try { T.r.render(T.escena, T.camara); } catch { /* se prepara al dibujar */ }
      T.escena.remove(t.modelo.grupo);
    }
  }, { timeout: 4000 });
  const medir = () => {
    const r = caja.getBoundingClientRect();
    // Nitidez de pantalla retina, sin pasar de ~4 millones de puntos (pantalla completa en monitores grandes)
    t.dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / Math.max(1, r.width * r.height)));
    const w = Math.round(r.width * t.dpr), h = Math.round(r.height * t.dpr);
    if (w === t.w && h === t.h) return;
    t.w = lienzo2d.width = w; t.h = lienzo2d.height = h;
    t.sucio = true;
  };
  // La primera vez espera su turno en la cola; después se redibuja al momento
  const pintar = () => {
    if (!t.visible || !t.sucio) return;
    if (!t.modelo) { encolar(t); return; }
    t.sucio = false; dibujar(t);
  };
  const ro = new ResizeObserver(() => { medir(); pintar(); });
  ro.observe(caja);
  const io = new IntersectionObserver((es) => {
    t.visible = es[es.length - 1].isIntersecting;
    if (t.visible) { medir(); pintar(); }
  }, { rootMargin: "300px" });
  io.observe(caja);

  const ir = (meta, ms = 600) => {
    const ahora = performance.now();
    for (const k of ["ang", "luz", "zoom"]) {
      if (meta[k] === undefined) continue;
      if (reducido.matches || ms <= 0) { t[k] = meta[k]; delete t.tramos[k]; }
      else t.tramos[k] = { de: t[k], a: meta[k], t0: ahora, ms: typeof ms === "object" ? ms[k] || 600 : ms };
    }
    pedir(t);
  };

  if (arrastrar) {
    let x0 = null, a0 = 0;
    caja.addEventListener("pointerdown", (e) => { x0 = e.clientX; a0 = t.ang; delete t.tramos.ang; caja.setPointerCapture(e.pointerId); });
    caja.addEventListener("pointermove", (e) => { if (x0 === null) return; t.arrastrando = true; t.ang = a0 + (e.clientX - x0) * 0.4; pedir(t); });
    // Al soltar, un último cuadro con toda la nitidez
    const soltar = () => { x0 = null; if (t.arrastrando) { t.arrastrando = false; pedir(t); } };
    caja.addEventListener("pointerup", soltar);
    caja.addEventListener("pointercancel", soltar);
  }

  return {
    ir,
    get estado() { return { ang: t.ang, luz: t.luz, zoom: t.zoom }; },
    get listo() { return t.listo; },
    destruir() {
      t.vivo = false;
      ro.disconnect(); io.disconnect(); activas.delete(t);
      // La maqueta queda guardada para las demás vistas del mismo apartamento
      lienzo2d.remove(); if (t.medidas) t.medidas.remove();
    }
  };
}
