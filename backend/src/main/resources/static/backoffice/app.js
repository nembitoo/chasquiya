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

async function cargarDashboard() {
  const m = await api('/admin/metricas');

  const tarjetas = [
    { etiqueta: 'Comisiones acumuladas', valor: pesos(m.comisionesAcumuladas), destacada: true },
    { etiqueta: 'Monto transado', valor: pesos(m.montoTransado) },
    { etiqueta: 'Usuarios registrados', valor: m.usuariosTotales },
    { etiqueta: 'Clientes', valor: m.clientes },
    { etiqueta: 'Maestros', valor: m.maestros },
    { etiqueta: 'Maestros aprobados', valor: m.maestrosAprobados },
    { etiqueta: 'Maestros pendientes', valor: m.maestrosPendientes },
    { etiqueta: 'Servicios totales', valor: m.serviciosTotales },
    { etiqueta: 'Servicios completados', valor: m.serviciosCompletados },
    { etiqueta: 'Disputas abiertas', valor: m.disputasAbiertas },
    { etiqueta: 'Calificación promedio', valor: m.calificacionPromedio ? '⭐ ' + m.calificacionPromedio : '—' },
  ];
  document.getElementById('tarjetas').innerHTML = tarjetas.map((t) => `
    <div class="tarjeta ${t.destacada ? 'destacada' : ''}">
      <div class="tarjeta-etiqueta">${t.etiqueta}</div>
      <div class="tarjeta-valor">${t.valor}</div>
    </div>`).join('');

  const estados = Object.entries(m.serviciosPorEstado || {}).sort((a, b) => b[1] - a[1]);
  const maximo = estados.reduce((max, [, n]) => Math.max(max, n), 0);
  document.getElementById('grafico-estados').innerHTML = estados.length === 0
    ? '<p class="vacio">Todavía no hay servicios.</p>'
    : estados.map(([estado, n]) => `
        <div class="barra-fila">
          <div class="barra-nombre">${txt(estado)}</div>
          <div class="barra-pista"><div class="barra" style="width:${maximo ? (n / maximo) * 100 : 0}%"></div></div>
          <div class="barra-valor">${n}</div>
        </div>`).join('');
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
