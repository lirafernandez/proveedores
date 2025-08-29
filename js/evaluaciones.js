import { SupabaseService } from './services/supabaseService.js';
import { fileToBase64 } from './modules/fileUtils.js';
import { CRITERIOS_EVALUACION } from './constants.js';

class EvaluacionManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.proveedorActual = null;
        this.evaluacionActual = null;
        this.tipoEvaluacionActual = 'ALTA';
        this.autoSaveTimeout = null;

        this.inicializarEventos();
        this.cargarProveedores();
    }

    inicializarEventos() {
        document.getElementById('selectProveedor').addEventListener('change', (e) => this.cambiarProveedor(e.target.value));
        document.getElementById('tipoEvaluacion').addEventListener('change', (e) => this.cambiarTipoEvaluacion(e.target.value));
        document.getElementById('btnGuardarEvaluacion').addEventListener('click', () => this.guardarEvaluacion(true));
        document.getElementById('comentariosEvaluacion').addEventListener('input', () => this.debouncedAutoSave());
    }

    async cargarProveedores() {
        try {
            const proveedores = await this.supabase.obtenerProveedores();
            const select = document.getElementById('selectProveedor');
            select.innerHTML = '<option value="" selected>Seleccione un proveedor...</option>';
            proveedores.forEach(proveedor => {
                const option = document.createElement('option');
                option.value = proveedor.id;
                option.textContent = `${proveedor.nombre} - ${proveedor.rfc}`;
                select.appendChild(option);
            });

            const urlParams = new URLSearchParams(window.location.search);
            const proveedorIdFromUrl = urlParams.get('proveedor');
            if (proveedorIdFromUrl) {
                select.value = proveedorIdFromUrl;
                await this.cambiarProveedor(proveedorIdFromUrl);
            }
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
        }
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
        const criterios = CRITERIOS_EVALUACION[this.tipoEvaluacionActual];
        let html = '';
        for (const [key, criterio] of Object.entries(criterios)) {
            html += `
                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="${key}" data-ponderacion="${criterio.ponderacion}">
                        <label class="form-check-label" for="${key}">${criterio.nombre} (${criterio.ponderacion}%)</label>
                    </div>
                    <div class="mt-2">
                        <input type="file" class="form-control" id="${key}File" name="${key}File">
                        <div class="file-status-container"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        this.reasignarListenersCriterios();
    }

    reasignarListenersCriterios() {
        document.querySelectorAll('#formEvaluacion .form-check-input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.actualizarPuntaje());
        });
        document.querySelectorAll('#formEvaluacion input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => this.manejarArchivo(e));
        });
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
                Object.entries(evaluacion.criterios).forEach(([criterio, valor]) => {
                    const checkbox = document.getElementById(criterio);
                    if (checkbox) checkbox.checked = !!valor;
                });
                document.getElementById('comentariosEvaluacion').value = evaluacion.comentarios || '';
            }

            const documentos = await this.supabase.obtenerDocumentosPorProveedor(this.proveedorActual.id);
            documentos.forEach(doc => {
                const fileInput = document.getElementById(`${doc.tipo}File`);
                if (fileInput) {
                    const statusContainer = fileInput.parentElement.querySelector('.file-status-container');
                    if(statusContainer) statusContainer.innerHTML = '<div class="text-success mt-1"><i class="bi bi-check-circle"></i> Documento guardado</div>';
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
        statusContainer.innerHTML = '<div class="text-info mt-1">Guardando...</div>';

        try {
            const contenido = await fileToBase64(file);
            const criterioId = event.target.id.replace('File', '');
            
            await this.supabase.guardarDocumento({
                proveedor_id: this.proveedorActual.id,
                tipo: criterioId,
                nombre_archivo: file.name,
                contenido: contenido
            });

            statusContainer.innerHTML = '<div class="text-success mt-1">Guardado</div>';
        } catch (error) {
            console.error('Error al guardar el archivo:', error);
            statusContainer.innerHTML = '<div class="text-danger mt-1">Error</div>';
        }
    }

    actualizarPuntaje() {
        const criteriosDefinidos = CRITERIOS_EVALUACION[this.tipoEvaluacionActual];
        let puntajeTotal = 0;
        Object.values(criteriosDefinidos).forEach(criterio => puntajeTotal += criterio.ponderacion);
        
        let puntajeObtenido = 0;
        Object.entries(criteriosDefinidos).forEach(([key, criterio]) => {
            const checkbox = document.getElementById(key);
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
            const criteriosDefinidos = CRITERIOS_EVALUACION[this.tipoEvaluacionActual];
            Object.keys(criteriosDefinidos).forEach(key => {
                const checkbox = document.getElementById(key);
                if(checkbox) criterios[key] = checkbox.checked;
            });

            const puntaje = parseFloat(document.getElementById('puntajeTotal').textContent);
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
                alert('Evaluación guardada correctamente');
            }
        } catch (error) {
            console.error('Error al guardar la evaluación:', error);
            if (mostrarNotificacion) {
                alert('Error al guardar la evaluación: ' + error.message);
            }
        }
    }
}

new EvaluacionManager();