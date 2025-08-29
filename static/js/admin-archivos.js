document.addEventListener('DOMContentLoaded', function() {
    inicializarAdminArchivos();
});

async function inicializarAdminArchivos() {
    // Verificar configuración
    actualizarEstadoSistema();

    // Cargar estadísticas
    await cargarEstadisticas();

    // Configurar eventos
    configurarEventos();

    // Cargar lista de archivos
    await cargarListaArchivos();
}

function actualizarEstadoSistema() {
    const estadoDiv = document.getElementById('estadoSistema');
    const botones = ['btnSincronizarArchivos', 'btnSubirArchivos', 'btnDescargarTodos', 'btnSubirManual'];

    if (window.githubStorage && window.githubStorage.configurado()) {
        estadoDiv.className = 'alert alert-success';
        estadoDiv.innerHTML = '<i class="bi bi-check-circle"></i> GitHub configurado - Sistema de archivos listo';

        // Habilitar botones
        botones.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
    } else {
        estadoDiv.className = 'alert alert-warning';
        estadoDiv.innerHTML = '<i class="bi bi-exclamation-triangle"></i> GitHub no configurado - <a href="configuracion-github.html">Configurar ahora</a>';

        // Deshabilitar botones
        botones.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }
}

async function cargarEstadisticas() {
    try {
        let archivosLocal = 0;
        let archivosGitHub = 0;
        let espacioUsado = 0;

        // Contar archivos locales
        const proveedores = obtenerProveedores();
        proveedores.forEach(proveedor => {
            if (proveedor.constanciaData) archivosLocal++;
            if (proveedor.contratos) {
                proveedor.contratos.forEach(contrato => {
                    if (contrato.documentoData) {
                        archivosLocal++;
                        espacioUsado += contrato.documentoData.tamaño || 0;
                    }
                });
            }
        });

        // Contar archivos en GitHub
        if (window.githubFiles && window.githubStorage && window.githubStorage.configurado()) {
            try {
                const archivosGH = await window.githubFiles.listar();
                archivosGitHub = archivosGH.length;
            } catch (error) {
                console.warn('No se pudieron obtener archivos de GitHub:', error);
            }
        }

        // Actualizar interfaz
        document.getElementById('totalArchivosLocal').textContent = archivosLocal;
        document.getElementById('totalArchivosGitHub').textContent = archivosGitHub;
        document.getElementById('espacioUsado').textContent = (espacioUsado / 1024 / 1024).toFixed(2) + ' MB';

        const ultimaSync = localStorage.getItem('ultima_sincronizacion_archivos');
        if (ultimaSync) {
            document.getElementById('ultimaSync').textContent = formatearFecha(ultimaSync);
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

function configurarEventos() {
    document.getElementById('btnSincronizarArchivos').addEventListener('click', sincronizarArchivos);
    document.getElementById('btnSubirArchivos').addEventListener('click', subirTodosArchivos);
    document.getElementById('btnDescargarTodos').addEventListener('click', descargarTodosArchivos);
    document.getElementById('btnLimpiarLocal').addEventListener('click', limpiarCacheLocal);
    document.getElementById('btnSubirManual').addEventListener('click', subirArchivoManual);
    document.getElementById('btnRefrescar').addEventListener('click', cargarListaArchivos);

    // Filtros
    document.getElementById('filtroTipo').addEventListener('change', filtrarArchivos);
    document.getElementById('filtroUbicacion').addEventListener('change', filtrarArchivos);
}

async function cargarListaArchivos() {
    const tabla = document.getElementById('tablaArchivos');
    tabla.innerHTML = '<tr><td colspan="6" class="text-center">Cargando archivos...</td></tr>';

    try {
        const archivos = [];

        // Obtener archivos locales
        const proveedores = obtenerProveedores();
        proveedores.forEach(proveedor => {
            if (proveedor.constanciaData) {
                archivos.push({
                    ...proveedor.constanciaData,
                    tipo: 'constancia',
                    proveedorId: proveedor.id,
                    proveedorNombre: proveedor.nombre,
                    ubicacion: 'local'
                });
            }

            if (proveedor.contratos) {
                proveedor.contratos.forEach(contrato => {
                    if (contrato.documentoData) {
                        archivos.push({
                            ...contrato.documentoData,
                            tipo: 'contrato',
                            proveedorId: proveedor.id,
                            contratoId: contrato.id,
                            proveedorNombre: proveedor.nombre,
                            contratoNumero: contrato.numero,
                            ubicacion: contrato.documentoData.metodo === 'github-files' ? 'github' : 'local'
                        });
                    }
                });
            }
        });

        // Obtener archivos de GitHub
        if (window.githubFiles && window.githubStorage && window.githubStorage.configurado()) {
            try {
                const archivosGH = await window.githubFiles.listar();
                archivosGH.forEach(archivo => {
                    // Verificar si ya existe en local
                    const existeLocal = archivos.find(a => a.nombre === archivo.nombre);
                    if (!existeLocal) {
                        archivos.push({
                            ...archivo,
                            tipo: archivo.nombre.includes('contrato') ? 'contrato' :
                                  archivo.nombre.includes('constancia') ? 'constancia' : 'anexo',
                            ubicacion: 'github-solo'
                        });
                    } else {
                        existeLocal.ubicacion = 'ambos';
                    }
                });
            } catch (error) {
                console.warn('Error al obtener archivos de GitHub:', error);
            }
        }

        mostrarArchivosEnTabla(archivos);
    } catch (error) {
        console.error('Error al cargar archivos:', error);
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar archivos</td></tr>';
    }
}

function mostrarArchivosEnTabla(archivos) {
    const tabla = document.getElementById('tablaArchivos');

    if (archivos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center">No hay archivos</td></tr>';
        return;
    }

    tabla.innerHTML = archivos.map(archivo => `
        <tr>
            <td>
                <div>
                    <strong>${archivo.nombre}</strong>
                    ${archivo.proveedorNombre ? `<br><small class="text-muted">Proveedor: ${archivo.proveedorNombre}</small>` : ''}
                    ${archivo.contratoNumero ? `<br><small class="text-muted">Contrato: ${archivo.contratoNumero}</small>` : ''}
                </div>
            </td>
            <td><span class="badge bg-secondary">${archivo.tipo}</span></td>
            <td>' + formatearTamaño(archivo.tamaño || 0) + '</td>
            <td>${obtenerBadgeUbicacion(archivo.ubicacion)}</td>
            <td>${formatearFecha(archivo.fechaSubida || archivo.fechaModificacion)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="descargarArchivo('${archivo.nombre}')">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="eliminarArchivo('${archivo.nombre}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function obtenerBadgeUbicacion(ubicacion) {
    switch (ubicacion) {
        case 'local': return '<span class="badge bg-warning">Local</span>';
        case 'github': return '<span class="badge bg-success">GitHub</span>';
        case 'github-solo': return '<span class="badge bg-info">Solo GitHub</span>';
        case 'ambos': return '<span class="badge bg-primary">Ambos</span>';
        default: return '<span class="badge bg-secondary">Desconocido</span>';
    }
}

function formatearTamaño(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatearFecha(fechaString) {
    if (!fechaString) return 'N/A';
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

async function descargarArchivo(nombreArchivo) {
    try {
        if (window.githubFiles) {
            mostrarNotificacion('Descargando archivo...', 'info');
            const resultado = await window.githubFiles.descargar(nombreArchivo);
            if (resultado) {
                mostrarNotificacion('Archivo descargado exitosamente', 'success');
            }
        }
    } catch (error) {
        console.error('Error al descargar:', error);
        mostrarNotificacion('Error al descargar archivo: ' + error.message, 'error');
    }
}

async function eliminarArchivo(nombreArchivo) {
    if (!confirm("¿Está seguro de que desea eliminar el archivo \"" + nombreArchivo + "\"?")) {
        return;
    }

    try {
        if (window.githubFiles) {
            mostrarNotificacion('Eliminando archivo...', 'info');
            const resultado = await window.githubFiles.eliminar(nombreArchivo);
            if (resultado) {
                await cargarListaArchivos();
                await cargarEstadisticas();
                mostrarNotificacion('Archivo eliminado exitosamente', 'success');
            }
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        mostrarNotificacion('Error al eliminar archivo: ' + error.message, 'error');
    }
}

async function subirTodosArchivos() {
    if (!confirm('¿Desea subir todos los archivos locales a GitHub?')) {
        return;
    }

    mostrarNotificacion('Subiendo todos los archivos...', 'info');
    // Implementar lógica de subida masiva
}

async function descargarTodosArchivos() {
    if (!confirm('¿Desea descargar todos los archivos de GitHub?')) {
        return;
    }

    mostrarNotificacion('Descargando todos los archivos...', 'info');
    // Implementar lógica de descarga masiva
}

function mostrarProgreso(porcentaje, texto) {
    const barra = document.getElementById('barraProgreso');
    const textoDiv = document.getElementById('textoProgreso');

    if (barra) {
        barra.style.width = porcentaje + '%';
        barra.setAttribute('aria-valuenow', porcentaje);
    }
    if (textoDiv) {
        textoDiv.textContent = texto;
    }
}

function ocultarProgreso() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalProgreso'));
    if (modal) {
        modal.hide();
    }
}

async function sincronizarArchivos() {
    mostrarNotificacion('Sincronizando archivos...', 'info');

    // Mostrar modal de progreso
    const modal = new bootstrap.Modal(document.getElementById('modalProgreso'));
    modal.show();
    mostrarProgreso(0, 'Iniciando sincronización...');

    try {
        if (window.githubFiles) {
            mostrarProgreso(25, 'Obteniendo archivos locales...');
            const resultado = await window.githubFiles.sincronizar();

            mostrarProgreso(75, 'Actualizando datos...');
            if (resultado) {
                localStorage.setItem('ultima_sincronizacion_archivos', new Date().toISOString());
                await cargarEstadisticas();
                await cargarListaArchivos();
                mostrarProgreso(100, 'Sincronización completada');
                mostrarNotificacion('Archivos sincronizados correctamente', 'success');
            } else {
                mostrarNotificacion('Error en la sincronización', 'error');
            }
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
        mostrarNotificacion('Error al sincronizar archivos: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            ocultarProgreso();
        }, 1500);
    }
}

async function subirArchivoManual() {
    const inputArchivo = document.getElementById('archivoManual');
    const tipoArchivo = document.getElementById('tipoArchivo').value;

    if (!inputArchivo.files.length) {
        mostrarNotificacion('Por favor seleccione un archivo', 'warning');
        return;
    }

    const archivo = inputArchivo.files[0];

    // Mostrar modal de progreso
    const modal = new bootstrap.Modal(document.getElementById('modalProgreso'));
    modal.show();
    mostrarProgreso(0, 'Preparando archivo...');

    try {
        if (window.githubFiles) {
            mostrarProgreso(25, 'Subiendo archivo a GitHub...');
            const resultado = await window.githubFiles.subir(archivo, 'manual', tipoArchivo);

            mostrarProgreso(75, 'Actualizando interfaz...');
            if (resultado) {
                inputArchivo.value = '';
                await cargarListaArchivos();
                await cargarEstadisticas();
                mostrarProgreso(100, 'Archivo subido correctamente');
                mostrarNotificacion('Archivo subido exitosamente', 'success');
            } else {
                mostrarNotificacion('Error al subir archivo', 'error');
            }
        }
    } catch (error) {
        console.error('Error al subir archivo:', error);
        mostrarNotificacion('Error al subir archivo: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            ocultarProgreso();
        }, 1500);
    }
}

function limpiarCacheLocal() {
    if (confirm('¿Está seguro de que desea limpiar el cache local de archivos?')) {
        // Implementar limpieza de cache
        mostrarNotificacion('Cache local limpiado', 'success');
        cargarListaArchivos();
        cargarEstadisticas();
    }
}

function filtrarArchivos() {
    // Implementar filtrado
    cargarListaArchivos();
}
