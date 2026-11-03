/* =========================================================
   Marco Abierto — escena 3D de la portada (Three.js)
   valle(): el Valle de Aburrá de noche, con la ciudad (edificios con
   ventanas, calles, tráfico y metro). Al tocar una zona, la cámara hace
   zoom sobre ella y lleva a la página con sus inmuebles.
   Si el navegador no puede con 3D, la portada conserva su versión plana.
   ========================================================= */

import * as THREE from "three";

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

/* =========================================================
   EL VALLE DE ABURRÁ
   ========================================================= */
export async function valle(caja) {
  // Espera a que la portada tenga lista la lista de zonas y el detalle
  if (!window.VALLE) await new Promise((ok) => addEventListener("valle:listo", ok, { once: true }));
  const V = window.VALLE;

  let render;
  try { render = crearRender(caja); } catch { return false; }
  caja.classList.add("con-3d");
  render.setClearColor("#16181d", 1);

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog("#16181d", 30, 66);
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
  const TONOS = [[0, "#15161a"], [0.5, "#1a1c21"], [1.3, "#202329"], [2.4, "#272a31"], [3.6, "#30343c"], [5.2, "#3b3f48"], [7, "#474c56"]].map(([h, c]) => [h, new THREE.Color(c)]);
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
  const VIDRIO = ["#6b7079", "#7a7f88", "#5c6169"].map((c) => new THREE.Color(c));
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
  const SODIO = new THREE.Color("#ffb05a"), LED = new THREE.Color("#fff1e6");
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
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(curvaRio, 260, 0.032, 6, false), new THREE.MeshStandardMaterial({ color: "#40444d", emissive: "#9aa0aa", emissiveIntensity: 0.3, roughness: 0.2 })));

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
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(metroCurva, 240, 0.014, 5, false), new THREE.MeshStandardMaterial({ color: "#8d929c", emissive: "#ffd3bf", emissiveIntensity: 0.3 })));
  const sig = new THREE.Vector3();
  const trenes = [0, 0.5].map((u, i) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.38), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6ef", emissiveIntensity: 1.4 }));
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
  const matPinVacio = new THREE.MeshStandardMaterial({ color: "#5b606a", roughness: 0.6 });
  const matPinElegido = new THREE.MeshStandardMaterial({ color: "#ff9f7a", emissive: "#ff9f7a", emissiveIntensity: 1.2, roughness: 0.3 });
  zonas.forEach((z) => {
    const cuantos = V.cuenta[z.nombre] || 0;
    const largo = cuantos ? 1.6 : 1.1;
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, largo, 6), cuantos ? matPin : matPinVacio);
    palo.position.y = largo / 2;
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(cuantos ? 0.2 : 0.13, 20, 14), cuantos ? matPin : matPinVacio);
    cabeza.position.y = largo;
    cabeza.userData.zona = z.nombre;
    const aro = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 32), new THREE.MeshBasicMaterial({ color: "#ff9f7a", transparent: true, opacity: 0, side: THREE.DoubleSide }));
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
  escena.add(new THREE.HemisphereLight("#e6ded6", "#0b0c0f", 0.75));
  const luna = new THREE.DirectionalLight("#fff1e8", 2.6);
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

    // Pin elegido: más grande, en luz cálida y con un aro que respira
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
