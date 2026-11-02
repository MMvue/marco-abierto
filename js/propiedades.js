/*
  Zonas e inmuebles de ejemplo.

  Los inmuebles reales se crean desde el panel de administración (admin.html)
  y se guardan en Supabase. Estos ejemplos solo se muestran mientras no haya
  ningún inmueble publicado (ver "ejemplosSiVacio" en js/config.js).

  IMPORTANTE: todos los inmuebles de abajo son DE EJEMPLO (ejemplo: true).
  Sus precios son FICTICIOS (solo para ver el diseño). No tienen área, estrato ni recorrido real.
  Su ubicación es solo el centro aproximado de la zona, para ver el mapa.

  Campos:
    id            texto único, se usa en la URL (inmueble.html?id=...)
    ejemplo       true mientras sea de muestra
    titulo        nombre corto del inmueble
    operacion     "arriendo" o "venta"
    tipo          "apartamento" o "apartaestudio"
    zona          sector (debe coincidir con ZONAS)
    barrio        barrio dentro de la zona (opcional, ver BARRIOS)
    municipio     Medellín, Envigado, Sabaneta, Itagüí, Bello...
    metro         estación cercana o null
    habitaciones  número
    banos         número
    parqueaderos  número (0 si no tiene)
    area          m² o null
    precio        en pesos, sin puntos (ej. 2500000) o null
    admin         valor de administración o null
    estrato       número o null
    lat, lng      ubicación aproximada (nunca la dirección exacta)
    tour          URL del recorrido 3D (Finca 360 u otro) o null
    fotos         lista de rutas de fotos reales, ej. ["fotos/ma-001/sala.jpg"]
    descripcion   texto o null
*/

// Zonas (sectores) con su centro aproximado: sirven para el mapa y para llenar la ubicación en el panel.
// "destacada" = aparece en la lista "Busca por zona" del inicio.
window.ZONAS = [
  { nombre: "El Poblado", municipio: "Medellín", metro: "Estación Poblado", lat: 6.2088, lng: -75.5680, destacada: true },
  { nombre: "Laureles", municipio: "Medellín", metro: "Estación Estadio", lat: 6.2443, lng: -75.5910, destacada: true },
  { nombre: "La América", municipio: "Medellín", metro: "Estación Floresta", lat: 6.2530, lng: -75.6110, destacada: true },
  { nombre: "Belén", municipio: "Medellín", metro: null, lat: 6.2260, lng: -75.6060, destacada: true },
  { nombre: "Centro", municipio: "Medellín", metro: "Estación Parque Berrío", lat: 6.2476, lng: -75.5658 },
  { nombre: "Buenos Aires", municipio: "Medellín", metro: null, lat: 6.2400, lng: -75.5520 },
  { nombre: "Guayabal", municipio: "Medellín", metro: null, lat: 6.2140, lng: -75.5840 },
  { nombre: "Robledo", municipio: "Medellín", metro: null, lat: 6.2780, lng: -75.5960 },
  { nombre: "San Antonio de Prado", municipio: "Medellín", metro: null, lat: 6.1840, lng: -75.6560 },
  { nombre: "Envigado", municipio: "Envigado", metro: "Estación Envigado", lat: 6.1716, lng: -75.5911, destacada: true },
  { nombre: "Sabaneta", municipio: "Sabaneta", metro: "Estación Sabaneta", lat: 6.1515, lng: -75.6166, destacada: true },
  { nombre: "Itagüí", municipio: "Itagüí", metro: "Estación Itagüí", lat: 6.1719, lng: -75.6114, destacada: true },
  { nombre: "La Estrella", municipio: "La Estrella", metro: "Estación La Estrella", lat: 6.1580, lng: -75.6430 },
  { nombre: "Caldas", municipio: "Caldas", metro: null, lat: 6.0910, lng: -75.6360 },
  { nombre: "Bello", municipio: "Bello", metro: "Estación Bello", lat: 6.3373, lng: -75.5579, destacada: true },
  { nombre: "Copacabana", municipio: "Copacabana", metro: null, lat: 6.3460, lng: -75.5090 }
];

// Barrios más buscados, cada uno con la zona a la que pertenece (para sugerencias y filtros)
window.BARRIOS = [
  ...["Provenza", "Manila", "Astorga", "Castropol", "Patio Bonito", "Los Balsos", "El Tesoro", "La Frontera", "Alejandría",
    "Santa María de los Ángeles", "Lalinde", "Las Lomas", "Altos del Poblado", "La Aguacatala", "San Lucas", "Los Naranjos"].map((b) => [b, "El Poblado"]),
  ...["Conquistadores", "Florida Nueva", "Naranjal", "Carlos E. Restrepo", "Suramericana", "Bolivariana", "Lorena",
    "Los Colores", "Estadio", "San Joaquín", "Velódromo", "Las Acacias"].map((b) => [b, "Laureles"]),
  ...["Calasanz", "Santa Mónica", "Simón Bolívar", "Los Pinos", "La Floresta", "Santa Lucía", "Ferrini"].map((b) => [b, "La América"]),
  ...["Loma de los Bernal", "La Mota", "Los Alpes", "Rosales", "Fátima", "La Gloria", "Las Playas", "Diego Echavarría", "El Rincón"].map((b) => [b, "Belén"]),
  ...["Boston", "Prado", "Villa Nueva", "San Diego"].map((b) => [b, "Centro"]),
  ...["Miraflores", "Loreto"].map((b) => [b, "Buenos Aires"]),
  ...["Cristo Rey", "Trinidad", "Santa Fe"].map((b) => [b, "Guayabal"]),
  ...["Zúñiga", "El Esmeraldal", "La Magnolia", "Alcalá", "Jardines", "Las Antillas", "El Portal", "Loma de las Brujas", "La Paz"].map((b) => [b, "Envigado"]),
  ...["Aves María", "Restrepo Naranjo", "Prados de Sabaneta", "Las Lomitas"].map((b) => [b, "Sabaneta"]),
  ...["Suramérica", "Santa María", "Ditaires", "San Gabriel", "San Pío X"].map((b) => [b, "Itagüí"]),
  ...["Niquía", "Cabañas", "Fontidueño"].map((b) => [b, "Bello"])
].map(([nombre, zona]) => ({ nombre, zona }));

// PRECIOS Y ÁREAS FICTICIOS: solo para ver el diseño. No son datos reales del mercado.
window.PROPIEDADES = ((ejemplo) => [
  ejemplo("ma-001", "Apartamento en Laureles", "arriendo", "apartamento", "Laureles", 3, 2, 1, 3200000, 92),
  ejemplo("ma-002", "Apartamento en El Poblado", "venta", "apartamento", "El Poblado", 2, 2, 2, 650000000, 84),
  ejemplo("ma-003", "Apartamento en Envigado", "venta", "apartamento", "Envigado", 3, 2, 1, 520000000, 88),
  ejemplo("ma-004", "Apartamento en Sabaneta", "arriendo", "apartamento", "Sabaneta", 2, 1, 0, 2300000, 62),
  ejemplo("ma-005", "Apartamento en Belén", "venta", "apartamento", "Belén", 4, 3, 2, 480000000, 118),
  ejemplo("ma-006", "Apartaestudio en Itagüí", "arriendo", "apartaestudio", "Itagüí", 1, 1, 0, 1400000, 38),
  ejemplo("ma-007", "Apartamento en Bello", "arriendo", "apartamento", "Bello", 2, 1, 1, 1600000, 56),
  ejemplo("ma-008", "Apartamento en La América", "venta", "apartamento", "La América", 3, 2, 0, 390000000, 74)
])((id, titulo, operacion, tipo, zona, habitaciones, banos, parqueaderos, precio, area) => {
  const z = window.ZONAS.find((x) => x.nombre === zona);
  return {
    id, ejemplo: true, titulo, operacion, tipo, zona, municipio: z.municipio, metro: z.metro,
    habitaciones, banos, parqueaderos, parqueadero: parqueaderos > 0,
    area, precio, admin: null, estrato: null,
    lat: z.lat, lng: z.lng, tour: null, fotos: [], descripcion: null
  };
});
