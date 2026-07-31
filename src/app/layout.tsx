import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generador de Contenido HTML · Lotería Las Arenas",
  description:
    "Herramienta local para generar el HTML de los posts del blog de Lotería Las Arenas, con el estilo de la plantilla de referencia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-noche text-claro">
        {children}
      </body>
    </html>
  );
}
