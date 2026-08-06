import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las rutas API leen referencias/reglas-estilo.md y plantilla-ejemplo.html en
  // tiempo de ejecución para inyectarlas en el prompt. En Vercel hay que incluir
  // esos archivos en el bundle de las funciones serverless.
  outputFileTracingIncludes: {
    "/api/generar": ["./referencias/**"],
    "/api/detectar": ["./referencias/**"],
    "/api/reglas": ["./referencias/**"],
    // La ruta ZIP lee public/arenas.css para incluirlo en el paquete.
    "/api/zip": ["./public/arenas.css"],
  },
};

export default nextConfig;
