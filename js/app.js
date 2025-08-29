import { ProveedorService } from './services/proveedorService.js';
import { UIManager } from './ui/uiManager.js';
import { TIPOS_EVALUACION, CRITERIOS_EVALUACION } from './db/database.js';

class App {
    constructor() {
        this.proveedorService = new ProveedorService();
        this.uiManager = new UIManager();
        this.proveedorActual = null;
        this.tipoEvaluacionActual = null;
    }

    async init() {
        await this.cargarProveedores();
    }

    async cargarProveedores() {
        try {
            const proveedores = await this.proveedorService.obtenerProveedores();
            // Cargar las evaluaciones para cada proveedor
            for (const proveedor of proveedores) {
                const evaluaciones = await this.proveedorService.obtenerEvaluaciones(proveedor.id);
                const evaluacionAlta = evaluaciones.find(e => e.tipoEvaluacion === TIPOS_EVALUACION.ALTA);
                const evaluacionInterna = evaluaciones.find(e => e.tipoEvaluacion === TIPOS_EVALUACION.INTERNA);
                
                proveedor.evaluacionAlta = evaluacionAlta ? evaluacionAlta.resultado : null;
                proveedor.evaluacionInterna = evaluacionInterna ? evaluacionInterna.resultado : null;
            }
            this.uiManager.mostrarListaProveedores(proveedores);
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            alert('Error al cargar la lista de proveedores');
        }
    }

    mostrarFormularioProveedor() {
        this.uiManager.mostrarFormularioProveedor();
    }

    async guardarProveedor(proveedor) {
        try {
            await this.proveedorService.agregarProveedor(proveedor);
            await this.cargarProveedores();
        } catch (error) {
            console.error('Error al guardar proveedor:', error);
            alert('Error al guardar el proveedor');
        }
    }

    async verProveedor(id) {
        try {
            this.proveedorActual = await this.proveedorService.obtenerProveedor(id);
            // Implementar vista de detalle del proveedor
            await this.cargarProveedores(); // Temporal, cambiar por vista de detalle
        } catch (error) {
            console.error('Error al cargar proveedor:', error);
            alert('Error al cargar los datos del proveedor');
        }
    }

    async evaluarProveedor(id, tipoEvaluacion = TIPOS_EVALUACION.ALTA) {
        try {
            this.proveedorActual = await this.proveedorService.obtenerProveedor(id);
            this.tipoEvaluacionActual = tipoEvaluacion;
            const criterios = CRITERIOS_EVALUACION[tipoEvaluacion];
            this.uiManager.mostrarFormularioEvaluacion(
                this.proveedorActual,
                tipoEvaluacion,
                criterios
            );
        } catch (error) {
            console.error('Error al preparar evaluación:', error);
            alert('Error al preparar el formulario de evaluación');
        }
    }

    async guardarEvaluacion(criterios) {
        try {
            const evaluacion = {
                proveedorId: this.proveedorActual.id,
                tipoEvaluacion: this.tipoEvaluacionActual,
                criterios,
                resultado: this.proveedorService.calcularPuntajeEvaluacion(criterios)
            };
            await this.proveedorService.guardarEvaluacion(evaluacion);
            await this.cargarProveedores();
        } catch (error) {
            console.error('Error al guardar evaluación:', error);
            alert('Error al guardar la evaluación');
        }
    }
}

// Inicializar la aplicación
window.app = new App();
window.app.init();
