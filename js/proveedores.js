import { SupabaseService } from './services/supabaseService.js';
import { CRITERIOS_EVALUACION } from './constants.js';

class ProveedorManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.proveedorSeleccionado = null;
        this.paginaActual = 1;
        this.proveedoresPorPagina = 25;
        this.totalPaginas = 1;
        this.todosLosProveedores = [];

        this.inicializarEventos();
        this.cargarProveedores();
    }

    inicializarEventos() {
        document.getElementById('btnNuevoProveedor').addEventListener('click', () => this.mostrarModalProveedor());
        document.getElementById('btnGuardarProveedor').addEventListener('click', () => this.guardarProveedor());
        document.getElementById('searchProveedor').addEventListener('input', () => { this.paginaActual = 1; this.renderizarTabla(); });
        document.getElementById('filterEstado').addEventListener('change', () => { this.paginaActual = 1; this.renderizarTabla(); });

        const pagSel = document.getElementById('selectProveedoresPorPagina');
        if (pagSel) {
            pagSel.addEventListener('change', (e) => {
                this.proveedoresPorPagina = parseInt(e.target.value);
                this.paginaActual = 1;
                this.renderizarTabla();
            });
        }

        this.modal = new bootstrap.Modal(document.getElementById('proveedorModal'));

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
        }
    }

    renderizarTabla() {
        const busqueda = document.getElementById('searchProveedor').value.toLowerCase();
        const estadoFiltro = document.getElementById('filterEstado').value;

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

        const tbody = document.getElementById('proveedoresTableBody');
        tbody.innerHTML = '';
        proveedoresPaginados.forEach(proveedor => {
            const row = this.crearFilaProveedor(proveedor, proveedor.evaluaciones);
            tbody.appendChild(row);
        });

        this.mostrarControlesPaginacion(total);
    }

    mostrarControlesPaginacion(total) {
        const paginacion = document.getElementById('paginacionProveedores');
        if (!paginacion) return;
        paginacion.innerHTML = '';
        if (this.totalPaginas > 1) {
            let html = `<nav><ul class='pagination justify-content-center'>`;
            for (let i = 1; i <= this.totalPaginas; i++) {
                html += `<li class='page-item${i === this.paginaActual ? ' active' : ''}'><a class='page-link' href='#' onclick='proveedorManager.irPagina(${i});return false;'>${i}</a></li>`;
            }
            html += `</ul></nav>`;
            paginacion.innerHTML = html;
        }
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
            <td>
                <button class="btn btn-sm btn-info" onclick="proveedorManager.editarProveedor(${proveedor.id})" title="Editar Proveedor"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-primary" onclick="proveedorManager.irAEvaluacion(${proveedor.id})" title="Evaluar Proveedor"><i class="bi bi-clipboard-check"></i></button>
                <button class="btn btn-sm btn-danger" onclick="proveedorManager.eliminarProveedor(${proveedor.id})" title="Eliminar Proveedor"><i class="bi bi-trash"></i></button>
            </td>
        `;
        return tr;
    }

    async eliminarProveedor(id) {
        if (!confirm(`¿Estás seguro de que quieres eliminar al proveedor con ID ${id}?`)) return;
        try {
            await this.supabase.eliminarProveedor(id);
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            alert('Error al eliminar el proveedor.');
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
        } catch (error) {
            console.error('Error al guardar proveedor:', error);
            alert('Error al guardar el proveedor.');
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

window.proveedorManager = new ProveedorManager();
window.eliminarProveedor = (id) => window.proveedorManager.eliminarProveedor(id);