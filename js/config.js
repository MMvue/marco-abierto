/*
  Conexión con Supabase.

  Mientras estos dos campos estén vacíos, el sitio funciona en MODO PRUEBA:
  los formularios se guardan solo en este navegador y el panel del
  administrador los muestra en este mismo computador.

  Para conectar de verdad, copia los datos de tu proyecto de Supabase
  (Project Settings > API) y pégalos aquí. Ver supabase/LEEME.md.

  La clave "anon public" puede estar en el sitio: es pública por diseño.
  Lo que protege los datos son las reglas de supabase/esquema.sql.
  NUNCA pegues aquí la clave "service_role".
*/
window.MA_CONFIG = {
  supabaseUrl: "https://gdhcryvifiyfkhybyiwg.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaGNyeXZpZml5ZmtoeWJ5aXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NjIxNzgsImV4cCI6MjEwOTEzODE3OH0.HxaK5Bh-ouiPfse3EWBPrKTv3ATJd5nKXOv3Jz_8Pwk", // "anon public"
  politicaVersion: "borrador-2026-11", // cámbiala cuando publiques la política definitiva
  ejemplosSiVacio: true // mientras no haya inmuebles publicados, mostrar los de ejemplo (js/propiedades.js)
};
