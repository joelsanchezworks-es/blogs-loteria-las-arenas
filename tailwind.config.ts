import type { Config } from "tailwindcss";

/**
 * Tema de la INTERFAZ de la herramienta (no confundir con la paleta del POST
 * generado, que vive en referencias/reglas-estilo.md).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        noche: "#14152E", // fondo azul noche
        panel: "#1C1D3D", // paneles
        borde: "#2A2B52", // bordes
        oro: "#C9A961", // acento dorado
        claro: "#E8E8F0", // texto principal
        tenue: "#8B8CA7", // texto secundario
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
