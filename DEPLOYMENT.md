# Instrucciones de Despliegue

Esta es una aplicación web estática que se conecta a Supabase. Puedes desplegarla en cualquier servicio de hosting estático como Netlify, Vercel, GitHub Pages, etc.

## Pasos para el Despliegue

1.  **Construir la Aplicación (si es necesario):**
    *   Actualmente, la aplicación no tiene un paso de construcción. Los archivos HTML, CSS y JavaScript se sirven tal como están. Si en el futuro se añade un sistema de construcción (por ejemplo, con Vite o Webpack), deberás ejecutar el comando de construcción (ej. `npm run build`) y desplegar el directorio de salida (ej. `dist`).

2.  **Configurar el Hosting:**
    *   Elige un proveedor de hosting estático (ej. Netlify).
    *   Conecta tu repositorio de Git a la plataforma de hosting.
    *   Configura el comando de construcción (si lo hay) y el directorio de publicación (debería ser el directorio raíz, ya que no hay build).

3.  **Configurar las Variables de Entorno:**
    *   **¡MUY IMPORTANTE!** Las credenciales de Supabase no deben estar hardcodeadas en el código en un entorno de producción.
    *   En lugar de usar el archivo `js/config.js`, debes configurar las siguientes variables de entorno en tu plataforma de hosting:
        *   `VITE_SUPABASE_URL` (o el nombre que prefieras, ej. `PUBLIC_SUPABASE_URL`): La URL de tu proyecto de Supabase.
        *   `VITE_SUPABASE_ANON_KEY` (o `PUBLIC_SUPABASE_ANON_KEY`): La clave anónima (anon key) de tu proyecto de Supabase.
    *   Para que la aplicación use estas variables, necesitarás un pequeño cambio en el código. Deberías tener un script que cargue estas variables y las ponga a disposición de tu aplicación. Si estuvieras usando un bundler como Vite, esto sería automático. Como no lo estás, la forma más sencilla es crear un archivo `js/config.js` dinámicamente en tu proceso de CI/CD, o modificar el código para que espere que estas variables estén en el objeto `window`.

**Ejemplo de cómo podrías adaptar el código para producción:**

En tu `index.html` (y las demás páginas), podrías tener un script que defina las variables globales antes de que se carguen los demás scripts:

```html
<script>
    // Este script se podría generar dinámicamente en tu CI/CD
    window.SUPABASE_CONFIG = {
        URL: 'TU_URL_DE_PRODUCCION',
        ANON_KEY: 'TU_LLAVE_ANON_DE_PRODUCCION'
    };
</script>
<script type="module" src="js/proveedores.js"></script>
```

Y en `supabaseService.js`:

```javascript
// ...
// En lugar de importar desde config.js
const SUPABASE_URL = window.SUPABASE_CONFIG.URL;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.ANON_KEY;

class SupabaseService {
    // ...
}
```

Esta es una de las varias maneras de manejar las credenciales en producción. La mejor práctica sería usar un sistema de construcción (bundler) que maneje las variables de entorno de forma nativa.

## Resumen para un Despliegue Rápido en Netlify/Vercel

1.  Sube tu código a un repositorio de GitHub/GitLab.
2.  Crea un nuevo sitio en Netlify/Vercel y conéctalo a tu repositorio.
3.  **No** establezcas un comando de construcción y deja el directorio de publicación como el raíz.
4.  Ve a la configuración del sitio y añade las variables de entorno para la URL y la clave de Supabase.
5.  Adapta el código para leer estas variables de entorno (esto es un paso de desarrollo, no de despliegue). Por ahora, la forma más sencilla es reemplazar manualmente el contenido de `js/config.js` en tu entorno de producción o antes de desplegar.

## Recomendaciones de Optimización

### Almacenamiento de Archivos

Actualmente, los archivos cargados se guardan como cadenas de texto en formato base64 directamente en la base de datos de Supabase. Este método puede ser ineficiente y costoso si se cargan archivos grandes o en gran cantidad.

**Recomendación:** Migrar al uso de **Supabase Storage**.

*   **Ventajas:**
    *   **Más eficiente:** Supabase Storage está optimizado para almacenar y servir archivos grandes.
    *   **Mejor rendimiento:** La carga y descarga de archivos será más rápida.
    *   **Más económico:** Generalmente, el costo de almacenamiento de objetos es menor que el de una base de datos.
    *   **Funcionalidades avanzadas:** Permite gestionar permisos de acceso, generar URLs firmadas, etc.

*   **Pasos para la migración:**
    1.  Crear un "bucket" de almacenamiento en el panel de control de Supabase.
    2.  Actualizar la lógica de carga de archivos (`manejarArchivo` en `js/evaluaciones.js`) para subir los archivos a Supabase Storage en lugar de convertirlos a base64.
    3.  Al guardar, almacenar únicamente la URL o la ruta del archivo en la base de datos, no el contenido completo.
    4.  Actualizar la lógica de previsualización (`previsualizarDocumento`) para que utilice la URL del archivo almacenado.
