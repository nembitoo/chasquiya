package cl.chasquiya.maestros.documentos;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;

/** Sube y descarga archivos en MinIO. Encapsula toda la interacción con el cliente. */
@Service
public class AlmacenamientoMinio {

    private final MinioClient minio;
    private final String bucket;

    public AlmacenamientoMinio(MinioClient minio, @Value("${chasquiya.minio.bucket}") String bucket) {
        this.minio = minio;
        this.bucket = bucket;
    }

    /** Crea el bucket al arrancar si todavía no existe. */
    @PostConstruct
    void asegurarBucket() {
        try {
            boolean existe = minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!existe) {
                minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo preparar el bucket de MinIO: " + bucket, e);
        }
    }

    public void subir(String objeto, byte[] datos, String tipoContenido) {
        try (InputStream in = new ByteArrayInputStream(datos)) {
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objeto)
                    .stream(in, datos.length, -1)
                    .contentType(tipoContenido)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo el archivo a MinIO", e);
        }
    }

    public byte[] descargar(String objeto) {
        try (InputStream in = minio.getObject(GetObjectArgs.builder()
                .bucket(bucket)
                .object(objeto)
                .build())) {
            return in.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Error descargando el archivo de MinIO", e);
        }
    }
}
