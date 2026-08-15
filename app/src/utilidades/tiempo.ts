/** "hace 5 min", "hace 2 h", "ayer"... Para listas donde la fecha exacta estorba. */
export function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) return 'recién';
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86_400) return `hace ${Math.floor(segundos / 3600)} h`;

  const dias = Math.floor(segundos / 86_400);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;

  // Más de un mes: la fecha concreta dice más que "hace N meses".
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}
