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
        if(this.btnNuevoProveedor) this.btnNuevoProveedor.addEventListener('click', () => this.mostrarModalProveedor());
        if(this.btnGuardarProveedor) this.btnGuardarProveedor.addEventListener('click', () => this.guardarProveedor());
        if(this.searchProveedor) this.searchProveedor.addEventListener('input', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if(this.filterEstado) this.filterEstado.addEventListener('change', () => { this.paginaActual = 1; this.renderizarTabla(); });
        if(this.btnConfirmDelete) this.btnConfirmDelete.addEventListener('click', () => this.ejecutarEliminacion());

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
            this.todosLosProveedores = await this.supabase.obtenerProveedores();
            const evaluaciones = await this.supabase.obtenerEvaluaciones();

            const evaluacionesPorProveedor = evaluaciones.reduce((acc, evaluacion) => {
                const key = evaluacion.proveedor_id;
                if (!acc[key]) {
                    acc[key] = {};
                }
                acc[key][evaluacion.tipo_evaluacion] = evaluacion;
                return acc;
            }, {});

            this.todosLosProveedores.forEach(p => {
                p.evaluaciones = evaluacionesPorProveedor[p.id] || {};
            });

            this.renderizarTabla();
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            showNotification('Error al cargar los proveedores', 'error');
        }
    }

    renderizarTabla() {
        if(!this.proveedoresTableBody) return;
        const busqueda = this.searchProveedor.value.toLowerCase();
        const estadoFiltro = this.filterEstado.value;

        let proveedoresFiltrados = this.todosLosProveedores.filter(p => {
            const busquedaCoincide = p.nombre.toLowerCase().includes(busqueda) || (p.rfc && p.rfc.toLowerCase().includes(busqueda));
            if (!estadoFiltro) return busquedaCoincide;

            const estadoProveedor = this.determinarEstado(p.evaluaciones.ALTA?.puntaje || 0, p.evaluaciones.INTERNA?.puntaje || 0);
            return busquedaCoincide && estadoProveedor.toLowerCase() === estadoFiltro;
        });

        const total = proveedoresFiltrados.length;
        this.totalPaginas = this.proveedoresPorPagina > 0 ? Math.ceil(total / this.proveedoresPorPagina) : 1;
        const proveedoresPaginados = this.proveedoresPorPagina > 0 
            ? proveedoresFiltrados.slice((this.paginaActual - 1) * this.proveedoresPorPagina, this.paginaActual * this.proveedoresPorPagina)
            : proveedoresFiltrados;

        this.proveedoresTableBody.innerHTML = '';
        proveedoresPaginados.forEach(proveedor => {
            const row = this.crearFilaProveedor(proveedor, proveedor.evaluaciones);
            this.proveedoresTableBody.appendChild(row);
        });

        this.renderizarPaginacion(total);
    }

    renderizarPaginacion() {
        if(!this.paginacionContainer) return;
        this.paginacionContainer.innerHTML = '';
        if (this.totalPaginas <= 1) return;

        const nav = document.createElement('nav');
        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';

        for (let i = 1; i <= this.totalPaginas; i++) {
            const li = document.createElement('li');
            li.className = `page-item${i === this.paginaActual ? ' active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.irPagina(i);
            });
            li.appendChild(a);
            ul.appendChild(li);
        }
        nav.appendChild(ul);
        this.paginacionContainer.appendChild(nav);
    }

    irPagina(num) {
        this.paginaActual = num;
        this.renderizarTabla();
    }

    crearFilaProveedor(proveedor, evaluaciones) {
        const tr = document.createElement('tr');
        const evalAlta = evaluaciones.ALTA || null;
        const evalInterna = evaluaciones.INTERNA || null;
        const estado = this.determinarEstado(evalAlta?.puntaje || 0, evalInterna?.puntaje || 0);

        tr.innerHTML = `
            <td>${proveedor.nombre}</td>
            <td>${proveedor.rfc}</td>
            <td>${new Date(proveedor.fecha_alta).toLocaleDateString()}</td>
            <td>
                <span class="badge ${this.getEstadoBadgeClass(estado)}">${estado}</span>
            </td>
        `;

        const actionsTd = document.createElement('td');
        actionsTd.className = 'text-end';

        const editBtn = this._createActionButton('Editar Proveedor', 'bi-pencil', 'btn-outline-info', () => this.editarProveedor(proveedor.id));
        const evalBtn = this._createActionButton('Evaluar Proveedor', 'bi-clipboard-check', 'btn-outline-primary', () => this.irAEvaluacion(proveedor.id));
        const deleteBtn = this._createActionButton('Eliminar Proveedor', 'bi-trash', 'btn-outline-danger', () => this.eliminarProveedor(proveedor.id));

        actionsTd.append(editBtn, evalBtn, deleteBtn);
        tr.appendChild(actionsTd);

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
            this.cargarProveedores(); // Recargar la lista
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

        const formData = new FormData(form);
        const proveedorData = Object.fromEntries(formData.entries());

        if (this.proveedorSeleccionado) {
            proveedorData.id = this.proveedorSeleccionado.id;
        } else {
            proveedorData.fecha_alta = new Date().toISOString();
        }

        try {
            await this.supabase.guardarProveedor(proveedorData);
            this.modal.hide();
            showNotification('Proveedor guardado con éxito.', 'success');
            this.cargarProveedores(); // Recargar la lista
        } catch (error) {
            console.error('Error al guardar proveedor:', error);
            showNotification('Error al guardar el proveedor.', 'error');
        }
    }

    async editarProveedor(id) {
        try {
            const proveedor = await this.supabase.obtenerProveedorPorId(id);
            if (proveedor) {
                this.mostrarModalProveedor(proveedor);
            }
        } catch (error) {
            console.error('Error al cargar proveedor para editar:', error);
            showNotification('Error al cargar el proveedor para editar.', 'error');
        }
    }

    determinarEstado(evalAlta, evalInterna) {
        if (!evalAlta && !evalInterna) return 'Pendiente';
        if (evalAlta >= 70 && evalInterna >= 70) return 'Aprobado';
        if (evalAlta < 70 || evalInterna < 70) return 'Rechazado';
        return 'En Proceso';
    }

    getEstadoBadgeClass(estado) {
        switch (estado) {
            case 'Aprobado': return 'bg-success';
            case 'Rechazado': return 'bg-danger';
            case 'En Proceso': return 'bg-warning';
            default: return 'bg-secondary';
        }
    }

    irAEvaluacion(id) {
        window.location.href = `evaluaciones.html?proveedor=${id}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProveedorManager();
});