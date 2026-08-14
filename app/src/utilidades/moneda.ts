/**
 * Formatea pesos chilenos: 27000 -> "$27.000".
 * En Chile el separador de miles es el punto y no se usan decimales.
 */
export function formatearCLP(monto: number | null | undefined): string {
  if (monto == null) {
    return '—';
  }
  const entero = Math.round(monto);
  const signo = entero < 0 ? '-' : '';
  const digitos = Math.abs(entero).toString();
  let salida = '';
  for (let i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 === 0) {
      salida += '.';
    }
    salida += digitos[i];
  }
  return `${signo}$${salida}`;
}
