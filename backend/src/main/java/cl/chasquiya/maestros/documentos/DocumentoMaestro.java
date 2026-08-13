package cl.chasquiya.maestros.documentos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Metadatos de un documento de verificación. El archivo en sí vive en MinIO. */
@Entity
@Table(name = "documentos_maestro")
public class DocumentoMaestro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "nombre_archivo", nullable = false)
    private String nombreArchivo;

    @Column(nullable = false)
    private String objeto;

    @Column(name = "tipo_contenido", nullable = false)
    private String tipoContenido;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected DocumentoMaestro() {
    }

    public DocumentoMaestro(Long usuarioId, String nombreArchivo, String objeto, String tipoContenido) {
        this.usuarioId = usuarioId;
        this.nombreArchivo = nombreArchivo;
        this.objeto = objeto;
        this.tipoContenido = tipoContenido;
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

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getNombreArchivo() {
        return nombreArchivo;
    }

    public String getObjeto() {
        return objeto;
    }

    public String getTipoContenido() {
        return tipoContenido;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
