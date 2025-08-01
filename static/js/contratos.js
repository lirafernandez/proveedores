/**
 * contratos.js - Lógica para manejo de contratos
 */

// Cargar datos cuando se inicia la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de detalle de proveedor
    const proveedorId = obtenerParametroUrl('id');
    
    if (proveedorId && document.getElementById('detalleProveedor')) {
        inicializarDatos();
        cargarDetalleProveedor(proveedorId);
        
        // Configurar botones
        const btnNuevoContrato = document.getElementById('btnNuevoContrato');
        if (btnNuevoContrato) {
            btnNuevoContrato.addEventListener('click', () => nuevoContrato(proveedorId));
        }
        
        const btnGuardarContrato = document.getElementById('btnGuardarContrato');
        if (btnGuardarContrato) {
            btnGuardarContrato.addEventListener('click', guardarContrato);
        }
        
        const btnEditar = document.getElementById('btnEditar');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => {
                // Abrir modal de edición de proveedor
                editarProveedor(proveedorId);
            });
        }
    }
});

// Función para cargar detalle del proveedor
function cargarDetalleProveedor(proveedorId) {
    const proveedor = obtenerProveedor(proveedorId);
    
    if (!proveedor) {
        mostrarNotificacion('No se encontró el proveedor especificado', 'danger');
        setTimeout(() => {
            window.location.href = 'proveedores.html';
        }, 2000);
        return;
    }
    
    // Actualizar datos del proveedor en la página
    document.getElementById('nombreProveedor').textContent = proveedor.nombre;
    document.getElementById('direccionProveedor').textContent = proveedor.direccion || 'No registrada';
    document.getElementById('fechaRegistroProveedor').textContent = formatearFecha(proveedor.fechaRegistro);
    
    // Mostrar badge de constancia
    const badgeConstancia = document.getElementById('badgeConstancia');
    if (proveedor.tieneConstancia) {
        badgeConstancia.className = 'badge bg-success';
        badgeConstancia.textContent = 'Con constancia';
    } else {
        badgeConstancia.className = 'badge bg-danger';
        badgeConstancia.textContent = 'Sin constancia';
    }
    
    // Mostrar opción para ver o subir constancia
    const constanciaContainer = document.getElementById('constanciaContainer');
    if (constanciaContainer) {
        if (proveedor.tieneConstancia && proveedor.constanciaUrl) {
            constanciaContainer.innerHTML = `
                <a href="${proveedor.constanciaUrl}" target="_blank" class="btn btn-outline-primary">
                    <i class="bi bi-file-earmark-text"></i> Ver constancia
                </a>
                <button id="btnSubirConstancia" class="btn btn-outline-success ms-2">
                    <i class="bi bi-upload"></i> Actualizar
                </button>
            `;
            
            // Configurar botón para subir constancia
            document.getElementById('btnSubirConstancia').addEventListener('click', () => {
                new bootstrap.Modal(document.getElementById('modalConstancia')).show();
            });
            
            // Configurar botón para guardar constancia
            const btnGuardarConstancia = document.getElementById('btnGuardarConstancia');
            if (btnGuardarConstancia) {
                btnGuardarConstancia.addEventListener('click', () => {
                    guardarConstancia(proveedorId);
                });
            }
        } else if (proveedor.tieneConstancia) {
            constanciaContainer.innerHTML = `
                <button id="btnSubirConstancia" class="btn btn-outline-primary">
                    <i class="bi bi-upload"></i> Subir constancia
                </button>
            `;
            
            // Configurar botón para subir constancia
            document.getElementById('btnSubirConstancia').addEventListener('click', () => {
                new bootstrap.Modal(document.getElementById('modalConstancia')).show();
            });
            
            // Configurar botón para guardar constancia
            const btnGuardarConstancia = document.getElementById('btnGuardarConstancia');
            if (btnGuardarConstancia) {
                btnGuardarConstancia.addEventListener('click', () => {
                    guardarConstancia(proveedorId);
                });
            }
        } else {
            constanciaContainer.innerHTML = `
                <span class="text-muted">Sin constancia requerida</span>
            `;
        }
    }
    
    // Cargar contratos del proveedor
    cargarContratos(proveedorId);
    
    // Actualizar título de la página
    document.title = `${proveedor.nombre} - Detalle de Proveedor`;
}

// Función para cargar contratos
function cargarContratos(proveedorId) {
    const proveedor = obtenerProveedor(proveedorId);
    if (!proveedor) return;
    
    const listaContratos = document.getElementById('listaContratos');
    if (!listaContratos) return;
    
    // Verificar si tiene contratos
    if (!proveedor.contratos || proveedor.contratos.length === 0) {
        listaContratos.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No hay contratos registrados para este proveedor.
            </div>
        `;
        return;
    }
    
    // Crear tabla de contratos
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Vigencia</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Documento</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const hoy = new Date();
    const contratos = [...proveedor.contratos];
    
    // Ordenar contratos por fecha de vencimiento
    contratos.sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin));
    
    contratos.forEach(contrato => {
        const fechaInicio = new Date(contrato.fechaInicio);
        const fechaFin = new Date(contrato.fechaFin);
        const diasRestantes = calcularDiasRestantes(fechaFin);
        
        // Determinar estado del contrato
        let estadoClass = 'bg-success';
        let estadoTexto = 'Vigente';
        let rowClass = '';
        
        if (fechaFin < hoy) {
            estadoClass = 'bg-danger';
            estadoTexto = 'Vencido';
            rowClass = 'table-danger';
        } else if (diasRestantes <= 30) {
            estadoClass = 'bg-warning text-dark';
            estadoTexto = `Por vencer (${diasRestantes} días)`;
            rowClass = 'table-warning';
        }
        
        html += `
            <tr class="${rowClass}">
                <td>${contrato.numero}</td>
                <td>
                    <div>Del: ${formatearFecha(contrato.fechaInicio)}</div>
                    <div>Al: ${formatearFecha(contrato.fechaFin)}</div>
                </td>
                <td>${formatearMoneda(contrato.monto)}</td>
                <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                <td>
                    ${contrato.documentoUrl ? 
                        `<a href="${contrato.documentoUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-file-earmark-text"></i> Ver
                        </a>` : 
                        '<span class="badge bg-secondary">Sin documento</span>'}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-warning" onclick="editarContrato('${contrato.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="confirmarEliminarContrato('${contrato.id}', '${contrato.numero}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    listaContratos.innerHTML = html;
}

// Función para abrir el modal de contrato en modo creación
function nuevoContrato(proveedorId) {
    // Resetear formulario
    document.getElementById('formContrato').reset();
    document.getElementById('contratoId').value = '';
    document.getElementById('documentoPreview').innerHTML = '';
    
    // Establecer fechas predeterminadas
    const hoy = new Date();
    const unAnio = new Date();
    unAnio.setFullYear(hoy.getFullYear() + 1);
    
    document.getElementById('fechaInicio').valueAsDate = hoy;
    document.getElementById('fechaFin').valueAsDate = unAnio;
    
    // Cambiar título del modal
    document.getElementById('tituloModalContrato').textContent = 'Nuevo Contrato';
    
    // Guardar referencia al proveedor actual
    window.proveedorActual = proveedorId;
    
    // Abrir modal
    new bootstrap.Modal(document.getElementById('modalContrato')).show();
}

// Función para editar un contrato existente
function editarContrato(contratoId) {
    const proveedorId = obtenerParametroUrl('id');
    if (!proveedorId) return;
    
    const proveedor = obtenerProveedor(proveedorId);
    if (!proveedor || !proveedor.contratos) return;
    
    const contrato = proveedor.contratos.find(c => c.id === contratoId);
    if (!contrato) {
        mostrarNotificacion('No se encontró el contrato especificado', 'danger');
        return;
    }
    
    // Llenar formulario con datos del contrato
    document.getElementById('contratoId').value = contrato.id;
    document.getElementById('numeroContrato').value = contrato.numero || '';
    document.getElementById('fechaInicio').value = contrato.fechaInicio || '';
    document.getElementById('fechaFin').value = contrato.fechaFin || '';
    document.getElementById('montoContrato').value = contrato.monto || '';
    document.getElementById('observacionesContrato').value = contrato.observaciones || '';
    
    // Mostrar documento actual si existe
    if (contrato.documentoUrl) {
        document.getElementById('documentoPreview').innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-file-earmark-text"></i> 
                <a href="${contrato.documentoUrl}" target="_blank">Ver documento actual</a>
            </div>
        `;
    } else {
        document.getElementById('documentoPreview').innerHTML = '';
    }
    
    // Cambiar título del modal
    document.getElementById('tituloModalContrato').textContent = 'Editar Contrato';
    
    // Guardar referencia al proveedor actual
    window.proveedorActual = proveedorId;
    
    // Abrir modal
    new bootstrap.Modal(document.getElementById('modalContrato')).show();
}

// Función para guardar un contrato (nuevo o existente)
async function guardarContrato() {
    const proveedorId = window.proveedorActual;
    if (!proveedorId) {
        mostrarNotificacion('Error: No se pudo identificar el proveedor', 'danger');
        return;
    }
    
    const contratoId = document.getElementById('contratoId').value;
    const numero = document.getElementById('numeroContrato').value.trim();
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const monto = parseFloat(document.getElementById('montoContrato').value);
    const observaciones = document.getElementById('observacionesContrato').value.trim();
    
    // Validaciones básicas
    if (!numero || !fechaInicio || !fechaFin || isNaN(monto)) {
        mostrarNotificacion('Por favor complete todos los campos obligatorios', 'warning');
        return;
    }
    
    // Validar que fecha de fin sea posterior a fecha de inicio
    if (new Date(fechaFin) < new Date(fechaInicio)) {
        mostrarNotificacion('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
        return;
    }
    
    // Preparar datos del contrato
    const contrato = {
        id: contratoId || `cont_${Date.now()}`,
        numero,
        fechaInicio,
        fechaFin,
        monto,
        observaciones,
        fechaActualizacion: new Date().toISOString()
    };
    
    // Procesar el documento si se subió uno
    const inputDocumento = document.getElementById('documentoContrato');
    if (inputDocumento && inputDocumento.files.length > 0) {
        const archivo = inputDocumento.files[0];
        
        // Mostrar progreso
        mostrarNotificacion('Subiendo documento...', 'info');
        
        // Subir archivo usando el nuevo sistema
        if (window.githubFiles && window.githubStorage && window.githubStorage.configurado()) {
            try {
                const archivoData = await window.githubFiles.subir(archivo, proveedorId, 'contrato');
                if (archivoData) {
                    contrato.documentoData = archivoData;
                    contrato.documentoUrl = archivoData.url || `data:${archivoData.tipo};base64,${archivoData.base64}`;
                }
            } catch (error) {
                console.error('Error al subir a GitHub:', error);
                // Fallback: sistema local
                contrato.documentoUrl = `../uploads/contratos/${archivo.name}`;
                contrato.documentoData = {
                    nombre: archivo.name,
                    tipo: archivo.type,
                    tamaño: archivo.size,
                    metodo: 'local'
                };
            }
        } else {
            // Fallback: usar el sistema local simulado
            contrato.documentoUrl = `../uploads/contratos/${archivo.name}`;
            contrato.documentoData = {
                nombre: archivo.name,
                tipo: archivo.type,
                tamaño: archivo.size,
                metodo: 'local'
            };
        }
    } else if (contratoId) {
        // Si es edición y no se subió documento nuevo, mantener el existente
        const proveedorActual = obtenerProveedor(proveedorId);
        const contratoActual = proveedorActual.contratos.find(c => c.id === contratoId);
        if (contratoActual && contratoActual.documentoUrl) {
            contrato.documentoUrl = contratoActual.documentoUrl;
            contrato.documentoData = contratoActual.documentoData;
        }
    }
    
    try {
        // Guardar contrato
        agregarContrato(proveedorId, contrato);
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide();
        
        // Mostrar notificación
        mostrarNotificacion(
            contratoId ? 'Contrato actualizado correctamente' : 'Contrato agregado correctamente', 
            'success'
        );
        
        // Recargar contratos
        cargarDetalleProveedor(proveedorId);
    } catch (error) {
        console.error('Error al guardar contrato:', error);
        mostrarNotificacion('Error al guardar el contrato: ' + error.message, 'danger');
    }
}

// Función para confirmar eliminación de contrato
function confirmarEliminarContrato(contratoId, numeroContrato) {
    const proveedorId = obtenerParametroUrl('id');
    if (!proveedorId) return;
    
    // Crear modal de confirmación si no existe
    if (!document.getElementById('modalConfirmacionContrato')) {
        const modalHTML = `
            <div class="modal fade" id="modalConfirmacionContrato" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">Confirmar eliminación</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <p>¿Está seguro que desea eliminar el contrato <strong id="numeroContratoEliminar"></strong>?</p>
                            <p class="text-danger">Esta acción no se puede deshacer.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="btnConfirmarEliminarContrato">Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Configurar modal
    document.getElementById('numeroContratoEliminar').textContent = numeroContrato;
    document.getElementById('btnConfirmarEliminarContrato').onclick = function() {
        eliminarContrato(proveedorId, contratoId);
        bootstrap.Modal.getInstance(document.getElementById('modalConfirmacionContrato')).hide();
        
        // Mostrar notificación
        mostrarNotificacion('Contrato eliminado correctamente', 'success');
        
        // Recargar contratos
        cargarDetalleProveedor(proveedorId);
    };
    
    // Mostrar modal
    new bootstrap.Modal(document.getElementById('modalConfirmacionContrato')).show();
}

// Función para guardar constancia
function guardarConstancia(proveedorId) {
    if (!proveedorId) {
        proveedorId = obtenerParametroUrl('id');
    }
    
    if (!proveedorId) {
        mostrarNotificacion('Error: No se pudo identificar el proveedor', 'danger');
        return;
    }
    
    const inputConstancia = document.getElementById('archivoConstancia');
    if (!inputConstancia || !inputConstancia.files.length) {
        mostrarNotificacion('Por favor seleccione un archivo', 'warning');
        return;
    }
    
    const file = inputConstancia.files[0];
    
    try {
        // Simular subida de archivo
        const constanciaUrl = `../uploads/constancias/${file.name}`;
        
        // Actualizar proveedor
        const proveedor = obtenerProveedor(proveedorId);
        if (!proveedor) throw new Error('Proveedor no encontrado');
        
        proveedor.tieneConstancia = true;
        proveedor.constanciaUrl = constanciaUrl;
        
        guardarProveedor(proveedor);
        
        // Cerrar modal
        const modalConstancia = bootstrap.Modal.getInstance(document.getElementById('modalConstancia'));
        if (modalConstancia) modalConstancia.hide();
        
        // Mostrar notificación
        mostrarNotificacion('Constancia guardada correctamente', 'success');
        
        // Actualizar vista
        cargarDetalleProveedor(proveedorId);
    } catch (error) {
        console.error('Error al guardar constancia:', error);
        mostrarNotificacion('Error al guardar la constancia: ' + error.message, 'danger');
    }
}