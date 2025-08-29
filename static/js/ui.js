/**
 * ui.js - UI components and utilities for the application.
 */

// --- Core UI Functions ---

/**
 * Renders a given HTML content into the main application container.
 * @param {string} html - The HTML string to render.
 */
function renderView(html) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = html;
    } else {
        console.error('Main content container #main-content not found.');
    }
}

/**
 * Shows a loading spinner in the main content area.
 */
function showLoader() {
    const loaderHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 50vh;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        </div>
    `;
    renderView(loaderHTML);
}

/**
 * Muestra una notificación toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación: success, danger, warning, info
 */
function showNotification(mensaje, tipo = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error('Toast container not found.');
        return;
    }

    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${tipo} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');

    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${mensaje}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toastElement);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

// --- View Templates ---

function getProviderListViewHTML() {
    return `
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h1 class="h4 mb-0">Gestión de Proveedores</h1>
                        <button class="btn btn-light" id="btnNuevoProveedor">
                            <i class="bi bi-plus-circle"></i> Nuevo Proveedor
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <label for="filtroNombre" class="form-label">Buscar por nombre:</label>
                                <input type="text" class="form-control" id="filtroNombre" placeholder="Nombre del proveedor">
                            </div>
                            <div class="col-md-3">
                                <label for="filtroConstancia" class="form-label">Constancia:</label>
                                <select class="form-select" id="filtroConstancia">
                                    <option value="">Todos</option>
                                    <option value="true">Con constancia</option>
                                    <option value="false">Sin constancia</option>
                                </select>
                            </div>
                            <div class="col-md-2 d-flex align-items-end">
                                <button class="btn btn-outline-secondary" id="btnLimpiarFiltros">
                                    <i class="bi bi-x-circle"></i> Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="alertasContainer"></div>
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h2 class="h5 mb-0">Lista de Proveedores</h2>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Dirección</th>
                                        <th>Constancia</th>
                                        <th>Contratos</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="tablaProveedores">
                                    <!-- Provider rows will be inserted here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


/**
 * Generates the HTML for the provider details view.
 * @param {Object} provider - The provider data.
 * @returns {string} - The HTML string for the view.
 */
function getProviderDetailsViewHTML(provider) {
    return `
        <div class="mb-3">
            <a href="#" onclick="event.preventDefault(); setupProveedoresPage();" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Volver al listado
            </a>
        </div>

        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h1 class="h4 mb-0">${provider.nombre}</h1>
            </div>
            <div class="card-body">
                <p><strong>Dirección:</strong> ${provider.direccion || 'No registrada'}</p>
                <p><strong>Constancia:</strong> ${provider.tieneConstancia ? 'Sí' : 'No'}</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <h2 class="h5 mb-0">Contratos</h2>
                <button class="btn btn-light btn-sm" onclick="openNewContractModal('${provider.id}')">
                    <i class="bi bi-plus-circle"></i> Nuevo Contrato
                </button>
            </div>
            <div class="card-body" id="listaContratos">
                <!-- Contracts will be rendered here -->
            </div>
        </div>
    `;
}


// --- Formatting and Utility Functions ---

function formatearFecha(fecha) {
    if (!fecha) return 'No disponible';
    return new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatearMoneda(valor) {
    if (valor === null || valor === undefined) return 'No disponible';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function calcularDiasRestantes(fechaFin) {
    const hoy = new Date();
    const fecha = new Date(fechaFin);
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    const diferencia = fecha.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}
