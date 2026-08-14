package cl.chasquiya.maestros.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.admin.dto.MetricasResponse;
import cl.chasquiya.maestros.admin.dto.UsuarioAdminResponse;
import cl.chasquiya.maestros.solicitudes.SolicitudService;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Datos y acciones del backoffice. Solo rol ADMIN (ver SecurityConfig: /admin/**). */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;
    private final SolicitudService solicitudService;
    private final UsuarioRepository usuarios;

    public AdminController(AdminService adminService, SolicitudService solicitudService,
                           UsuarioRepository usuarios) {
        this.adminService = adminService;
        this.solicitudService = solicitudService;
        this.usuarios = usuarios;
    }

    @GetMapping("/metricas")
    public MetricasResponse metricas() {
        return adminService.metricas();
    }

    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> usuarios() {
        return adminService.listarUsuarios();
    }

    @PostMapping("/usuarios/{id}/suspender")
    public UsuarioAdminResponse suspender(Authentication auth, @PathVariable Long id) {
        return adminService.cambiarActivo(idAutenticado(auth), id, false);
    }

    @PostMapping("/usuarios/{id}/reactivar")
    public UsuarioAdminResponse reactivar(Authentication auth, @PathVariable Long id) {
        return adminService.cambiarActivo(idAutenticado(auth), id, true);
    }

    @GetMapping("/servicios")
    public List<SolicitudResponse> servicios() {
        return solicitudService.todosLosServicios();
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
