/**
 * La librería STOMP usa TextEncoder/TextDecoder para armar los frames.
 * Algunos motores de React Native no los traen, así que los definimos
 * solo si faltan (implementación mínima de UTF-8).
 */
const g = globalThis as unknown as Record<string, unknown>;

if (typeof g.TextEncoder === 'undefined') {
  g.TextEncoder = class {
    encode(texto: string): Uint8Array {
      const bytes: number[] = [];
      for (let i = 0; i < texto.length; i++) {
        let punto = texto.codePointAt(i) as number;
        if (punto > 0xffff) {
          i++; // el carácter ocupa dos posiciones (par suplente)
        }
        if (punto < 0x80) {
          bytes.push(punto);
        } else if (punto < 0x800) {
          bytes.push(0xc0 | (punto >> 6), 0x80 | (punto & 0x3f));
        } else if (punto < 0x10000) {
          bytes.push(0xe0 | (punto >> 12), 0x80 | ((punto >> 6) & 0x3f), 0x80 | (punto & 0x3f));
        } else {
          bytes.push(
            0xf0 | (punto >> 18),
            0x80 | ((punto >> 12) & 0x3f),
            0x80 | ((punto >> 6) & 0x3f),
            0x80 | (punto & 0x3f),
          );
        }
      }
      return new Uint8Array(bytes);
    }
  };
}

if (typeof g.TextDecoder === 'undefined') {
  g.TextDecoder = class {
    decode(datos: Uint8Array): string {
      let salida = '';
      for (let i = 0; i < datos.length; ) {
        const b = datos[i];
        if (b < 0x80) {
          salida += String.fromCodePoint(b);
          i += 1;
        } else if (b < 0xe0) {
          salida += String.fromCodePoint(((b & 0x1f) << 6) | (datos[i + 1] & 0x3f));
          i += 2;
        } else if (b < 0xf0) {
          salida += String.fromCodePoint(
            ((b & 0x0f) << 12) | ((datos[i + 1] & 0x3f) << 6) | (datos[i + 2] & 0x3f),
          );
          i += 3;
        } else {
          salida += String.fromCodePoint(
            ((b & 0x07) << 18) |
              ((datos[i + 1] & 0x3f) << 12) |
              ((datos[i + 2] & 0x3f) << 6) |
              (datos[i + 3] & 0x3f),
          );
          i += 4;
        }
      }
      return salida;
    }
  };
}

export {};
