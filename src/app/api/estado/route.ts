import { NextResponse } from "next/server";
import { ALMACEN, MODELO_API, MODO_LOCAL, MOTOR } from "@/lib/config";
import { clienteDisponible } from "@/lib/anthropic";
import { cliDisponible } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Estado del entorno según el modo activo (local/CLI o API/Postgres). */
export async function GET() {
  const base = { modoLocal: MODO_LOCAL, motor: MOTOR, almacen: ALMACEN, modelo: MODELO_API };

  if (MODO_LOCAL) {
    const cli = await cliDisponible();
    const hayApiKey = clienteDisponible();
    return NextResponse.json({ ...base, cliDisponible: cli, hayApiKey });
  }

  const hayApiKey = clienteDisponible();
  const hayPostgres = Boolean(process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim());
  return NextResponse.json({ ...base, hayApiKey, hayPostgres });
}
