import { supabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

class ProveedorManager {
    constructor() {
        this.supabase = supabaseService;
        this.proveedorSeleccionado = null;
        this.proveedorAEliminar = null;
        this.paginaActual = 1;
        this.proveedoresPorPagina = 25;
        this.totalPaginas = 1;
        this.todosLosProveedores = [];

        this.cacheDOM();
        this.inicializarEventos();
        this.cargarProveedores();
    }

    cacheDOM() {
        // Botones principales y filtros
        this.btnNuevoProveedor = document.getElementById('btnNuevoProveedor');
        this.searchProveedor = document.getElementById('searchProveedor');
        this.filterEstado = document.getElementById('filterEstado');
        this.pagSel = document.getElementById('selectProveedoresPorPagina');
        
        // Tabla y paginación
        this.proveedoresTableBody = document.getElementById('proveedoresTableBody');
        this.paginacionContainer = document.getElementById('paginacionProveedores');

        // Modal de Proveedor
        this.proveedorModal = document.getElementById('proveedorModal');
        this.btnGuardarProveedor = document.getElementById('btnGuardarProveedor');
        this.closeProveedorModal = document.getElementById('closeProveedorModal');
        this.cancelProveedorModal = document.getElementById('cancelProveedorModal');
        
        // Modal de Confirmación de Eliminación
        this.confirmDeleteModal = document.getElementById('confirmDeleteModal');
        this.btnConfirmDelete = document.getElementById('btnConfirmDelete');
        this.btnCancelDelete = document.getElementById('btnCancelDelete');
    }

    inicializarEventos() {
        // Eventos de la página principal
        if (this.btnNuevoProveedor) this.btnNuevoProveedor.addEventListener('click', () => this.mostrarModalProveedor());
        if (this.searchProveedor) this.searchProveedor.addEventListener('input', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.filterEstado) this.filterEstado.addEventListener('change', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.pagSel) {
            this.pagSel.addEventListener('change', (e) => {
                this.proveedoresPorPagina = parseInt(e.target.value, 10) || 0;
                this.paginaActual = 1;
                this.renderizarTabla();
            });
        }

        // Eventos del Modal de Proveedor
        if (this.btnGuardarProveedor) this.btnGuardarProveedor.addEventListener('click', () => this.guardarProveedor());
        if (this.closeProveedorModal) this.closeProveedorModal.addEventListener('click', () => this.cerrarModalProveedor());
        if (this.cancelProveedorModal) this.cancelProveedorModal.addEventListener('click', () => this.cerrarModalProveedor());

        // Eventos del Modal de Eliminación
        if (this.btnConfirmDelete) this.btnConfirmDelete.addEventListener('click', () => this.ejecutarEliminacion());
        if (this.btnCancelDelete) this.btnCancelDelete.addEventListener('click', () => this.cerrarModalEliminacion());

        // Suscripción a cambios en Supabase
        this.supabase.subscribeToProveedores(() => {
            this.cargarProveedores();
        });
    }

    // --- Métodos de Control de Modales ---
    abrirModalProveedor() {
        this.proveedorModal.classList.remove('hidden');
    }

    cerrarModalProveedor() {
        this.proveedorModal.classList.add('hidden');
    }

    abrirModalEliminacion() {
        this.confirmDeleteModal.classList.remove('hidden');
    }

    cerrarModalEliminacion() {
        this.confirmDeleteModal.classList.add('hidden');
    }

    // --- Métodos de Lógica de Datos ---
    async cargarProveedores() {
        try {
            const { data } = await this.supabase.obtenerProveedores({ porPagina: 0 });
            this.todosLosProveedores = data;
            this.renderizarTabla();
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            showNotification('Error al cargar los proveedores', 'error');
        }
    }

    renderizarTabla() {
        if (!this.proveedoresTableBody) return;

        const busqueda = this.searchProveedor.value.toLowerCase();
        const estadoFiltro = this.filterEstado.value;

        let proveedoresFiltrados = this.todosLosProveedores.filter(p => {
            const busquedaCoincide = p.nombre.toLowerCase().includes(busqueda) || (p.rfc && p.rfc.toLowerCase().includes(busqueda));
            if (!estadoFiltro) return busquedaCoincide;
            const estadoProveedor = this.determinarEstado(p.evaluaciones?.ALTA, p.evaluaciones?.INTERNA);
            return busquedaCoincide && estadoProveedor.toLowerCase() === estadoFiltro;
        });

        const total = proveedoresFiltrados.length;
        this.totalPaginas = this.proveedoresPorPagina > 0 ? Math.ceil(total / this.proveedoresPorPagina) : 1;
        
        const proveedoresPaginados = this.proveedoresPorPagina > 0
            ? proveedoresFiltrados.slice((this.paginaActual - 1) * this.proveedoresPorPagina, this.paginaActual * this.proveedoresPorPagina)
            : proveedoresFiltrados;

        this.proveedoresTableBody.innerHTML = '';
        if (proveedoresPaginados.length === 0) {
            this.proveedoresTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-10">No se encontraron proveedores.</td></tr>`;
        } else {
            proveedoresPaginados.forEach(proveedor => {
                const row = this.crearFilaProveedor(proveedor);
                this.proveedoresTableBody.appendChild(row);
            });
        }

        this.renderizarPaginacion(total);
    }
    
    renderizarPaginacion() {
        this.paginacionContainer.innerHTML = '';
        if (this.totalPaginas <= 1) return;

        for (let i = 1; i <= this.totalPaginas; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `px-3 py-1 rounded-md text-sm font-medium mx-1 ${i === this.paginaActual ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`;
            btn.addEventListener('click', () => {
                this.paginaActual = i;
                this.renderizarTabla();
            });
            this.paginacionContainer.appendChild(btn);
        }
    }

    crearFilaProveedor(proveedor) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        
        const estado = this.determinarEstado(proveedor.evaluaciones?.ALTA, proveedor.evaluaciones?.INTERNA);
        const badgeClass = this.getEstadoBadgeClass(estado);

        tr.innerHTML = `
            <td class="p-4">${proveedor.nombre}</td>
            <td class="p-4">${proveedor.rfc || 'N/A'}</td>
            <td class="p-4">${proveedor.fecha_alta ? new Date(proveedor.fecha_alta).toLocaleDateString() : 'N/A'}</td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${estado}</span></td>
            <td class="p-4 text-right"></td>
        `;

        const accionesTd = tr.querySelector('td:last-child');
        accionesTd.appendChild(this._createActionButton('Evaluar', 'bi-clipboard-check', 'bg-blue-500 hover:bg-blue-600', () => this.irAEvaluacion(proveedor.id)));
        accionesTd.appendChild(this._createActionButton('Editar', 'bi-pencil', 'bg-yellow-500 hover:bg-yellow-600', () => this.mostrarModalProveedor(proveedor)));
        accionesTd.appendChild(this._createActionButton('Eliminar', 'bi-trash', 'bg-red-500 hover:bg-red-600', () => this.solicitarEliminacion(proveedor.id)));

        return tr;
    }

    _createActionButton(title, icon, btnClass, onClick) {
        const button = document.createElement('button');
        button.className = `text-white p-2 rounded-md shadow-sm hover:shadow-lg transition-all duration-200 mx-1 ${btnClass}`;
        button.title = title;
        button.innerHTML = `<i class="bi ${icon}"></i>`;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return button;
    }
    
    solicitarEliminacion(id) {
        this.proveedorAEliminar = id;
        this.abrirModalEliminacion();
    }

    async ejecutarEliminacion() {
        if (!this.proveedorAEliminar) return;
        try {
            await this.supabase.eliminarProveedor(this.proveedorAEliminar);
            showNotification('Proveedor eliminado con éxito.', 'success');
            this.proveedorAEliminar = null;
            this.cerrarModalEliminacion();
            this.cargarProveedores();
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            showNotification('Error al eliminar el proveedor.', 'error');
        }
    }

    mostrarModalProveedor(proveedor = null) {
        this.proveedorSeleccionado = proveedor;
        const form = document.getElementById('proveedorForm');
        form.reset();
        document.getElementById('proveedorModalTitle').textContent = proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor';

        if (proveedor) {
            // Mapeo de claves de proveedor a nombres de formulario
            const keyMapping = {
                'business_unit': 'businessUnit',
                'supplier_number': 'supplierNumber',
                'nombre': 'nombre',
                'alternate_name': 'alternateName',
                'rfc': 'rfc',
                'city': 'city',
                'state': 'state',
                'county': 'county',
                'postal_code': 'postalCode',
                'payment_terms': 'paymentTerms',
                'currency': 'currency',
                'remittance_email': 'remittanceEmail',
                'primary_flag': 'primaryFlag',
                'purchasing_email': 'purchasingEmail'
            };
            
            Object.keys(proveedor).forEach(key => {
                const formElementName = Object.keys(keyMapping).find(k => keyMapping[k] === key) || key;
                 const formElement = form.elements[formElementName] || form.elements[key];
                if (formElement) {
                    formElement.value = proveedor[key] || '';
                }
            });
        }
        this.abrirModalProveedor();
    }

    async guardarProveedor() {
        const form = document.getElementById('proveedorForm');
        const formData = new FormData(form);
        const proveedorData = Object.fromEntries(formData.entries());

        if (this.proveedorSeleccionado && this.proveedorSeleccionado.id) {
            proveedorData.id = this.proveedorSeleccionado.id;
        }

        try {
            await this.supabase.guardarProveedor(proveedorData);
            showNotification('Proveedor guardado con éxito', 'success');
            this.cerrarModalProveedor();
        } catch (error) {
            console.error('Error al guardar proveedor:', error);
            showNotification('Error al guardar el proveedor.', 'error');
        }
    }

    determinarEstado(evaluacionAlta, evaluacionInterna) {
        let puntajeFinal;

        const altaExiste = evaluacionAlta && evaluacionAlta.puntaje !== undefined;
        const internaExiste = evaluacionInterna && evaluacionInterna.puntaje !== undefined;

        if (internaExiste) {
            // La evaluación interna siempre tiene precedencia para reflejar el rendimiento actual
            puntajeFinal = evaluacionInterna.puntaje;
        } else if (altaExiste) {
            // Si no hay interna, se usa la de alta
            puntajeFinal = evaluacionAlta.puntaje;
        } else {
            // Sin ninguna evaluación, está pendiente
            return 'PENDIENTE';
        }

        if (puntajeFinal > 80) return 'APROBADO';
        if (puntajeFinal >= 60) return 'CONDICIONADO';
        // Si tiene una evaluación (alta o interna) y no llega a 60, es rechazado.
        return 'RECHAZADO';
    }

    getEstadoBadgeClass(estado) {
        switch (estado) {
            case 'APROBADO': return 'bg-green-100 text-green-800';
            case 'CONDICIONADO': return 'bg-yellow-100 text-yellow-800';
            case 'RECHAZADO': return 'bg-red-100 text-red-800';
            case 'PENDIENTE': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    irAEvaluacion(proveedorId) {
        window.location.href = `evaluaciones.html?proveedor=${proveedorId}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('proveedoresTableBody')) {
        new ProveedorManager();
    }
});
