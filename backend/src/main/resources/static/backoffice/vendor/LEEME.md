# Librerías de terceros del backoffice

El backoffice no tiene paso de compilación (ni npm ni bundler): son archivos
estáticos que Spring sirve tal cual. Por eso las librerías se guardan aquí en
vez de instalarse.

## chart.umd.js

- **Qué es:** Chart.js, para los gráficos del dashboard.
- **Versión:** 4.4.7
- **Licencia:** MIT
- **Origen:** https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js
- **SHA-256:** `2812cb8825fdc57469eb2f7bb055e9429244e599920511ee477e828499b632cb`

**Por qué copiado y no por CDN:** el panel de administración tiene que funcionar
sin internet, y cargarlo desde un tercero significa que ese tercero puede
ejecutar código en una página donde hay una sesión de administrador.

**Para actualizarlo:** descarga la versión nueva desde la misma URL cambiando el
número, reemplaza el archivo y anota aquí la versión y el hash nuevos.
