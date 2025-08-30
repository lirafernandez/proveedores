export class UIManager {
    constructor(app) {
        this.app = app; // Guardar una referencia a la instancia de la App
        this.container = document.getElementById('app-container');
        this.notificationContainer = document.getElementById('notification-container');
    }

    // Método para crear elementos del DOM de forma segura
    _createElement(tag, classNames = [], attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        if (classNames.length) {
            element.classList.add(...classNames);
        }
        for (const attr in attributes) {
            element.setAttribute(attr, attributes[attr]);
        }
        if (textContent) {
            element.textContent = textContent;
        }
        return element;
    }

    // Reemplaza alert() con notificaciones toast
    showNotification(message, type = 'info') { // types: success, error, info
        if (!this.notificationContainer) return;

        const iconMap = {
            success: 'check-circle-fill',
            error: 'x-circle-fill',
            info: 'info-circle-fill'
        };

        const toast = this._createElement('div', ['toast-notification', type]);
        const icon = this._createElement('i', ['bi', `bi-${iconMap[type]}`, 'icon']);
        const msg = this._createElement('div', ['message'], {}, message);

        toast.appendChild(icon);
        toast.appendChild(msg);

        this.notificationContainer.appendChild(toast);

        // Hacer visible la notificación
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Ocultar y eliminar después de 5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 5000);
    }

    renderProveedorList(proveedores) {
        // Limpiar contenedor
        this.container.innerHTML = '';

        // Header
        const header = this._createElement('div', ['d-flex', 'justify-content-between', 'align-items-center', 'mb-4']);
        const title = this._createElement('h1', ['mb-0'], {}, 'Gestión de Proveedores');
        const actions = this._createElement('div', ['d-flex', 'gap-2']);

        const importBtn = this._createElement('a', ['btn', 'btn-info'], { href: 'importar_proveedores.html' });
        importBtn.innerHTML = '<i class="bi bi-upload me-2"></i>Importar';

        const newBtn = this._createElement('button', ['btn', 'btn-primary']);
        newBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i> Nuevo Proveedor';
        newBtn.addEventListener('click', () => this.app.showProveedorForm());

        actions.append(importBtn, newBtn);
        header.append(title, actions);

        // Tabla
        const tableContainer = this._createElement('div', ['card']);
        const cardBody = this._createElement('div', ['card-body']);
        const tableResponsive = this._createElement('div', ['table-responsive']);
        const table = this._createElement('table', ['table', 'table-hover', 'align-middle']);
        const thead = this._createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Nombre</th>
                <th>RFC</th>
                <th>Fecha de Alta</th>
                <th>Estado</th>
                <th class="text-end">Acciones</th>
            </tr>
        `;
        const tbody = this._createElement('tbody');

        if (proveedores.length === 0) {
            const tr = this._createElement('tr');
            const td = this._createElement('td', [], { colspan: '5', class: 'text-center text-muted py-5' });
            td.innerHTML = 'No hay proveedores registrados.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            proveedores.forEach(p => {
                const tr = this._createElement('tr');
                tr.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${p.rfc}</td>
                    <td>${new Date(p.fecha_alta).toLocaleDateString()}</td>
                    <td><span class="badge bg-success">${p.estado || 'Activo'}</span></td>
                `;

                const actionsTd = this._createElement('td', ['text-end']);
                const viewBtn = this._createElement('button', ['btn', 'btn-sm', 'btn-outline-secondary', 'me-2']);
                viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
                viewBtn.addEventListener('click', () => this.app.viewProveedor(p.id));

                const evalBtn = this._createElement('button', ['btn', 'btn-sm', 'btn-outline-primary', 'me-2']);
                evalBtn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
                evalBtn.addEventListener('click', () => this.app.evaluateProveedor(p.id));

                const deleteBtn = this._createElement('button', ['btn', 'btn-sm', 'btn-outline-danger']);
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.addEventListener('click', () => this.app.deleteProveedor(p.id));

                actionsTd.append(viewBtn, evalBtn, deleteBtn);
                tr.appendChild(actionsTd);
                tbody.appendChild(tr);
            });
        }

        table.append(thead, tbody);
        tableResponsive.appendChild(table);
        cardBody.appendChild(tableResponsive);
        tableContainer.appendChild(cardBody);

        this.container.append(header, tableContainer);
    }

    // Aquí irían los otros métodos refactorizados:
    // renderProveedorForm()
    // renderEvaluationForm()
}
