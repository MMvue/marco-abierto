/* =========================================================
   Marco Abierto — lógica compartida
   - Íconos (sprite), encabezado y pie comunes
   - Modelo 3D ilustrativo dibujado desde los datos
   - Visor: Recorrido 3D / Fotos, pantalla completa
   - Tarjetas, formularios con consentimiento, apariciones
   ========================================================= */

document.documentElement.classList.add("js");

const MA = (() => {
  const reducido = matchMedia("(prefers-reduced-motion: reduce)");
  const punteroFino = matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- Íconos literales ---------- */
  const ICONOS = {
    casa: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    llave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="m17 6 3 3"/><path d="m14.5 8.5 2.5 2.5"/>',
    metro: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M9 7h6"/><path d="m8 21 2-4"/><path d="m16 21-2-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
    cama: '<path d="M3 18V6"/><path d="M3 14h18v4"/><path d="M21 14v-1a3 3 0 0 0-3-3h-7v4"/><circle cx="6.5" cy="11.5" r="1.5"/>',
    ducha: '<path d="M6 21V7a4 4 0 0 1 8 0"/><path d="M11 8h7"/><path d="M12 12v1"/><path d="M15 12v1"/><path d="M18 12v1"/><path d="M13.5 15.5v1"/><path d="M16.5 15.5v1"/>',
    carro: '<path d="M3 16h18v-4l-2-5H5l-2 5z"/><path d="M3 12h18"/><path d="M5 16v3"/><path d="M19 16v3"/><circle cx="7" cy="14" r=".6"/><circle cx="17" cy="14" r=".6"/>',
    area: '<path d="M3 9V3h6"/><path d="M21 15v6h-6"/><path d="m3 3 7 7"/><path d="m21 21-7-7"/>',
    cubo: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
    foto: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6 10 3.5h4L15.5 6"/>',
    ubicacion: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    filtro: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    cerrar: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
    expandir: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
    contraer: '<path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    mensaje: '<path d="M4 5h16v11H9l-5 4z"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    flecha: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    documento: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6"/><path d="M10 17h6"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    campana: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    edificio: '<path d="M4 21V4h11v17"/><path d="M15 9h5v12"/><path d="M2 21h20"/><path d="M8 8h3"/><path d="M8 12h3"/><path d="M8 16h3"/>',
    mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    girar: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    escudo: '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    puerta: '<path d="M5 21V3h14v18"/><path d="M2 21h20"/><path d="M9 21V7.5l7-2V21"/><circle cx="13.5" cy="13.5" r=".7"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    pesos: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .9 3 2.1-1.3 1.9-3 1.9c-1.5 0-2.6-.6-3-1.6"/><path d="M12 6v12"/>',
    socio: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 8v6"/><path d="M14 11h6"/>'
  };

  function icono(nombre, clase = "") {
    return `<svg class="icono ${clase}" aria-hidden="true" viewBox="0 0 24 24"><use href="#i-${nombre}"/></svg>`;
  }

  // Símbolo del logo en versión plana: el marco inclinado con su vidrio y la M
  function logoSVG(color = "#ffffff", vidrio = "#9fcbe6") {
    return `<svg class="marca__simbolo" viewBox="0 0 140 82" aria-hidden="true">
      <path fill="${color}" fill-rule="evenodd" d="M30 6 L76 0 L58 74 L10 74 Z M38.5 15.5 L64 12.5 L50.5 64 L23 64 Z"/>
      <path fill="${vidrio}" d="M36 64 L49.5 64 L63 14 L58 18 Z"/>
      <path fill="${vidrio}" d="M76 25 L82 25 L96 66 L92 74 Z"/>
      <path fill="${color}" d="M82 25 L95 25 L106 55 L112 39 L124 39 L138 74 L125 74 L117.5 55 L110 74 L98 74 Z"/>
      <path fill="${vidrio}" d="M112 39 L117 39 L109 60 L106.5 55 Z"/>
    </svg>`;
  }

  function montarSprite() {
    const simbolos = Object.entries(ICONOS)
      .map(([n, d]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`)
      .join("");
    const div = document.createElement("div");
    div.hidden = true;
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${simbolos}</svg>`;
    document.body.prepend(div);
  }

  /* ---------- Encabezado y pie (un solo lugar para editarlos) ---------- */
  const NAV = [
    { href: "buscar.html?operacion=arriendo", texto: "Arriendo", icono: "llave", id: "arriendo" },
    { href: "buscar.html?operacion=venta", texto: "Venta", icono: "casa", id: "venta" },
    { href: "propietarios.html", texto: "Propietarios", icono: "persona", id: "propietarios" },
    { href: "panel.html", texto: "Mi panel", icono: "edificio", id: "panel" }
  ];

  function montarBarra() {
    const lugar = document.querySelector("[data-barra]");
    if (!lugar) return;
    const actual = document.body.dataset.pagina;
    const enlaces = NAV.map((n) => `<a href="${n.href}"${n.id === actual ? ' aria-current="page"' : ""}>${n.texto}</a>`).join("");
    const enlacesMovil = NAV.map((n) => `<a href="${n.href}">${icono(n.icono)}${n.texto}</a>`).join("");
    lugar.outerHTML = `
      <header class="barra">
        <div class="contenedor barra__fila">
          <a class="marca" href="index.html" aria-label="Marco Abierto, inicio">${logoSVG()}<span class="marca__texto" aria-hidden="true"><b>MARCO</b><span>ABIERTO</span></span></a>
          <nav class="barra__nav" aria-label="Principal">${enlaces}</nav>
          <div class="barra__acciones">
            <a class="barra__ingresar" href="ingreso.html"${actual === "ingreso" ? ' aria-current="page"' : ""}>${icono("persona")}<span>Ingresar</span></a>
            <a class="boton barra__publicar" href="propietarios.html#publicar">Publicar inmueble</a>
            <button class="barra__menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-movil">${icono("menu")}</button>
          </div>
        </div>
      </header>
      <div class="menu-movil" id="menu-movil" hidden>
        <div class="menu-movil__cab">
          <a class="marca" href="index.html" aria-label="Marco Abierto, inicio">${logoSVG()}<span class="marca__texto" aria-hidden="true"><b>MARCO</b><span>ABIERTO</span></span></a>
          <button class="barra__menu" type="button" aria-label="Cerrar menú" data-cerrar-menu>${icono("cerrar")}</button>
        </div>
        <nav aria-label="Menú">${enlacesMovil}<a href="ingreso.html">${icono("persona")}Ingresar o crear cuenta</a><a href="privacidad.html">${icono("escudo")}Privacidad</a></nav>
        <a class="boton" href="propietarios.html#publicar">Publicar mi inmueble</a>
      </div>`;

    const menu = document.getElementById("menu-movil");
    const abrir = document.querySelector(".barra .barra__menu");
    const cerrar = menu.querySelector("[data-cerrar-menu]");
    const alternar = (si) => {
      menu.hidden = !si;
      abrir.setAttribute("aria-expanded", String(si));
      document.body.classList.toggle("sin-scroll", si);
      (si ? cerrar : abrir).focus();
    };
    abrir.addEventListener("click", () => alternar(true));
    cerrar.addEventListener("click", () => alternar(false));
    menu.addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
  }

  function montarPie() {
    const lugar = document.querySelector("[data-pie]");
    if (!lugar) return;
    lugar.outerHTML = `
      <footer class="pie">
        <div class="contenedor">
          <div class="pie__arriba">
          <!-- El marco del logo, grande: el vidrio se abre cuando el pie aparece -->
          <div class="pie__marco" data-aparece aria-hidden="true">
            <svg viewBox="6 -4 74 82">
              <path fill="#ffffff" fill-rule="evenodd" d="M30 6 L76 0 L58 74 L10 74 Z M38.5 15.5 L64 12.5 L50.5 64 L23 64 Z"/>
              <path class="pie__vidrio" fill="#9fcbe6" d="M36 64 L49.5 64 L63 14 L58 18 Z"/>
            </svg>
          </div>
          <div class="pie__cols">
            <div>
              <h2>Marco Abierto</h2>
              <p>Arriendo y venta de apartamentos en Medellín y el Valle de Aburrá, con recorrido 3D en cada inmueble.</p>
              <p style="margin-top:14px"><span class="marcador">WhatsApp, correo y dirección de oficina</span></p>
            </div>
            <div>
              <h2>Buscar</h2>
              <ul>
                <li><a href="buscar.html?operacion=arriendo">Arriendo</a></li>
                <li><a href="buscar.html?operacion=venta">Venta</a></li>
                <li><a href="buscar.html">Todos los inmuebles</a></li>
              </ul>
            </div>
            <div>
              <h2>Propietarios</h2>
              <ul>
                <li><a href="ingreso.html?modo=registro&amp;rol=propietario">Crear cuenta de propietario</a></li>
                <li><a href="propietarios.html">Cómo trabajamos</a></li>
                <li><a href="propietarios.html#publicar">Publicar inmueble</a></li>
                <li><a href="panel.html">Panel del propietario</a></li>
                <li><a href="socio.html">Panel del socio referidor</a></li>
              </ul>
            </div>
            <div>
              <h2>Legal</h2>
              <ul>
                <li><a href="privacidad.html">Aviso de privacidad</a></li>
                <li><a href="privacidad.html#politica">Política de tratamiento de datos</a></li>
                <li><a href="privacidad.html#derechos">Tus derechos como titular</a></li>
              </ul>
            </div>
          </div>
          </div>
          <div class="pie__legal">
            <p>Tratamos tus datos personales según la Ley 1581 de 2012 y la Ley 1266 de 2008. Puedes conocer, actualizar, rectificar o pedir que eliminemos tus datos en cualquier momento: <a class="enlace" href="privacidad.html#derechos">así se hace</a>.</p>
            <p><span class="marcador">Razón social y NIT</span> · © ${new Date().getFullYear()} Marco Abierto</p>
          </div>
        </div>
      </footer>`;
  }

  /* ---------- Formatos ---------- */
  const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  function precioHTML(p) {
    if (p.precio == null) return "Consultar precio";
    return `${pesos.format(p.precio)}${p.operacion === "arriendo" ? '<small class="precio__extra"> /mes</small>' : ""}`;
  }

  function specsHTML(p) {
    // El área va primero y siempre se muestra (si falta, se dice que está por confirmar)
    const items = [
      p.area ? `<li class="specs__area">${icono("area")}${Number(p.area).toLocaleString("es-CO")} m²</li>` : `<li class="specs__area is-pendiente">${icono("area")}m² por confirmar</li>`,
      `<li>${icono("cama")}${p.habitaciones} ${p.habitaciones === 1 ? "habitación" : "habitaciones"}</li>`,
      `<li>${icono("ducha")}${p.banos} ${p.banos === 1 ? "baño" : "baños"}</li>`
    ];
    const parq = Number(p.parqueaderos) || (p.parqueadero ? 1 : 0);
    if (parq) items.push(`<li>${icono("carro")}${parq === 1 ? "Parqueadero" : `${parq} parqueaderos`}</li>`);
    return `<ul class="specs">${items.join("")}</ul>`;
  }

  const OPERACION = { arriendo: "Arriendo", venta: "Venta" };
  const lugar = (p) => [p.barrio, p.zona, p.municipio].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");

  /* ---------- Distribución ilustrativa del apartamento ----------
     Se dibuja desde habitaciones y baños. No es la distribución real:
     se reemplaza por las fotos y el recorrido de cada inmueble. */
  function cuartos(p) {
    const r = [];
    const n = Math.max(1, Math.min(5, p.habitaciones));
    r.push({ x: -50, y: -35, w: 30, h: 26, nombre: "Cocina", tipo: "servicio" });
    r.push({ x: -20, y: -35, w: 25, h: 18, nombre: "Baño", tipo: "bano" });
    r.push({ x: -20, y: -17, w: 25, h: 8, nombre: "Ropas", tipo: "servicio" });
    r.push({ x: -50, y: -9, w: 55, h: 44, nombre: "Sala-comedor", tipo: "social" });
    const alto = 70 / n;
    for (let i = 0; i < n; i++) {
      const y = -35 + i * alto;
      r.push({ x: 5, y, w: 45, h: alto, nombre: i === 0 && n > 1 ? "Alcoba principal" : "Alcoba", tipo: "alcoba" });
      if (i === 0 && p.banos >= 2) Object.assign(r.at(-1), { etiquetaW: 28, nombre: "Alcoba ppal." });
      if (i === 0 && p.banos >= 2) r.push({ x: 33, y, w: 17, h: Math.min(16, alto * 0.6), nombre: "Baño", tipo: "bano" });
    }
    return r;
  }

  const COLOR_PISO = { social: "#cfe5f3", alcoba: "#e8f2fa", servicio: "#b3d4ea", bano: "#d6e6f2" };

  function muebles(p) {
    const m = [];
    const n = Math.max(1, Math.min(5, p.habitaciones));
    const alto = 70 / n;
    for (let i = 0; i < n; i++) {
      const y = -35 + i * alto;
      const h = Math.min(18, alto - 6);
      m.push({ x: 10, y: y + (alto - h) / 2, w: 15, h, c: "#ffffff" });
    }
    m.push({ x: -44, y: 20, w: 26, h: 9, c: "#11304f" });  // sofá
    m.push({ x: -30, y: 0, w: 16, h: 10, c: "#ffffff" });  // comedor
    m.push({ x: -48, y: -33, w: 26, h: 5, c: "#ffffff" }); // mesón
    return m;
  }

  const rect = (c) => `M${c.x} ${c.y}h${c.w}v${c.h}h${-c.w}z`;

  function matrizIso(grados) {
    const a = (grados * Math.PI) / 180;
    const c = Math.cos(a), s = Math.sin(a);
    return `matrix(${c.toFixed(4)} ${(0.5 * s).toFixed(4)} ${(-s).toFixed(4)} ${(0.5 * c).toFixed(4)} 0 0)`;
  }

  let contadorModelos = 0;
  const CAPAS = 22;

  function modeloSVG(p) {
    const id = `m${++contadorModelos}`;
    const cs = cuartos(p);
    const pisos = cs.map((c) => `<path d="${rect(c)}" fill="${COLOR_PISO[c.tipo]}"/>`).join("");
    const mueb = muebles(p).map((m) => `<path d="${rect(m)}" fill="${m.c}"/>`).join("");
    const interiores = cs.map(rect).join("");
    const exterior = "M-50 -35h100v70h-100z";
    const capas = [];
    for (let k = 1; k <= CAPAS; k++) {
      const tope = k === CAPAS;
      capas.push(`<g data-capa="${k}"><use href="#${id}-int" stroke="${tope ? "#9fcbe6" : "#1b4370"}"/><use href="#${id}-ext" stroke="${tope ? "#9fcbe6" : "#0a2540"}"/></g>`);
    }
    return `<svg viewBox="0 0 400 300" role="img" aria-label="Vista previa ilustrativa de la distribución: ${p.habitaciones} habitaciones y ${p.banos} baños" data-modelo>
      <defs>
        <path id="${id}-int" d="${interiores}" fill="none" stroke-width="1.5" stroke-linejoin="round"/>
        <path id="${id}-ext" d="${exterior}" fill="none" stroke-width="2.6" stroke-linejoin="round"/>
      </defs>
      <g data-capa="0"><path d="${exterior}" fill="#0a2540" transform="translate(0 3)"/>${pisos}<g data-muebles>${mueb}</g></g>
      ${capas.join("")}
    </svg>`;
  }

  function girarModelo(svg, grados) {
    const m = matrizIso(grados);
    svg.querySelectorAll("[data-capa]").forEach((g) => {
      const k = Number(g.dataset.capa);
      g.setAttribute("transform", `translate(200 ${152 - k * 1.25}) scale(2.95) ${m}`);
    });
    svg.dataset.angulo = grados;
  }

  function animarGiro(svg, desde, hasta, ms = 900) {
    if (reducido.matches) { girarModelo(svg, hasta); return; }
    const t0 = performance.now();
    cancelAnimationFrame(svg._raf);
    const paso = (t) => {
      const x = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - x, 4);
      girarModelo(svg, desde + (hasta - desde) * e);
      if (x < 1) svg._raf = requestAnimationFrame(paso);
    };
    svg._raf = requestAnimationFrame(paso);
  }

  /* ---------- Visor: Recorrido 3D / Fotos ---------- */
  let contadorVisores = 0;
  const FOTOS_PENDIENTES = ["Sala", "Cocina", "Alcoba principal", "Baño", "Vista desde el balcón", "Fachada"];

  // Todo texto que viene de la base de datos se muestra como texto
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Solo se cargan imágenes y recorridos de direcciones seguras
  const urlSegura = (u) => (/^(https:\/\/|data:image\/)/.test(String(u || "")) || /^[\w./-]+$/.test(String(u || "")) ? esc(u) : "");

  function visorHTML(p, { titulo = true } = {}) {
    const id = `v${++contadorVisores}`;
    const fotosOk = (p.fotos || []).map(urlSegura).filter(Boolean);
    const fotos = fotosOk.length
      ? fotosOk.map((src, i) => `<figure class="visor__foto"><img src="${src}" alt="${esc(p.titulo)}, foto ${i + 1} de ${fotosOk.length}" loading="lazy" decoding="async"></figure>`).join("")
      : FOTOS_PENDIENTES.map((f) => `<figure class="visor__foto foto-vacia">${icono("foto")}<span><strong>Foto real pendiente</strong><br>${f}</span></figure>`).join("");
    const totalFotos = fotosOk.length || FOTOS_PENDIENTES.length;

    // Miniatura de la pestaña de fotos: en celular se ve el ícono; en pantallas anchas, la primera foto
    const miniFotos = icono("foto") + (fotosOk[0] ? `<img src="${fotosOk[0]}" alt="" loading="lazy">` : "");

    // Mientras carga el recorrido se ve una portada: la primera foto o el modelo ilustrativo
    const portada = fotosOk[0]
      ? `<img class="visor__portada" src="${fotosOk[0]}" alt="" decoding="async">`
      : `<div class="visor__modelo" tabindex="0" aria-label="Vista previa ilustrativa. Usa las flechas para girar">${modeloSVG(p)}</div>`;
    const tour = urlSegura(p.tour);
    const panel3d = tour
      ? `${portada}
         <button class="boton visor__cargar" type="button" data-cargar-tour="${tour}">${icono("cubo")}Entrar al recorrido 3D</button>`
      : `${portada}
         <div class="visor__nota">
           ${p.ejemplo ? "" : '<span class="pastilla pastilla--oscura">Recorrido 3D en preparación</span>'}
           ${fotosOk[0] ? "" : `<span class="pastilla pastilla--oscura">${icono("girar")}Arrastra para girar</span>`}
         </div>`;

    return `<div class="visor" data-visor data-inmueble="${esc(p.id)}">
      <div class="visor__escena">
        <div class="visor__sup">
          ${tour || p.ejemplo ? `<span class="pastilla">${icono("cubo")}3D</span>` : "<span></span>"}
        </div>
        <div class="visor__panel" role="tabpanel" id="${id}-3d" aria-labelledby="${id}-t3d">${panel3d}</div>
        <div class="visor__panel visor__galeria" role="tabpanel" id="${id}-fotos" aria-labelledby="${id}-tfotos" hidden>
          <div class="visor__fotos" tabindex="0" aria-label="Fotos del inmueble. Desliza o usa las flechas">${fotos}</div>
          <button class="visor__flecha visor__flecha--ant" type="button" data-foto="-1" aria-label="Foto anterior">${icono("flecha")}</button>
          <button class="visor__flecha visor__flecha--sig" type="button" data-foto="1" aria-label="Foto siguiente">${icono("flecha")}</button>
          <p class="visor__contador pastilla pastilla--oscura" aria-live="polite"><span data-foto-actual>1</span>&nbsp;de ${totalFotos}</p>
        </div>
      </div>
      <div class="visor__tabs" role="tablist" aria-label="${titulo ? "Ver el inmueble" : "Vista"}">
        <span class="visor__indicador" aria-hidden="true"></span>
        <button class="visor__tab" role="tab" id="${id}-t3d" aria-controls="${id}-3d" aria-selected="true"><span class="visor__mini visor__mini--3d" aria-hidden="true">${icono("cubo")}</span><span><span class="solo-ancho">Recorrido&nbsp;</span>3D</span></button>
        <button class="visor__tab" role="tab" id="${id}-tfotos" aria-controls="${id}-fotos" aria-selected="false" tabindex="-1"><span class="visor__mini visor__mini--fotos" aria-hidden="true">${miniFotos}</span><span>Fotos <small class="solo-ancho">${totalFotos}</small></span></button>
        <button class="visor__tab visor__tab--accion" type="button" data-completo aria-label="Ver en pantalla completa">${icono("expandir")}</button>
      </div>
    </div>`;
  }

  function activarVisor(raiz) {
    const tabs = [...raiz.querySelectorAll('[role="tab"]')];
    // Indicador que se desliza hasta la pestaña elegida
    const indicador = raiz.querySelector(".visor__indicador");
    const moverIndicador = () => {
      const t = tabs.find((x) => x.getAttribute("aria-selected") === "true");
      if (!t || !indicador) return;
      indicador.style.width = `${t.offsetWidth}px`;
      indicador.style.transform = `translateX(${t.offsetLeft}px)`;
    };
    const elegir = (tab) => {
      tabs.forEach((t) => {
        const si = t === tab;
        t.setAttribute("aria-selected", String(si));
        t.tabIndex = si ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !si;
        if (si) { panel.classList.remove("is-entrando"); void panel.offsetWidth; panel.classList.add("is-entrando"); }
      });
      moverIndicador();
    };
    if (indicador) {
      requestAnimationFrame(() => { indicador.classList.add("sin-transicion"); moverIndicador(); requestAnimationFrame(() => indicador.classList.remove("sin-transicion")); });
      if ("ResizeObserver" in window) new ResizeObserver(moverIndicador).observe(raiz.querySelector(".visor__tabs"));
    }

    // Galería: contador, flechas y deslizar con el dedo (desplazamiento nativo con imán)
    const carrete = raiz.querySelector(".visor__fotos");
    if (carrete) {
      const actual = raiz.querySelector("[data-foto-actual]");
      const items = [...carrete.children];
      const paso = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : carrete.clientWidth);
      const indice = () => Math.round(carrete.scrollLeft / Math.max(1, paso()));
      const pintar = () => {
        const i = Math.min(items.length - 1, indice());
        actual.textContent = i + 1;
        raiz.querySelector(".visor__flecha--ant").disabled = i <= 0;
        raiz.querySelector(".visor__flecha--sig").disabled = i >= items.length - 1;
      };
      let pendiente = false;
      carrete.addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; pintar(); }); } }, { passive: true });
      const ir = (d) => carrete.scrollTo({ left: (indice() + d) * paso(), behavior: reducido.matches ? "auto" : "smooth" });
      raiz.querySelectorAll("[data-foto]").forEach((b) => b.addEventListener("click", () => ir(Number(b.dataset.foto))));
      carrete.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); e.stopPropagation(); ir(d); }
      });
      pintar();
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => elegir(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        const sig = tabs[(i + d + tabs.length) % tabs.length];
        sig.focus();
        elegir(sig);
      });
    });

    // Pantalla completa: clase propia (funciona también en iPhone)
    const btn = raiz.querySelector("[data-completo]");
    const alternar = (si) => {
      raiz.classList.toggle("is-completo", si);
      raiz.classList.toggle("is-abriendo", si);
      document.body.classList.toggle("sin-scroll", si);
      btn.innerHTML = icono(si ? "contraer" : "expandir");
      btn.setAttribute("aria-label", si ? "Salir de pantalla completa" : "Ver en pantalla completa");
    };
    btn.addEventListener("click", () => alternar(!raiz.classList.contains("is-completo")));
    raiz.addEventListener("keydown", (e) => { if (e.key === "Escape" && raiz.classList.contains("is-completo")) { alternar(false); btn.focus(); } });
    raiz.addEventListener("animationend", () => raiz.classList.remove("is-abriendo"));

    // Recorrido real: el iframe solo se crea cuando la persona lo pide
    raiz.querySelectorAll("[data-cargar-tour]").forEach((b) => {
      b.addEventListener("click", () => {
        const f = document.createElement("iframe");
        f.className = "visor__iframe";
        f.src = b.dataset.cargarTour;
        f.title = "Recorrido 3D del inmueble";
        f.allow = "fullscreen; xr-spatial-tracking; gyroscope; accelerometer";
        f.allowFullscreen = true;
        b.closest(".visor__panel").append(f);
        b.remove();
        if (window.DATOS) window.DATOS.registrarVistaRecorrido(raiz.dataset.inmueble);
      });
    });

    // Girar la vista previa con el dedo, el mouse o las flechas
    const caja = raiz.querySelector(".visor__modelo");
    const svg = caja && caja.querySelector("[data-modelo]");
    if (!svg) return;
    girarModelo(svg, 10);
    // En la portada el modelo gira cuando el vidrio del marco ya se corrió
    const espera = raiz.closest(".visor-marco") && !reducido.matches ? 1500 : 0;
    setTimeout(() => animarGiro(svg, 10, 38, 1300), espera);
    let x0 = null, a0 = 0;
    caja.addEventListener("pointerdown", (e) => {
      x0 = e.clientX; a0 = Number(svg.dataset.angulo) || 0;
      cancelAnimationFrame(svg._raf);
      caja.setPointerCapture(e.pointerId);
    });
    caja.addEventListener("pointermove", (e) => {
      if (x0 === null) return;
      girarModelo(svg, a0 + (e.clientX - x0) * 0.45);
    });
    const soltar = () => { x0 = null; };
    caja.addEventListener("pointerup", soltar);
    caja.addEventListener("pointercancel", soltar);
    caja.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 15 : e.key === "ArrowLeft" ? -15 : 0;
      if (!d) return;
      e.preventDefault();
      const a = Number(svg.dataset.angulo) || 0;
      animarGiro(svg, a, a + d, 300);
    });
  }

  /* ---------- Tarjeta de inmueble con vista previa 3D ---------- */
  // Cada inmueble mira desde su propio ángulo (sale de su código, así siempre es el mismo)
  const anguloDe = (id) => {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return 18 + (h % 50);
  };

  // Inmuebles pintados en tarjetas, para abrir la vista rápida sin volver a buscarlos
  const registro = new Map();

  // Cada tarjeta sin foto tiene su propia luz de fondo (amanecer, día, tarde o noche), siempre la misma para el inmueble
  const TONOS = ["amanecer", "dia", "tarde", "noche"];

  function tarjetaHTML(p, i = 0) {
    registro.set(String(p.id), p);
    const foto = urlSegura((p.fotos || [])[0]);
    const con3d = p.tour || p.ejemplo;
    const url = `inmueble.html?id=${encodeURIComponent(p.id)}`;
    // --n escalona la entrada de las tarjetas cuando se pintan
    return `<article class="tarjeta" style="--n:${(Number(i) || 0) % 3}">
      <div class="tarjeta__media" data-tono="${TONOS[anguloDe(p.id) % TONOS.length]}">
        ${foto ? `<img class="tarjeta__foto" src="${foto}" alt="" loading="lazy" decoding="async">` : modeloSVG(p).replace("data-modelo", `data-modelo data-base="${anguloDe(p.id)}"`)}
        <span class="tarjeta__vidrio" aria-hidden="true"></span>
        <span class="tarjeta__chips">
          ${con3d ? `<span class="pastilla">${icono("cubo")}3D</span>` : ""}
          <span class="pastilla pastilla--clara">${OPERACION[p.operacion]}</span>
        </span>
        <button class="tarjeta__rapida" type="button" data-vista-rapida="${esc(p.id)}">${icono("ojo")}<span>Vista rápida</span></button>
      </div>
      <div class="tarjeta__cuerpo">
        <p class="tarjeta__precio">${precioHTML(p)}</p>
        <h3 class="tarjeta__titulo"><a class="tarjeta__enlace" href="${url}">${esc(p.titulo)}</a></h3>
        <p class="tarjeta__lugar">${icono("ubicacion")}${esc(lugar(p))}</p>
        ${specsHTML(p)}
      </div>
    </article>`;
  }

  // Las tarjetas giran su modelo desde su propio ángulo: al pasar el mouse, o una vez al aparecer en celular
  function activarTarjetas(raiz = document) {
    const tarjetas = [...raiz.querySelectorAll(".tarjeta")];
    // Entran a la vista con un pequeño ascenso (ver .tarjeta.is-vista en el CSS)
    if ("IntersectionObserver" in window) {
      const ioVista = new IntersectionObserver((entradas) => {
        for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("is-vista"); ioVista.unobserve(e.target); }
      }, { rootMargin: "0px 0px -8% 0px" });
      tarjetas.forEach((t) => ioVista.observe(t));
    } else tarjetas.forEach((t) => t.classList.add("is-vista"));
    const base = (svg) => Number(svg.dataset.base) || 35;
    const io = "IntersectionObserver" in window ? new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const svg = e.target.querySelector("[data-modelo]");
        animarGiro(svg, base(svg) - 20, base(svg), 1400);
      }
    }, { rootMargin: "0px 0px -15% 0px" }) : null;
    tarjetas.forEach((t) => {
      const svg = t.querySelector("[data-modelo]");
      if (!svg) return;
      if (io && !reducido.matches) { girarModelo(svg, base(svg) - 20); io.observe(t); }
      else girarModelo(svg, base(svg));
      t.addEventListener("pointerenter", () => {
        if (!punteroFino.matches) return;
        animarGiro(svg, Number(svg.dataset.angulo), base(svg) + 40, 900);
      });
      t.addEventListener("pointerleave", () => {
        if (!punteroFino.matches) return;
        animarGiro(svg, Number(svg.dataset.angulo), base(svg), 700);
      });
    });
  }

  /* ---------- Lugares y cajas con sugerencias (portada y búsqueda) ---------- */
  // Sin tildes ni mayúsculas, para que "itagui" encuentre "Itagüí"
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let lugaresCache = null;
  const lugares = () => lugaresCache || (lugaresCache = [
    ...(window.ZONAS || []).map((z) => ({ tipo: "zona", valor: z.nombre, detalle: z.municipio === z.nombre ? "Municipio" : `Zona · ${z.municipio}`, icono: "ubicacion" })),
    ...(window.BARRIOS || []).map((b) => ({ tipo: "barrio", valor: b.nombre, detalle: `Barrio · ${b.zona}`, icono: "casa" })),
    ...[...new Set((window.ZONAS || []).map((z) => z.municipio))].filter((m) => !window.ZONAS.some((z) => z.nombre === m))
      .map((m) => ({ tipo: "municipio", valor: m, detalle: "Municipio", icono: "edificio" }))
  ]);
  // Coincide en cualquier parte ("pobla" → El Poblado); primero lo que empieza igual
  function buscarLugares(t, max = 8) {
    return lugares()
      .map((l) => {
        const n = norm(l.valor);
        const puntaje = n.startsWith(t) ? 0 : n.split(/\s+/).some((w) => w.startsWith(t)) ? 1 : n.includes(t) ? 2 : 9;
        return { ...l, puntaje, texto: l.valor };
      })
      .filter((l) => l.puntaje < 9)
      .sort((a, b) => a.puntaje - b.puntaje || (b.tipo === "zona") - (a.tipo === "zona") || a.valor.localeCompare(b.valor))
      .slice(0, max);
  }

  // Caja de texto con lista de sugerencias, manejable con teclado (flechas, Enter, Escape) y con el dedo
  function autocompletar(input, caja, contenedor, sugerir, elegir) {
    let opciones = [], activa = -1;
    const cerrar = () => { caja.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); activa = -1; };
    const abrirLista = () => {
      const t = norm(input.value.trim());
      if (!t) { cerrar(); return; }
      opciones = sugerir(t, input.value.trim());
      caja.innerHTML = opciones.length
        ? opciones.map((o, i) => `<li role="option" id="${caja.id}-${i}" data-i="${i}" aria-selected="false">${icono(o.icono)}<span>${esc(o.texto)}</span><small>${esc(o.detalle)}</small></li>`).join("")
        : '<li class="buscador-q__nada">No encontramos ese lugar. Prueba con otro nombre.</li>';
      caja.hidden = false;
      input.setAttribute("aria-expanded", "true");
      activa = -1;
    };
    const resaltar = (i) => {
      if (!opciones.length) return;
      activa = (i + opciones.length) % opciones.length;
      caja.querySelectorAll("[role=option]").forEach((li, k) => li.setAttribute("aria-selected", String(k === activa)));
      input.setAttribute("aria-activedescendant", `${caja.id}-${activa}`);
      caja.querySelector(`#${caja.id}-${activa}`)?.scrollIntoView({ block: "nearest" });
    };
    const tomar = (o) => { cerrar(); elegir(o); };
    input.addEventListener("input", abrirLista);
    input.addEventListener("focus", () => { if (input.value.trim()) abrirLista(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (caja.hidden) abrirLista(); resaltar(activa + 1); }
      else if (e.key === "ArrowUp" && !caja.hidden) { e.preventDefault(); resaltar(activa - 1); }
      else if (e.key === "Enter" && !caja.hidden && opciones.length) { e.preventDefault(); tomar(opciones[activa >= 0 ? activa : 0]); }
      else if (e.key === "Escape") cerrar();
    });
    caja.addEventListener("pointerdown", (e) => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); tomar(opciones[Number(li.dataset.i)]); } });
    document.addEventListener("pointerdown", (e) => { if (!contenedor.contains(e.target)) cerrar(); });
    return { cerrar };
  }

  /* ---------- Vista rápida: el visor en una hoja, sin salir del listado ---------- */
  let dialogoRapido = null;
  function abrirVistaRapida(p, origen) {
    if (!dialogoRapido) {
      dialogoRapido = document.createElement("dialog");
      dialogoRapido.className = "hoja-dialogo hoja-dialogo--ancha vista-rapida";
      dialogoRapido.setAttribute("aria-labelledby", "vr-titulo");
      document.body.append(dialogoRapido);
      dialogoRapido.addEventListener("close", () => {
        document.body.classList.remove("sin-scroll");
        dialogoRapido.innerHTML = ""; // detiene el recorrido si estaba cargado
        if (dialogoRapido._origen) dialogoRapido._origen.focus({ preventScroll: true });
      });
      dialogoRapido.addEventListener("click", (e) => {
        if (e.target === dialogoRapido || e.target.closest("[data-cerrar-rapida]")) dialogoRapido.close();
      });
    }
    const url = `inmueble.html?id=${encodeURIComponent(p.id)}`;
    dialogoRapido._origen = origen;
    dialogoRapido.innerHTML = `
      <div class="hoja-dialogo__cab">
        <div>
          <p class="tarjeta__precio">${precioHTML(p)}</p>
          <h2 id="vr-titulo">${esc(p.titulo)}</h2>
        </div>
        <button class="boton boton--suave boton--icono" type="button" data-cerrar-rapida aria-label="Cerrar">${icono("cerrar")}</button>
      </div>
      ${visorHTML(p)}
      <div class="vista-rapida__pie">
        ${specsHTML(p)}
        <div class="vista-rapida__acciones">
          <a class="boton boton--suave" href="${url}">Ver todo el detalle</a>
          <a class="boton boton--navy" href="${url}#agendar">${icono("calendario")}Agendar visita</a>
        </div>
      </div>`;
    dialogoRapido.showModal();
    document.body.classList.add("sin-scroll");
    activarVisor(dialogoRapido.querySelector("[data-visor]"));
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-vista-rapida]");
    if (!b) return;
    e.preventDefault();
    const p = registro.get(b.dataset.vistaRapida);
    if (p) abrirVistaRapida(p, b);
  });

  /* ---------- Formularios con consentimiento (Ley 1581) ---------- */
  // Arma la fila a guardar: casillas como sí/no y prueba de la autorización (texto exacto, fecha y versión)
  function filaDe(f) {
    const fila = {};
    new FormData(f).forEach((v, k) => { fila[k] = typeof v === "string" ? v.trim() : v; });
    f.querySelectorAll('input[type="checkbox"][name]').forEach((c) => { fila[c.name] = c.checked; });
    const casilla = f.querySelector('[name="autorizacion"], [name="permiso_confirmado"]');
    if (casilla) {
      fila.autorizacion_texto = casilla.closest("label").innerText.replace(/\s+/g, " ").trim();
      fila.autorizacion_fecha = new Date().toISOString();
      fila.politica_version = (window.MA_CONFIG && window.MA_CONFIG.politicaVersion) || null;
    }
    fila.origen = location.pathname.split("/").pop() || "index.html";
    return fila;
  }

  // Valida, guarda y avisa. Lo usan todos los formularios con data-tabla.
  async function enviarFormulario(f, tabla) {
    const estado = f.querySelector(".form-estado");
    const boton = f.querySelector('[type="submit"]');
    estado.classList.remove("is-error");
    const autorizo = f.querySelector('[name="autorizacion"], [name="permiso_confirmado"]');
    if (autorizo && !autorizo.checked) {
      estado.textContent = autorizo.name === "permiso_confirmado"
        ? "Necesitamos que confirmes que el propietario te autorizó."
        : "Para enviarlo necesitamos tu autorización de tratamiento de datos.";
      estado.classList.add("is-error");
      autorizo.focus();
      return false;
    }
    if (!f.checkValidity()) { f.reportValidity(); return false; }
    if (!window.DATOS) {
      estado.textContent = "No se pudo enviar: falta la conexión de datos.";
      estado.classList.add("is-error");
      return false;
    }
    boton.disabled = true;
    estado.textContent = "Enviando…";
    try {
      await window.DATOS.guardar(tabla, filaDe(f));
      estado.textContent = f.dataset.exito || "Listo, lo recibimos. Te contactamos pronto.";
      if (window.DATOS.modo === "prueba") estado.textContent += " (Modo prueba: quedó guardado solo en este navegador.)";
      f.reset();
      return true;
    } catch (err) {
      estado.textContent = window.DATOS.mensajeError(err);
      estado.classList.add("is-error");
      return false;
    } finally {
      boton.disabled = false;
    }
  }

  function activarFormularios() {
    document.querySelectorAll("form[data-form]").forEach((f) => {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        enviarFormulario(f, f.dataset.tabla);
      });
    });
  }

  // Si hay sesión, el enlace "Ingresar" lleva al panel de cada quien
  async function marcarSesion() {
    if (!window.DATOS) return;
    const s = await window.DATOS.sesion();
    const enlace = document.querySelector(".barra__ingresar");
    if (!s || !enlace) return;
    enlace.href = window.DATOS.RUTA_POR_ROL[s.rol] || "index.html";
    enlace.querySelector("span").textContent = "Mi cuenta";
    enlace.setAttribute("aria-label", "Mi cuenta");
    const nav = document.querySelector("#menu-movil nav");
    if (nav) {
      const salir = document.createElement("a");
      salir.href = "#";
      salir.innerHTML = `${icono("cerrar")}Salir de mi cuenta`;
      salir.addEventListener("click", async (e) => {
        e.preventDefault();
        await window.DATOS.salir();
        location.href = "index.html";
      });
      nav.append(salir);
    }
  }

  /* ---------- Apariciones al hacer scroll ---------- */
  function activarApariciones() {
    const els = document.querySelectorAll("[data-aparece]");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Scroll suave (solo computador con mouse y sin "reducir movimiento") ----------
     Lenis mueve el scroll nativo con inercia: los efectos que escuchan el scroll siguen funcionando.
     Dentro de diálogos y listas desplegables el scroll queda normal. */
  function activarScrollSuave() {
    if (reducido.matches || !punteroFino.matches || window.lenis) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js";
    s.onload = () => {
      if (!window.Lenis) return;
      const lenis = new window.Lenis({
        lerp: 0.09, wheelMultiplier: 1,
        prevent: (n) => !!(n.closest && n.closest("dialog, .buscador-q__lista, .menu-movil, .hoja__cuerpo, .leaflet-container, [data-lenis-prevent]"))
      });
      window.lenis = lenis;
      const paso = (t) => { lenis.raf(t); requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
      // Con un diálogo abierto, el fondo no se mueve
      new MutationObserver(() => (document.querySelector("dialog[open]") ? lenis.stop() : lenis.start()))
        .observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], childList: true });
    };
    document.head.append(s);
  }

  function iniciar() {
    montarSprite();
    montarBarra();
    montarPie();
    activarScrollSuave();
    document.querySelectorAll("[data-visor]").forEach(activarVisor);
    activarFormularios();
    activarApariciones();
    marcarSesion();
  }

  return { norm, buscarLugares, autocompletar, esc, urlSegura, enviarFormulario, filaDe, icono, precioHTML, specsHTML, OPERACION, lugar, modeloSVG, girarModelo, visorHTML, activarVisor, tarjetaHTML, activarTarjetas, activarApariciones, iniciar };
})();
