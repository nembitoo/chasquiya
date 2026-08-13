package cl.chasquiya.maestros.usuarios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.seguridad.JwtService;
import cl.chasquiya.maestros.usuarios.dto.AuthResponse;
import cl.chasquiya.maestros.usuarios.dto.LoginRequest;
import cl.chasquiya.maestros.usuarios.dto.RegistroRequest;

class AuthServiceTest {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final AuthService authService = new AuthService(usuarios, encoder, jwtService);

    private RegistroRequest registroValido() {
        // Email con mayúsculas y espacios para verificar la normalización.
        return new RegistroRequest("Kevin", "Alvarez", " Kevin@Test.cl ", "+56911111111",
                "clave12345", RolUsuario.CLIENTE, true);
    }

    @Test
    void registraUsuarioNuevoYDevuelveToken() {
        when(usuarios.existsByEmail("kevin@test.cl")).thenReturn(false);
        when(encoder.encode("clave12345")).thenReturn("hash-bcrypt");
        when(jwtService.generarToken(any())).thenReturn("token-jwt");

        AuthResponse resp = authService.registrar(registroValido());

        assertEquals("token-jwt", resp.token());
        assertEquals(RolUsuario.CLIENTE, resp.rol());
        verify(usuarios).save(any(Usuario.class));
    }

    @Test
    void noPermiteEmailDuplicado() {
        when(usuarios.existsByEmail("kevin@test.cl")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> authService.registrar(registroValido()));
        verify(usuarios, never()).save(any());
    }

    @Test
    void loginCorrectoDevuelveToken() {
        Usuario u = new Usuario("Kevin", "Alvarez", "kevin@test.cl", "+56911111111",
                "hash-bcrypt", RolUsuario.MAESTRO, true);
        when(usuarios.findByEmail("kevin@test.cl")).thenReturn(Optional.of(u));
        when(encoder.matches("clave12345", "hash-bcrypt")).thenReturn(true);
        when(jwtService.generarToken(u)).thenReturn("token-jwt");

        AuthResponse resp = authService.login(new LoginRequest("kevin@test.cl", "clave12345"));

        assertEquals("token-jwt", resp.token());
        assertEquals(RolUsuario.MAESTRO, resp.rol());
    }

    @Test
    void loginConClaveIncorrectaFalla() {
        Usuario u = new Usuario("Kevin", "Alvarez", "kevin@test.cl", "+56911111111",
                "hash-bcrypt", RolUsuario.CLIENTE, true);
        when(usuarios.findByEmail("kevin@test.cl")).thenReturn(Optional.of(u));
        when(encoder.matches("mala", "hash-bcrypt")).thenReturn(false);

        assertThrows(ResponseStatusException.class,
                () -> authService.login(new LoginRequest("kevin@test.cl", "mala")));
    }

    @Test
    void loginConEmailInexistenteFalla() {
        when(usuarios.findByEmail("nadie@test.cl")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> authService.login(new LoginRequest("nadie@test.cl", "clave12345")));
    }
}
