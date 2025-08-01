/**
 * github-files.js - Manejo de archivos PDF/documentos en GitHub
 */

// Configuración para archivos
const FILE_CONFIG = {
    maxSizeBase64: 1024 * 1024, // 1MB para base64
    maxSizeGitHub: 25 * 1024 * 1024, // 25MB para GitHub
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png']
};

/**
 * Subir archivo según su tamaño
 * @param {File} archivo - Archivo a subir
 * @param {string} proveedorId - ID del proveedor
 * @param {string} tipo - Tipo de archivo (contrato, constancia, anexo)
 */
async function subirArchivo(archivo, proveedorId, tipo) {
    try {
        // Validar tipo de archivo
        const extension = '.' + archivo.name.split('.').pop().toLowerCase();
        if (!FILE_CONFIG.allowedTypes.includes(extension)) {
            throw new Error(`Tipo de archivo no permitido: ${extension}`);
        }
        
        // Decidir método según tamaño
        if (archivo.size <= FILE_CONFIG.maxSizeBase64) {
            return await subirComoBase64(archivo, proveedorId, tipo);
        } else if (archivo.size <= FILE_CONFIG.maxSizeGitHub) {
            return await subirAGitHubFiles(archivo, proveedorId, tipo);
        } else {
            throw new Error(`Archivo demasiado grande: ${archivo.size} bytes`);
        }
    } catch (error) {
        console.error('Error al subir archivo:', error);
        mostrarNotificacion('Error al subir archivo: ' + error.message, 'danger');
        return null;
    }
}

/**
 * Subir archivo pequeño como base64 en el JSON
 */
async function subirComoBase64(archivo, proveedorId, tipo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result.split(',')[1];
            const archivoData = {
                nombre: archivo.name,
                tipo: archivo.type,
                tamaño: archivo.size,
                base64: base64,
                metodo: 'base64',
                fechaSubida: new Date().toISOString()
            };
            resolve(archivoData);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

/**
 * Subir archivo a GitHub Files API
 */
async function subirAGitHubFiles(archivo, proveedorId, tipo) {
    const nombreArchivo = `${tipo}-${proveedorId}-${Date.now()}-${archivo.name}`;
    const ruta = `uploads/${tipo}/${nombreArchivo}`;
    
    // Convertir archivo a base64
    const base64 = await convertirArchivoABase64(archivo);
    
    // Subir a GitHub
    const response = await githubRequest(`contents/${ruta}`, 'PUT', {
        message: `Subir ${tipo}: ${archivo.name}`,
        content: base64,
        branch: GITHUB_CONFIG.branch
    });
    
    return {
        nombre: archivo.name,
        tipo: archivo.type,
        tamaño: archivo.size,
        url: response.content.download_url,
        sha: response.content.sha,
        metodo: 'github-files',
        fechaSubida: new Date().toISOString()
    };
}

/**
 * Convertir archivo a base64
 */
function convertirArchivoABase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

/**
 * Descargar archivo desde GitHub
 */
async function descargarArchivo(archivoData) {
    try {
        if (archivoData.metodo === 'base64') {
            // Crear blob desde base64
            const byteCharacters = atob(archivoData.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: archivoData.tipo });
            
            // Crear enlace de descarga
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = archivoData.nombre;
            a.click();
            window.URL.revokeObjectURL(url);
        } else if (archivoData.metodo === 'github-files') {
            // Abrir URL directa de GitHub
            window.open(archivoData.url, '_blank');
        }
    } catch (error) {
        console.error('Error al descargar archivo:', error);
        mostrarNotificacion('Error al descargar archivo: ' + error.message, 'danger');
    }
}

/**
 * Eliminar archivo de GitHub
 */
async function eliminarArchivo(archivoData) {
    try {
        if (archivoData.metodo === 'github-files' && archivoData.sha) {
            const ruta = archivoData.url.split('/').slice(-2).join('/'); // Extraer ruta
            await githubRequest(`contents/uploads/${ruta}`, 'DELETE', {
                message: `Eliminar archivo: ${archivoData.nombre}`,
                sha: archivoData.sha,
                branch: GITHUB_CONFIG.branch
            });
        }
        // Para base64, no hay que eliminar nada de GitHub
        return true;
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
    }
}

/**
 * Listar todos los archivos en GitHub
 */
async function listarArchivosGitHub(tipo = null) {
    try {
        const ruta = tipo ? `uploads/${tipo}` : 'uploads';
        const response = await githubRequest(`contents/${ruta}`);
        
        return response.map(archivo => ({
            nombre: archivo.name,
            url: archivo.download_url,
            sha: archivo.sha,
            tamaño: archivo.size,
            fechaModificacion: archivo.last_modified || new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error al listar archivos:', error);
        return [];
    }
}

/**
 * Sincronizar archivos entre local y GitHub
 */
async function sincronizarArchivos() {
    try {
        mostrarNotificacion('Sincronizando archivos...', 'info');
        
        // Obtener proveedores locales
        const proveedores = obtenerProveedores();
        let archivosLocal = [];
        
        // Extraer referencias de archivos locales
        proveedores.forEach(proveedor => {
            if (proveedor.constanciaData) {
                archivosLocal.push({
                    tipo: 'constancia',
                    proveedorId: proveedor.id,
                    data: proveedor.constanciaData
                });
            }
            
            if (proveedor.contratos) {
                proveedor.contratos.forEach(contrato => {
                    if (contrato.documentoData) {
                        archivosLocal.push({
                            tipo: 'contrato',
                            proveedorId: proveedor.id,
                            contratoId: contrato.id,
                            data: contrato.documentoData
                        });
                    }
                });
            }
        });
        
        // Obtener archivos de GitHub
        const archivosGitHub = await listarArchivosGitHub();
        
        mostrarNotificacion(`Encontrados ${archivosLocal.length} archivos locales y ${archivosGitHub.length} en GitHub`, 'success');
        
        return {
            local: archivosLocal,
            github: archivosGitHub
        };
    } catch (error) {
        console.error('Error en sincronización de archivos:', error);
        mostrarNotificacion('Error en sincronización: ' + error.message, 'danger');
        return null;
    }
}

// Exportar funciones
window.githubFiles = {
    subir: subirArchivo,
    descargar: descargarArchivo,
    eliminar: eliminarArchivo,
    listar: listarArchivosGitHub,
    sincronizar: sincronizarArchivos
};
