/* =========================================================
   Marco Abierto — capa de datos
   Con Supabase configurado (js/config.js) guarda y lee en la nube.
   Sin configurar, funciona en modo prueba: todo queda en este navegador.
   El resto del sitio solo usa estas funciones, así que cambiar de modo
   no obliga a tocar las páginas.
   ========================================================= */

window.DATOS = (() => {
  const cfg = window.MA_CONFIG || {};
  // Para probar cambios sin tocar la base real: en la consola, localStorage.setItem("ma-forzar-prueba", "1")
  const forzarPrueba = (() => { try { return localStorage.getItem("ma-forzar-prueba") === "1"; } catch { return false; } })();
  const real = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey) && !forzarPrueba;
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

  const RUTA_POR_ROL = { admin: "admin.html", propietario: "panel.html", socio: "socio.html", comprador: "buscar.html" };

  /* ---------- Cliente de Supabase (se carga solo si hace falta) ---------- */
  let cliente = null;
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = () => mal(new Error("sin-conexion"));
      document.head.append(s);
    });
  }
  async function sb() {
    if (!cliente) {
      if (!window.supabase) await cargarScript(CDN);
      cliente = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return cliente;
  }

  /* ---------- Modo prueba: almacenamiento del navegador ---------- */
  const PREFIJO = "ma-prueba-";
  const leer = (k, def) => {
    try { return JSON.parse(localStorage.getItem(PREFIJO + k)) ?? def; } catch { return def; }
  };
  const escribir = (k, v) => {
    try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); } catch { /* sin almacenamiento: se pierde al recargar */ }
  };
  const ESTADO_INICIAL = { solicitudes_publicacion: "nueva", solicitudes_visita: "por_confirmar", socios_postulaciones: "nueva", referidos: "recibido" };
  const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  /* ---------- Mensajes de error en español ---------- */
  function mensajeError(e) {
    const m = String((e && (e.message || e.error_description)) || e || "");
    if (/sin-conexion|Failed to fetch|NetworkError/i.test(m)) return "No hay conexión. Revisa tu internet e intenta de nuevo.";
    if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
    if (/already registered|ya existe/i.test(m)) return "Ya existe una cuenta con ese correo. Prueba ingresar.";
    if (/Email not confirmed/i.test(m)) return "Confirma tu correo antes de entrar: te enviamos un enlace.";
    if (/Password should be|weak/i.test(m)) return "La contraseña es muy débil. Usa mínimo 8 caracteres.";
    if (/rate limit|too many/i.test(m)) return "Demasiados intentos seguidos. Espera un momento.";
    if (/PGRST205|schema cache|does not exist/i.test(m) || (e && e.code === "PGRST205")) return "La base de datos todavía no tiene las tablas: falta correr supabase/esquema.sql.";
    if (/no-encontrada/i.test(m)) return "No encontramos una cuenta con ese correo en este navegador (modo prueba).";
    if (/no-eliminado/i.test(m)) return "No se pudo eliminar. Revisa que hayas entrado con la cuenta de administrador.";
    return "No pudimos completar la acción. Intenta de nuevo en un momento.";
  }

  /* ---------- Formularios y solicitudes ---------- */
  async function guardar(tabla, fila) {
    if (real) {
      const { error } = await (await sb()).from(tabla).insert(fila);
      if (error) throw error;
      return;
    }
    const filas = leer(tabla, []);
    filas.unshift({ ...fila, id: nuevoId(), creado: new Date().toISOString(), estado: ESTADO_INICIAL[tabla] });
    escribir(tabla, filas);
  }

  // filtros: { columna: valor } para quedarse solo con las filas que coinciden
  async function listar(tabla, filtros = {}) {
    if (real) {
      let q = (await sb()).from(tabla).select("*");
      for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v);
      const { data, error } = await q.order("creado", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    }
    return leer(tabla, []).filter((f) => Object.entries(filtros).every(([k, v]) => f[k] === v));
  }

  // Crea o reemplaza una fila por su id (lo usa el administrador)
  async function upsert(tabla, fila) {
    if (real) {
      const { error } = await (await sb()).from(tabla).upsert(fila);
      if (error) throw error;
      return;
    }
    const filas = leer(tabla, []);
    const i = filas.findIndex((f) => f.id === fila.id);
    const ahora = new Date().toISOString();
    if (i >= 0) filas[i] = { ...filas[i], ...fila, actualizado: ahora };
    else filas.unshift({ creado: ahora, ...fila, actualizado: ahora });
    escribir(tabla, filas);
    // Igual que el disparador de la base de datos: una novedad avisada cuenta como aviso
    if (tabla === "inmueble_eventos" && fila.avisado) {
      escribir("inmuebles", leer("inmuebles", []).map((f) => (f.id === fila.inmueble_id ? { ...f, ultimo_aviso: ahora } : f)));
    }
  }

  async function borrar(tabla, filtros) {
    if (real) {
      let q = (await sb()).from(tabla).delete();
      for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v);
      const { error } = await q;
      if (error) throw error;
      return;
    }
    escribir(tabla, leer(tabla, []).filter((f) => !Object.entries(filtros).every(([k, v]) => f[k] === v)));
  }

  /* ---------- Inventario ---------- */
  // Convierte una fila de la base de datos al formato que usan las páginas (el de propiedades.js)
  const aPagina = (f) => ({
    id: f.id, ejemplo: false, titulo: f.titulo, operacion: f.operacion, zona: f.zona, municipio: f.municipio,
    tipo: f.tipo || "apartamento", barrio: f.barrio || null, lat: f.lat != null ? Number(f.lat) : null, lng: f.lng != null ? Number(f.lng) : null,
    parqueaderos: Number(f.parqueaderos) || (f.parqueadero ? 1 : 0),
    metro: f.metro || null, habitaciones: f.habitaciones, banos: f.banos, parqueadero: !!f.parqueadero || Number(f.parqueaderos) > 0,
    area: f.area ? Number(f.area) : null, precio: f.precio ? Number(f.precio) : null,
    admin: f.administracion ? Number(f.administracion) : null, estrato: f.estrato || null,
    tour: f.tour_url || null, fotos: f.fotos || [], descripcion: f.descripcion || null
  });

  // Lo que ve el público. Si todavía no hay nada publicado, se muestran los ejemplos de propiedades.js
  async function inmueblesPublicos() {
    let filas = [];
    try {
      if (real) {
        const { data, error } = await (await sb()).from("inmuebles_publicos").select("*").order("creado", { ascending: false }).limit(300);
        if (error) throw error;
        filas = data;
      } else {
        filas = leer("inmuebles", []).filter((f) => f.publicado);
      }
    } catch (e) {
      console.warn("No se pudo leer el inventario; se muestran ejemplos.", e);
    }
    if (filas.length) return filas.map(aPagina);
    return cfg.ejemplosSiVacio === false ? [] : (window.PROPIEDADES || []);
  }

  // Reduce la foto antes de subirla (ancho máximo 1600 px, JPEG) para ahorrar espacio
  async function reducirImagen(archivo, max = 1600) {
    const bmp = await createImageBitmap(archivo);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * k);
    lienzo.height = Math.round(bmp.height * k);
    lienzo.getContext("2d").drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    return new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", 0.82));
  }

  async function subirImagen(archivo, carpeta) {
    const blob = await reducirImagen(archivo);
    if (real) {
      const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const cliente = await sb();
      const { error } = await cliente.storage.from("inmuebles").upload(ruta, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      return cliente.storage.from("inmuebles").getPublicUrl(ruta).data.publicUrl;
    }
    // Modo prueba: imagen pequeña dentro del navegador
    const chica = await reducirImagen(archivo, 480);
    return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(chica); });
  }

  // Borra un inmueble con sus novedades, documentos y vistas. Después intenta quitar sus fotos.
  async function eliminarInmueble(inmueble) {
    if (real) {
      const cliente = await sb();
      // Se pide la fila borrada: si los permisos lo impiden, Supabase no da error y simplemente no borra nada
      const { data, error } = await cliente.from("inmuebles").delete().eq("id", inmueble.id).select("id");
      if (error) throw error;
      if (!data || !data.length) throw new Error("no-eliminado");
      const MARCA = "/object/public/inmuebles/";
      const rutas = [...(inmueble.fotos || []), inmueble.plano_url]
        .filter((u) => u && u.includes(MARCA))
        .map((u) => decodeURIComponent(u.split(MARCA)[1].split("?")[0]));
      if (rutas.length) {
        const { data: borradas, error: errorFotos } = await cliente.storage.from("inmuebles").remove(rutas);
        if (errorFotos || !borradas || !borradas.length) console.warn("El inmueble se eliminó, pero quedaron fotos guardadas.", errorFotos);
      }
      return;
    }
    escribir("inmuebles", leer("inmuebles", []).filter((f) => f.id !== inmueble.id));
    ["inmueble_eventos", "inmueble_documentos", "recorrido_vistas"].forEach((t) => {
      escribir(t, leer(t, []).filter((f) => f.inmueble_id !== inmueble.id));
    });
  }

  async function registrarVistaRecorrido(inmuebleId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(inmuebleId))) return; // los ejemplos no cuentan
    try {
      if (real) await (await sb()).from("recorrido_vistas").insert({ inmueble_id: inmuebleId });
      else escribir("recorrido_vistas", [...leer("recorrido_vistas", []), { inmueble_id: inmuebleId, creado: new Date().toISOString() }]);
    } catch { /* contar vistas nunca debe romper la página */ }
  }

  // Inmuebles del propietario que tiene la sesión abierta
  async function misInmuebles() {
    const s = await sesion();
    if (!s) return [];
    if (real) {
      const { data, error } = await (await sb()).from("inmuebles").select("*").eq("propietario_id", s.id).order("creado", { ascending: false });
      if (error) throw error;
      return data;
    }
    return leer("inmuebles", []).filter((f) => (f.propietario_correo || "").toLowerCase() === s.correo.toLowerCase());
  }

  async function resumenInmueble(id, dias = 7) {
    if (real) {
      const { data, error } = await (await sb()).rpc("resumen_inmueble", { p_id: id, p_dias: dias });
      if (error) throw error;
      return data && data[0] ? data[0] : { vistas_recorrido: 0, visitas_pedidas: 0, ofertas: 0 };
    }
    const desde = Date.now() - dias * 864e5;
    const reciente = (f) => new Date(f.creado).getTime() > desde;
    return {
      vistas_recorrido: leer("recorrido_vistas", []).filter((f) => f.inmueble_id === id && reciente(f)).length,
      visitas_pedidas: leer("solicitudes_visita", []).filter((f) => f.inmueble_id === id && reciente(f)).length,
      ofertas: leer("inmueble_eventos", []).filter((f) => f.inmueble_id === id && f.tipo === "oferta" && reciente(f)).length
    };
  }

  async function actualizar(tabla, id, cambios) {
    if (real) {
      const { error } = await (await sb()).from(tabla).update(cambios).eq("id", id);
      if (error) throw error;
      return;
    }
    escribir(tabla, leer(tabla, []).map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  /* ---------- Cuentas ---------- */
  async function perfilDe(usuario) {
    const { data } = await (await sb()).from("perfiles").select("nombre, rol").eq("id", usuario.id).maybeSingle();
    return { id: usuario.id, correo: usuario.email, nombre: data?.nombre || "", rol: data?.rol || "comprador" };
  }

  async function registrar({ correo, clave, nombre, celular, rol, publicidad, autorizacion_texto }) {
    const meta = { nombre, celular, rol, publicidad: Boolean(publicidad), autorizacion_texto, autorizacion_fecha: new Date().toISOString(), politica_version: cfg.politicaVersion };
    if (real) {
      const { data, error } = await (await sb()).auth.signUp({
        email: correo, password: clave,
        options: { data: meta, emailRedirectTo: new URL("ingreso.html", location.href).href }
      });
      if (error) throw error;
      if (!data.session) return { confirmarCorreo: true };
      return { confirmarCorreo: false, sesion: await perfilDe(data.user) };
    }
    // Modo prueba: no se guarda la contraseña
    const usuarios = leer("usuarios", []);
    if (usuarios.some((u) => u.correo === correo)) throw new Error("ya existe");
    const u = { id: nuevoId(), correo, nombre, celular, rol, ...meta };
    escribir("usuarios", [...usuarios, u]);
    const sesion = { id: u.id, correo, nombre, rol };
    escribir("sesion", sesion);
    return { confirmarCorreo: false, sesion };
  }

  async function ingresar(correo, clave) {
    if (real) {
      const { data, error } = await (await sb()).auth.signInWithPassword({ email: correo, password: clave });
      if (error) throw error;
      return perfilDe(data.user);
    }
    // Modo prueba: la contraseña no se verifica. "admin@prueba" entra como administrador.
    if (correo.toLowerCase().startsWith("admin@prueba")) {
      const s = { id: "admin-prueba", correo, nombre: "Administrador de prueba", rol: "admin" };
      escribir("sesion", s);
      return s;
    }
    const u = leer("usuarios", []).find((x) => x.correo === correo);
    if (!u) throw new Error("no-encontrada");
    const s = { id: u.id, correo, nombre: u.nombre, rol: u.rol };
    escribir("sesion", s);
    return s;
  }

  async function sesion() {
    if (real) {
      try {
        const { data } = await (await sb()).auth.getSession();
        return data.session ? perfilDe(data.session.user) : null;
      } catch { return null; }
    }
    return leer("sesion", null);
  }

  async function salir() {
    if (real) { await (await sb()).auth.signOut(); return; }
    try { localStorage.removeItem(PREFIJO + "sesion"); } catch { /* nada */ }
  }

  async function recuperarClave(correo) {
    if (real) {
      const { error } = await (await sb()).auth.resetPasswordForEmail(correo, { redirectTo: new URL("ingreso.html", location.href).href });
      if (error) throw error;
    }
  }

  return {
    modo: real ? "supabase" : "prueba", RUTA_POR_ROL, nuevoId,
    guardar, listar, actualizar, upsert, borrar,
    inmueblesPublicos, subirImagen, eliminarInmueble, registrarVistaRecorrido, misInmuebles, resumenInmueble,
    registrar, ingresar, sesion, salir, recuperarClave, mensajeError
  };
})();
