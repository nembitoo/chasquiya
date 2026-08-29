/*
 * Backoffice de ChasquiYa!
 * Se sirve desde el propio backend, así que las llamadas van al mismo origen
 * (no hay CORS). El token JWT del admin se guarda en el navegador.
 */

const CLAVE_TOKEN = 'chasquiya_admin_token';
let token = localStorage.getItem(CLAVE_TOKEN);

// ---------- Utilidades ----------

/** Llama a la API agregando el token; si expiró, vuelve al login. */
async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    salir();
    throw new Error('Tu sesión expiró. Vuelve a entrar.');
  }
  if (!res.ok) {
    let motivo = 'Ocurrió un error.';
    try {
      const cuerpo = await res.json();
      motivo = cuerpo.detail || cuerpo.message || motivo;
    } catch (_) { /* sin cuerpo JSON */ }
    throw new Error(motivo);
  }
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

const pesos = (n) => '$' + (n ?? 0).toLocaleString('es-CL');
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL') : '—');
/** Evita inyección de HTML al mostrar texto que escribieron los usuarios. */
const txt = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function mostrarError(e) {
  document.getElementById('error-global').textContent = e instanceof Error ? e.message : String(e);
}

const OFICIOS = ['ELECTRICIDAD', 'GASFITERIA', 'CERRAJERIA', 'PINTURA', 'LIMPIEZA',
  'REPARACIONES', 'INSTALACIONES', 'MANTENCION', 'OTROS'];
const ETIQUETA_OFICIO = {
  ELECTRICIDAD: 'Electricidad', GASFITERIA: 'Gasfitería', CERRAJERIA: 'Cerrajería',
  PINTURA: 'Pintura', LIMPIEZA: 'Limpieza', REPARACIONES: 'Reparaciones',
  INSTALACIONES: 'Instalaciones', MANTENCION: 'Mantención', OTROS: 'Otros',
};

const COLOR_ESTADO = {
  SOLICITADO: 'badge-amarillo', COTIZADO: 'badge-azul', ACEPTADO: 'badge-azul',
  EN_CURSO: 'badge-amarillo', COMPLETADO: 'badge-verde', PAGADO: 'badge-verde',
  CALIFICADO: 'badge-verde', CANCELADO: 'badge-gris', EN_DISPUTA: 'badge-rojo',
  APROBADO: 'badge-verde', PENDIENTE: 'badge-amarillo', RECHAZADO: 'badge-rojo',
};
const badge = (estado) => `<span class="badge ${COLOR_ESTADO[estado] || 'badge-gris'}">${txt(estado)}</span>`;

// ---------- Acceso ----------

async function entrar(evento) {
  evento.preventDefault();
  const error = document.getElementById('login-error');
  error.textContent = '';
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });
    const cuerpo = await res.json();
    if (!res.ok) throw new Error(cuerpo.detail || cuerpo.message || 'No se pudo entrar.');
    if (cuerpo.rol !== 'ADMIN') throw new Error('Esta cuenta no es de administrador.');

    token = cuerpo.token;
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem('chasquiya_admin_nombre', cuerpo.nombre);
    abrirPanel();
  } catch (e) {
    error.textContent = e.message;
  }
}

function salir() {
  localStorage.removeItem(CLAVE_TOKEN);
  token = null;
  document.getElementById('panel').classList.add('oculto');
  document.getElementById('login').classList.remove('oculto');
}

function abrirPanel() {
  const nombre = localStorage.getItem('chasquiya_admin_nombre') || '';
  document.getElementById('login').classList.add('oculto');
  document.getElementById('panel').classList.remove('oculto');
  document.getElementById('admin-nombre').textContent = nombre;
  document.getElementById('admin-inicial').textContent = (nombre.trim()[0] || 'A').toUpperCase();
  pintarMenu();
  mostrar('dashboard');
}

// ---------- Tema ----------

/**
 * El tema se guarda en el navegador y se aplica en el <html>, no aquí: el
 * index lo lee antes de pintar para que no haya un destello blanco al cargar.
 */
function alternarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  const nuevo = oscuro ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = nuevo;
  localStorage.setItem('chasquiya_tema', nuevo);

  // Chart.js dibuja en un canvas: no hereda CSS, hay que redibujarlo a mano.
  if (!document.getElementById('vista-dashboard').classList.contains('oculto')) {
    cargarDashboard().catch(mostrarError);
  }
}

/** Colores del tema actual, leídos del CSS para no repetirlos en dos lugares. */
function tema() {
  const css = getComputedStyle(document.documentElement);
  const leer = (nombre) => css.getPropertyValue(nombre).trim();
  return {
    primario: leer('--primario'),
    texto: leer('--texto-suave'),
    borde: leer('--borde'),
    esOscuro: document.documentElement.dataset.tema === 'oscuro',
  };
}

// ---------- Navegación ----------

const ICONOS = {
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  maestros: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  servicios: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  disputas: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  reclamos: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
  dinero: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  grafico: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  check: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/>',
  estrella: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z"/>',
  ticket: '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 5v14"/>',
  activo: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  cancelado: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
};

const svg = (nombre) => `<svg viewBox="0 0 24 24" class="nav-icono">${ICONOS[nombre] || ''}</svg>`;

const VISTAS = [
  { id: 'dashboard', titulo: 'Dashboard', subtitulo: 'Resumen de la plataforma' },
  { id: 'maestros', titulo: 'Maestros', subtitulo: 'Perfiles registrados y su verificación' },
  { id: 'usuarios', titulo: 'Usuarios', subtitulo: 'Cuentas de clientes y maestros' },
  { id: 'servicios', titulo: 'Servicios', subtitulo: 'Todas las transacciones de la plataforma' },
  { id: 'disputas', titulo: 'Disputas', subtitulo: 'Problemas abiertos sobre un servicio' },
  { id: 'reclamos', titulo: 'Reclamos', subtitulo: 'Soporte que no es de un servicio puntual' },
];

function pintarMenu() {
  document.getElementById('menu').innerHTML = VISTAS.map((v) => `
    <button class="nav-item" data-vista="${v.id}" onclick="mostrar('${v.id}')">
      ${svg(v.id)}
      <span>${v.titulo}</span>
      <span class="nav-contador oculto" id="contador-${v.id}"></span>
    </button>`).join('');
}

/** Marca en el menú lo que está esperando una decisión. */
function marcarPendientes(id, cantidad) {
  const globo = document.getElementById('contador-' + id);
  if (!globo) return;
  globo.textContent = cantidad;
  globo.classList.toggle('oculto', !cantidad);
}

function alternarMenu(abrir) {
  document.getElementById('sidebar').classList.toggle('abierto', abrir);
  document.getElementById('sidebar-fondo').classList.toggle('visible', abrir);
}

function mostrar(vista) {
  document.getElementById('error-global').textContent = '';
  document.querySelectorAll('.vista').forEach((v) => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('.nav-item').forEach((b) =>
    b.classList.toggle('activa', b.dataset.vista === vista));

  const datos = VISTAS.find((v) => v.id === vista);
  document.getElementById('titulo-vista').textContent = datos.titulo;
  document.getElementById('subtitulo-vista').textContent = datos.subtitulo;
  alternarMenu(false);

  const cargadores = {
    dashboard: cargarDashboard,
    maestros: cargarMaestros,
    usuarios: cargarUsuarios,
    servicios: cargarServicios,
    disputas: cargarDisputas,
    reclamos: cargarReclamos,
  };
  cargadores[vista]().catch(mostrarError);
}

// ---------- Dashboard ----------

/** Período seleccionado, en días. */
let dias = 30;
/** Instancias de Chart.js vivas: hay que destruirlas antes de redibujar. */
const graficos = {};

// Mismos colores que estilos.css, para que los gráficos no desentonen.
const PALETA = {
  primario: '#E11D2A',
  primarioSuave: 'rgba(225, 29, 42, 0.12)',
  azul: '#2563EB',
  verde: '#16A34A',
  amarillo: '#F59E0B',
  rojo: '#DC2626',
  gris: '#94A3B8',
};

const COLOR_GRAFICO_ESTADO = {
  SOLICITADO: PALETA.amarillo, COTIZADO: PALETA.azul, ACEPTADO: PALETA.azul,
  EN_CURSO: PALETA.amarillo, COMPLETADO: PALETA.verde, PAGADO: PALETA.verde,
  CALIFICADO: PALETA.verde, CANCELADO: PALETA.gris, EN_DISPUTA: PALETA.rojo,
};

function cambiarPeriodo(nuevos) {
  dias = nuevos;
  document.querySelectorAll('.periodo-btn').forEach((b) =>
    b.classList.toggle('activo', Number(b.dataset.dias) === dias));
  cargarDashboard().catch(mostrarError);
}

/**
 * Flechita de variación. Si el período anterior fue cero, el backend manda
 * null: no se puede medir el crecimiento desde nada, así que va un guion.
 */
function variacion(comp, alRevés = false) {
  if (!comp || comp.variacion === null || comp.variacion === undefined) {
    return '<span class="var var-neutra">— sin base previa</span>';
  }
  const v = comp.variacion;
  // En cancelaciones, subir es malo: el color se invierte para que el verde
  // siempre signifique "buena noticia".
  const bueno = alRevés ? v < 0 : v > 0;
  const clase = v === 0 ? 'var-neutra' : bueno ? 'var-sube' : 'var-baja';
  const flecha = v > 0 ? '▲' : v < 0 ? '▼' : '=';
  return `<span class="var ${clase}">${flecha} ${Math.abs(v)}%</span>`;
}

async function cargarDashboard() {
  const m = await api(`/admin/metricas?dias=${dias}`);

  pintarAlertas(m.alertas || []);

  // Tasas derivadas: se calculan aquí porque son cociente de datos que ya vienen.
  const creados = m.serviciosCreados.actual;
  const tasaConversion = creados ? Math.round((m.serviciosCompletados.actual / creados) * 100) : null;
  const tasaCancelacion = creados ? Math.round((m.serviciosCancelados.actual / creados) * 100) : null;

  // Flujo: lo que pasó DURANTE el período, con su comparación.
  const flujo = [
    { icono: 'dinero', etiqueta: `Comisiones (${m.dias} días)`, valor: pesos(m.comisiones.actual), comp: m.comisiones },
    { icono: 'grafico', etiqueta: 'Monto transado', valor: pesos(m.montoTransado.actual), comp: m.montoTransado },
    { icono: 'servicios', etiqueta: 'Servicios creados', valor: creados, comp: m.serviciosCreados },
    { icono: 'check', etiqueta: 'Servicios terminados', valor: m.serviciosCompletados.actual, comp: m.serviciosCompletados },
    { icono: 'ticket', etiqueta: 'Ticket promedio', valor: pesos(m.ticketPromedio.actual), comp: m.ticketPromedio },
    { icono: 'usuarios', etiqueta: 'Usuarios nuevos', valor: m.usuariosNuevos.actual, comp: m.usuariosNuevos },
    { icono: 'activo', etiqueta: 'Usuarios activos', valor: m.usuariosActivos, ayuda: 'Participaron en algún servicio' },
    { icono: 'cancelado', etiqueta: 'Servicios cancelados', valor: m.serviciosCancelados.actual, comp: m.serviciosCancelados, alRevés: true },
  ];
  // Stock: una foto de ahora. No lleva período ni comparación.
  const stock = [
    { icono: 'usuarios', etiqueta: 'Usuarios registrados', valor: m.usuariosTotales },
    { icono: 'usuarios', etiqueta: 'Clientes', valor: m.clientes },
    { icono: 'maestros', etiqueta: 'Maestros', valor: m.maestros },
    { icono: 'check', etiqueta: 'Maestros aprobados', valor: m.maestrosAprobados },
    { icono: 'maestros', etiqueta: 'Maestros pendientes', valor: m.maestrosPendientes },
    { icono: 'disputas', etiqueta: 'Disputas abiertas', valor: m.disputasAbiertas },
    { icono: 'estrella', etiqueta: 'Calificación promedio', valor: m.calificacionPromedio || '—' },
    { icono: 'check', etiqueta: 'Tasa de conversión', valor: tasaConversion === null ? '—' : tasaConversion + '%' },
    { icono: 'cancelado', etiqueta: 'Tasa de cancelación', valor: tasaCancelacion === null ? '—' : tasaCancelacion + '%' },
  ];

  document.getElementById('tarjetas').innerHTML = flujo.map((t) => `
    <div class="tarjeta">
      <div class="tarjeta-icono">${svg(t.icono)}</div>
      <div class="tarjeta-pie">
        <div>
          <div class="tarjeta-valor">${t.valor}</div>
          <div class="tarjeta-etiqueta">${t.etiqueta}</div>
        </div>
        ${t.comp ? variacion(t.comp, t.alRevés) : `<span class="var var-neutra">${t.ayuda || ''}</span>`}
      </div>
    </div>`).join('');

  document.getElementById('tarjetas-stock').innerHTML = stock.map((t) => `
    <div class="tarjeta tarjeta-chica">
      <div class="tarjeta-icono">${svg(t.icono)}</div>
      <div class="tarjeta-valor">${t.valor}</div>
      <div class="tarjeta-etiqueta">${t.etiqueta}</div>
    </div>`).join('');

  // El menú avisa de lo pendiente sin tener que entrar a cada sección.
  marcarPendientes('maestros', m.maestrosPendientes);
  marcarPendientes('disputas', m.disputasAbiertas);
  marcarPendientes('reclamos',
    (m.alertas || []).filter((a) => a.tipo === 'reclamo').reduce((n, a) => n + a.cantidad, 0));

  dibujarEvolucion(m.serie || []);
  dibujarEstados(m.serviciosPorEstado || {});
  dibujarUsuarios(m.serie || []);
}

/** Barras de altas por día: se ve mejor el pulso de registros que con una línea. */
function dibujarUsuarios(serie) {
  const tm = tema();
  Chart.defaults.color = tm.texto;
  const paso = serie.length > 45 ? 7 : serie.length > 14 ? 3 : 1;

  nuevoGrafico('gr-usuarios', {
    type: 'bar',
    data: {
      labels: serie.map((p, i) => (i % paso === 0 ? formatoDiaMes(p.fecha) : '')),
      datasets: [{
        label: 'Usuarios nuevos',
        data: serie.map((p) => p.usuariosNuevos),
        backgroundColor: PALETA.azul,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: (items) => formatoDiaMes(serie[items[0].dataIndex].fecha) } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

function pintarAlertas(alertas) {
  const caja = document.getElementById('alertas');
  if (alertas.length === 0) {
    caja.innerHTML = '<div class="alerta alerta-ok">✅ Nada pendiente por revisar.</div>';
    return;
  }
  caja.innerHTML = alertas.map((a) => `
    <div class="alerta alerta-${txt(a.severidad)}">
      <strong>${a.cantidad}</strong> ${txt(a.mensaje)}
    </div>`).join('');
}

/** Destruye el gráfico anterior antes de crear el nuevo (si no, se acumulan). */
function nuevoGrafico(id, config) {
  if (graficos[id]) graficos[id].destroy();
  graficos[id] = new Chart(document.getElementById(id), config);
}

function dibujarEvolucion(serie) {
  // Con 90 días, una etiqueta por día es ilegible: se muestran salteadas.
  const paso = serie.length > 45 ? 7 : serie.length > 14 ? 3 : 1;
  const etiquetas = serie.map((p, i) => (i % paso === 0 ? formatoDiaMes(p.fecha) : ''));
  const tm = tema();
  // Los ejes y la leyenda son texto sobre el fondo: siguen al tema.
  Chart.defaults.color = tm.texto;
  Chart.defaults.borderColor = tm.borde;

  nuevoGrafico('gr-evolucion', {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Servicios creados',
          data: serie.map((p) => p.servicios),
          borderColor: PALETA.primario,
          backgroundColor: PALETA.primarioSuave,
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Comisiones ($)',
          data: serie.map((p) => p.comisiones),
          borderColor: PALETA.verde,
          backgroundColor: 'transparent',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            // El eje X va con etiquetas salteadas; el tooltip sí muestra la fecha completa.
            title: (items) => formatoDiaMes(serie[items[0].dataIndex].fecha),
            label: (item) => item.datasetIndex === 1
              ? `Comisiones: ${pesos(item.parsed.y)}`
              : `Servicios: ${item.parsed.y}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Servicios' } },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Comisiones' },
          ticks: { callback: (v) => pesos(v) },
        },
      },
    },
  });
}

function dibujarEstados(porEstado) {
  const tm = tema();
  Chart.defaults.color = tm.texto;
  const estados = Object.entries(porEstado).sort((a, b) => b[1] - a[1]);
  const vacio = document.getElementById('estados-vacio');
  const lienzo = document.getElementById('gr-estados');

  if (estados.length === 0) {
    vacio.textContent = 'Todavía no hay servicios.';
    lienzo.style.display = 'none';
    if (graficos['gr-estados']) { graficos['gr-estados'].destroy(); delete graficos['gr-estados']; }
    return;
  }
  vacio.textContent = '';
  lienzo.style.display = '';

  nuevoGrafico('gr-estados', {
    type: 'doughnut',
    data: {
      labels: estados.map(([e]) => e),
      datasets: [{
        data: estados.map(([, n]) => n),
        backgroundColor: estados.map(([e]) => COLOR_GRAFICO_ESTADO[e] || PALETA.gris),
        // El borde separa los gajos; tiene que ser del color del panel, no blanco fijo.
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--superficie').trim(),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } },
    },
  });
}

/** "2026-08-15" -> "15 ago". Se parte a mano para no depender de la zona horaria. */
function formatoDiaMes(iso) {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [, mes, dia] = iso.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1]}`;
}

// ---------- Maestros ----------

async function cargarMaestros() {
  const lista = await api('/admin/maestros');
  maestrosCargados = lista;
  listado({
    id: 'maestros',
    contenedor: 'tabla-maestros',
    datos: lista,
    placeholder: 'Buscar por nombre, correo, oficio o zona…',
    vacio: 'Todavía no hay maestros con perfil.',
    buscarEn: (m) => `${m.nombre} ${m.apellido} ${m.email} ${(m.oficios || []).join(' ')} ${m.zonaCobertura || ''} ${m.usuarioId}`,
    filtros: [
      {
        clave: 'estado', etiqueta: 'Estado', de: (m) => m.estadoVerificacion,
        opciones: [
          { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
          { valor: 'APROBADO', etiqueta: 'Aprobado' },
          { valor: 'RECHAZADO', etiqueta: 'Rechazado' },
        ],
      },
      {
        clave: 'oficio', etiqueta: 'Oficio', de: (m) => (m.oficios || [])[0],
        opciones: OFICIOS.map((o) => ({ valor: o, etiqueta: ETIQUETA_OFICIO[o] || o })),
      },
    ],
    ordenes: [
      { clave: 'nombre-az', etiqueta: 'Nombre A-Z', cmp: porTextoAsc((m) => `${m.nombre} ${m.apellido}`) },
      { clave: 'nombre-za', etiqueta: 'Nombre Z-A', cmp: porTextoDesc((m) => `${m.nombre} ${m.apellido}`) },
      { clave: 'exp-mayor', etiqueta: 'Más experiencia', cmp: porNumeroDesc((m) => m.aniosExperiencia) },
      { clave: 'exp-menor', etiqueta: 'Menos experiencia', cmp: porNumeroAsc((m) => m.aniosExperiencia) },
    ],
    render: (pagina) => tabla(
      ['Nombre', 'Correo', 'Oficios', 'Zona', 'Exp.', 'Estado', 'Acciones'],
      pagina,
      (m) => `
        <td>${txt(m.nombre)} ${txt(m.apellido)}</td>
        <td>${txt(m.email)}</td>
        <td>${(m.oficios || []).map((o) => txt(ETIQUETA_OFICIO[o] || o)).join(', ')}</td>
        <td>${txt(m.zonaCobertura || '—')}</td>
        <td>${m.aniosExperiencia} años</td>
        <td>${badge(m.estadoVerificacion)}</td>
        <td class="acciones-celda">
          <button class="btn btn-mini btn-secundario" onclick="verFichaMaestro(${m.usuarioId})">Ver ficha</button>
        </td>`),
  });
}

/*
 * Ficha del maestro: lo que hace falta para decidir su verificacion.
 *
 * Antes la tabla solo ofrecia Aprobar/Rechazar, sin forma de ver el carnet ni
 * los antecedentes: el admin decidia a ciegas.
 */
let maestrosCargados = [];
let urlsFicha = [];

/**
 * Descarga una imagen protegida y la deja lista para un <img>.
 *
 * Un <img src> no puede mandar el encabezado Authorization, asi que se pide con
 * fetch y se envuelve en un blob local. Las URLs creadas hay que liberarlas al
 * cerrar o se van acumulando en memoria.
 */
async function urlImagen(ruta, destino) {
  const res = await fetch(ruta, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('No se pudo cargar la imagen');
  const url = URL.createObjectURL(await res.blob());
  (destino || urlsFicha).push(url);
  return url;
}

async function verFichaMaestro(usuarioId) {
  const m = maestrosCargados.find((x) => x.usuarioId === usuarioId);
  if (!m) return;

  const cuerpo = document.getElementById('ficha-cuerpo');
  const iniciales = `${(m.nombre || '?')[0] || ''}${(m.apellido || '')[0] || ''}`.toUpperCase();
  cuerpo.innerHTML = `
    <div class="ficha-cabecera">
      <div class="ficha-avatar" id="ficha-avatar">${txt(iniciales)}</div>
      <div>
        <div class="ficha-nombre" id="ficha-titulo">${txt(m.nombre)} ${txt(m.apellido)}</div>
        <div class="ficha-correo">${txt(m.email)}${m.telefono ? ' · ' + txt(m.telefono) : ''}</div>
        <div style="margin-top:6px">${badge(m.estadoVerificacion)}</div>
      </div>
    </div>

    <div class="ficha-datos">
      <div class="ficha-dato">
        <div class="ficha-dato-etiqueta">Oficios</div>
        <div class="ficha-dato-valor">${(m.oficios || []).map((o) => txt(ETIQUETA_OFICIO[o] || o)).join(', ') || '—'}</div>
      </div>
      <div class="ficha-dato">
        <div class="ficha-dato-etiqueta">Zona</div>
        <div class="ficha-dato-valor">${txt(m.zonaCobertura || '—')}</div>
      </div>
      <div class="ficha-dato">
        <div class="ficha-dato-etiqueta">Experiencia</div>
        <div class="ficha-dato-valor">${m.aniosExperiencia} años</div>
      </div>
      <div class="ficha-dato">
        <div class="ficha-dato-etiqueta">Trabajos terminados</div>
        <div class="ficha-dato-valor">${m.trabajosCompletados}</div>
      </div>
      <div class="ficha-dato">
        <div class="ficha-dato-etiqueta">Calificación</div>
        <div class="ficha-dato-valor">${m.cantidadCalificaciones > 0
          ? `${m.calificacionPromedio.toFixed(1)} (${m.cantidadCalificaciones})`
          : 'Sin calificaciones'}</div>
      </div>
    </div>

    ${m.descripcion ? `
      <div class="ficha-titulo-bloque">Cómo se describe</div>
      <p class="ficha-descripcion">${txt(m.descripcion)}</p>` : ''}

    <div class="ficha-titulo-bloque">Documentos de verificación</div>
    <div class="ficha-docs" id="ficha-docs"><p class="vacio">Cargando documentos…</p></div>

    <div class="ficha-acciones">
      ${m.estadoVerificacion !== 'APROBADO'
        ? `<button class="btn" onclick="decidirMaestro(${m.usuarioId}, true)">Aprobar</button>` : ''}
      ${m.estadoVerificacion !== 'RECHAZADO'
        ? `<button class="btn btn-secundario" onclick="decidirMaestro(${m.usuarioId}, false)">Rechazar</button>` : ''}
    </div>`;

  document.getElementById('ficha-fondo').classList.remove('oculto');

  // La foto de perfil es opcional: si no tiene, quedan sus iniciales.
  if (m.tieneAvatar) {
    try {
      const url = await urlImagen(`/usuarios/${usuarioId}/avatar`);
      const caja = document.getElementById('ficha-avatar');
      if (caja) caja.outerHTML = `<img class="ficha-avatar" src="${url}" alt="Foto de ${txt(m.nombre)}" />`;
    } catch (_) { /* se queda con las iniciales */ }
  }

  const contenedor = document.getElementById('ficha-docs');
  try {
    const docs = await api(`/admin/maestros/${usuarioId}/documentos`);
    if (!docs.length) {
      contenedor.innerHTML = '<p class="vacio">Todavía no subió ningún documento.</p>';
      return;
    }
    const partes = await Promise.all(docs.map(async (d) => {
      try {
        const url = await urlImagen(`/admin/maestros/${usuarioId}/documentos/${d.id}/contenido`);
        return `<figure class="ficha-doc">
                  <img src="${url}" alt="${txt(d.nombreArchivo)}" onclick="window.open('${url}', '_blank')" />
                  <span>${txt(d.nombreArchivo)}</span>
                </figure>`;
      } catch (_) {
        return `<figure class="ficha-doc"><span>No se pudo cargar ${txt(d.nombreArchivo)}</span></figure>`;
      }
    }));
    contenedor.innerHTML = partes.join('');
  } catch (e) {
    contenedor.innerHTML = `<p class="vacio">${txt(e.message)}</p>`;
  }
}

function cerrarFicha(evento) {
  // Solo cierra al tocar el fondo, no al tocar la ficha.
  if (evento && evento.target !== document.getElementById('ficha-fondo')) return;
  document.getElementById('ficha-fondo').classList.add('oculto');
  urlsFicha.forEach((u) => URL.revokeObjectURL(u));
  urlsFicha = [];
}

async function decidirMaestro(usuarioId, aprobar) {
  try {
    await api(`/admin/maestros/${usuarioId}/${aprobar ? 'aprobar' : 'rechazar'}`, { method: 'POST' });
    document.getElementById('ficha-fondo').classList.add('oculto');
    await cargarMaestros();
  } catch (e) { mostrarError(e); }
}

// ---------- Usuarios ----------

async function cargarUsuarios() {
  const lista = await api('/admin/usuarios');
  listado({
    id: 'usuarios',
    contenedor: 'tabla-usuarios',
    datos: lista,
    placeholder: 'Buscar por nombre, correo, teléfono o ID…',
    vacio: 'No hay usuarios registrados.',
    buscarEn: (u) => `${u.id} ${u.nombre} ${u.apellido} ${u.email} ${u.telefono || ''}`,
    filtros: [
      {
        clave: 'rol', etiqueta: 'Rol', de: (u) => u.rol,
        opciones: [
          { valor: 'CLIENTE', etiqueta: 'Cliente' },
          { valor: 'MAESTRO', etiqueta: 'Maestro' },
          { valor: 'ADMIN', etiqueta: 'Admin' },
        ],
      },
      {
        clave: 'activo', etiqueta: 'Estado', de: (u) => u.activo,
        opciones: [{ valor: true, etiqueta: 'Activo' }, { valor: false, etiqueta: 'Suspendido' }],
      },
    ],
    ordenes: [
      { clave: 'reciente', etiqueta: 'Más reciente', cmp: porFechaDesc('fechaCreacion') },
      { clave: 'antiguo', etiqueta: 'Más antiguo', cmp: porFechaAsc('fechaCreacion') },
      { clave: 'nombre-az', etiqueta: 'Nombre A-Z', cmp: porTextoAsc((u) => `${u.nombre} ${u.apellido}`) },
      { clave: 'nombre-za', etiqueta: 'Nombre Z-A', cmp: porTextoDesc((u) => `${u.nombre} ${u.apellido}`) },
      { clave: 'mas-servicios', etiqueta: 'Más servicios', cmp: porNumeroDesc((u) => u.serviciosRealizados) },
      { clave: 'menos-servicios', etiqueta: 'Menos servicios', cmp: porNumeroAsc((u) => u.serviciosRealizados) },
    ],
    render: (pagina) => tabla(
      ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Servicios', 'Registro', 'Estado', 'Acciones'],
      pagina,
      (u) => `
        <td>${txt(u.nombre)} ${txt(u.apellido)}</td>
        <td>${txt(u.email)}</td>
        <td>${txt(u.telefono || '—')}</td>
        <td>${badge(u.rol)}</td>
        <td>${u.serviciosRealizados}</td>
        <td>${fecha(u.fechaCreacion)}</td>
        <td>${u.activo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-rojo">Suspendido</span>'}</td>
        <td class="acciones-celda">
          ${u.rol === 'ADMIN' ? '—' : (u.activo
            ? `<button class="btn btn-mini btn-secundario" onclick="cambiarEstadoUsuario(${u.id}, false)">Suspender</button>`
            : `<button class="btn btn-mini" onclick="cambiarEstadoUsuario(${u.id}, true)">Reactivar</button>`)}
        </td>`),
  });
}

async function cambiarEstadoUsuario(id, activar) {
  try {
    await api(`/admin/usuarios/${id}/${activar ? 'reactivar' : 'suspender'}`, { method: 'POST' });
    await cargarUsuarios();
  } catch (e) { mostrarError(e); }
}

// ---------- Servicios ----------

async function cargarServicios() {
  const lista = await api('/admin/servicios');
  listado({
    id: 'servicios',
    contenedor: 'tabla-servicios',
    datos: lista,
    placeholder: 'Buscar por cliente, maestro, descripción o ID…',
    vacio: 'Todavía no hay servicios.',
    buscarEn: (s) => `${s.id} ${s.clienteNombre} ${s.maestroNombre} ${s.descripcion || ''} ${s.direccion || ''}`,
    filtros: [
      {
        clave: 'estado', etiqueta: 'Estado', de: (s) => s.estado,
        opciones: ['SOLICITADO', 'COTIZADO', 'ACEPTADO', 'EN_CURSO', 'COMPLETADO', 'PAGADO', 'CALIFICADO', 'CANCELADO', 'EN_DISPUTA']
          .map((e) => ({ valor: e, etiqueta: e.replace('_', ' ') })),
      },
      {
        clave: 'oficio', etiqueta: 'Categoría', de: (s) => s.oficio,
        opciones: OFICIOS.map((o) => ({ valor: o, etiqueta: ETIQUETA_OFICIO[o] || o })),
      },
      {
        clave: 'maestro', etiqueta: 'Maestro', de: (s) => s.maestroNombre,
        opciones: [...new Set(lista.map((s) => s.maestroNombre))].sort()
          .map((n) => ({ valor: n, etiqueta: n })),
      },
    ],
    ordenes: [
      { clave: 'reciente', etiqueta: 'Más reciente', cmp: porFechaDesc('fechaCreacion') },
      { clave: 'antiguo', etiqueta: 'Más antiguo', cmp: porFechaAsc('fechaCreacion') },
      { clave: 'monto-mayor', etiqueta: 'Mayor monto', cmp: porNumeroDesc((s) => s.cotizacionMonto) },
      { clave: 'monto-menor', etiqueta: 'Menor monto', cmp: porNumeroAsc((s) => s.cotizacionMonto) },
    ],
    render: (pagina) => tabla(
      ['#', 'Cliente', 'Maestro', 'Servicio', 'Fecha', 'Monto', 'Estado'],
      pagina,
      (s) => `
        <td>${s.id}</td>
        <td>${txt(s.clienteNombre)}</td>
        <td>${txt(s.maestroNombre)}</td>
        <td>${txt(ETIQUETA_OFICIO[s.oficio] || s.oficio)}</td>
        <td>${fecha(s.fechaCreacion)}</td>
        <td>${s.cotizacionMonto ? pesos(s.cotizacionMonto) : '—'}</td>
        <td>${badge(s.estado)}</td>`),
  });
}

// ---------- Disputas ----------

async function cargarDisputas() {
  const lista = await api('/admin/disputas');
  const caja = document.getElementById('tabla-disputas');
  if (lista.length === 0) {
    caja.innerHTML = '<p class="vacio">No hay disputas abiertas 🎉</p>';
    return;
  }
  caja.innerHTML = lista.map((d) => `
    <div class="disputa-caja">
      <div class="disputa-partes">${txt(d.clienteNombre)} <span style="color:#6B7280;font-weight:400">vs</span> ${txt(d.maestroNombre)}</div>
      <div style="color:#6B7280;margin-top:4px">${txt(d.descripcion)} · ${d.cotizacionMonto ? pesos(d.cotizacionMonto) : 'sin cotización'}</div>
      <div class="disputa-motivo"><strong>Motivo:</strong> ${txt(d.motivoCancelacion || 'Sin detalle')}</div>
      <div class="fila-form">
        <input id="resolucion-${d.id}" placeholder="Resolución (queda registrada)" />
        <button class="btn btn-mini" onclick="resolverDisputa(${d.id}, true)">A favor del cliente</button>
        <button class="btn btn-mini btn-secundario" onclick="resolverDisputa(${d.id}, false)">A favor del maestro</button>
      </div>
    </div>`).join('');
}

async function resolverDisputa(id, aFavorDelCliente) {
  try {
    const resolucion = document.getElementById('resolucion-' + id).value;
    await api(`/admin/disputas/${id}/resolver`, {
      method: 'POST',
      body: JSON.stringify({ aFavorDelCliente, resolucion }),
    });
    await cargarDisputas();
  } catch (e) { mostrarError(e); }
}

// ---------- Reclamos y soporte ----------

const ETIQUETA_CATEGORIA = {
  PAGO: 'Pago', SERVICIO: 'Servicio', CUENTA: 'Cuenta',
  DENUNCIA: 'Denuncia', SUGERENCIA: 'Sugerencia', OTRO: 'Otro',
};
const COLOR_TICKET = { NUEVO: 'badge-rojo', EN_REVISION: 'badge-amarillo', RESUELTO: 'badge-verde' };

/*
 * Las evidencias se piden al tocarlas, no al abrir la pestana: bajar todas las
 * imagenes de todos los reclamos para mirar uno seria descargar de mas.
 */
let urlsReclamos = [];

async function verEvidencias(ticketId) {
  const caja = document.getElementById('evidencias-' + ticketId);
  caja.innerHTML = '<p class="vacio">Cargando evidencias…</p>';
  try {
    const ids = await api(`/admin/reclamos/${ticketId}/fotos`);
    const partes = await Promise.all(ids.map(async (id) => {
      try {
        const url = await urlImagen(`/admin/reclamos/${ticketId}/fotos/${id}/contenido`, urlsReclamos);
        return `<figure class="ficha-doc">
                  <img src="${url}" alt="Evidencia del reclamo" onclick="window.open('${url}', '_blank')" />
                </figure>`;
      } catch (_) {
        return '<figure class="ficha-doc"><span>No se pudo cargar</span></figure>';
      }
    }));
    caja.innerHTML = `<div class="ficha-docs">${partes.join('')}</div>`;
  } catch (e) {
    caja.innerHTML = `<p class="vacio">${txt(e.message)}</p>`;
  }
}

async function verConversacion(ticketId) {
  const caja = document.getElementById('hilo-' + ticketId);
  caja.innerHTML = '<p class="vacio">Cargando conversacion…</p>';
  try {
    const hilo = await api(`/admin/reclamos/${ticketId}/mensajes`);
    caja.innerHTML = hilo.length === 0
      ? '<p class="vacio">Nadie ha escrito todavia.</p>'
      : hilo.map((m) => `
          <div class="burbuja ${m.esAdmin ? 'burbuja-soporte' : 'burbuja-usuario'}">
            <div class="burbuja-autor">${txt(m.autor)} · ${fecha(m.fechaCreacion)}</div>
            <div>${txt(m.cuerpo)}</div>
          </div>`).join('');
  } catch (e) {
    caja.innerHTML = `<p class="vacio">${txt(e.message)}</p>`;
  }
}

/*
 * Escribir no cierra el reclamo: sirve para pedir un dato que falta y seguir.
 * Si estaba NUEVO, el backend lo pasa a EN_REVISION solo.
 */
async function escribirEnReclamo(id) {
  try {
    const campo = document.getElementById('respuesta-' + id);
    const cuerpo = campo.value.trim();
    if (!cuerpo) return;
    await api(`/admin/reclamos/${id}/mensajes`, { method: 'POST', body: JSON.stringify({ cuerpo }) });
    campo.value = '';
    await cargarReclamos();
    await verConversacion(id);
  } catch (e) { mostrarError(e); }
}

async function cargarReclamos() {
  // Se repinta entero: las imagenes que habia cargadas ya no estan en el DOM.
  urlsReclamos.forEach((u) => URL.revokeObjectURL(u));
  urlsReclamos = [];
  const lista = await api('/admin/reclamos');
  listado({
    id: 'reclamos',
    contenedor: 'tabla-reclamos',
    datos: lista,
    placeholder: 'Buscar por asunto, mensaje, usuario o correo…',
    vacio: 'No hay reclamos 🎉',
    buscarEn: (r) => `${r.id} ${r.asunto} ${r.mensaje} ${r.usuarioNombre} ${r.usuarioEmail}`
      + ` ${r.solicitudId || ''} ${r.servicioDescripcion || ''} ${r.servicioMaestro || ''}`,
    filtros: [
      {
        clave: 'estado', etiqueta: 'Estado', de: (r) => r.estado,
        opciones: [
          { valor: 'NUEVO', etiqueta: 'Nuevo' },
          { valor: 'EN_REVISION', etiqueta: 'En revisión' },
          { valor: 'RESUELTO', etiqueta: 'Resuelto' },
        ],
      },
      {
        clave: 'categoria', etiqueta: 'Categoría', de: (r) => r.categoria,
        opciones: Object.entries(ETIQUETA_CATEGORIA).map(([v, e]) => ({ valor: v, etiqueta: e })),
      },
    ],
    ordenes: [
      { clave: 'antiguo', etiqueta: 'Más antiguo primero', cmp: porFechaAsc('fechaCreacion') },
      { clave: 'reciente', etiqueta: 'Más reciente primero', cmp: porFechaDesc('fechaCreacion') },
    ],
    render: (pagina) => pintarReclamos(pagina),
  });
}

/*
 * De que servicio habla el reclamo. Antes aqui solo decia "servicio #12" y el
 * admin tenia que irse a otra pantalla a buscar de que le estaban hablando.
 */
function contextoDelReclamo(r) {
  if (!r.solicitudId) return '';
  // El servicio pudo borrarse: el reclamo sobrevive con el id a secas.
  if (!r.servicioOficio) {
    return `<div class="reclamo-servicio">Servicio #${r.solicitudId} · ya no existe</div>`;
  }
  const partes = [ETIQUETA_OFICIO[r.servicioOficio] || r.servicioOficio, r.servicioMaestro]
    .filter(Boolean).map(txt).join(' · ');
  return `
    <div class="reclamo-servicio">
      <div class="reclamo-servicio-titulo">
        Servicio #${r.solicitudId} · ${partes} · ${fecha(r.servicioFecha)}
        ${badge(r.servicioEstado)}
      </div>
      <div>${txt(r.servicioDescripcion)}</div>
    </div>`;
}

function pintarReclamos(lista) {
  return lista.map((r) => `
    <div class="disputa-caja">
      <div class="disputa-partes">
        ${txt(r.asunto)}
        <span class="badge ${COLOR_TICKET[r.estado] || 'badge-gris'}">${txt(r.estado)}</span>
        <span class="badge badge-gris">${txt(ETIQUETA_CATEGORIA[r.categoria] || r.categoria)}</span>
      </div>
      <div style="color:#6B7280;margin-top:4px">
        ${txt(r.usuarioNombre)} · ${txt(r.usuarioEmail)} · ${fecha(r.fechaCreacion)}
      </div>
      <div class="disputa-motivo">${txt(r.mensaje)}</div>
      ${contextoDelReclamo(r)}
      ${r.cantidadFotos > 0 ? `
        <div class="reclamo-evidencias" id="evidencias-${r.id}">
          <button class="btn btn-mini btn-secundario" onclick="verEvidencias(${r.id})">
            Ver ${r.cantidadFotos} foto${r.cantidadFotos > 1 ? 's' : ''} adjunta${r.cantidadFotos > 1 ? 's' : ''}
          </button>
        </div>` : ''}
      ${r.respuesta ? `<div class="respuesta-caja"><strong>Respuesta:</strong> ${txt(r.respuesta)}</div>` : ''}
      <div class="reclamo-hilo" id="hilo-${r.id}">
        <button class="btn btn-mini btn-secundario" onclick="verConversacion(${r.id})">
          ${r.cantidadMensajes > 0
            ? `Ver conversacion (${r.cantidadMensajes})`
            : 'Ver conversacion'}
        </button>
      </div>
      ${r.estado === 'RESUELTO' ? '' : `
        <div class="fila-form">
          <input id="respuesta-${r.id}" placeholder="Escribe al usuario (obligatorio para cerrar)" />
          <button class="btn btn-mini btn-secundario" onclick="escribirEnReclamo(${r.id})">Responder</button>
          ${r.estado === 'NUEVO'
            ? `<button class="btn btn-mini btn-secundario" onclick="responderReclamo(${r.id}, 'EN_REVISION')">Tomar</button>`
            : ''}
          <button class="btn btn-mini" onclick="responderReclamo(${r.id}, 'RESUELTO')">Resolver</button>
        </div>`}
    </div>`).join('');
}

/** Repinta sin volver al servidor: conserva búsqueda, filtros y página. */
function refrescarReclamos() {
  pintarListado('reclamos');
}

async function responderReclamo(id, estado) {
  try {
    const respuesta = document.getElementById('respuesta-' + id).value;
    await api(`/admin/reclamos/${id}`, { method: 'POST', body: JSON.stringify({ estado, respuesta }) });
    await cargarReclamos();
  } catch (e) { mostrarError(e); }
}

// ---------- Listado con buscador, filtros, orden y paginación ----------

/*
 * Un solo módulo para todos los listados. La alternativa era copiar buscador,
 * filtros y paginación en cada tabla: cinco copias que se van separando entre
 * sí en cuanto una cambia.
 *
 * El estado (búsqueda, filtros, orden, página) vive por sección y sobrevive
 * mientras dure la sesión, así que volver de otra pantalla no lo borra.
 */
const estadoListados = {};

const TAMANOS_PAGINA = [10, 25, 50, 100];

/**
 * @param cfg.id            clave de la sección (guarda su estado)
 * @param cfg.datos         lista completa ya traída del servidor
 * @param cfg.buscarEn      (item) => texto donde busca el buscador
 * @param cfg.filtros       [{ clave, etiqueta, opciones:[{valor,etiqueta}], de:(item)=>valor }]
 * @param cfg.ordenes       [{ clave, etiqueta, cmp }]
 * @param cfg.render        (itemsDeLaPagina) => HTML
 */
function listado(cfg) {
  estadoListados[cfg.id] = { ...(estadoListados[cfg.id] || {
    busqueda: '', filtros: {}, orden: cfg.ordenes?.[0]?.clave ?? null, pagina: 1, porPagina: 10,
  }), cfg };
  pintarListado(cfg.id);
}

function estadoDe(id) {
  return estadoListados[id];
}

/** Cualquier cambio de filtro o búsqueda vuelve a la página 1: si no, se ve vacío. */
function cambiarListado(id, cambios) {
  const e = estadoDe(id);
  Object.assign(e, cambios, cambios.pagina ? {} : { pagina: 1 });
  pintarListado(id);
}

function limpiarFiltro(id, clave) {
  const e = estadoDe(id);
  if (clave === 'busqueda') e.busqueda = '';
  else delete e.filtros[clave];
  e.pagina = 1;
  pintarListado(id);
}

function limpiarTodo(id) {
  const e = estadoDe(id);
  e.busqueda = '';
  e.filtros = {};
  e.pagina = 1;
  pintarListado(id);
}

/** Aplica búsqueda, luego filtros, luego orden. Ese orden importa para el conteo. */
function filtrar(e) {
  const { cfg } = e;
  let items = cfg.datos;

  const q = e.busqueda.trim().toLowerCase();
  if (q) {
    items = items.filter((x) => cfg.buscarEn(x).toLowerCase().includes(q));
  }
  for (const f of cfg.filtros || []) {
    const valor = e.filtros[f.clave];
    if (valor) items = items.filter((x) => String(f.de(x)) === valor);
  }
  const orden = (cfg.ordenes || []).find((o) => o.clave === e.orden);
  if (orden) items = [...items].sort(orden.cmp);
  return items;
}

function pintarListado(id) {
  const e = estadoDe(id);
  const { cfg } = e;
  const items = filtrar(e);

  const totalPaginas = Math.max(1, Math.ceil(items.length / e.porPagina));
  if (e.pagina > totalPaginas) e.pagina = totalPaginas;
  const desde = (e.pagina - 1) * e.porPagina;
  const pagina = items.slice(desde, desde + e.porPagina);

  // --- Fichas de lo que está filtrando ahora mismo ---
  const fichas = [];
  if (e.busqueda.trim()) {
    fichas.push(`<button class="ficha" onclick="limpiarFiltro('${id}','busqueda')">
      «${txt(e.busqueda.trim())}» <span aria-hidden="true">×</span></button>`);
  }
  for (const f of cfg.filtros || []) {
    const valor = e.filtros[f.clave];
    if (!valor) continue;
    const op = f.opciones.find((o) => String(o.valor) === valor);
    fichas.push(`<button class="ficha" onclick="limpiarFiltro('${id}','${f.clave}')">
      ${f.etiqueta}: ${txt(op ? op.etiqueta : valor)} <span aria-hidden="true">×</span></button>`);
  }

  const controles = `
    <div class="controles">
      <div class="buscador">
        ${svg('buscar')}
        <input id="q-${id}" type="search" placeholder="${cfg.placeholder || 'Buscar…'}"
               value="${txt(e.busqueda)}" oninput="cambiarListado('${id}',{busqueda:this.value})" />
      </div>
      ${(cfg.filtros || []).map((f) => `
        <select onchange="cambiarListado('${id}',{filtros:{...estadoDe('${id}').filtros,${f.clave}:this.value||undefined}})">
          <option value="">${f.etiqueta}: todos</option>
          ${f.opciones.map((o) => `<option value="${o.valor}" ${e.filtros[f.clave] === String(o.valor) ? 'selected' : ''}>${o.etiqueta}</option>`).join('')}
        </select>`).join('')}
      ${(cfg.ordenes || []).length ? `
        <select onchange="cambiarListado('${id}',{orden:this.value})">
          ${cfg.ordenes.map((o) => `<option value="${o.clave}" ${e.orden === o.clave ? 'selected' : ''}>${o.etiqueta}</option>`).join('')}
        </select>` : ''}
      <select class="por-pagina" onchange="cambiarListado('${id}',{porPagina:Number(this.value)})">
        ${TAMANOS_PAGINA.map((n) => `<option value="${n}" ${e.porPagina === n ? 'selected' : ''}>${n} por página</option>`).join('')}
      </select>
    </div>
    ${fichas.length ? `<div class="fichas">${fichas.join('')}
        <button class="ficha ficha-limpiar" onclick="limpiarTodo('${id}')">Limpiar todo</button></div>` : ''}`;

  const cuerpo = items.length === 0
    ? `<div class="tabla-caja"><p class="vacio">${
        e.busqueda || Object.keys(e.filtros).length
          ? 'Ningún resultado con esos criterios.'
          : cfg.vacio}</p></div>`
    : cfg.render(pagina);

  const pie = items.length === 0 ? '' : `
    <div class="paginacion">
      <span class="paginacion-total">
        ${desde + 1}–${desde + pagina.length} de <strong>${items.length}</strong>
        ${items.length !== cfg.datos.length ? `(de ${cfg.datos.length} en total)` : ''}
      </span>
      <div class="paginacion-btns">
        <button class="pag-btn" ${e.pagina === 1 ? 'disabled' : ''}
                onclick="cambiarListado('${id}',{pagina:${e.pagina - 1}})">Anterior</button>
        ${numerosDePagina(e.pagina, totalPaginas).map((n) => n === '…'
          ? '<span class="pag-puntos">…</span>'
          : `<button class="pag-btn ${n === e.pagina ? 'activa' : ''}"
                     onclick="cambiarListado('${id}',{pagina:${n}})">${n}</button>`).join('')}
        <button class="pag-btn" ${e.pagina === totalPaginas ? 'disabled' : ''}
                onclick="cambiarListado('${id}',{pagina:${e.pagina + 1}})">Siguiente</button>
      </div>
    </div>`;

  document.getElementById(cfg.contenedor).innerHTML = controles + cuerpo + pie;

  // Escribir en el buscador reemplaza el HTML: hay que devolver el foco y el cursor.
  const campo = document.getElementById('q-' + id);
  if (campo && document.activeElement !== campo && e.busqueda) {
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }
}

/** Con muchas páginas no se listan todas: 1 … 4 5 6 … 20. */
function numerosDePagina(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set([1, total, actual, actual - 1, actual + 1]);
  const ordenados = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  ordenados.forEach((n, i) => {
    if (i > 0 && n - ordenados[i - 1] > 1) salida.push('…');
    salida.push(n);
  });
  return salida;
}

/** Tabla simple, para usar dentro de `render`. */
function tabla(columnas, filas, pintarFila) {
  return `<div class="tabla-caja"><table>
      <thead><tr>${columnas.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((f) => `<tr>${pintarFila(f)}</tr>`).join('')}</tbody>
    </table></div>`;
}

// --- Comparadores reutilizables ---
const porFechaDesc = (campo) => (a, b) => new Date(b[campo]) - new Date(a[campo]);
const porFechaAsc = (campo) => (a, b) => new Date(a[campo]) - new Date(b[campo]);
const porTextoAsc = (f) => (a, b) => f(a).localeCompare(f(b), 'es');
const porTextoDesc = (f) => (a, b) => f(b).localeCompare(f(a), 'es');
const porNumeroDesc = (f) => (a, b) => (f(b) || 0) - (f(a) || 0);
const porNumeroAsc = (f) => (a, b) => (f(a) || 0) - (f(b) || 0);

// Si ya había una sesión guardada, entramos directo.
if (token) {
  abrirPanel();
}
