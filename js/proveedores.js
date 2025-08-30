import { SupabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

class ProveedorManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.cacheDOM();
        this.cargarProveedores();
    }

    cacheDOM() {
        this.proveedoresTableBody = document.getElementById('proveedoresTableBody');
    }

    async cargarProveedores() {
        try {
            const { data, count } = await this.supabase.obtenerProveedores({ porPagina: 0 }); // Get all providers
            this.renderizarTabla(data);
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            showNotification('Error al cargar los proveedores', 'error');
        }
    }

    renderizarTabla(proveedores) {
        if(!this.proveedoresTableBody) return;
        this.proveedoresTableBody.innerHTML = '';

        if (proveedores.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.className = 'text-center text-muted py-5';
            td.textContent = 'No se encontraron proveedores.';
            tr.appendChild(td);
            this.proveedoresTableBody.appendChild(tr);
        } else {
            proveedores.forEach(proveedor => {
                const row = this.crearFilaProveedor(proveedor);
                this.proveedoresTableBody.appendChild(row);
            });
        }
    }

    crearFilaProveedor(proveedor) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${proveedor.nombre}</td>
            <td>${proveedor.rfc}</td>
            <td>${new Date(proveedor.fecha_alta).toLocaleDateString()}</td>
            <td><span class="badge bg-secondary">Pendiente</span></td>
            <td></td>
        `;
        return tr;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProveedorManager();
});