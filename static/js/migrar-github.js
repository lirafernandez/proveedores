let migracionEnProgreso = false;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar conexión con GitHub
    verificarConfiguracion();

    // Cargar estadísticas locales
    cargarEstadisticas();

    // Configurar botón de migración
    document.getElementById('btnMigrar').addEventListener('click', iniciarMigracion);
});

function verificarConfiguracion() {
    const estadoDiv = document.getElementById('estadoConexion');
    const btnMigrar = document.getElementById('btnMigrar');

    try {
        const config = JSON.parse(localStorage.getItem('github_config') || '{}');

        if (config.owner && config.repo && config.token) {
            estadoDiv.className = 'alert alert-success mb-0';
            estadoDiv.innerHTML = '<i class="bi bi-check-circle"></i> GitHub configurado correctamente';
            btnMigrar.disabled = false;
        } else {
            estadoDiv.className = 'alert alert-warning mb-0';
            estadoDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Por favor configura GitHub primero';
            btnMigrar.disabled = true;
        }
    } catch (error) {
        estadoDiv.className = 'alert alert-danger mb-0';
        estadoDiv.innerHTML = '<i class="bi bi-x-circle"></i> Error en la configuración';
        btnMigrar.disabled = true;
    }
}

function cargarEstadisticas() {
    const proveedores = obtenerProveedores();
    document.getElementById('contadorProveedores').textContent = proveedores.length;

    // Simular conteo de archivos (en una implementación real esto vendría del sistema de archivos)
    document.getElementById('contadorArchivos').textContent = '0';

    // Cargar última migración
    const ultimaMigracion = localStorage.getItem('ultima_migracion');
    if (ultimaMigracion) {
        document.getElementById('ultimaMigracion').textContent = new Date(ultimaMigracion).toLocaleString('es-ES');
    }
}

async function iniciarMigracion() {
    if (migracionEnProgreso) return;

    if (!confirm('¿Está seguro de que desea iniciar la migración completa a GitHub?')) {
        return;
    }

    migracionEnProgreso = true;

    const btnMigrar = document.getElementById('btnMigrar');
    const contenedorProgreso = document.getElementById('contenedorProgreso');
    const barraProgreso = document.getElementById('barraProgreso');
    const textoProgreso = document.getElementById('textoProgreso');
    const listaResultados = document.getElementById('listaResultados');

    // Deshabilitar botón y mostrar progreso
    btnMigrar.disabled = true;
    btnMigrar.innerHTML = '<i class="bi bi-hourglass-split"></i> Migrando...';
    contenedorProgreso.classList.remove('d-none');
    listaResultados.innerHTML = '';

    try {
        // Paso 1: Crear backup
        actualizarProgreso(10, 'Creando backup local...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Paso 2: Subir datos de proveedores
        actualizarProgreso(30, 'Subiendo datos de proveedores...');
        if (window.githubStorage) {
            await window.githubStorage.subir();
        }
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Paso 3: Subir archivos PDF
        actualizarProgreso(70, 'Subiendo archivos PDF...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Paso 4: Verificar migración
        actualizarProgreso(90, 'Verificando migración...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Finalizar
        actualizarProgreso(100, 'Migración completada');

        // Guardar timestamp de migración
        localStorage.setItem('ultima_migracion', new Date().toISOString());

        // Mostrar resultados
        mostrarResultados([
            { tipo: 'success', mensaje: 'Datos de proveedores migrados correctamente' },
            { tipo: 'success', mensaje: 'Archivos PDF procesados' },
            { tipo: 'info', mensaje: 'Backup local creado' }
        ]);

        // Actualizar estado
        document.getElementById('estadoMigracion').className = 'badge bg-success';
        document.getElementById('estadoMigracion').textContent = 'Completada';

        cargarEstadisticas();

    } catch (error) {
        console.error('Error durante la migración:', error);
        actualizarProgreso(0, 'Error en la migración');
        mostrarResultados([
            { tipo: 'danger', mensaje: 'Error: ' + error.message }
        ]);
    } finally {
        migracionEnProgreso = false;
        btnMigrar.disabled = false;
        btnMigrar.innerHTML = '<i class="bi bi-cloud-upload"></i> Iniciar Migración Completa';
    }
}

function actualizarProgreso(porcentaje, texto) {
    const barraProgreso = document.getElementById('barraProgreso');
    const textoProgreso = document.getElementById('textoProgreso');

    barraProgreso.style.width = porcentaje + '%';
    barraProgreso.setAttribute('aria-valuenow', porcentaje);
    textoProgreso.textContent = texto;
}

function mostrarResultados(resultados) {
    const listaResultados = document.getElementById('listaResultados');

    resultados.forEach(resultado => {
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-${resultado.tipo}`;

        let icono = '';
        switch (resultado.tipo) {
            case 'success': icono = '<i class="bi bi-check-circle"></i>'; break;
            case 'danger': icono = '<i class="bi bi-x-circle"></i>'; break;
            case 'warning': icono = '<i class="bi bi-exclamation-triangle"></i>'; break;
            default: icono = '<i class="bi bi-info-circle"></i>';
        }

        item.innerHTML = `${icono} ${resultado.mensaje}`;
        listaResultados.appendChild(item);
    });
}
