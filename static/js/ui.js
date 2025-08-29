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

/**
 * Generates the HTML for the provider details view.
 * @param {Object} provider - The provider data.
 * @param {Array} contracts - The list of contracts for the provider.
 * @returns {string} - The HTML string for the view.
 */
function getProviderDetailsViewHTML(provider, contracts) {
    return `
        <div class="mb-3">
            <a href="#" onclick="loadAndRenderProviders()" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Volver al listado
            </a>
        </div>

        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h1 class="h4 mb-0">${provider.name}</h1>
            </div>
            <div class="card-body">
                <p><strong>Dirección:</strong> ${provider.address || 'No registrada'}</p>
                <p><strong>Constancia:</strong> ${provider.has_tax_document ? 'Sí' : 'No'}</p>
                <!-- Add more details as needed -->
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
                <!-- Contracts will be rendered here by renderContractList -->
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

function inicializarTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}
