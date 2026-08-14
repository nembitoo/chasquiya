// Sistema de diseño de ChasquiYa!
// Regla: ninguna pantalla escribe un color, tamaño o espacio "a mano".
// Todo sale de aquí, para que la app se vea como un solo producto.

// ---------------------------------------------------------------------------
// COLOR
// ---------------------------------------------------------------------------

/** Escala de grises. Del más claro (0) al más oscuro (900). */
const neutral = {
  0: '#FFFFFF',
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
};

export const colores = {
  // --- Marca ---
  primario: '#E11D2A',
  primarioHover: '#C4161F',
  primarioActivo: '#A31219',
  primarioSuave: '#FEF2F2',
  primarioBorde: '#FECACA',

  // --- Neutros ---
  neutral,
  blanco: neutral[0],
  fondo: neutral[50],
  superficie: neutral[0],
  borde: neutral[200],
  bordeFuerte: neutral[300],

  // --- Texto ---
  texto: neutral[800],
  textoSuave: neutral[500],
  textoTenue: neutral[400],
  textoInverso: neutral[0],

  // --- Semánticos (cada uno con su fondo y su texto legible encima) ---
  exito: '#16A34A',
  exitoFondo: '#DCFCE7',
  exitoTexto: '#166534',

  alerta: '#F59E0B',
  alertaFondo: '#FEF3C7',
  alertaTexto: '#92400E',

  error: '#DC2626',
  errorFondo: '#FEE2E2',
  errorTexto: '#991B1B',

  info: '#2563EB',
  infoFondo: '#DBEAFE',
  infoTexto: '#1E40AF',
};

// ---------------------------------------------------------------------------
// ESPACIADO — escala de 4. Nunca usar números sueltos en las pantallas.
// ---------------------------------------------------------------------------

export const espacio = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/** Padding lateral estándar de todas las pantallas. */
export const margenPantalla = 20;

// ---------------------------------------------------------------------------
// RADIOS
// ---------------------------------------------------------------------------

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  completo: 999,
};

// ---------------------------------------------------------------------------
// TIPOGRAFÍA — fuente Inter, 8 roles con tamaño y peso definidos.
// ---------------------------------------------------------------------------

export const fuentes = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/** Estilos de texto listos para usar: <Text style={texto.h2}> */
export const texto = {
  display: { fontFamily: fuentes.extrabold, fontSize: 34, lineHeight: 40, color: colores.texto },
  h1: { fontFamily: fuentes.extrabold, fontSize: 28, lineHeight: 34, color: colores.texto },
  h2: { fontFamily: fuentes.bold, fontSize: 22, lineHeight: 28, color: colores.texto },
  h3: { fontFamily: fuentes.bold, fontSize: 18, lineHeight: 24, color: colores.texto },
  cuerpo: { fontFamily: fuentes.regular, fontSize: 16, lineHeight: 23, color: colores.texto },
  cuerpoFuerte: { fontFamily: fuentes.semibold, fontSize: 16, lineHeight: 23, color: colores.texto },
  pequeno: { fontFamily: fuentes.regular, fontSize: 14, lineHeight: 20, color: colores.textoSuave },
  pequenoFuerte: { fontFamily: fuentes.semibold, fontSize: 14, lineHeight: 20, color: colores.texto },
  etiqueta: { fontFamily: fuentes.medium, fontSize: 12, lineHeight: 16, color: colores.textoSuave },
} as const;

/** Tamaños sueltos, para cuando se necesita solo el número. */
export const tipografia = {
  titulo: 28,
  subtitulo: 18,
  cuerpo: 16,
  pequeno: 13,
};

// ---------------------------------------------------------------------------
// SOMBRAS — iOS usa shadow*, Android usa elevation. Aquí van los dos.
// ---------------------------------------------------------------------------

export const sombra = {
  /** Tarjetas en reposo. */
  nivel1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Elementos elevados (barra inferior, tarjeta activa). */
  nivel2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  /** Modales y hojas inferiores. */
  nivel3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 8,
  },
};

// ---------------------------------------------------------------------------
// ACCESIBILIDAD
// ---------------------------------------------------------------------------

/** Área táctil mínima recomendada (iOS 44, Android 48). */
export const areaMinima = 48;
