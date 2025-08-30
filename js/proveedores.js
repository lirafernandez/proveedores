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
        // Modales de Bootstrap
        this.proveedorModalEl = document.getElementById('proveedorModal');
        this.proveedorModal = new bootstrap.Modal(this.proveedorModalEl);
        this.confirmDeleteModalEl = document.getElementById('confirmDeleteModal');
        this.confirmDeleteModal = new bootstrap.Modal(this.confirmDeleteModalEl);

        // Botones principales y filtros
        this.searchProveedor = document.getElementById('searchProveedor');
        this.filterEstado = document.getElementById('filterEstado');
        this.pagSel = document.getElementById('selectProveedoresPorPagina');
        
        // Tabla y paginación
        this.proveedoresTableBody = document.getElementById('proveedoresTableBody');
        this.paginacionContainer = document.getElementById('paginacionProveedores');

        // Formulario y botones de modales
        this.btnGuardarProveedor = document.getElementById('btnGuardarProveedor');
        this.btnConfirmDelete = document.getElementById('btnConfirmDelete');
    }

    inicializarEventos() {
        // Eventos de la página principal
        if (this.searchProveedor) this.searchProveedor.addEventListener('input', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.filterEstado) this.filterEstado.addEventListener('change', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.pagSel) {
            this.pagSel.addEventListener('change', (e) => {
                this.proveedoresPorPagina = parseInt(e.target.value, 10) || 0;
                this.paginaActual = 1;
                this.renderizarTabla();
            });
        }

        // Eventos de Modales
        if (this.btnGuardarProveedor) this.btnGuardarProveedor.addEventListener('click', () => this.guardarProveedor());
        if (this.btnConfirmDelete) this.btnConfirmDelete.addEventListener('click', () => this.ejecutarEliminacion());

        // Limpiar formulario al cerrar modal de proveedor
        this.proveedorModalEl.addEventListener('hidden.bs.modal', () => {
            document.getElementById('proveedorForm').reset();
            this.proveedorSeleccionado = null;
        });

        // Suscripción a cambios en Supabase
        this.supabase.subscribeToProveedores(() => {
            this.cargarProveedores();
        });
    }

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
            this.proveedoresTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5">No se encontraron proveedores.</td></tr>`;
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

        const ul = document.createElement('ul');
        ul.className = 'pagination';

        for (let i = 1; i <= this.totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.paginaActual ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.paginaActual = i;
                this.renderizarTabla();
            });
            li.appendChild(a);
            ul.appendChild(li);
        }
        this.paginacionContainer.appendChild(ul);
    }

    crearFilaProveedor(proveedor) {
        const tr = document.createElement('tr');
        
        const estado = this.determinarEstado(proveedor.evaluaciones?.ALTA, proveedor.evaluaciones?.INTERNA);
        const badgeClass = this.getEstadoBadgeClass(estado);

        tr.innerHTML = `
            <td>${proveedor.nombre}</td>
            <td>${proveedor.rfc || 'N/A'}</td>
            <td>${proveedor.fecha_alta ? new Date(proveedor.fecha_alta).toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${badgeClass}">${estado}</span></td>
            <td class="text-end"></td>
        `;

        const accionesTd = tr.querySelector('td:last-child');
        accionesTd.appendChild(this._createActionButton('Evaluar', 'bi-clipboard-check', 'btn-info', () => this.irAEvaluacion(proveedor.id)));
        accionesTd.appendChild(this._createActionButton('Editar', 'bi-pencil', 'btn-warning', () => this.mostrarModalProveedor(proveedor)));
        accionesTd.appendChild(this._createActionButton('Eliminar', 'bi-trash', 'btn-danger', () => this.solicitarEliminacion(proveedor.id)));

        return tr;
    }

    _createActionButton(title, icon, btnClass, onClick) {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${btnClass} mx-1`;
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
        this.confirmDeleteModal.show();
    }

    async ejecutarEliminacion() {
        if (!this.proveedorAEliminar) return;
        try {
            await this.supabase.eliminarProveedor(this.proveedorAEliminar);
            showNotification('Proveedor eliminado con éxito.', 'success');
            this.proveedorAEliminar = null;
            this.confirmDeleteModal.hide();
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
        this.proveedorModal.show();
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
            this.proveedorModal.hide();
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
            puntajeFinal = evaluacionInterna.puntaje;
        } else if (altaExiste) {
            puntajeFinal = evaluacionAlta.puntaje;
        } else {
            return 'PENDIENTE';
        }

        if (puntajeFinal > 80) return 'APROBADO';
        if (puntajeFinal >= 60) return 'CONDICIONADO';
        return 'RECHAZADO';
    }

    getEstadoBadgeClass(estado) {
        switch (estado) {
            case 'APROBADO': return 'bg-success';
            case 'CONDICIONADO': return 'bg-warning text-dark';
            case 'RECHAZADO': return 'bg-danger';
            case 'PENDIENTE': return 'bg-secondary';
            default: return 'bg-light text-dark';
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
