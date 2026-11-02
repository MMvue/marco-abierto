/* =========================================================
   Marco Abierto — mapa de resultados
   Leaflet + OpenStreetMap (gratis). Se carga solo cuando alguien
   abre la vista de mapa, para no hacer más lenta la página.
   Las ubicaciones son aproximadas: nunca la dirección exacta.
   ========================================================= */

window.MAPA = (() => {
  const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  const CENTRO_VALLE = [6.235, -75.585];
  let mapa = null, capa = null, cargando = null;

  function cargarLeaflet() {
    if (window.L) return Promise.resolve();
    if (cargando) return cargando;
    cargando = new Promise((ok, mal) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.append(css);
      const s = document.createElement("script");
      s.src = LEAFLET_JS;
      s.onload = ok;
      s.onerror = () => mal(new Error("No se pudo cargar el mapa"));
      document.head.append(s);
    });
    return cargando;
  }

  function crear(contenedor) {
    const m = L.map(contenedor, { scrollWheelZoom: false, zoomControl: true }).setView(CENTRO_VALLE, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(m);
    // La rueda del mouse solo hace zoom después de hacer clic en el mapa (no secuestra el scroll)
    m.on("click", () => m.scrollWheelZoom.enable());
    contenedor.addEventListener("mouseleave", () => m.scrollWheelZoom.disable());
    return m;
  }

  async function iniciar(contenedor) {
    try {
      await cargarLeaflet();
    } catch {
      contenedor.innerHTML = '<p class="admin-vacio" style="padding:24px">No se pudo cargar el mapa. Revisa tu conexión.</p>';
      return false;
    }
    if (!mapa) {
      mapa = crear(contenedor);
      capa = L.layerGroup().addTo(mapa);
    }
    // El contenedor estaba oculto: el mapa debe medirse de nuevo antes de encuadrar los inmuebles
    mapa.invalidateSize();
    return true;
  }

  // Precio corto para el pin: "$ 3,5 M"
  const corto = (p) => {
    if (p.precio == null) return p.operacion === "arriendo" ? "Arriendo" : "Venta";
    const n = Number(p.precio);
    return n >= 1e9 ? `$ ${(n / 1e9).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil M`
      : `$ ${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  };

  // Varios inmuebles en la misma zona: se separan un poco para que no queden encima
  const separar = (lista) => {
    const vistos = {};
    return lista.map((p) => {
      const k = `${Number(p.lat).toFixed(3)},${Number(p.lng).toFixed(3)}`;
      const i = vistos[k] = (vistos[k] ?? -1) + 1;
      const ang = i * 2.4, r = i ? 0.0016 * Math.sqrt(i) : 0;
      return { p, lat: Number(p.lat) + r * Math.sin(ang), lng: Number(p.lng) + r * Math.cos(ang) };
    });
  };

  function pintar(lista) {
    if (!mapa) return;
    capa.clearLayers();
    const conUbicacion = lista.filter((p) => p.lat != null && p.lng != null);
    const puntos = separar(conUbicacion);
    puntos.forEach(({ p, lat, lng }) => {
      const icono = L.divIcon({
        className: "pin-mapa",
        html: `<span class="pin-mapa__etiqueta">${p.tour || p.ejemplo ? '<b>3D</b>' : ""}${MA.esc(corto(p))}</span>`,
        iconSize: null,
        iconAnchor: [0, 0]
      });
      const url = `inmueble.html?id=${encodeURIComponent(p.id)}`;
      L.marker([lat, lng], { icon: icono, title: p.titulo, keyboard: true })
        .bindPopup(`<div class="pop-mapa">
            <p class="tarjeta__precio">${MA.precioHTML(p)}</p>
            <a class="pop-mapa__titulo" href="${url}">${MA.esc(p.titulo)}</a>
            <p class="tarjeta__lugar">${MA.icono("ubicacion")}${MA.esc(MA.lugar(p))}</p>
            ${MA.specsHTML(p)}
            <div class="pop-mapa__acciones">
              <button class="boton boton--suave" type="button" data-vista-rapida="${MA.esc(p.id)}">Vista rápida</button>
              <a class="boton boton--navy" href="${url}">Ver</a>
            </div>
          </div>`, { maxWidth: 280, minWidth: 240 })
        .addTo(capa);
    });
    if (puntos.length) mapa.fitBounds(L.latLngBounds(puntos.map((x) => [x.lat, x.lng])).pad(0.25), { maxZoom: 14 });
    else mapa.setView(CENTRO_VALLE, 12);
  }

  // Mapa pequeño del detalle: un círculo con la zona aproximada, sin marcar la dirección
  async function zona(contenedor, p) {
    if (p.lat == null || p.lng == null) return false;
    try { await cargarLeaflet(); } catch { return false; }
    const m = L.map(contenedor, { scrollWheelZoom: false, dragging: !matchMedia("(pointer: coarse)").matches, zoomControl: true })
      .setView([p.lat, p.lng], 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(m);
    L.circle([p.lat, p.lng], { radius: 350, color: "#1b4370", weight: 2, fillColor: "#9fcbe6", fillOpacity: 0.35 }).addTo(m);
    return true;
  }

  return { iniciar, pintar, zona };
})();
