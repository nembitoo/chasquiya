/*
 * Genera el fondo del dashboard: una malla de puntos conectados, mas densa
 * abajo, sobre un degradado oscuro. Sale un SVG (unos pocos KB) en vez de una
 * foto: escala a cualquier pantalla y no mete un binario al repositorio.
 *
 * Semilla fija => el resultado es siempre el mismo. Si se vuelve a correr, no
 * cambia el diseno sin querer.
 */
const fs = require('fs');

const ANCHO = 1600;
const ALTO = 900;
const DISTANCIA_MAX = 128; // hasta donde se unen dos puntos

// Generador con semilla (mulberry32): reproducible entre corridas.
function aleatorio(semilla) {
  return function () {
    semilla |= 0;
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = aleatorio(20260815);

// Los puntos se concentran abajo: arriba queda aire para que se lea el contenido.
const puntos = [];
for (let i = 0; i < 190; i++) {
  const sesgo = Math.pow(rnd(), 0.55); // empuja hacia el borde inferior
  puntos.push({
    x: rnd() * (ANCHO + 120) - 60,
    y: ALTO - sesgo * ALTO * 0.72,
  });
}

const lineas = [];
for (let i = 0; i < puntos.length; i++) {
  for (let j = i + 1; j < puntos.length; j++) {
    const dx = puntos[i].x - puntos[j].x;
    const dy = puntos[i].y - puntos[j].y;
    const d = Math.hypot(dx, dy);
    if (d < DISTANCIA_MAX) {
      // Mientras mas lejos, mas tenue: da sensacion de profundidad.
      const op = (1 - d / DISTANCIA_MAX) * 0.42;
      lineas.push(
        `<line x1="${puntos[i].x.toFixed(0)}" y1="${puntos[i].y.toFixed(0)}" ` +
        `x2="${puntos[j].x.toFixed(0)}" y2="${puntos[j].y.toFixed(0)}" opacity="${op.toFixed(2)}"/>`,
      );
    }
  }
}

const nodos = puntos
  .map((p) => `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${(1.3 + rnd() * 1.5).toFixed(1)}"/>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" preserveAspectRatio="xMidYMax slice">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#4A4A4A"/>
      <stop offset="0.45" stop-color="#333333"/>
      <stop offset="1" stop-color="#242424"/>
    </linearGradient>
    <radialGradient id="brillo" cx="0.08" cy="0.05" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#cielo)"/>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#brillo)"/>
  <g stroke="#FFFFFF" stroke-width="0.9" fill="none">${lineas.join('')}</g>
  <g fill="#FFFFFF" opacity="0.55">${nodos}</g>
</svg>
`;

const destino = process.argv[2];
fs.writeFileSync(destino, svg);
console.log(`OK: ${destino} — ${puntos.length} puntos, ${lineas.length} lineas, ${(svg.length / 1024).toFixed(1)} KB`);
