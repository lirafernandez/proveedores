import { SupabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

class ConfiguracionManager {
    constructor() {
        this.supabase = new SupabaseService();
        this.editando = false;
        this.idEditando = null;

        this.cacheDOM();
        this.inicializarEventos();
        this.cargarCriterios();
    }

    cacheDOM() {
        this.form = document.getElementById('form-criterio');
        this.tituloForm = document.getElementById('form-criterio-titulo');
        this.inputId = document.getElementById('criterio-id');
        this.inputNombre = document.getElementById('criterio-nombre');
        this.inputPonderacion = document.getElementById('criterio-ponderacion');
        this.inputTipo = document.getElementById('criterio-tipo');
        this.btnCancelar = document.getElementById('btn-cancelar-edicion');
        this.tablaAlta = document.getElementById('tabla-criterios-alta');
        this.tablaInterna = document.getElementById('tabla-criterios-interna');
    }

    inicializarEventos() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarCriterio();
        });
        this.btnCancelar.addEventListener('click', () => this.cancelarEdicion());
    }

    async cargarCriterios() {
        try {
            const criterios = await this.supabase.obtenerCriterios();
            this.renderizarTablas(criterios);
        } catch (error) {
            showNotification('Error al cargar los criterios', 'error');
            console.error('Error:', error);
        }
    }

    renderizarTablas(criterios) {
        this.tablaAlta.innerHTML = '';
        this.tablaInterna.innerHTML = '';

        criterios.sort((a, b) => a.nombre.localeCompare(b.nombre));

        for (const criterio of criterios) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${criterio.nombre}</td>
                <td>${criterio.ponderacion}%</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-editar" data-id="${criterio.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${criterio.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            if (criterio.tipo_evaluacion === 'ALTA') {
                this.tablaAlta.appendChild(tr);
            } else {
                this.tablaInterna.appendChild(tr);
            }
        }
        this.agregarEventosBotones();
    }

    agregarEventosBotones() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.prepararEdicion(id);
            });
        });
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de que quieres eliminar este criterio?')) {
                    this.eliminarCriterio(id);
                }
            });
        });
    }

    async guardarCriterio() {
        const criterio = {
            nombre: this.inputNombre.value.trim(),
            ponderacion: parseInt(this.inputPonderacion.value),
            tipo_evaluacion: this.inputTipo.value
        };

        if (!criterio.nombre || isNaN(criterio.ponderacion)) {
            showNotification('Por favor, complete todos los campos', 'warning');
            return;
        }

        try {
            if (this.editando) {
                await this.supabase.actualizarCriterio(this.idEditando, criterio);
                showNotification('Criterio actualizado con éxito', 'success');
            } else {
                await this.supabase.agregarCriterio(criterio);
                showNotification('Criterio agregado con éxito', 'success');
            }
            this.resetForm();
            this.cargarCriterios();
        } catch (error) {
            showNotification('Error al guardar el criterio', 'error');
            console.error('Error:', error);
        }
    }

    async prepararEdicion(id) {
        try {
            const criterios = await this.supabase.obtenerCriterios();
            const criterio = criterios.find(c => c.id == id);
            if (!criterio) return;

            this.editando = true;
            this.idEditando = id;
            this.tituloForm.textContent = 'Editar Criterio';
            this.inputNombre.value = criterio.nombre;
            this.inputPonderacion.value = criterio.ponderacion;
            this.inputTipo.value = criterio.tipo_evaluacion;
            this.btnCancelar.style.display = 'inline-block';
            window.scrollTo(0, 0);
        } catch (error) {
            showNotification('Error al cargar datos para edición', 'error');
        }
    }

    async eliminarCriterio(id) {
        try {
            await this.supabase.eliminarCriterio(id);
            showNotification('Criterio eliminado con éxito', 'success');
            this.cargarCriterios();
        } catch (error) {
            showNotification('Error al eliminar el criterio', 'error');
            console.error('Error:', error);
        }
    }

    resetForm() {
        this.form.reset();
        this.editando = false;
        this.idEditando = null;
        this.tituloForm.textContent = 'Agregar Nuevo Criterio';
        this.btnCancelar.style.display = 'none';
    }

    cancelarEdicion() {
        this.resetForm();
    }
}

document.addEventListener('DOMContentLoaded', () => new ConfiguracionManager());
