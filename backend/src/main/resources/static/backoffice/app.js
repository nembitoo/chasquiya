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
  document.getElementById('login').classList.add('oculto');
  document.getElementById('panel').classList.remove('oculto');
  document.getElementById('admin-nombre').textContent =
    localStorage.getItem('chasquiya_admin_nombre') || '';
  mostrar('dashboard');
}

// ---------- Navegación ----------

function mostrar(vista) {
  document.getElementById('error-global').textContent = '';
  document.querySelectorAll('.vista').forEach((v) => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('activa', t.dataset.vista === vista));

  const cargadores = {
    dashboard: cargarDashboard,
    maestros: cargarMaestros,
    usuarios: cargarUsuarios,
    servicios: cargarServicios,
    disputas: cargarDisputas,
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
    { etiqueta: `Comisiones (${m.dias} días)`, valor: pesos(m.comisiones.actual), comp: m.comisiones, destacada: true },
    { etiqueta: 'Monto transado', valor: pesos(m.montoTransado.actual), comp: m.montoTransado },
    { etiqueta: 'Servicios creados', valor: m.serviciosCreados.actual, comp: m.serviciosCreados },
    { etiqueta: 'Servicios terminados', valor: m.serviciosCompletados.actual, comp: m.serviciosCompletados },
  ];
  // Stock: una foto de ahora. No lleva período ni comparación.
  const stock = [
    { etiqueta: 'Usuarios registrados', valor: m.usuariosTotales },
    { etiqueta: 'Clientes', valor: m.clientes },
    { etiqueta: 'Maestros', valor: m.maestros },
    { etiqueta: 'Maestros aprobados', valor: m.maestrosAprobados },
    { etiqueta: 'Maestros pendientes', valor: m.maestrosPendientes },
    { etiqueta: 'Disputas abiertas', valor: m.disputasAbiertas },
    { etiqueta: 'Calificación promedio', valor: m.calificacionPromedio ? '⭐ ' + m.calificacionPromedio : '—' },
  ];

  document.getElementById('tarjetas').innerHTML = flujo.map((t) => `
    <div class="tarjeta ${t.destacada ? 'destacada' : ''}">
      <div class="tarjeta-etiqueta">${t.etiqueta}</div>
      <div class="tarjeta-valor">${t.valor}</div>
      ${variacion(t.comp)}
    </div>`).join('');

  document.getElementById('tarjetas-stock').innerHTML = stock.map((t) => `
    <div class="tarjeta tarjeta-chica">
      <div class="tarjeta-etiqueta">${t.etiqueta}</div>
      <div class="tarjeta-valor">${t.valor}</div>
    </div>`).join('');

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
        borderWidth: 0,
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
