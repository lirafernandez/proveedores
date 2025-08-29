/**
 * contratos.js - Logic for handling contracts.
 * This file contains functions for managing contracts for a provider.
 * It's designed to be used by the main application logic when displaying provider details.
 */

// --- Contract Management Functions ---

/**
 * Fetches all data for a single provider, including contracts.
 * @param {string} providerId - The ID of the provider.
 * @returns {Promise<Object|null>} - An object with provider and contracts data, or null.
 */
async function getProviderDetails(providerId) {
    const provider = await getProvider(providerId); // from supabase.js
    if (!provider) {
        console.error("Provider not found");
        return null;
    }

    const contracts = await getContracts(providerId); // from supabase.js

    return { provider, contracts };
}

/**
 * Renders the list of contracts for a provider.
 * @param {Array} contracts - The list of contracts to render.
 * @param {HTMLElement} container - The HTML element to render the list into.
 */
function renderContractList(contracts, container) {
    if (!container) return;

    if (!contracts || contracts.length === 0) {
        container.innerHTML = `<div class="alert alert-info">No hay contratos registrados.</div>`;
        return;
    }

    // Sort contracts by end date
    contracts.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

    const html = contracts.map(contract => createContractRowHTML(contract)).join('');
    container.innerHTML = `
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
            <tbody>${html}</tbody>
        </table>
    `;
}

/**
 * Creates the HTML for a single contract row.
 * @param {Object} contract - The contract object.
 * @returns {string} - HTML string for the table row.
 */
function createContractRowHTML(contract) {
    const status = getContractStatus(contract.end_date);

    return `
        <tr class="${status.rowClass}">
            <td>${contract.number}</td>
            <td>
                <div>Del: ${formatearFecha(contract.start_date)}</div>
                <div>Al: ${formatearFecha(contract.end_date)}</div>
            </td>
            <td>${formatearMoneda(contract.amount)}</td>
            <td><span class="badge ${status.className}">${status.text}</span></td>
            <td>
                ${contract.document_url ?
                    `<a href="${contract.document_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-text"></i> Ver</a>` :
                    '<span class="badge bg-secondary">Sin documento</span>'}
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning" onclick="openEditContractModal('${contract.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-danger" onclick="confirmDeleteContract('${contract.id}', '${contract.number}')"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Determines the status of a contract based on its end date.
 * @param {string} endDate - The end date of the contract in ISO format.
 * @returns {{text: string, className: string, rowClass: string}}
 */
function getContractStatus(endDate) {
    const today = new Date();
    const contractEndDate = new Date(endDate);
    const daysRemaining = calcularDiasRestantes(endDate);

    if (contractEndDate < today) {
        return { text: 'Vencido', className: 'bg-danger', rowClass: 'table-danger' };
    }
    if (daysRemaining <= 30) {
        return { text: `Por vencer (${daysRemaining} días)`, className: 'bg-warning text-dark', rowClass: 'table-warning' };
    }
    return { text: 'Vigente', className: 'bg-success', rowClass: '' };
}


// --- Modal and Form Handling ---

/**
 * Opens the contract modal for creating a new contract.
 * @param {string} providerId - The ID of the provider for the new contract.
 */
function openNewContractModal(providerId) {
    const form = document.getElementById('formContrato');
    form.reset();
    document.getElementById('contratoId').value = '';
    document.getElementById('documentoPreview').innerHTML = '';
    document.getElementById('tituloModalContrato').textContent = 'Nuevo Contrato';

    // Store providerId in a hidden input or data attribute for later use
    form.dataset.providerId = providerId;

    new bootstrap.Modal(document.getElementById('modalContrato')).show();
}

/**
 * Opens the contract modal for editing an existing contract.
 * @param {string} contractId - The ID of the contract to edit.
 */
async function openEditContractModal(contractId) {
    // This assumes contracts are already fetched and available, or fetches it
    // For simplicity, we'll need a way to get a single contract
    console.log(`Editing contract ${contractId}. Fetching data...`);
    // In a real scenario, you'd fetch the contract data and populate the form.
}

/**
 * Saves a contract (new or existing) to the database.
 */
async function handleSaveContract() {
    const form = document.getElementById('formContrato');
    const providerId = form.dataset.providerId;
    const contractId = document.getElementById('contratoId').value;

    const contractData = {
        provider_id: providerId,
        number: document.getElementById('numeroContrato').value.trim(),
        start_date: document.getElementById('fechaInicio').value,
        end_date: document.getElementById('fechaFin').value,
        amount: parseFloat(document.getElementById('montoContrato').value),
        observations: document.getElementById('observacionesContrato').value.trim(),
    };

    if (contractId) {
        contractData.id = contractId;
    }

    // File Upload Logic
    const fileInput = document.getElementById('documentoContrato');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const documentUrl = await uploadFile('contratos', file, providerId); // from supabase.js
        if (documentUrl) {
            contractData.document_url = documentUrl;
        } else {
            console.error("Failed to upload contract document.");
            // showNotification("Error al subir el documento.", "danger");
            return;
        }
    }

    const savedContract = await saveContract(contractData); // from supabase.js

    if (savedContract) {
        bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide();
        // showNotification('Contrato guardado con éxito', 'success');
        // Here, you would trigger a refresh of the contract list view
    } else {
        console.error("Failed to save contract.");
        // showNotification('Error al guardar el contrato', 'danger');
    }
}

/**
 * Confirms and handles the deletion of a contract.
 * @param {string} contractId - The ID of the contract to delete.
 * @param {string} contractNumber - The number/name of the contract for the confirmation message.
 */
function confirmDeleteContract(contractId, contractNumber) {
    // This would open a confirmation modal, similar to the provider deletion
    console.log(`Requesting confirmation to delete contract ${contractId} (${contractNumber})`);

    // On confirm:
    // const success = await deleteContract(contractId);
    // if (success) {
    //     showNotification('Contrato eliminado', 'success');
    //     // Refresh view
    // } else {
    //     showNotification('Error al eliminar contrato', 'danger');
    // }
}
