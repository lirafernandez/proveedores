document.addEventListener('DOMContentLoaded', function() {
    explorarUploads();
    configurarFiltros();

    // Verificar si hay un filtro de proveedor en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const proveedorId = urlParams.get('proveedor');
    if (proveedorId) {
        filtrarPorProveedor(proveedorId);
    }
});

function configurarFiltros() {
    document.getElementById('filtroTipo').addEventListener('change', filtrarDocumentos);
    document.getElementById('buscarArchivo').addEventListener('input', filtrarDocumentos);
}

function filtrarPorProveedor(proveedorId) {
    // Buscar el proveedor y mostrar solo sus documentos
    const proveedores = obtenerProveedores();
    const proveedor = proveedores.find(p => p.id === proveedorId);

    if (proveedor) {
        // Actualizar título para mostrar filtro
        const titulo = document.querySelector('.card-header h1');
        titulo.innerHTML = '<i class="bi bi-folder2-open"></i> Documentos de ' + proveedor.nombre;

        // Agregar botón para ver todos
        const cardBody = document.querySelector('.card-body');
        const btnVerTodos = document.createElement('div');
        btnVerTodos.className = 'alert alert-info d-flex justify-content-between align-items-center mb-3';
        btnVerTodos.innerHTML =
            '<span><i class="bi bi-filter"></i> Mostrando solo documentos de: <strong>' + proveedor.nombre + '</strong></span>' +
            '<button class="btn btn-sm btn-primary" onclick="window.location.href=\'ver-documentos.html\'">' +
                '<i class="bi bi-arrow-clockwise"></i> Ver todos' +
            '</button>';
        cardBody.insertBefore(btnVerTodos, cardBody.firstChild);

        // Guardar ID del proveedor para filtrar
        window.proveedorFiltrado = proveedorId;
    }
}

async function explorarUploads() {
    try {
        // Esta función explorará la carpeta uploads
        const documentos = await obtenerDocumentosUploads();
        mostrarDocumentos(documentos);
    } catch (error) {
        document.getElementById('listaDocumentos').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i>
                No se pudieron cargar los documentos: ${error.message}
            </div>
        `;
    }
}

async function obtenerDocumentosUploads() {
    // Simular exploración de uploads
    const documentos = [];

    // En producción, esto exploraría realmente la carpeta uploads
    // Por ahora, obtenemos documentos de los proveedores
    const proveedores = obtenerProveedores();

    proveedores.forEach(proveedor => {
        // Si hay filtro de proveedor, solo mostrar ese proveedor
        if (window.proveedorFiltrado && proveedor.id !== window.proveedorFiltrado) {
            return;
        }

        // Constancias
        if (proveedor.constanciaData) {
            documentos.push({
                nombre: proveedor.constanciaData.nombre || 'constancia.pdf',
                tipo: 'constancias',
                proveedor: proveedor.nombre,
                proveedorId: proveedor.id,
                tamaño: proveedor.constanciaData.tamaño || 0,
                fecha: proveedor.constanciaData.fechaSubida || new Date().toISOString(),
                data: proveedor.constanciaData
            });
        }

        // Contratos
        if (proveedor.contratos) {
            proveedor.contratos.forEach(contrato => {
                if (contrato.documentoData) {
                    documentos.push({
                        nombre: contrato.documentoData.nombre || 'contrato.pdf',
                        tipo: 'contratos',
                        proveedor: proveedor.nombre,
                        proveedorId: proveedor.id,
                        contrato: contrato.numero,
                        tamaño: contrato.documentoData.tamaño || 0,
                        fecha: contrato.documentoData.fechaSubida || contrato.fechaInicio,
                        data: contrato.documentoData
                    });
                }
            });
        }
    });

    return documentos;
}

function mostrarDocumentos(documentos) {
    const container = document.getElementById('listaDocumentos');

    if (documentos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <h4 class="mt-3">No hay documentos</h4>
                <p class="text-muted">Sube algunos archivos para comenzar</p>
                <button class="btn btn-primary" onclick="subirNuevoArchivo()">
                    <i class="bi bi-plus"></i> Subir Documento
                </button>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th><i class="bi bi-file-earmark"></i> Archivo</th>
                        <th><i class="bi bi-folder"></i> Tipo</th>
                        <th><i class="bi bi-person"></i> Proveedor</th>
                        <th><i class="bi bi-hdd"></i> Tamaño</th>
                        <th><i class="bi bi-calendar"></i> Fecha</th>
                        <th><i class="bi bi-gear"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let rowsHTML = '';
    documentos.forEach((doc, index) => {
        const tamaño = formatearTamaño(doc.tamaño);
        const fecha = new Date(doc.fecha).toLocaleDateString();
        const icono = obtenerIconoTipo(doc.tipo);

        rowsHTML += `
            <tr data-tipo="${doc.tipo}" data-nombre="${doc.nombre.toLowerCase()}">
                <td>
                    <i class="bi ${icono} me-2"></i>
                    <strong>${doc.nombre}</strong>
                    ${doc.contrato ? `<br><small class="text-muted">Contrato: ${doc.contrato}</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-${obtenerColorTipo(doc.tipo)}">${doc.tipo}</span>
                </td>
                <td>${doc.proveedor}</td>
                <td>${tamaño}</td>
                <td>${fecha}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="verArchivo(${index})" title="Ver">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="descargarArchivo(${index})" title="Descargar">
                            <i class="bi bi-download"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="copiarEnlace(${index})" title="Copiar enlace">
                            <i class="bi bi-link"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += rowsHTML;
    tableHTML += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <small class="text-muted">
                <i class="bi bi-info-circle"></i>
                Total: ${documentos.length} documento(s) |
                Tamaño total: ${formatearTamaño(documentos.reduce((sum, doc) => sum + (doc.tamaño || 0), 0))}
            </small>
        </div>
    `;

    container.innerHTML = tableHTML;

    // Guardar documentos para uso posterior
    window.documentosActuales = documentos;
}

function obtenerIconoTipo(tipo) {
    switch(tipo) {
        case 'contratos': return 'bi-file-earmark-text';
        case 'constancias': return 'bi-file-earmark-check';
        case 'anexos': return 'bi-paperclip';
        default: return 'bi-file-earmark';
    }
}

function obtenerColorTipo(tipo) {
    switch(tipo) {
        case 'contratos': return 'primary';
        case 'constancias': return 'success';
        case 'anexos': return 'info';
        default: return 'secondary';
    }
}

function formatearTamaño(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function filtrarDocumentos() {
    const tipoFiltro = document.getElementById('filtroTipo').value;
    const textoBusqueda = document.getElementById('buscarArchivo').value.toLowerCase();
    const filas = document.querySelectorAll('#listaDocumentos tbody tr');

    filas.forEach(fila => {
        const tipo = fila.dataset.tipo;
        const nombre = fila.dataset.nombre;

        const coincideTipo = !tipoFiltro || tipo === tipoFiltro;
        const coincideTexto = !textoBusqueda || nombre.includes(textoBusqueda);

        fila.style.display = coincideTipo && coincideTexto ? '' : 'none';
    });
}

function verArchivo(index) {
    const doc = window.documentosActuales[index];
    const modal = new bootstrap.Modal(document.getElementById('modalVistaPrevia'));

    document.getElementById('tituloArchivo').textContent = doc.nombre;

    if (doc.data.base64) {
        // Archivo en base64
        const contenido =
            '<iframe src="data:' + doc.data.tipo + ';base64,' + doc.data.base64 + '" ' +
                    'width="100%" height="100%" class="border-0">' +
            '</iframe>';
        document.getElementById('contenidoVistaPrevia').innerHTML = contenido;
    } else if (doc.data.url) {
        // Archivo en GitHub
        const contenido =
            '<div class="text-center py-5">' +
                '<i class="bi bi-github display-1"></i>' +
                '<h5 class="mt-3">Este archivo está almacenado en GitHub</h5>' +
                '<p>No se puede previsualizar directamente.</p>' +
                '<a href="' + doc.data.url + '" target="_blank" class="btn btn-primary">' +
                    '<i class="bi bi-box-arrow-up-right"></i> Abrir en GitHub' +
                '</a>' +
            '</div>';
        document.getElementById('contenidoVistaPrevia').innerHTML = contenido;
    } else {
        document.getElementById('contenidoVistaPrevia').innerHTML =
            '<div class="alert alert-warning">' +
                '<i class="bi bi-exclamation-triangle"></i> No se puede mostrar vista previa' +
            '</div>';
    }

    modal.show();
}

function descargarArchivo(index) {
    const doc = window.documentosActuales[index];

    if (doc.data.base64) {
        // Crear enlace de descarga para base64
        const link = document.createElement('a');
        link.href = `data:${doc.data.tipo};base64,${doc.data.base64}`;
        link.download = doc.nombre;
        link.click();
    } else if (doc.data.url) {
        // Abrir URL de GitHub
        window.open(doc.data.url, '_blank');
    } else {
        alert('No se puede descargar este archivo');
    }
}

function copiarEnlace(index) {
    const doc = window.documentosActuales[index];
    let enlace = '';

    if (doc.data.base64) {
        enlace = 'data:' + doc.data.tipo + ';base64,' + doc.data.base64;
    } else if (doc.data.url) {
        enlace = doc.data.url;
    }

    if (enlace) {
        navigator.clipboard.writeText(enlace).then(() => {
            mostrarNotificacion('Enlace copiado al portapapeles', 'success');
        });
    }
}

function subirNuevoArchivo() {
    window.location.href = 'admin-archivos.html';
}
