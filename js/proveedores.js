import { SupabaseService } from './services/supabaseService.js';
import { CRITERIOS_EVALUACION } from './constants.js';
import { showNotification } from './ui/notifications.js';

class ProveedorManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.proveedorSeleccionado = null;
        this.proveedorAEliminar = null; // Para guardar el ID del proveedor a eliminar
        this.paginaActual = 1;
        this.proveedoresPorPagina = 25;
        this.totalPaginas = 1;
        this.todosLosProveedores = [];

        this.cacheDOM();
        this.inicializarEventos();
        this.cargarProveedores();
    }

    cacheDOM() {
        this.btnNuevoProveedor = document.getElementById('btnNuevoProveedor');
        this.btnGuardarProveedor = document.getElementById('btnGuardarProveedor');
        this.searchProveedor = document.getElementById('searchProveedor');
        this.filterEstado = document.getElementById('filterEstado');
        this.pagSel = document.getElementById('selectProveedoresPorPagina');

        this.modalElement = document.getElementById('proveedorModal');
        this.modal = new bootstrap.Modal(this.modalElement);

        this.confirmDeleteModalElement = document.getElementById('confirmDeleteModal');
        this.confirmDeleteModal = new bootstrap.Modal(this.confirmDeleteModalElement);
        this.btnConfirmDelete = document.getElementById('btnConfirmDelete');

        this.proveedoresTableBody = document.getElementById('proveedoresTableBody');
        this.paginacionContainer = document.getElementById('paginacionProveedores');
    }

    inicializarEventos() {
        if (this.btnNuevoProveedor) this.btnNuevoProveedor.addEventListener('click', () => this.mostrarModalProveedor());
        if (this.btnGuardarProveedor) this.btnGuardarProveedor.addEventListener('click', () => this.guardarProveedor());
        if (this.searchProveedor) this.searchProveedor.addEventListener('input', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.filterEstado) this.filterEstado.addEventListener('change', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if (this.btnConfirmDelete) this.btnConfirmDelete.addEventListener('click', () => this.ejecutarEliminacion());

        if (this.pagSel) {
            this.pagSel.addEventListener('change', (e) => {
                this.proveedoresPorPagina = parseInt(e.target.value);
                this.paginaActual = 1;
                this.renderizarTabla();
            });
        }

        this.supabase.subscribeToProveedores(() => {
            this.cargarProveedores();
        });
    }

    async cargarProveedores() {
        try {
            const { data } = await this.supabase.obtenerProveedores({ porPagina: 0 }); // Obtener todos
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

            const estadoProveedor = this.determinarEstado(
                p.evaluaciones?.ALTA?.puntaje || 0,
                p.evaluaciones?.INTERNA?.puntaje || 0
            );
            return busquedaCoincide && estadoProveedor.toLowerCase() === estadoFiltro;
        });

        const total = proveedoresFiltrados.length;
        this.totalPaginas = this.proveedoresPorPagina > 0 ? Math.ceil(total / this.proveedoresPorPagina) : 1;
        const proveedoresPaginados = this.proveedoresPorPagina > 0
            ? proveedoresFiltrados.slice((this.paginaActual - 1) * this.proveedoresPorPagina, this.paginaActual * this.proveedoresPorPagina)
            : proveedoresFiltrados;

        this.proveedoresTableBody.innerHTML = '';
        if (proveedoresPaginados.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.className = 'text-center text-muted py-5';
            td.textContent = 'No se encontraron proveedores.';
            tr.appendChild(td);
            this.proveedoresTableBody.appendChild(tr);
        } else {
            proveedoresPaginados.forEach(proveedor => {
                const row = this.crearFilaProveedor(proveedor, proveedor.evaluaciones);
                this.proveedoresTableBody.appendChild(row);
            });
        }

        this.renderizarPaginacion(total);
    }

    renderizarPaginacion() {
        this.paginacionContainer.innerHTML = '';
        for (let i = 1; i <= this.totalPaginas; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `btn btn-sm ${i === this.paginaActual ? 'btn-primary' : 'btn-outline-primary'} me-1`;
            btn.addEventListener('click', () => {
                this.paginaActual = i;
                this.renderizarTabla();
            });
            this.paginacionContainer.appendChild(btn);
        }
    }

    crearFilaProveedor(proveedor, evaluaciones) {
        const tr = document.createElement('tr');
        const estado = this.determinarEstado(
            evaluaciones?.ALTA?.puntaje || 0,
            evaluaciones?.INTERNA?.puntaje || 0
        );

        tr.innerHTML = `
            <td>${proveedor.nombre}</td>
            <td>${proveedor.rfc || ''}</td>
            <td>${proveedor.fecha_alta ? new Date(proveedor.fecha_alta).toLocaleDateString() : ''}</td>
            <td><span class="badge ${this.getEstadoBadgeClass(estado)}">${estado}</span></td>
            <td class="text-end"></td>
        `;

        const accionesTd = tr.querySelector('td:last-child');
        accionesTd.appendChild(this._createActionButton('Editar', 'bi-pencil', 'btn-primary', () => this.editarProveedor(proveedor.id)));
        accionesTd.appendChild(this._createActionButton('Eliminar', 'bi-trash', 'btn-danger', () => this.eliminarProveedor(proveedor.id)));
        accionesTd.appendChild(this._createActionButton('Evaluar', 'bi-clipboard-check', 'btn-info', () => this.irAEvaluacion(proveedor.id)));

        return tr;
    }

    _createActionButton(title, icon, btnClass, onClick) {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${btnClass} me-2`;
        button.title = title;
        button.innerHTML = `<i class="bi ${icon}"></i>`;
        button.addEventListener('click', onClick);
        return button;
    }

    eliminarProveedor(id) {
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
            Object.keys(proveedor).forEach(key => {
                const formElement = form.elements[key];
                if (formElement) {
                    formElement.value = proveedor[key] || '';
                }
            });
        }
        this.modal.show();
    }

    async guardarProveedor() {
        const form = document.getElementById('proveedorForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const