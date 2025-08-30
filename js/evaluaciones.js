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
        // Controles principales
        this.selectProveedor = document.getElementById('selectProveedor');
        this.searchProveedorInput = document.getElementById('searchProveedor');
        this.tipoEvaluacion = document.getElementById('tipoEvaluacion');
        this.btnGuardarEvaluacion = document.getElementById('btnGuardarEvaluacion');
        this.comentariosEvaluacion = document.getElementById('comentariosEvaluacion');
        this.formEvaluacion = document.getElementById('formEvaluacion');
        this.puntajeTotal = document.getElementById('puntajeTotal');
        this.btnBorrarTodos = document.getElementById('btnBorrarTodosEvaluaciones');
        this.btnCancelar = document.getElementById('btnCancelar');

        // Modal de confirmación para borrar todo
        this.confirmDeleteAllModal = document.getElementById('confirmDeleteAllModal');
        this.btnConfirmDeleteAll = document.getElementById('btnConfirmDeleteAll');
        this.btnCancelDeleteAll = document.getElementById('btnCancelDeleteAll');
    }

    inicializarEventos() {
        this.selectProveedor.addEventListener('change', (e) => this.cambiarProveedor(e.target.value));
        this.searchProveedorInput.addEventListener('input', () => this.renderizarProveedores());
        this.tipoEvaluacion.addEventListener('change', (e) => this.cambiarTipoEvaluacion(e.target.value));
        this.btnGuardarEvaluacion.addEventListener('click', () => this.guardarEvaluacion(true));
        this.comentariosEvaluacion.addEventListener('input', () => this.debouncedAutoSave());
        this.btnCancelar.addEventListener('click', () => this.cancelarEvaluacion());

        // Eventos del modal de confirmación
        this.btnBorrarTodos.addEventListener('click', () => this.abrirModalConfirmacion());
        this.btnConfirmDeleteAll.addEventListener('click', () => this.borrarTodasLasEvaluaciones());
        this.btnCancelDeleteAll.addEventListener('click', () => this.cerrarModalConfirmacion());
    }

    // --- Métodos de Control de Modales ---
    abrirModalConfirmacion() {
        this.confirmDeleteAllModal.classList.remove('hidden');
    }

    cerrarModalConfirmacion() {
        this.confirmDeleteAllModal.classList.add('hidden');
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
            this.todosLosProveedores = proveedores || [];
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

    cancelarEvaluacion() {
        this.formEvaluacion.classList.add('hidden');
        this.selectProveedor.value = '';
        this.proveedorActual = null;
    }

    async cambiarProveedor(proveedorId) {
        if (!proveedorId) {
            this.cancelarEvaluacion();
            return;
        }
        try {
            this.proveedorActual = this.todosLosProveedores.find(p => p.id == proveedorId);
            this.formEvaluacion.classList.remove('hidden');
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
        const container = document.querySelector(`#evaluacion${this.tipoEvaluacionActual === 'ALTA' ? 'Alta' : 'Interna'} > div`);
        container.innerHTML = '';
        const criterios = this.criterios[this.tipoEvaluacionActual];

        for (const criterio of criterios) {
            const criterioId = `criterio-${criterio.id}`;
            const formGroup = document.createElement('div');
            formGroup.className = 'p-4 border border-gray-200 rounded-lg';

            formGroup.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <input id="${criterioId}" type="checkbox" data-ponderacion="${criterio.ponderacion}" class="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <label for="${criterioId}" class="ml-3 block text-md font-medium text-gray-800">${criterio.nombre} (${criterio.ponderacion}%)</label>
                    </div>
                </div>
                <div class="mt-3 ml-8 file-input-container">
                    <input type="file" id="${criterioId}File" name="${criterioId}File" class="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                    <div class="file-status-container mt-2 text-sm"></div>
                </div>
            `;

            formGroup.querySelector(`#${criterioId}`).addEventListener('change', () => this.actualizarPuntaje());
            formGroup.querySelector(`#${criterioId}File`).addEventListener('change', (e) => this.manejarArchivo(e));
            container.appendChild(formGroup);
        }
    }

    limpiarFormulario() {
        this.formEvaluacion.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        this.formEvaluacion.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
        this.formEvaluacion.querySelectorAll('.file-status-container').forEach(c => c.innerHTML = '');
        this.comentariosEvaluacion.value = '';
        this.puntajeTotal.textContent = '0%';
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
                this.comentariosEvaluacion.value = evaluacion.comentarios || '';
            }

            const documentos = await this.supabase.obtenerDocumentosPorProveedor(this.proveedorActual.id);
            documentos.forEach(doc => {
                const fileInput = document.getElementById(`${doc.tipo}File`);
                if (fileInput) {
                    const statusContainer = fileInput.parentElement.querySelector('.file-status-container');
                    if (statusContainer) {
                        statusContainer.innerHTML = this.generarHtmlEstadoArchivo(doc.nombre_archivo, doc.tipo);
                        statusContainer.querySelector('.btn-preview').addEventListener('click', () => this.previsualizarDocumento(doc.tipo));
                        statusContainer.querySelector('.btn-delete').addEventListener('click', () => this.eliminarDocumento(doc.tipo, statusContainer));
                    }
                }
            });

            this.actualizarPuntaje();
        } catch (error) {
            console.error('Error al cargar evaluación existente:', error);
        }
    }

    generarHtmlEstadoArchivo(nombreArchivo, criterioId) {
        const nombreCorto = nombreArchivo.length > 25 ? nombreArchivo.substring(0, 22) + '...' : nombreArchivo;
        return `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                <span class="text-green-700 font-medium" title="${nombreArchivo}"><i class="bi bi-check-circle-fill mr-2"></i>${nombreCorto}</span>
                <div class="space-x-2">
                    <button class="btn-preview text-blue-600 hover:text-blue-800" title="Vista Previa"><i class="bi bi-eye"></i></button>
                    <button class="btn-delete text-red-600 hover:text-red-800" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
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
        statusContainer.innerHTML = '<span class="text-blue-600">Subiendo...</span>';
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
            statusContainer.innerHTML = this.generarHtmlEstadoArchivo(file.name, criterioId);
            statusContainer.querySelector('.btn-preview').addEventListener('click', () => this.previsualizarDocumento(criterioId));
            statusContainer.querySelector('.btn-delete').addEventListener('click', () => this.eliminarDocumento(criterioId, statusContainer));
            showNotification('Archivo subido con éxito.', 'success');
        } catch (error) {
            console.error('Error al guardar el archivo:', error);
            statusContainer.innerHTML = '<span class="text-red-600">Error al subir</div>';
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
            const { data: { signedUrl }, error } = await this.supabase.createSignedUrl(doc.storage_path, 60);
            if(error) throw error;
            const newWindow = window.open(signedUrl, '_blank');
            if (!newWindow) {
                showNotification('Por favor, deshabilite el bloqueo de ventanas emergentes.', 'info');
            }
        } catch (error) {
            console.error('Error al previsualizar el documento:', error);
            showNotification('Error al cargar el documento para previsualización.', 'error');
        }
    }

    async eliminarDocumento(criterioId, statusContainer) {
        if (!confirm('¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.')) return;
        try {
            const doc = await this.supabase.obtenerDocumento(this.proveedorActual.id, criterioId);
            if (!doc || !doc.storage_path) {
                showNotification('No se encontró el documento para eliminar.', 'warning');
                statusContainer.innerHTML = '';
                const fileInput = statusContainer.closest('.file-input-container').querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
                return;
            }
            await this.supabase.eliminarDocumento(doc.storage_path);
            statusContainer.innerHTML = '';
            const fileInput = statusContainer.closest('.file-input-container').querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
            showNotification('Documento eliminado con éxito.', 'success');
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            showNotification('No se pudo eliminar el documento.', 'error');
        }
    }

    actualizarPuntaje() {
        const criteriosDefinidos = this.criterios[this.tipoEvaluacionActual];
        if (!criteriosDefinidos || criteriosDefinidos.length === 0) {
            this.puntajeTotal.textContent = '0%';
            return;
        }
        let puntajeTotalPonderacion = 0;
        let puntajeObtenido = 0;
        criteriosDefinidos.forEach(criterio => {
            puntajeTotalPonderacion += criterio.ponderacion;
            const checkbox = document.getElementById(`criterio-${criterio.id}`);
            if (checkbox && checkbox.checked) {
                puntajeObtenido += criterio.ponderacion;
            }
        });
        const porcentaje = puntajeTotalPonderacion > 0 ? (puntajeObtenido / puntajeTotalPonderacion) * 100 : 0;
        this.puntajeTotal.textContent = `${porcentaje.toFixed(0)}%`;
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
                if (checkbox) criterios[`criterio-${criterio.id}`] = checkbox.checked;
            });
            const puntaje = Math.round(parseFloat(this.puntajeTotal.textContent));
            const comentarios = this.comentariosEvaluacion.value.trim();
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
            this.cerrarModalConfirmacion();
            this.cancelarEvaluacion();
        } catch (error) {
            console.error('Error al borrar todas las evaluaciones:', error);
            showNotification('Error al borrar las evaluaciones.', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formEvaluacion')) {
        new EvaluacionManager();
    }
});
