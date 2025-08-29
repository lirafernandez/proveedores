/**
 * contratos.js - Logic for handling contracts.
 * This file contains functions for managing contracts for a provider.
 */

document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('click', function(event) {
        if (event.target.id === 'btnGuardarContrato') {
            handleSaveContract();
        }
    });
});


/**
 * Renders the list of contracts for a provider.
 * @param {Object} provider - The provider object containing contracts.
 * @param {HTMLElement} container - The HTML element to render the list into.
 */
function renderContractList(provider, container) {
    if (!container) return;

    const contracts = provider.contracts || [];

    if (contracts.length === 0) {
        container.innerHTML = `<div class="alert alert-info">No hay contratos registrados.</div>`;
        return;
    }

    contracts.sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin));

    const html = contracts.map(contract => createContractRowHTML(provider.id, contract)).join('');
    container.innerHTML = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Vigencia</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `;
}

/**
 * Creates the HTML for a single contract row.
 * @param {string} providerId - The ID of the provider.
 * @param {Object} contract - The contract object.
 * @returns {string} - HTML string for the table row.
 */
function createContractRowHTML(providerId, contract) {
    const status = getContractStatus(contract.fechaFin);

    return `
        <tr class="${status.rowClass}">
            <td>${contract.numero}</td>
            <td>
                <div>Del: ${formatearFecha(contract.fechaInicio)}</div>
                <div>Al: ${formatearFecha(contract.fechaFin)}</div>
            </td>
            <td>${formatearMoneda(contract.monto)}</td>
            <td><span class="badge ${status.className}">${status.text}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning" onclick="openEditContractModal('${providerId}', '${contract.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-danger" onclick="confirmDeleteContract('${providerId}', '${contract.id}', '${contract.numero}')"><i class="bi bi-trash"></i></button>
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
    if (!endDate) return { text: 'Sin fecha', className: 'bg-secondary', rowClass: '' };
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
    const modalElement = document.getElementById('modalContrato');
    if (!modalElement) {
        console.error('Contract modal not found in DOM.');
        return;
    }
    const form = document.getElementById('formContrato');
    form.reset();
    document.getElementById('contratoId').value = '';
    document.getElementById('tituloModalContrato').textContent = 'Nuevo Contrato';
    form.dataset.providerId = providerId; // Store providerId
    new bootstrap.Modal(modalElement).show();
}

/**
 * Opens the contract modal for editing an existing contract.
 * @param {string} providerId - The ID of the provider.
 * @param {string} contractId - The ID of the contract to edit.
 */
function openEditContractModal(providerId, contractId) {
    const provider = obtenerProveedor(providerId);
    if (!provider || !provider.contracts) {
        showNotification('Proveedor o contratos no encontrados', 'danger');
        return;
    }
    const contract = provider.contracts.find(c => c.id === contractId);

    if (contract) {
        const form = document.getElementById('formContrato');
        form.reset();
        document.getElementById('contratoId').value = contract.id;
        document.getElementById('numeroContrato').value = contract.numero;
        document.getElementById('fechaInicio').value = contract.fechaInicio;
        document.getElementById('fechaFin').value = contract.fechaFin;
        document.getElementById('montoContrato').value = contract.monto;
        document.getElementById('tituloModalContrato').textContent = 'Editar Contrato';
        form.dataset.providerId = providerId;
        new bootstrap.Modal(document.getElementById('modalContrato')).show();
    } else {
        showNotification('Contrato no encontrado', 'danger');
    }
}

/**
 * Saves a contract (new or existing) to localStorage.
 */
function handleSaveContract() {
    const form = document.getElementById('formContrato');
    const providerId = form.dataset.providerId;
    const contractId = document.getElementById('contratoId').value;

    const contractData = {
        id: contractId || null,
        numero: document.getElementById('numeroContrato').value.trim(),
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value,
        monto: parseFloat(document.getElementById('montoContrato').value)
    };

    if (!contractData.numero || !contractData.fechaInicio || !contractData.fechaFin || isNaN(contractData.monto)) {
        showNotification('Por favor, complete todos los campos obligatorios.', 'warning');
        return;
    }

    agregarContrato(providerId, contractData);

    bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide();
    showNotification('Contrato guardado con éxito', 'success');

    viewProviderDetails(providerId);
}

/**
 * Confirms and handles the deletion of a contract.
 * @param {string} providerId - The ID of the provider.
 * @param {string} contractId - The ID of the contract to delete.
 * @param {string} contractNumber - The number/name of the contract for the confirmation message.
 */
function confirmDeleteContract(providerId, contractId, contractNumber) {
    const confirmation = confirm(`¿Está seguro que desea eliminar el contrato "${contractNumber}"?`);
    if (confirmation) {
        eliminarContrato(providerId, contractId);
        showNotification('Contrato eliminado con éxito', 'success');
        viewProviderDetails(providerId); // Refresh the view
    }
}
