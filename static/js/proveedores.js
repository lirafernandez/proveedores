/**
 * proveedores.js - Business logic for provider management.
 * This file handles the UI interactions and data manipulation for the providers page,
 * using localStorage as the data source.
 */

// --- State ---
let allProviders = [];

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', function() {
    inicializarDatos(); // Ensure localStorage is initialized
    setupProveedoresPage();
});

/**
 * Sets up the initial state of the providers page.
 */
function setupProveedoresPage() {
    renderView(getProviderListViewHTML());
    loadAndRenderProviders();
    setupEventListeners();
}

/**
 * Fetches providers from localStorage, caches them, and renders them.
 */
function loadAndRenderProviders() {
    allProviders = obtenerProveedores(); // from storage.js
    renderProviderTable(allProviders);
    displayContractAlerts();
}

/**
 * Renders an array of providers into the main table.
 * @param {Array} providers - The array of provider objects to render.
 */
function renderProviderTable(providers) {
    const tablaProveedores = document.getElementById('tablaProveedores');
    if (!tablaProveedores) return;

    if (!providers || providers.length === 0) {
        tablaProveedores.innerHTML = '<tr><td colspan="6" class="text-center">No hay proveedores registrados.</td></tr>';
        return;
    }

    const html = providers.map(provider => createProviderRowHTML(provider)).join('');
    tablaProveedores.innerHTML = html;
}

/**
 * Sets up all necessary event listeners for the page.
 */
function setupEventListeners() {
    // Using event delegation on a parent element for dynamically loaded content
    const mainContent = document.getElementById('main-content');

    mainContent.addEventListener('input', function(event) {
        if (event.target.id === 'filtroNombre') {
            handleFilterChange();
        }
    });

    mainContent.addEventListener('change', function(event) {
        if (event.target.id === 'filtroConstancia') {
            handleFilterChange();
        }
    });

    mainContent.addEventListener('click', function(event) {
        if (event.target.id === 'btnLimpiarFiltros') {
            clearFilters();
        }
        if (event.target.id === 'btnNuevoProveedor') {
            openNewProviderModal();
        }
    });

    // Modals are outside main-content, so they need their own listeners
    document.getElementById('btnGuardarProveedor').addEventListener('click', handleSaveProvider);
}

/**
 * Creates the HTML for a single provider row in the table.
 * @param {Object} provider - The provider object.
 * @returns {string} - The HTML string for the table row.
 */
function createProviderRowHTML(provider) {
    const contracts = provider.contracts || [];
    const numContracts = contracts.length;
    const status = getProviderStatus(provider);

    return `
        <tr>
            <td>${provider.nombre}</td>
            <td>${provider.direccion || '<span class="text-muted">No registrada</span>'}</td>
            <td>
                ${provider.tieneConstancia ?
                    '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Sí</span>' :
                    '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> No</span>'}
            </td>
            <td>
                <a href="#" onclick="viewProviderDetails('${provider.id}')" class="badge bg-primary text-decoration-none">
                    <i class="bi bi-file-text"></i> ${numContracts} contrato(s)
                </a>
            </td>
            <td><span class="badge ${status.className}">${status.text}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-primary" onclick="viewProviderDetails('${provider.id}')" title="Ver detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-warning" onclick="openEditProviderModal('${provider.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger" onclick="confirmDeleteProvider('${provider.id}', '${provider.nombre}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Determines the status of a provider based on their contracts.
 * @param {Object} provider - The provider object.
 * @returns {{text: string, className: string}} - The status text and Bootstrap class.
 */
function getProviderStatus(provider) {
    if (!provider.contracts || provider.contracts.length === 0) {
        return { text: 'Sin Contratos', className: 'bg-secondary' };
    }

    const hoy = new Date();
    const hasExpired = provider.contracts.some(c => new Date(c.fechaFin) < hoy);
    if (hasExpired) {
        return { text: 'Contrato Vencido', className: 'bg-danger' };
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(hoy.getDate() + 30);
    const hasExpiring = provider.contracts.some(c => {
        const endDate = new Date(c.fechaFin);
        return endDate >= hoy && endDate <= thirtyDaysFromNow;
    });
    if (hasExpiring) {
        return { text: 'Contrato por Vencer', className: 'bg-warning text-dark' };
    }

    return { text: 'Activo', className: 'bg-success' };
}


/**
 * Handles changes in the filter inputs and re-renders the table.
 */
function handleFilterChange() {
    const nameFilter = document.getElementById('filtroNombre').value.toLowerCase();
    const constanciaFilter = document.getElementById('filtroConstancia').value;

    const filteredProviders = allProviders.filter(provider => {
        const nameMatch = provider.nombre.toLowerCase().includes(nameFilter);

        let constanciaMatch = true;
        if (constanciaFilter !== '') {
            constanciaMatch = provider.tieneConstancia === (constanciaFilter === 'true');
        }

        return nameMatch && constanciaMatch;
    });

    renderProviderTable(filteredProviders);
}

/**
 * Clears all filter inputs and re-renders the original list.
 */
function clearFilters() {
    document.getElementById('filtroNombre').value = '';
    document.getElementById('filtroConstancia').value = '';
    renderProviderTable(allProviders);
}

/**
 * Displays alerts for contracts that are expiring soon or have expired.
 */
function displayContractAlerts() {
    const alertasContainer = document.getElementById('alertasContainer');
    if (!alertasContainer) return;
    alertasContainer.innerHTML = '';
}

/**
 * Opens the modal to create a new provider.
 */
function openNewProviderModal() {
    document.getElementById('formProveedor').reset();
    document.getElementById('idProveedor').value = '';
    document.getElementById('tituloModalProveedor').textContent = 'Nuevo Proveedor';
    new bootstrap.Modal(document.getElementById('modalProveedor')).show();
}

/**
 * Opens the modal to edit an existing provider.
 * @param {string} id - The ID of the provider to edit.
 */
function openEditProviderModal(id) {
    const provider = obtenerProveedor(id);
    if (!provider) {
        showNotification('Proveedor no encontrado', 'danger');
        return;
    }

    document.getElementById('idProveedor').value = provider.id;
    document.getElementById('nombreProveedor').value = provider.nombre || '';
    document.getElementById('direccionProveedor').value = provider.direccion || '';
    document.getElementById('tieneConstancia').checked = provider.tieneConstancia || false;

    document.getElementById('tituloModalProveedor').textContent = 'Editar Proveedor';
    new bootstrap.Modal(document.getElementById('modalProveedor')).show();
}

/**
 * Handles the logic for saving a new or existing provider.
 */
function handleSaveProvider() {
    const id = document.getElementById('idProveedor').value;
    const nombre = document.getElementById('nombreProveedor').value.trim();
    const direccion = document.getElementById('direccionProveedor').value.trim();
    const tieneConstancia = document.getElementById('tieneConstancia').checked;

    if (!nombre) {
        showNotification('El nombre es obligatorio', 'warning');
        return;
    }

    const providerData = { id: id || null, nombre, direccion, tieneConstancia };

    guardarProveedor(providerData);

    bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
    showNotification('Proveedor guardado con éxito', 'success');
    loadAndRenderProviders();
}

/**
 * Shows a confirmation dialog before deleting a provider.
 * @param {string} id - The ID of the provider to delete.
 * @param {string} name - The name of the provider.
 */
function confirmDeleteProvider(id, name) {
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    document.getElementById('nombreProveedorEliminar').textContent = name;

    const btnConfirmar = document.getElementById('btnConfirmarEliminar');
    btnConfirmar.onclick = () => {
        eliminarProveedor(id);
        modal.hide();
        showNotification('Proveedor eliminado con éxito', 'success');
        loadAndRenderProviders();
    };

    modal.show();
}

/**
 * Displays the details for a specific provider.
 * @param {string} id - The ID of the provider to view.
 */
function viewProviderDetails(id) {
    const provider = obtenerProveedor(id);

    if (provider) {
        const contracts = provider.contracts || [];
        const viewHtml = getProviderDetailsViewHTML(provider);
        renderView(viewHtml);

        const contractContainer = document.getElementById('listaContratos');
        renderContractList(provider, contractContainer);
    } else {
        showNotification("No se pudieron cargar los detalles del proveedor.", "danger");
        setupProveedoresPage();
    }
}
