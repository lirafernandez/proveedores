/**
 * proveedores.js - Business logic for provider management.
 * This file handles the UI interactions and data manipulation for the providers page.
 * It uses async/await to interact with the Supabase backend.
 */

// --- State ---
let allProviders = []; // Cache for all providers to reduce DB calls

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', async function() {
    // Since this is a single-page app, we'll always set up the providers page on load.
    await setupProveedoresPage();
});

/**
 * Sets up the initial state of the providers page.
 */
async function setupProveedoresPage() {
    // This function now renders the main provider list view.
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
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

    showLoader();
    await loadAndRenderProviders();
    setupEventListeners();
}


/**
 * Fetches providers from Supabase, caches them, and renders them.
 */
async function loadAndRenderProviders() {
    // If we are not on the main list view, render it first.
    if (!document.getElementById('tablaProveedores')) {
        await setupProveedoresPage();
        return;
    }

    showLoader();
    allProviders = await getProviders(); // from supabase.js
    renderProviderTable(allProviders);
    // displayContractAlerts will be implemented later
}

/**
 * Renders an array of providers into the main table.
 * @param {Array} providers - The array of provider objects to render.
 */
function renderProviderTable(providers) {
    const tablaProveedores = document.getElementById('tablaProveedores');
    if (!tablaProveedores) {
        // If the table doesn't exist, it means we are in a different view.
        // We should render the main view first.
        setupProveedoresPage().then(() => renderProviderTable(providers));
        return;
    }

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
    // Use event delegation for dynamically added elements if necessary
    document.getElementById('filtroNombre')?.addEventListener('input', handleFilterChange);
    document.getElementById('filtroConstancia')?.addEventListener('change', handleFilterChange);
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', clearFilters);
    document.getElementById('btnNuevoProveedor')?.addEventListener('click', openNewProviderModal);
    document.getElementById('btnGuardarProveedor').addEventListener('click', handleSaveProvider);
}

/**
 * Creates the HTML for a single provider row in the table.
 * @param {Object} provider - The provider object.
 * @returns {string} - The HTML string for the table row.
 */
function createProviderRowHTML(provider) {
    // This is a placeholder for contract count.
    const numContracts = 0;
    const status = { text: 'Activo', className: 'bg-success' }; // Placeholder

    return `
        <tr>
            <td>${provider.name}</td>
            <td>${provider.address || '<span class="text-muted">No registrada</span>'}</td>
            <td>
                ${provider.has_tax_document ?
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
                    <button class="btn btn-danger" onclick="confirmDeleteProvider('${provider.id}', '${provider.name}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Handles changes in the filter inputs and re-renders the table.
 */
function handleFilterChange() {
    const nameFilter = document.getElementById('filtroNombre').value.toLowerCase();
    const constanciaFilter = document.getElementById('filtroConstancia').value;

    const filteredProviders = allProviders.filter(provider => {
        const nameMatch = provider.name.toLowerCase().includes(nameFilter);
        let constanciaMatch = true;
        if (constanciaFilter !== '') {
            constanciaMatch = provider.has_tax_document === (constanciaFilter === 'true');
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
async function openEditProviderModal(id) {
    const provider = await getProvider(id);
    if (!provider) {
        showNotification('Proveedor no encontrado', 'danger');
        return;
    }

    document.getElementById('idProveedor').value = provider.id;
    document.getElementById('nombreProveedor').value = provider.name || '';
    document.getElementById('direccionProveedor').value = provider.address || '';
    document.getElementById('tieneConstancia').checked = provider.has_tax_document || false;

    document.getElementById('tituloModalProveedor').textContent = 'Editar Proveedor';
    new bootstrap.Modal(document.getElementById('modalProveedor')).show();
}

/**
 * Handles the logic for saving a new or existing provider.
 */
async function handleSaveProvider() {
    const id = document.getElementById('idProveedor').value;
    const name = document.getElementById('nombreProveedor').value.trim();
    const address = document.getElementById('direccionProveedor').value.trim();
    const has_tax_document = document.getElementById('tieneConstancia').checked;

    if (!name) {
        showNotification('El nombre es obligatorio', 'warning');
        return;
    }

    const providerData = { name, address, has_tax_document };
    if (id) {
        providerData.id = id;
    }

    const savedProvider = await saveProvider(providerData);

    if (savedProvider) {
        bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
        showNotification('Proveedor guardado con éxito', 'success');
        await loadAndRenderProviders();
    } else {
        showNotification('Error al guardar el proveedor', 'danger');
    }
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
    btnConfirmar.onclick = async () => {
        const success = await deleteProvider(id);
        modal.hide();
        if (success) {
            showNotification('Proveedor eliminado con éxito', 'success');
            await loadAndRenderProviders();
        } else {
            showNotification('Error al eliminar el proveedor', 'danger');
        }
    };

    modal.show();
}

/**
 * Fetches and displays the details for a specific provider.
 * @param {string} id - The ID of the provider to view.
 */
async function viewProviderDetails(id) {
    showLoader();
    const details = await getProviderDetails(id); // from contratos.js

    if (details) {
        const { provider, contracts } = details;
        const viewHtml = getProviderDetailsViewHTML(provider, contracts); // from ui.js
        renderView(viewHtml); // from ui.js

        const contractContainer = document.getElementById('listaContratos');
        renderContractList(contracts, contractContainer); // from contratos.js
    } else {
        showNotification("No se pudieron cargar los detalles del proveedor.", "danger");
        // Optionally, render the main list again
        await loadAndRenderProviders();
    }
}
