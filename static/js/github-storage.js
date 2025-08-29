/**
 * github-storage.js - Sistema de almacenamiento usando GitHub como base de datos
 *
 * Este sistema permite usar un repositorio de GitHub como almacenamiento de datos
 * para aplicaciones web estáticas. Es ideal para proyectos pequeños a medianos.
 */

// Configuración de GitHub - Se carga dinámicamente
const GITHUB_CONFIG = {
    owner: null,
    repo: null,
    branch: 'main',
    token: null,
    dataPath: 'data/'
};

/**
 * Carga la configuración de GitHub desde localStorage
 * @returns {boolean} - true si la configuración se cargó, false en caso contrario
 */
function cargarConfiguracionGitHub() {
    const configStr = localStorage.getItem('github_config');
    if (configStr) {
        try {
            const config = JSON.parse(configStr);
            GITHUB_CONFIG.owner = config.owner || null;
            GITHUB_CONFIG.repo = config.repo || null;
            GITHUB_CONFIG.token = config.token || null;
            return true;
        } catch (e) {
            console.error("Error al parsear la configuración de GitHub desde localStorage", e);
            return false;
        }
    }
    return false;
}

/**
 * Guarda la configuración de GitHub en localStorage
 * @param {Object} config - Objeto con owner, repo y token
 */
function guardarConfiguracionGitHub(config) {
    localStorage.setItem('github_config', JSON.stringify(config));
    GITHUB_CONFIG.owner = config.owner;
    GITHUB_CONFIG.repo = config.repo;
    GITHUB_CONFIG.token = config.token;
}


/**
 * Configurar token de GitHub
 * @param {string} token - Token de acceso personal de GitHub
 */
function configurarGitHubToken(token) {
    GITHUB_CONFIG.token = token;
    // Actualizar la configuración guardada
    const configStr = localStorage.getItem('github_config');
    const config = configStr ? JSON.parse(configStr) : {};
    config.token = token;
    localStorage.setItem('github_config', JSON.stringify(config));
}

/**
 * Obtener token de GitHub desde localStorage
 */
function obtenerGitHubToken() {
    if (!GITHUB_CONFIG.token) {
        cargarConfiguracionGitHub();
    }
    return GITHUB_CONFIG.token;
}

/**
 * Realizar petición a la API de GitHub
 * @param {string} endpoint - Endpoint de la API
 * @param {string} method - Método HTTP
 * @param {Object} data - Datos a enviar
 */
async function githubRequest(endpoint, method = 'GET', data = null) {
    // Asegurarse de que la configuración esté cargada
    if (!GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo) {
        cargarConfiguracionGitHub();
    }

    const token = obtenerGitHubToken();
    if (!token || !GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo) {
        throw new Error('Token, owner o repo de GitHub no configurado');
    }

    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${endpoint}`;

    const options = {
        method,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
    }

    // Para algunas respuestas (ej. 204 No Content), no hay JSON
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

/**
 * Obtener contenido de un archivo desde GitHub
 * @param {string} path - Ruta del archivo
 */
async function obtenerArchivoGitHub(path) {
    try {
        const response = await githubRequest(`contents/${GITHUB_CONFIG.dataPath}${path}`);

        // Decodificar el contenido base64
        const content = atob(response.content);
        return {
            content: JSON.parse(content),
            sha: response.sha
        };
    } catch (error) {
        if (error.message.includes('404')) {
            // Archivo no existe, devolver datos vacíos
            return {
                content: [],
                sha: null
            };
        }
        throw error;
    }
}

/**
 * Guardar contenido en un archivo de GitHub
 * @param {string} path - Ruta del archivo
 * @param {Object} content - Contenido a guardar
 * @param {string} sha - SHA del archivo existente (para actualizaciones)
 * @param {string} message - Mensaje del commit
 */
async function guardarArchivoGitHub(path, content, sha = null, message = 'Actualizar datos') {
    const encodedContent = btoa(JSON.stringify(content, null, 2));

    const data = {
        message,
        content: encodedContent,
        branch: GITHUB_CONFIG.branch
    };

    if (sha) {
        data.sha = sha;
    }

    return await githubRequest(`contents/${GITHUB_CONFIG.dataPath}${path}`, 'PUT', data);
}

/**
 * Obtener todos los proveedores desde GitHub
 */
async function obtenerProveedoresGitHub() {
    try {
        const result = await obtenerArchivoGitHub('proveedores.json');
        return result.content || [];
    } catch (error) {
        console.error('Error al obtener proveedores desde GitHub:', error);
        mostrarNotificacion('Error al cargar datos desde GitHub: ' + error.message, 'danger');
        return [];
    }
}

/**
 * Guardar proveedores en GitHub
 * @param {Array} proveedores - Lista de proveedores
 */
async function guardarProveedoresGitHub(proveedores) {
    try {
        // Obtener SHA actual del archivo
        const currentFile = await obtenerArchivoGitHub('proveedores.json');

        // Guardar con el SHA actual
        await guardarArchivoGitHub(
            'proveedores.json',
            proveedores,
            currentFile.sha,
            `Actualizar proveedores - ${new Date().toISOString()}`
        );

        mostrarNotificacion('Datos guardados en GitHub correctamente', 'success');
        return true;
    } catch (error) {
        console.error('Error al guardar en GitHub:', error);
        mostrarNotificacion('Error al guardar en GitHub: ' + error.message, 'danger');
        return false;
    }
}

/**
 * Sincronizar datos locales con GitHub
 */
async function sincronizarConGitHub() {
    try {
        mostrarNotificacion('Sincronizando con GitHub...', 'info');

        // Obtener datos desde GitHub
        const proveedoresGitHub = await obtenerProveedoresGitHub();

        // Guardar en localStorage
        if (proveedoresGitHub.length > 0) {
            localStorage.setItem(KEYS.PROVEEDORES, JSON.stringify(proveedoresGitHub));
            localStorage.setItem('ultima_sincronizacion', new Date().toISOString());
            mostrarNotificacion('Datos sincronizados desde GitHub', 'success');
        }

        return proveedoresGitHub;
    } catch (error) {
        console.error('Error en sincronización:', error);
        mostrarNotificacion('Error en sincronización: ' + error.message, 'danger');
        return null;
    }
}

/**
 * Subir datos locales a GitHub
 */
async function subirDatosAGitHub() {
    try {
        const proveedoresLocales = obtenerProveedores();

        if (proveedoresLocales.length === 0) {
            mostrarNotificacion('No hay datos locales para subir', 'warning');
            return false;
        }

        return await guardarProveedoresGitHub(proveedoresLocales);
    } catch (error) {
        console.error('Error al subir datos:', error);
        mostrarNotificacion('Error al subir datos: ' + error.message, 'danger');
        return false;
    }
}

/**
 * Verificar si GitHub está configurado
 */
function gitHubConfigurado() {
    cargarConfiguracionGitHub();
    return !!(GITHUB_CONFIG.owner && GITHUB_CONFIG.repo && GITHUB_CONFIG.token);
}

/**
 * Crear backup automático en GitHub
 */
async function crearBackupAutomatico() {
    if (!gitHubConfigurado()) {
        return false;
    }

    try {
        const proveedores = obtenerProveedores();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        await guardarArchivoGitHub(
            `backups/proveedores-${timestamp}.json`,
            proveedores,
            null,
            `Backup automático - ${new Date().toLocaleString()}`
        );

        return true;
    } catch (error) {
        console.error('Error en backup automático:', error);
        return false;
    }
}

/**
 * Inicializar sistema de almacenamiento híbrido (local + GitHub)
 */
async function inicializarAlmacenamientoHibrido() {
    // Primero cargar datos locales
    inicializarDatos();

    // Si GitHub está configurado, intentar sincronizar
    if (gitHubConfigurado()) {
        try {
            await sincronizarConGitHub();
        } catch (error) {
            console.warn('No se pudo sincronizar con GitHub, usando datos locales');
        }
    }
}

// Exportar funciones para uso global
window.githubStorage = {
    configurarToken: configurarGitHubToken,
    guardarConfiguracion: guardarConfiguracionGitHub,
    sincronizar: sincronizarConGitHub,
    subir: subirDatosAGitHub,
    configurado: gitHubConfigurado,
    backup: crearBackupAutomatico,
    inicializar: inicializarAlmacenamientoHibrido
};
