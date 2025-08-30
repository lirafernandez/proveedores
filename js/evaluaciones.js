import { SupabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

class EvaluacionUI {
    constructor() {
        this.supabase = new SupabaseService();
        this.proveedorId = null;
        this.proveedor = null;
        this.criterios = [];
        this.evaluacion = {};
        this.autoSaveTimeout = null;
        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        // Header
        this.proveedorNombreEl = document.getElementById('proveedorNombre');
        this.puntajeActualEl = document.getElementById('puntajeActual');

        // Progress Bar
        this.progresoTextoEl = document.getElementById('progresoTexto');
        this.progressBarEl = document.getElementById('progressBar');

        // Criterios
        this.criteriosContainer = document.querySelector('.grid');

        // Resumen
        this.totalScoreEl = document.getElementById('totalScore');
        this.saveButton = document.getElementById('saveButton');
    }

    async init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.proveedorId = parseInt(urlParams.get('proveedor'), 10);

            if (!this.proveedorId) {
                this.showError("No se ha especificado un proveedor.");
                return;
            }

            this.proveedor = await this.supabase.obtenerProveedorPorId(this.proveedorId);
            this.criterios = await this.supabase.obtenerCriterios();
            // Assuming a general evaluation type for the new design
            this.evaluacion = (await this.supabase.obtenerEvaluacion(this.proveedorId, 'GENERAL')) || { criterios: {} };

            this.render();
            this.addEventListeners();
        } catch (error) {
            this.showError(`Error al inicializar: ${error.message}`);
            console.error(error);
        }
    }

    addEventListeners() {
        this.saveButton.addEventListener('click', () => this.saveEvaluation());
    }

    showError(message) {
        this.criteriosContainer.innerHTML = `<p class="text-red-500 bg-red-100 p-4 rounded-lg">${message}</p>`;
        showNotification(message, 'error');
    }

    render() {
        this.renderHeader();
        this.renderCriterios();
        this.updateOverallProgress();
        this.updateTotalScore();
    }

    renderHeader() {
        this.proveedorNombreEl.textContent = this.proveedor.nombre || 'Nombre no disponible';
    }

    renderCriterios() {
        this.criteriosContainer.innerHTML = ''; // Clear container
        this.criterios.forEach(criterio => {
            const criterioEl = this.createCriterioCard(criterio);
            this.criteriosContainer.appendChild(criterioEl);
            this.addEventListenersToCriterio(criterio);
            // Load existing data
            const existingData = this.evaluacion.criterios[criterio.id] || { score: 0 };
            this.evaluacion.criterios[criterio.id] = existingData;
            this.updateCriterionUI(criterio.id);
            this.loadAndRenderDocuments(criterio.id);
        });
    }

    createCriterioCard(criterio) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300';
        div.id = `criterio-card-${criterio.id}`;
        div.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="bg-blue-100 p-2 rounded-lg"><i class="fas fa-file-contract text-blue-600 text-xl"></i></div>
                        <div>
                            <h3 class="font-bold text-gray-800">${criterio.nombre}</h3>
                            <p class="text-sm text-gray-600">${criterio.descripcion || 'Evaluación de criterio'}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-green-600" id="criterio-${criterio.id}-score-display">0</div>
                        <div class="text-xs text-gray-500">/10</div>
                    </div>
                </div>
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-600">Cumplimiento</span>
                        <span class="text-green-600 font-medium" id="criterio-${criterio.id}-progress-text">0%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" id="criterio-${criterio.id}-progress-bar" style="width: 0%"></div></div>
                </div>
                <div class="space-y-2 mb-4" id="criterio-${criterio.id}-doc-list"></div>
                <div id="criterio-${criterio.id}-drop-area" class="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <input type="file" class="hidden" id="criterio-${criterio.id}-file-input" accept=".pdf,.doc,.docx,.jpg,.png">
                    <label for="criterio-${criterio.id}-file-input" class="cursor-pointer">
                        <div class="text-center">
                            <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                            <p class="text-sm text-gray-600">Arrastra o <span class="text-blue-600">selecciona</span> archivos</p>
                        </div>
                    </label>
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Puntaje</label>
                    <input type="number" id="criterio-${criterio.id}-score-input" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" max="10" step="0.1" value="0">
                </div>
            </div>
        `;
        return div;
    }

    addEventListenersToCriterio(criterio) {
        const scoreInput = document.getElementById(`criterio-${criterio.id}-score-input`);
        scoreInput.addEventListener('input', () => {
            this.evaluacion.criterios[criterio.id] = { score: parseFloat(scoreInput.value) || 0 };
            this.updateCriterionUI(criterio.id);
            this.updateTotalScore();
            this.updateOverallProgress();
            this.debouncedAutoSave();
        });

        const dropArea = document.getElementById(`criterio-${criterio.id}-drop-area`);
        const fileInput = document.getElementById(`criterio-${criterio.id}-file-input`);
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, e => e.preventDefault()));
        dropArea.addEventListener('dragover', () => dropArea.classList.add('border-blue-400', 'bg-blue-50'));
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('border-blue-400', 'bg-blue-50'));
        dropArea.addEventListener('drop', e => {
            dropArea.classList.remove('border-blue-400', 'bg-blue-50');
            if (e.dataTransfer.files.length > 0) this.uploadFile(criterio.id, e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) this.uploadFile(criterio.id, fileInput.files[0]);
        });
    }

    async loadAndRenderDocuments(criterioId) {
        const docList = document.getElementById(`criterio-${criterioId}-doc-list`);
        docList.innerHTML = ''; // Clear list
        const documentos = await this.supabase.obtenerDocumentosPorProveedor(this.proveedorId);
        const criterioDocs = documentos.filter(d => d.tipo === `criterio-${criterioId}`);

        criterioDocs.forEach(doc => {
            const docEl = this.createDocumentItem(criterioId, doc);
            docList.appendChild(docEl);
        });
    }

    createDocumentItem(criterioId, doc) {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        div.innerHTML = `<div class="flex items-center space-x-2"><i class="fas fa-file-pdf text-red-500"></i><span class="text-sm">${doc.nombre_archivo}</span></div><button class="text-red-500 hover:text-red-700 delete-doc" data-criterio-id="${criterioId}" data-storage-path="${doc.storage_path}"><i class="fas fa-trash-alt"></i></button>`;
        div.querySelector('.delete-doc').addEventListener('click', (e) => this.handleDeleteDocument(e));
        return div;
    }

    async uploadFile(criterioId, file) {
        const dropArea = document.getElementById(`criterio-${criterioId}-drop-area`);
        const originalContent = dropArea.innerHTML;
        dropArea.innerHTML = `<div class="text-center p-4">Subiendo: ${file.name}...</div>`;

        try {
            const filePath = `${this.proveedorId}/criterio-${criterioId}/${file.name}`;
            await this.supabase.uploadFile(file, filePath);
            await this.supabase.guardarDocumento({
                proveedor_id: this.proveedorId,
                tipo: `criterio-${criterioId}`,
                nombre_archivo: file.name,
                storage_path: filePath
            });
            showNotification('Archivo subido con éxito', 'success');
            this.loadAndRenderDocuments(criterioId);
        } catch (error) {
            showNotification(`Error al subir archivo: ${error.message}`, 'error');
        } finally {
            dropArea.innerHTML = originalContent;
            // Re-add label 'for' attribute as it might get lost
            dropArea.querySelector('label').setAttribute('for', `criterio-${criterioId}-file-input`);
        }
    }

    async handleDeleteDocument(event) {
        const button = event.currentTarget;
        const criterioId = button.dataset.criterioId;
        const storagePath = button.dataset.storagePath;

        if (!confirm(`¿Estás seguro de que quieres eliminar este documento?`)) return;

        try {
            await this.supabase.eliminarDocumento(storagePath);
            showNotification('Documento eliminado con éxito', 'success');
            this.loadAndRenderDocuments(criterioId);
        } catch (error) {
            showNotification(`Error al eliminar documento: ${error.message}`, 'error');
        }
    }

    updateCriterionUI(criterioId) {
        const score = this.evaluacion.criterios[criterioId].score;
        const percentage = (score / 10) * 100;
        document.getElementById(`criterio-${criterioId}-score-display`).textContent = score.toFixed(1);
        document.getElementById(`criterio-${criterioId}-score-input`).value = score;
        document.getElementById(`criterio-${criterioId}-progress-text`).textContent = `${percentage.toFixed(0)}%`;
        document.getElementById(`criterio-${criterioId}-progress-bar`).style.width = `${percentage}%`;
    }

    updateOverallProgress() {
        const evaluatedCriterios = Object.values(this.evaluacion.criterios).filter(c => c.score > 0).length;
        const totalCriterios = this.criterios.length;
        const progress = totalCriterios > 0 ? (evaluatedCriterios / totalCriterios) * 100 : 0;
        this.progresoTextoEl.textContent = `${evaluatedCriterios}/${totalCriterios} Criterios`;
        this.progressBarEl.style.width = `${progress}%`;
    }

    updateTotalScore() {
        const totalPossibleScore = this.criterios.length * 10;
        if (totalPossibleScore === 0) {
            this.totalScoreEl.textContent = '0.0';
            this.puntajeActualEl.textContent = '0.0';
            return;
        }
        const totalScore = Object.values(this.evaluacion.criterios).reduce((acc, {score}) => acc + score, 0);
        const finalPercentage = (totalScore / totalPossibleScore) * 100;
        this.totalScoreEl.textContent = finalPercentage.toFixed(1);
        this.puntajeActualEl.textContent = finalPercentage.toFixed(1);
    }

    async saveEvaluation(isManual = true) {
        try {
            const puntaje = parseFloat(this.totalScoreEl.textContent);
            const evaluacionData = {
                proveedor_id: this.proveedorId,
                tipo_evaluacion: 'GENERAL',
                criterios: this.evaluacion.criterios,
                puntaje: puntaje,
                comentarios: '', // No comments field in the new design
                fecha: new Date().toISOString()
            };
            await this.supabase.guardarEvaluacion(evaluacionData);
            if (isManual) showNotification('Evaluación guardada correctamente', 'success');
        } catch (error) {
            if (isManual) showNotification(`Error al guardar: ${error.message}`, 'error');
        }
    }

    debouncedAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.saveEvaluation(false), 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => new EvaluacionUI());