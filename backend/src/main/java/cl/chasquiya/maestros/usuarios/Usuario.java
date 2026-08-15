package cl.chasquiya.maestros.usuarios;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Usuario de la plataforma (cliente o maestro).
 * La contraseña se guarda SIEMPRE hasheada (BCrypt), nunca en texto plano.
 * El esquema lo define Flyway (V2); esta clase solo mapea la tabla.
 */
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefono;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RolUsuario rol;

    @Column(name = "acepto_terminos", nullable = false)
    private boolean aceptoTerminos;

    /** Un usuario suspendido por el admin no puede iniciar sesión. */
    @Column(nullable = false)
    private boolean activo = true;

    /** Clave de la foto de perfil en MinIO. Null = sin foto (se muestran iniciales). */
    @Column(name = "avatar_objeto")
    private String avatarObjeto;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    /** Requerido por JPA. */
    protected Usuario() {
    }

    public Usuario(String nombre, String apellido, String email, String telefono,
                   String passwordHash, RolUsuario rol, boolean aceptoTerminos) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.telefono = telefono;
        this.passwordHash = passwordHash;
        this.rol = rol;
        this.aceptoTerminos = aceptoTerminos;
    }

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) {
            fechaCreacion = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public String getEmail() {
        return email;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public boolean isAceptoTerminos() {
        return aceptoTerminos;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public String getAvatarObjeto() {
        return avatarObjeto;
    }

    public void setAvatarObjeto(String avatarObjeto) {
        this.avatarObjeto = avatarObjeto;
    }

    public boolean tieneAvatar() {
        return avatarObjeto != null;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
