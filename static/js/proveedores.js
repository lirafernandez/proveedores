/**
 * proveedores.js - Gestión de proveedores
 */

// Cargar datos cuando se inicia la página
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de listado de proveedores
    if (document.getElementById('tablaProveedores')) {
        inicializarDatos();
        cargarListaProveedores();
        mostrarAlertasContratos();
        
        // Configurar filtros
        const filtroNombre = document.getElementById('filtroNombre');
        const filtroConstancia = document.getElementById('filtroConstancia');
        const filtroContrato = document.getElementById('filtroContrato');
        
        if (filtroNombre) filtroNombre.addEventListener('input', filtrarProveedores);
        if (filtroConstancia) filtroConstancia.addEventListener('change', filtrarProveedores);
        if (filtroContrato) filtroContrato.addEventListener('change', filtrarProveedores);
        
        // Botón de limpiar filtros
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    }
});

// Función para cargar lista de proveedores
function cargarListaProveedores() {
    const tablaProveedores = document.getElementById('tablaProveedores');
    if (!tablaProveedores) return;
    
    const proveedores = obtenerProveedores();
    
    if (proveedores.length === 0) {
        tablaProveedores.innerHTML = '<tr><td colspan="6" class="text-center">No hay proveedores registrados</td></tr>';
        return;
    }
    
    tablaProveedores.innerHTML = '';
    
    proveedores.forEach(function(proveedor) {
        const tieneContratos = proveedor.contratos && proveedor.contratos.length > 0;
        const numContratos = tieneContratos ? proveedor.contratos.length : 0;
        
        // Determinar estado del proveedor
        let estado = 'Activo';
        let estadoClass = 'bg-success';
        
        if (tieneContratos) {
            // Verificar si tiene contratos vencidos
            const hoy = new Date();
            const contratoVencido = proveedor.contratos.some(c => new Date(c.fechaFin) < hoy);
            
            if (contratoVencido) {
                estado = 'Contrato vencido';
                estadoClass = 'bg-danger';
            } else {
                // Verificar si hay contratos por vencer en 30 días
                const treintaDias = new Date();
                treintaDias.setDate(treintaDias.getDate() + 30);
                
                const contratoPorVencer = proveedor.contratos.some(c => {
                    const fechaFin = new Date(c.fechaFin);
                    return fechaFin > hoy && fechaFin <= treintaDias;
                });
                
                if (contratoPorVencer) {
                    estado = 'Por vencer';
                    estadoClass = 'bg-warning text-dark';
                }
            }
        } else {
            estado = 'Sin contratos';
            estadoClass = 'bg-secondary';
        }
        
        tablaProveedores.innerHTML += `
            <tr>
                <td>${proveedor.nombre}</td>
                <td>${proveedor.direccion || '<span class="text-muted">No registrada</span>'}</td>
                <td>
                    ${proveedor.tieneConstancia ? 
                        '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Sí</span>' : 
                        '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> No</span>'}
                </td>
                <td>
                    ${numContratos > 0 ? 
                        `<a href="detalle-provedor.html?id=${proveedor.id}" class="badge bg-primary text-decoration-none">
                            <i class="bi bi-file-text"></i> ${numContratos} contrato(s)
                        </a>` : 
                        '<span class="badge bg-secondary"><i class="bi bi-dash-circle"></i> Sin contratos</span>'}
                </td>
                <td><span class="badge ${estadoClass}">${estado}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <a href="detalle-provedor.html?id=${proveedor.id}" class="btn btn-primary" title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </a>
                        ${tieneContratos || proveedor.tieneConstancia ? 
                            `<button class="btn btn-info" onclick="verDocumentosProveedor('${proveedor.id}')" title="Ver documentos">
                                <i class="bi bi-file-earmark-pdf"></i>
                            </button>` : ''}
                        <button class="btn btn-warning" onclick="editarProveedor('${proveedor.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="confirmarEliminarProveedor('${proveedor.id}', '${proveedor.nombre}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Función para filtrar proveedores
function filtrarProveedores() {
    const textoBusqueda = document.getElementById('filtroNombre').value.toLowerCase();
    const filtroConstancia = document.getElementById('filtroConstancia').value;
    const filtroContrato = document.getElementById('filtroContrato').value;
    
    let proveedores = obtenerProveedores();
    
    // Aplicar filtros
    proveedores = proveedores.filter(function(proveedor) {
        // Filtro por nombre
        if (textoBusqueda && !proveedor.nombre.toLowerCase().includes(textoBusqueda)) {
            return false;
        }
        
        // Filtro por constancia
        if (filtroConstancia !== '') {
            const tieneConstancia = filtroConstancia === "true";
            
            if (proveedor.tieneConstancia !== tieneConstancia) {
                return false;
            }
        }
        
        // Filtro por contrato
        if (filtroContrato !== '') {
            const tieneContratos = filtroContrato === "true";
            const proveedorTieneContratos = proveedor.contratos && proveedor.contratos.length > 0;
            
            if (proveedorTieneContratos !== tieneContratos) {
                return false;
            }
        }
        
        return true;
    });
    
    // Actualizar tabla con resultados filtrados
    const tablaProveedores = document.getElementById('tablaProveedores');
    
    if (proveedores.length === 0) {
        tablaProveedores.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron proveedores con los filtros seleccionados</td></tr>';
        return;
    }
    
    tablaProveedores.innerHTML = '';
    proveedores.forEach(function(proveedor) {
        const tieneContratos = proveedor.contratos && proveedor.contratos.length > 0;
        const numContratos = tieneContratos ? proveedor.contratos.length : 0;
        
        // Determinar estado del proveedor
        let estado = 'Activo';
        let estadoClass = 'bg-success';
        
        if (tieneContratos) {
            const hoy = new Date();
            const contratoVencido = proveedor.contratos.some(c => new Date(c.fechaFin) < hoy);
            
            if (contratoVencido) {
                estado = 'Contrato vencido';
                estadoClass = 'bg-danger';
            } else {
                const treintaDias = new Date();
                treintaDias.setDate(treintaDias.getDate() + 30);
                
                const contratoPorVencer = proveedor.contratos.some(c => {
                    const fechaFin = new Date(c.fechaFin);
                    return fechaFin > hoy && fechaFin <= treintaDias;
                });
                
                if (contratoPorVencer) {
                    estado = 'Por vencer';
                    estadoClass = 'bg-warning text-dark';
                }
            }
        } else {
            estado = 'Sin contratos';
            estadoClass = 'bg-secondary';
        }
        
        tablaProveedores.innerHTML += `
            <tr>
                <td>${proveedor.nombre}</td>
                <td>${proveedor.direccion || '<span class="text-muted">No registrada</span>'}</td>
                <td>
                    ${proveedor.tieneConstancia ? 
                        '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Sí</span>' : 
                        '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> No</span>'}
                </td>
                <td>
                    ${numContratos > 0 ? 
                        `<a href="detalle-provedor.html?id=${proveedor.id}" class="badge bg-primary text-decoration-none">
                            <i class="bi bi-file-text"></i> ${numContratos} contrato(s)
                        </a>` : 
                        '<span class="badge bg-secondary"><i class="bi bi-dash-circle"></i> Sin contratos</span>'}
                </td>
                <td><span class="badge ${estadoClass}">${estado}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <a href="detalle-provedor.html?id=${proveedor.id}" class="btn btn-primary" title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </a>
                        ${tieneContratos || proveedor.tieneConstancia ? 
                            `<button class="btn btn-info" onclick="verDocumentosProveedor('${proveedor.id}')" title="Ver documentos">
                                <i class="bi bi-file-earmark-pdf"></i>
                            </button>` : ''}
                        <button class="btn btn-warning" onclick="editarProveedor('${proveedor.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="confirmarEliminarProveedor('${proveedor.id}', '${proveedor.nombre}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Función para limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroNombre').value = '';
    document.getElementById('filtroConstancia').value = '';
    document.getElementById('filtroContrato').value = '';
    cargarListaProveedores();
}

// Función para mostrar alertas de contratos por vencer o vencidos
function mostrarAlertasContratos() {
    const alertasContainer = document.getElementById('alertasContainer');
    if (!alertasContainer) return;
    
    alertasContainer.innerHTML = '';
    
    const proveedores = obtenerProveedores();
    const hoy = new Date();
    const treintaDias = new Date();
    treintaDias.setDate(treintaDias.getDate() + 30);
    
    // Verificar si hay contratos vencidos o por vencer
    const contratosVencidos = [];
    const contratosPorVencer = [];
    
    proveedores.forEach(function(proveedor) {
        if (proveedor.contratos && proveedor.contratos.length > 0) {
            proveedor.contratos.forEach(function(contrato) {
                const fechaFin = new Date(contrato.fechaFin);
                
                if (fechaFin < hoy) {
                    contratosVencidos.push({
                        proveedor: proveedor.nombre,
                        proveedorId: proveedor.id,
                        contrato: contrato.numero,
                        fechaFin: fechaFin
                    });
                } else if (fechaFin <= treintaDias) {
                    const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
                    contratosPorVencer.push({
                        proveedor: proveedor.nombre,
                        proveedorId: proveedor.id,
                        contrato: contrato.numero,
                        fechaFin: fechaFin,
                        diasRestantes: diasRestantes
                    });
                }
            });
        }
    });
    
    // Mostrar alertas de contratos vencidos
    if (contratosVencidos.length > 0) {
        const alertaVencidos = document.createElement('div');
        alertaVencidos.className = 'alert alert-danger';
        alertaVencidos.innerHTML = `
            <h5><i class="bi bi-exclamation-triangle-fill"></i> Contratos Vencidos (${contratosVencidos.length})</h5>
            <ul class="mb-0">
                ${contratosVencidos.map(c => `
                    <li>
                        <a href="detalle-provedor.html?id=${c.proveedorId}" class="alert-link">
                            ${c.proveedor} - Contrato ${c.contrato}
                        </a>
                        <span class="text-muted">
                            (Venció el ${c.fechaFin.toLocaleDateString()})
                        </span>
                    </li>
                `).join('')}
            </ul>
        `;
        alertasContainer.appendChild(alertaVencidos);
    }
    
    // Mostrar alertas de contratos por vencer
    if (contratosPorVencer.length > 0) {
        const alertaPorVencer = document.createElement('div');
        alertaPorVencer.className = 'alert alert-warning';
        alertaPorVencer.innerHTML = `
            <h5><i class="bi bi-clock-fill"></i> Contratos por Vencer (${contratosPorVencer.length})</h5>
            <ul class="mb-0">
                ${contratosPorVencer.map(c => `
                    <li>
                        <a href="detalle-provedor.html?id=${c.proveedorId}" class="alert-link">
                            ${c.proveedor} - Contrato ${c.contrato}
                        </a>
                        <span class="text-muted">
                            (Vence en ${c.diasRestantes} día${c.diasRestantes !== 1 ? 's' : ''}: ${c.fechaFin.toLocaleDateString()})
                        </span>
                    </li>
                `).join('')}
            </ul>
        `;
        alertasContainer.appendChild(alertaPorVencer);
    }
}

// Función para editar proveedor
function editarProveedor(id) {
    const proveedor = obtenerProveedor(id);
    if (!proveedor) {
        mostrarNotificacion('Proveedor no encontrado', 'danger');
        return;
    }
    
    // Llenar el formulario
    document.getElementById('idProveedor').value = id;
    document.getElementById('nombreProveedor').value = proveedor.nombre || '';
    document.getElementById('direccionProveedor').value = proveedor.direccion || '';
    document.getElementById('tieneConstancia').checked = proveedor.tieneConstancia || false;
    
    // Mostrar/ocultar sección de constancia
    document.getElementById('seccionConstancia').style.display = 
        proveedor.tieneConstancia ? 'block' : 'none';
    
    // Mostrar constancia si existe
    if (proveedor.tieneConstancia && proveedor.constanciaUrl) {
        document.getElementById('constanciaPreview').innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-file-earmark-text"></i> 
                <a href="${proveedor.constanciaUrl}" target="_blank">Ver constancia actual</a>
            </div>
        `;
    } else {
        document.getElementById('constanciaPreview').innerHTML = '';
    }
    
    // Actualizar título del modal
    document.getElementById('tituloModalProveedor').textContent = 'Editar Proveedor';
    
    // Mostrar el modal
    new bootstrap.Modal(document.getElementById('modalProveedor')).show();
}

// Función para confirmar eliminación de proveedor
function confirmarEliminarProveedor(id, nombre) {
    document.getElementById('nombreProveedorEliminar').textContent = nombre;
    
    document.getElementById('btnConfirmarEliminar').onclick = function() {
        eliminarProveedor(id);
        bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();
    };
    
    new bootstrap.Modal(document.getElementById('modalConfirmacion')).show();
}

// Función para guardar proveedor
function guardarProveedor() {
    const id = document.getElementById('idProveedor').value;
    const nombre = document.getElementById('nombreProveedor').value.trim();
    const direccion = document.getElementById('direccionProveedor').value.trim();
    const tieneConstancia = document.getElementById('tieneConstancia').checked;
    
    // Validación básica
    if (!nombre) {
        mostrarNotificacion('El nombre del proveedor es obligatorio', 'warning');
        return;
    }
    
    // Preparar datos del proveedor
    const proveedor = {
        id: id || undefined,
        nombre,
        direccion,
        tieneConstancia
    };
    
    // Si es una edición, mantener datos existentes
    if (id) {
        const proveedorExistente = obtenerProveedor(id);
        if (proveedorExistente) {
            // Mantener constancia si existe
            if (proveedorExistente.tieneConstancia && proveedorExistente.constanciaUrl) {
                proveedor.constanciaUrl = proveedorExistente.constanciaUrl;
            }
            
            // Mantener contratos si existen
            if (proveedorExistente.contratos) {
                proveedor.contratos = proveedorExistente.contratos;
            }
            
            // Mantener fecha de registro
            proveedor.fechaRegistro = proveedorExistente.fechaRegistro;
        }
    } else {
        // Nueva fecha de registro para nuevo proveedor
        proveedor.fechaRegistro = new Date().toISOString();
    }
    
    // Procesar archivo de constancia si se subió uno
    const inputConstancia = document.getElementById('archivoConstancia');
    if (tieneConstancia && inputConstancia && inputConstancia.files.length > 0) {
        const file = inputConstancia.files[0];
        // Simular URL para el archivo (en producción, aquí se subiría al servidor)
        proveedor.constanciaUrl = `../uploads/constancias/${file.name}`;
    }
    
    try {
        // Guardar proveedor en el almacenamiento usando la función del storage.js
        const proveedorId = agregarProveedor(proveedor);
        
        // Cerrar el modal
        bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
        
        // Mostrar notificación
        mostrarNotificacion(
            id ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente',
            'success'
        );
        
        // Recargar la lista y las alertas
        cargarListaProveedores();
        mostrarAlertasContratos();
    } catch (error) {
        console.error('Error al guardar proveedor:', error);
        mostrarNotificacion('Error al guardar el proveedor', 'danger');
    }
}

// Función para ver documentos de un proveedor específico
function verDocumentosProveedor(proveedorId) {
    // Redirigir a ver-documentos.html con filtro del proveedor
    window.location.href = `ver-documentos.html?proveedor=${proveedorId}`;
}
