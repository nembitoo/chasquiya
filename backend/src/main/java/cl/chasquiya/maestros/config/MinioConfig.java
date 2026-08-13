package cl.chasquiya.maestros.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

/** Crea el cliente de MinIO a partir de la configuración. */
@Configuration
public class MinioConfig {

    @Bean
    public MinioClient minioClient(
            @Value("${chasquiya.minio.endpoint}") String endpoint,
            @Value("${chasquiya.minio.access-key}") String accessKey,
            @Value("${chasquiya.minio.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
