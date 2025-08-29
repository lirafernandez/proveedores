document.addEventListener('DOMContentLoaded', function() {
    cargarConfiguracion();
    actualizarEstadisticas();
    actualizarEstadoGitHub();

    document.getElementById('formGitHub').addEventListener('submit', guardarConfiguracionForm);
    document.getElementById('btnSincronizar').addEventListener('click', sincronizarDatos);
    document.getElementById('btnSubir').addEventListener('click', subirDatos);
    document.getElementById('btnBackup').addEventListener('click', crearBackup);
    document.getElementById('btnProbar').addEventListener('click', probarConexion);

    document.querySelectorAll('input[name="modoTrabajo"]').forEach(radio => {
        radio.addEventListener('change', cambiarModoTrabajo);
    });
});

function cargarConfiguracion() {
    const configStr = localStorage.getItem('github_config');
    if (!configStr) return;

    try {
        const config = JSON.parse(configStr);
        document.getElementById('githubOwner').value = config.owner || '';
        document.getElementById('githubRepo').value = config.repo || '';
        document.getElementById('githubToken').value = config.token || '';
    } catch (error) {
        console.error('Error al cargar configuración de GitHub:', error);
    }
}

function guardarConfiguracionForm(e) {
    e.preventDefault();

    const config = {
        owner: document.getElementById('githubOwner').value.trim(),
        repo: document.getElementById('githubRepo').value.trim(),
        token: document.getElementById('githubToken').value.trim()
    };

    if (!config.owner || !config.repo || !config.token) {
        mostrarNotificacion('Por favor, complete todos los campos.', 'warning');
        return;
    }

    try {
        window.githubStorage.guardarConfiguracion(config);
        actualizarEstadoGitHub();
        mostrarNotificacion('Configuración guardada correctamente.', 'success');
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarNotificacion(`Error al guardar: ${error.message}`, 'danger');
    }
}

function actualizarEstadoGitHub() {
    const estadoDiv = document.getElementById('estadoGitHub');
    const botones = ['btnSincronizar', 'btnSubir', 'btnBackup', 'btnProbar'];
    const estadoConexion = document.getElementById('estadoConexion');

    if (window.githubStorage && window.githubStorage.configurado()) {
        estadoDiv.className = 'alert alert-success';
        estadoDiv.innerHTML = '<i class="bi bi-check-circle"></i> GitHub configurado correctamente.';
        botones.forEach(id => document.getElementById(id).disabled = false);
        estadoConexion.className = 'badge bg-success';
        estadoConexion.textContent = 'Configurado';
    } else {
        estadoDiv.className = 'alert alert-warning';
        estadoDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> GitHub no está configurado.';
        botones.forEach(id => document.getElementById(id).disabled = true);
        estadoConexion.className = 'badge bg-secondary';
        estadoConexion.textContent = 'No configurado';
    }
}

async function sincronizarDatos() {
    if (window.githubStorage) {
        await window.githubStorage.sincronizar();
        actualizarEstadisticas();
    }
}

async function subirDatos() {
    if (window.githubStorage) {
        await window.githubStorage.subir();
        actualizarEstadisticas();
    }
}

async function crearBackup() {
    if (window.githubStorage) {
        const success = await window.githubStorage.backup();
        if (success) {
            mostrarNotificacion('Backup creado correctamente.', 'success');
        }
    }
}

async function probarConexion() {
    try {
        mostrarNotificacion('Probando conexión...', 'info');
        // Una petición simple para probar las credenciales, como obtener info del repo
        await githubRequest('', 'GET');
        mostrarNotificacion('Conexión con GitHub exitosa.', 'success');
        actualizarEstadoGitHub();
    } catch (error) {
        mostrarNotificacion(`Error de conexión: ${error.message}`, 'danger');
    }
}

function actualizarEstadisticas() {
    const proveedores = obtenerProveedores();
    document.getElementById('proveedoresLocales').textContent = proveedores.length;

    const ultimaSync = localStorage.getItem('ultima_sincronizacion');
    document.getElementById('ultimaSync').textContent = ultimaSync ? new Date(ultimaSync).toLocaleString('es-ES') : 'Nunca';
}

function cambiarModoTrabajo(e) {
    const modo = e.target.value;
    localStorage.setItem('modo_trabajo', modo);
    mostrarNotificacion(`Modo de trabajo cambiado a: ${modo}.`, 'info');
}
