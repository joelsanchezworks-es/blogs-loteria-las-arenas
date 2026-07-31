/**
 * Cola secuencial (un solo `claude` a la vez).
 *
 * Si se sueltan varios trabajos, se procesan de uno en uno, no todos en paralelo.
 * Se guarda en globalThis para sobrevivir al HMR de desarrollo y compartir la
 * misma cola entre las rutas API.
 */

type Tarea<T> = () => Promise<T>;

type EstadoCola = {
  cadena: Promise<unknown>;
  pendientes: number;
};

const g = globalThis as unknown as { __colaLLA?: EstadoCola };

function obtener(): EstadoCola {
  if (!g.__colaLLA) g.__colaLLA = { cadena: Promise.resolve(), pendientes: 0 };
  return g.__colaLLA;
}

/**
 * Encola una tarea. `onPosicion` se llama con la posición en cola (>0) si tiene
 * que esperar a que terminen otras antes de arrancar.
 */
export function encolar<T>(
  tarea: Tarea<T>,
  onPosicion?: (posicion: number) => void,
): Promise<T> {
  const c = obtener();
  const posicion = c.pendientes; // 0 = arranca ya
  c.pendientes++;
  if (posicion > 0) onPosicion?.(posicion);

  const ejecucion = c.cadena.then(() => tarea());
  // La cadena sigue aunque la tarea falle; al terminar, decrementa el contador.
  c.cadena = ejecucion.then(
    () => {},
    () => {},
  ).then(() => {
    c.pendientes--;
  });
  return ejecucion;
}

export function pendientesEnCola(): number {
  return obtener().pendientes;
}
