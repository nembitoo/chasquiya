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
function variacion(comp) {
  if (!comp || comp.variacion === null || comp.variacion === undefined) {
    return '<span class="var var-neutra">— sin base previa</span>';
  }
  const v = comp.variacion;
  const clase = v > 0 ? 'var-sube' : v < 0 ? 'var-baja' : 'var-neutra';
  const flecha = v > 0 ? '▲' : v < 0 ? '▼' : '=';
  return `<span class="var ${clase}">${flecha} ${Math.abs(v)}% vs período anterior</span>`;
}

async function cargarDashboard() {
  const m = await api(`/admin/metricas?dias=${dias}`);

  pintarAlertas(m.alertas || []);

  // Flujo: lo que pasó DURANTE el período, con su comparación.
  const flujo = [
    { icono: 'dinero', etiqueta: `Comisiones (${m.dias} días)`, valor: pesos(m.comisiones.actual), comp: m.comisiones },
    { icono: 'grafico', etiqueta: 'Monto transado', valor: pesos(m.montoTransado.actual), comp: m.montoTransado },
    { icono: 'servicios', etiqueta: 'Servicios creados', valor: m.serviciosCreados.actual, comp: m.serviciosCreados },
    { icono: 'check', etiqueta: 'Servicios terminados', valor: m.serviciosCompletados.actual, comp: m.serviciosCompletados },
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
  ];

  document.getElementById('tarjetas').innerHTML = flujo.map((t) => `
    <div class="tarjeta">
      <div class="tarjeta-icono">${svg(t.icono)}</div>
      <div class="tarjeta-pie">
        <div>
          <div class="tarjeta-valor">${t.valor}</div>
          <div class="tarjeta-etiqueta">${t.etiqueta}</div>
        </div>
        ${variacion(t.comp)}
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
  document.getElementById('tabla-maestros').innerHTML = tabla(
    ['Nombre', 'Correo', 'Oficios', 'Zona', 'Exp.', 'Estado', 'Acciones'],
    lista,
    (m) => `
      <td>${txt(m.nombre)} ${txt(m.apellido)}</td>
      <td>${txt(m.email)}</td>
      <td>${(m.oficios || []).map(txt).join(', ')}</td>
      <td>${txt(m.zonaCobertura || '—')}</td>
      <td>${m.aniosExperiencia} años</td>
      <td>${badge(m.estadoVerificacion)}</td>
      <td class="acciones-celda">
        ${m.estadoVerificacion !== 'APROBADO'
          ? `<button class="btn btn-mini" onclick="decidirMaestro(${m.usuarioId}, true)">Aprobar</button>` : ''}
        ${m.estadoVerificacion !== 'RECHAZADO'
          ? `<button class="btn btn-mini btn-secundario" onclick="decidirMaestro(${m.usuarioId}, false)">Rechazar</button>` : ''}
      </td>`,
    'Todavía no hay maestros con perfil.');
}

async function decidirMaestro(usuarioId, aprobar) {
  try {
    await api(`/admin/maestros/${usuarioId}/${aprobar ? 'aprobar' : 'rechazar'}`, { method: 'POST' });
    await cargarMaestros();
  } catch (e) { mostrarError(e); }
}

// ---------- Usuarios ----------

async function cargarUsuarios() {
  const lista = await api('/admin/usuarios');
  document.getElementById('tabla-usuarios').innerHTML = tabla(
    ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Servicios', 'Registro', 'Estado', 'Acciones'],
    lista,
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
      </td>`,
    'No hay usuarios registrados.');
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
  lista.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  document.getElementById('tabla-servicios').innerHTML = tabla(
    ['#', 'Cliente', 'Maestro', 'Servicio', 'Fecha', 'Monto', 'Estado'],
    lista,
    (s) => `
      <td>${s.id}</td>
      <td>${txt(s.clienteNombre)}</td>
      <td>${txt(s.maestroNombre)}</td>
      <td>${txt(s.oficio)}</td>
      <td>${fecha(s.fechaCreacion)}</td>
      <td>${s.cotizacionMonto ? pesos(s.cotizacionMonto) : '—'}</td>
      <td>${badge(s.estado)}</td>`,
    'Todavía no hay servicios.');
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

async function cargarReclamos() {
  const lista = await api('/admin/reclamos');
  const caja = document.getElementById('tabla-reclamos');
  if (lista.length === 0) {
    caja.innerHTML = '<p class="vacio">No hay reclamos 🎉</p>';
    return;
  }
  caja.innerHTML = lista.map((r) => `
    <div class="disputa-caja">
      <div class="disputa-partes">
        ${txt(r.asunto)}
        <span class="badge ${COLOR_TICKET[r.estado] || 'badge-gris'}">${txt(r.estado)}</span>
        <span class="badge badge-gris">${txt(ETIQUETA_CATEGORIA[r.categoria] || r.categoria)}</span>
      </div>
      <div style="color:#6B7280;margin-top:4px">
        ${txt(r.usuarioNombre)} · ${txt(r.usuarioEmail)} · ${fecha(r.fechaCreacion)}
        ${r.solicitudId ? ` · servicio #${r.solicitudId}` : ''}
      </div>
      <div class="disputa-motivo">${txt(r.mensaje)}</div>
      ${r.respuesta ? `<div class="respuesta-caja"><strong>Respuesta:</strong> ${txt(r.respuesta)}</div>` : ''}
      ${r.estado === 'RESUELTO' ? '' : `
        <div class="fila-form">
          <input id="respuesta-${r.id}" placeholder="Respuesta al usuario (obligatoria para cerrar)" />
          ${r.estado === 'NUEVO'
            ? `<button class="btn btn-mini btn-secundario" onclick="responderReclamo(${r.id}, 'EN_REVISION')">Tomar</button>`
            : ''}
          <button class="btn btn-mini" onclick="responderReclamo(${r.id}, 'RESUELTO')">Resolver</button>
        </div>`}
    </div>`).join('');
}

async function responderReclamo(id, estado) {
  try {
    const respuesta = document.getElementById('respuesta-' + id).value;
    await api(`/admin/reclamos/${id}`, { method: 'POST', body: JSON.stringify({ estado, respuesta }) });
    await cargarReclamos();
  } catch (e) { mostrarError(e); }
}

// ---------- Tabla genérica ----------

function tabla(columnas, filas, pintarFila, mensajeVacio) {
  if (!filas || filas.length === 0) {
    return `<div class="tabla-caja"><p class="vacio">${mensajeVacio}</p></div>`;
  }
  return `<div class="tabla-caja"><table>
      <thead><tr>${columnas.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((f) => `<tr>${pintarFila(f)}</tr>`).join('')}</tbody>
    </table></div>`;
}

// Si ya había una sesión guardada, entramos directo.
if (token) {
  abrirPanel();
}
