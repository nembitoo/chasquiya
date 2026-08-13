package cl.chasquiya.maestros.seguridad;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import cl.chasquiya.maestros.usuarios.RolUsuario;
import cl.chasquiya.maestros.usuarios.Usuario;

class JwtServiceTest {

    private final JwtService jwtService =
            new JwtService("secreto-de-pruebas-suficientemente-largo-1234567890", 12);

    private Usuario usuarioDemo() {
        return new Usuario("Kevin", "Alvarez", "kevin@test.cl", "+56911111111",
                "hash", RolUsuario.CLIENTE, true);
    }

    @Test
    void generaTokenValidoYExtraeEmail() {
        String token = jwtService.generarToken(usuarioDemo());

        assertTrue(jwtService.esValido(token));
        assertEquals("kevin@test.cl", jwtService.extraerEmail(token));
        assertEquals("CLIENTE", jwtService.claims(token).get("rol", String.class));
    }

    @Test
    void tokenInvalidoNoPasa() {
        assertFalse(jwtService.esValido("esto.no-es.un-token"));
    }
}
