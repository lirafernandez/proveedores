import { SupabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

class EvaluacionManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.proveedorActual = null;
        this.evaluacionActual = null;
        this.tipoEvaluacionActual = 'ALTA';
        this.criterios = { ALTA: [], INTERNA: [] };
        this.todosLosProveedores = [];
        this.autoSaveTimeout = null;

        this.cacheDOM();
        this.inicializarEventos();
        this.inicializarAplicacion();
    }

    cacheDOM() {
        this.selectProveedor = document.getElementById('selectProveedor');
        this.searchProveedorInput = document.getElementById('searchProveedor');
        this.tipoEvaluacion = document.getElementById('tipoEvaluacion');
        this.btnGuardarEvaluacion = document.getElementById('btnGuardarEvaluacion');
        this.comentariosEvaluacion = document.getElementById('comentariosEvaluacion');
        this.formEvaluacion = document.getElementById('formEvaluacion');
        this.puntajeTotal = document.getElementById('puntajeTotal');
        this.btnBorrarTodos = document.getElementById('btnBorrarTodosEvaluaciones');

        this.confirmDeleteAllModalElement = document.getElementById('confirmDeleteAllModal');
        this.confirmDeleteAllModal = new bootstrap.Modal(this.confirmDeleteAllModalElement);
        this.btnConfirmDeleteAll = document.getElementById('btnConfirmDeleteAll');
    }

    inicializarEventos() {
        this.selectProveedor.addEventListener('change', (e) => this.cambiarProveedor(e.target.value));
        this.searchProveedorInput.addEventListener('input', () => this.renderizarProveedores());
        this.tipoEvaluacion.addEventListener('change', (e) => this.cambiarTipoEvaluacion(e.target.value));
        this.btnGuardarEvaluacion.addEventListener('click', () => this.guardarEvaluacion(true));
        this.comentariosEvaluacion.addEventListener('input', () => this.debouncedAutoSave());
        this.btnBorrarTodos.addEventListener('click', () => this.confirmDeleteAllModal.show());
        this.btnConfirmDeleteAll.addEventListener('click', () => this.borrarTodasLasEvaluaciones());
    }

    async inicializarAplicacion() {
        await this.cargarCriterios();
        await this.cargarProveedores();
    }

    async cargarCriterios() {
        try {
            const criterios = await this.supabase.obtenerCriterios();
            this.criterios.ALTA = criterios.filter(c => c.tipo_evaluacion === 'ALTA');
            this.criterios.INTERNA = criterios.filter(c => c.tipo_evaluacion === 'INTERNA');
        } catch (error) {
            console.error('Error al cargar criterios:', error);
            showNotification('No se pudieron cargar los criterios de evaluación.', 'error');
        }
    }

    async cargarProveedores() {
        try {
            const { data: proveedores } = await this.supabase.obtenerProveedores({ porPagina: 0 });
            this.todosLosProveedores = proveedores;
            this.renderizarProveedores();

            const urlParams = new URLSearchParams(window.location.search);
            const proveedorIdFromUrl = urlParams.get('proveedor');
            if (proveedorIdFromUrl) {
                this.selectProveedor.value = proveedorIdFromUrl;
                await this.cambiarProveedor(proveedorIdFromUrl);
            }
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
        }
    }

    renderizarProveedores() {
        const busqueda = this.searchProveedorInput.value.toLowerCase();
        const proveedoresFiltrados = this.todosLosProveedores.filter(p => {
            return p.nombre.toLowerCase().includes(busqueda) || (p.rfc && p.rfc.toLowerCase().includes(busqueda));
        });

        this.selectProveedor.innerHTML = '<option value="" selected>Seleccione un proveedor...</option>';
        proveedoresFiltrados.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.id;
            option.textContent = `${proveedor.nombre} - ${proveedor.rfc}`;
            this.selectProveedor.appendChild(option);
        });
    }

    async cambiarProveedor(proveedorId) {
        if (!proveedorId) {
            document.getElementById('formEvaluacion').classList.add('hidden');
            this.proveedorActual = null;
            return;
        }
        try {
            this.proveedorActual = await this.supabase.obtenerProveedorPorId(Number(proveedorId));
            document.getElementById('formEvaluacion').classList.remove('hidden');
            await this.cargarEvaluacionExistente();
        } catch (error) {
            console.error('Error al cambiar de proveedor:', error);
        }
    }

    async cambiarTipoEvaluacion(tipo) {
        this.tipoEvaluacionActual = tipo;
        await this.cargarEvaluacionExistente();
    }

    generarCriterios() {
        const container = document.querySelector(`#evaluacion${this.tipoEvaluacionActual === 'ALTA' ? 'Alta' : 'Interna'} .card-body`);
        container.innerHTML = '';
        const criterios = this.criterios[this.tipoEvaluacionActual];

        for (const criterio of criterios) {
            const criterioId = `criterio-${criterio.id}`;
            const formGroup = document.createElement('div');
            formGroup.className = 'mb-3';

            const formCheck = document.createElement('div');
            formCheck.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input';
            checkbox.type = 'checkbox';
            checkbox.id = criterioId;
            checkbox.dataset.ponderacion = criterio.ponderacion;
            checkbox.addEventListener('change', () => this.actualizarPuntaje());

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = criterioId;
            label.textContent = `${criterio.nombre} (${criterio.ponderacion}%)`;

            formCheck.append(checkbox, label);

            const fileInputContainer = document.createElement('div');
            fileInputContainer.className = 'mt-2';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.className = 'form-control';
            fileInput.id = `${criterioId}File`;
            fileInput.name = `${criterioId}File`;
            fileInput.addEventListener('change', (e) => this.manejarArchivo(e));

            const fileStatus = document.createElement('div');
            fileStatus.className = 'file-status-container d-flex align-items-center mt-1';

            fileInputContainer.append(fileInput, fileStatus);
            formGroup.append(formCheck, fileInputContainer);
            container.appendChild(formGroup);
        }
    }

    limpiarFormulario() {
        const formContainer = document.getElementById('formEvaluacion');
        formContainer.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        formContainer.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
        formContainer.querySelectorAll('.file-status-container').forEach(c => c.innerHTML = '');
        document.getElementById('comentariosEvaluacion').value = '';
        document.getElementById('puntajeTotal').textContent = '0';
    }

    async cargarEvaluacionExistente() {
        this.limpiarFormulario();
        this.mostrarSeccionEvaluacion();

        if (!this.proveedorActual) return;

        try {
            const evaluacion = await this.supabase.obtenerEvaluacion(this.proveedorActual.id, this.tipoEvaluacionActual);
            this.evaluacionActual = evaluacion;

            if (evaluacion && evaluacion.criterios) {
                Object.entries(evaluacion.criterios).forEach(([criterioId, valor]) => {
                    const checkbox = document.getElementById(criterioId);
                    if (checkbox) checkbox.checked = !!valor;
                });
                document.getElementById('comentariosEvaluacion').value = evaluacion.comentarios || '';
            }

            const documentos = await this.supabase.obtenerDocumentosPorProveedor(this.proveedorActual.id);
            documentos.forEach(doc => {
                const fileInput = document.getElementById(`${doc.tipo}File`);
                if (fileInput) {
                    const statusContainer = fileInput.parentElement.querySelector('.file-status-container');
                    if(statusContainer) {
                        statusContainer.innerHTML = `
                            <span class="text-success me-2"><i class="bi bi-check-circle"></i> ${doc.nombre_archivo}</span>
                            <button class="btn btn-sm btn-outline-primary btn-preview">Vista Previa</button>
                        `;
                        statusContainer.querySelector('.btn-preview').addEventListener('click', () => this.previsualizarDocumento(doc.tipo));
                    }
                }
            });

            this.actualizarPuntaje();
        } catch (error) {
            console.error('Error al cargar evaluación existente:', error);
        }
    }

    mostrarSeccionEvaluacion() {
        const altaDiv = document.getElementById('evaluacionAlta');
        const internaDiv = document.getElementById('evaluacionInterna');
        if (this.tipoEvaluacionActual === 'ALTA') {
            altaDiv.classList.remove('hidden');
            internaDiv.classList.add('hidden');
        } else {
            altaDiv.classList.add('hidden');
            internaDiv.classList.remove('hidden');
        }
        this.generarCriterios();
    }

    async manejarArchivo(event) {
        const file = event.target.files[0];
        if (!file || !this.proveedorActual) return;

        const statusContainer = event.target.parentElement.querySelector('.file-status-container');
        statusContainer.innerHTML = '<div class="text-info mt-1">Subiendo...</div>';

        try {
            const criterioId = event.target.id.replace('File', '');
            const filePath = `${this.proveedorActual.id}/${criterioId}-${file.name}`;

            await this.supabase.uploadFile(file, filePath);
            
            await this.supabase.guardarDocumento({
                proveedor_id: this.proveedorActual.id,
                tipo: criterioId,
                nombre_archivo: file.name,
                storage_path: filePath
            });

            statusContainer.innerHTML = `
                <span class="text-success me-2"><i class="bi bi-check-circle"></i> ${file.name}</span>
                <button class="btn btn-sm btn-outline-primary btn-preview">Vista Previa</button>
            `;
            statusContainer.querySelector('.btn-preview').addEventListener('click', () => this.previsualizarDocumento(criterioId));
            showNotification('Archivo subido con éxito.', 'success');

        } catch (error) {
            console.error('Error al guardar el archivo:', error);
            statusContainer.innerHTML = '<div class="text-danger mt-1">Error al subir</div>';
            showNotification('Error al subir el archivo.', 'error');
        }
    }

    async previsualizarDocumento(criterioId) {
        try {
            const doc = await this.supabase.obtenerDocumento(this.proveedorActual.id, criterioId);
            if (!doc || !doc.storage_path) {
                showNotification('No se encontró el documento para previsualizar.', 'warning');
                return;
            }

            const { signedUrl } = await this.supabase.createSignedUrl(doc.storage_path);

            const newWindow = window.open(signedUrl, '_blank');
            if(!newWindow) {
                showNotification('Por favor, deshabilite el bloqueo de ventanas emergentes para este sitio.', 'info');
            }

        } catch (error) {
            console.error('Error al previsualizar el documento:', error);
            showNotification('Error al cargar el documento para previsualización.', 'error');
        }
    }

    getFileMimeType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return 'application/pdf';
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'gif': return 'image/gif';
            case 'txt': return 'text/plain';
            default: return 'application/octet-stream';
        }
    }

    actualizarPuntaje() {
        const criteriosDefinidos = this.criterios[this.tipoEvaluacionActual];
        let puntajeTotal = 0;
        criteriosDefinidos.forEach(criterio => puntajeTotal += criterio.ponderacion);
        
        let puntajeObtenido = 0;
        criteriosDefinidos.forEach(criterio => {
            const checkbox = document.getElementById(`criterio-${criterio.id}`);
            if (checkbox && checkbox.checked) {
                puntajeObtenido += criterio.ponderacion;
            }
        });

        const porcentaje = puntajeTotal > 0 ? (puntajeObtenido / puntajeTotal) * 100 : 0;
        document.getElementById('puntajeTotal').textContent = porcentaje.toFixed(1);
        this.debouncedAutoSave();
    }

    debouncedAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.guardarEvaluacion(false);
        }, 1500);
    }

    async guardarEvaluacion(mostrarNotificacion = false) {
        if (!this.proveedorActual) return;

        try {
            const criterios = {};
            const criteriosDefinidos = this.criterios[this.tipoEvaluacionActual];
            criteriosDefinidos.forEach(criterio => {
                const checkbox = document.getElementById(`criterio-${criterio.id}`);
                if(checkbox) criterios[`criterio-${criterio.id}`] = checkbox.checked;
            });

            const puntaje = Math.round(parseFloat(document.getElementById('puntajeTotal').textContent));
            const comentarios = document.getElementById('comentariosEvaluacion').value.trim();

            const evaluacionData = {
                proveedor_id: this.proveedorActual.id,
                tipo_evaluacion: this.tipoEvaluacionActual,
                criterios: criterios,
                puntaje: puntaje,
                comentarios: comentarios,
                fecha: new Date().toISOString()
            };

            const savedData = await this.supabase.guardarEvaluacion(evaluacionData);
            this.evaluacionActual = savedData;

            if (mostrarNotificacion) {
                showNotification('Evaluación guardada correctamente', 'success');
            }
        } catch (error) {
            console.error('Error al guardar la evaluación:', error);
            if (mostrarNotificacion) {
                showNotification(`Error al guardar la evaluación: ${error.message}`, 'error');
            }
        }
    }

    async borrarTodasLasEvaluaciones() {
        try {
            await this.supabase.borrarTodasEvaluaciones();
            showNotification('Todas las evaluaciones han sido borradas.', 'success');
            this.confirmDeleteAllModal.hide();
            this.cargarProveedores();
        } catch (error) {
            console.error('Error al borrar todas las evaluaciones:', error);
            showNotification('Error al borrar las evaluaciones.', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EvaluacionManager();
});