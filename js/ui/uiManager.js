export class UIManager {
    constructor(containerId = 'app') {
        this.container = document.getElementById(containerId);
    }

    mostrarListaProveedores(proveedores) {
        const html = `
            <div class="row mb-4">
                <div class="col">
                    <h2>Proveedores</h2>
                </div>
                <div class="col text-end">
                    <button class="btn btn-primary" onclick="window.app.mostrarFormularioProveedor()">
                        Nuevo Proveedor
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>RFC</th>
                            <th>Fecha de Alta</th>
                            <th>Evaluación Alta</th>
                            <th>Evaluación Interna</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proveedores.map(p => `
                            <tr>
                                <td>${p.nombre}</td>
                                <td>${p.rfc}</td>
                                <td>${new Date(p.fechaAlta).toLocaleDateString()}</td>
                                <td>${this._formatearPuntaje(p.evaluacionAlta)}</td>
                                <td>${this._formatearPuntaje(p.evaluacionInterna)}</td>
                                <td>
                                    <button class="btn btn-sm btn-info" onclick="window.app.verProveedor(${p.id})">
                                        Ver
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="window.app.evaluarProveedor(${p.id})">
                                        Evaluar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.container.innerHTML = html;
    }

    mostrarFormularioProveedor(proveedor = null) {
        const html = `
            <div class="row">
                <div class="col">
                    <h2>${proveedor ? 'Editar' : 'Nuevo'} Proveedor</h2>
                </div>
            </div>
            <form id="formProveedor" class="needs-validation" novalidate>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="nombre" class="form-label">Nombre</label>
                        <input type="text" class="form-control" id="nombre" required 
                            value="${proveedor?.nombre || ''}">
                    </div>
                    <div class="col-md-6">
                        <label for="rfc" class="form-label">RFC</label>
                        <input type="text" class="form-control" id="rfc" required
                            value="${proveedor?.rfc || ''}">
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col">
                        <button type="submit" class="btn btn-primary">Guardar</button>
                        <button type="button" class="btn btn-secondary" 
                            onclick="window.app.mostrarListaProveedores()">Cancelar</button>
                    </div>
                </div>
            </form>
        `;
        this.container.innerHTML = html;
        this._configurarFormularioProveedor();
    }

    mostrarFormularioEvaluacion(proveedor, tipoEvaluacion, criterios) {
        const html = `
            <div class="row mb-4">
                <div class="col">
                    <h2>Evaluación de Proveedor - ${tipoEvaluacion}</h2>
                    <h4>${proveedor.nombre}</h4>
                </div>
            </div>
            <form id="formEvaluacion">
                ${Object.entries(criterios).map(([key, criterio]) => `
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="${key}">
                            <label class="form-check-label" for="${key}">
                                ${criterio.nombre} (${criterio.ponderacion}%)
                            </label>
                        </div>
                    </div>
                `).join('')}
                <div class="row mt-4">
                    <div class="col">
                        <button type="submit" class="btn btn-primary">Guardar Evaluación</button>
                        <button type="button" class="btn btn-secondary" 
                            onclick="window.app.verProveedor(${proveedor.id})">Cancelar</button>
                    </div>
                </div>
            </form>
        `;
        this.container.innerHTML = html;
        this._configurarFormularioEvaluacion();
    }

    _formatearPuntaje(puntaje) {
        if (puntaje === undefined || puntaje === null) return 'Sin evaluar';
        return `${puntaje.toFixed(1)}%`;
    }

    _configurarFormularioProveedor() {
        const form = document.getElementById('formProveedor');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (form.checkValidity()) {
                const proveedor = {
                    nombre: document.getElementById('nombre').value,
                    rfc: document.getElementById('rfc').value
                };
                window.app.guardarProveedor(proveedor);
            }
            form.classList.add('was-validated');
        });
    }

    _configurarFormularioEvaluacion() {
        const form = document.getElementById('formEvaluacion');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const criterios = {};
            form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                criterios[checkbox.id] = checkbox.checked;
            });
            window.app.guardarEvaluacion(criterios);
        });
    }
}
