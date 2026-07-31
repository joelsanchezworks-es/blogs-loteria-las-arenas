import { NextResponse } from "next/server";
import { comprobarApiKey } from "@/lib/guard";
import { verificarCli } from "@/lib/claude";

export const dynamic = "force-dynamic";

/** Estado del entorno: guardia de API key + disponibilidad del CLI. */
export async function GET() {
  const apiKey = comprobarApiKey();
  const cli = await verificarCli();
  return NextResponse.json({ apiKey, cli });
}
