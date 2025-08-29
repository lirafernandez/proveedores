import { db, TIPOS_EVALUACION } from './db/database.js';

class Dashboard {
    constructor() {
        this.initializeDashboard();
    }

    async initializeDashboard() {
        await this.actualizarEstadisticas();
        // Actualizar cada 5 minutos
        setInterval(() => this.actualizarEstadisticas(), 300000);
    }

    async actualizarEstadisticas() {
        try {
            // Contar total de proveedores
            const totalProveedores = await db.proveedores.count();
            document.getElementById('totalProveedores').textContent = 
                `Total: ${totalProveedores} proveedores`;

            // Contar evaluaciones pendientes
            const proveedores = await db.proveedores.toArray();
            const evaluaciones = await db.evaluaciones.toArray();
            
            let pendientes = 0;
            for (const proveedor of proveedores) {
                const tieneAlta = evaluaciones.some(e => 
                    e.proveedorId === proveedor.id && e.tipoEvaluacion === TIPOS_EVALUACION.ALTA);
                const tieneInterna = evaluaciones.some(e => 
                    e.proveedorId === proveedor.id && e.tipoEvaluacion === TIPOS_EVALUACION.INTERNA);
                
                if (!tieneAlta || !tieneInterna) pendientes++;
            }
            
            document.getElementById('evaluacionesPendientes').textContent = 
                `${pendientes} evaluaciones pendientes`;

            // Calcular proveedores aprobados
            const aprobados = evaluaciones.filter(e => e.puntaje >= 70).length;
            document.getElementById('proveedoresAprobados').textContent = 
                `${aprobados} proveedores`;

            // Total de evaluaciones completadas
            document.getElementById('evaluacionesCompletadas').textContent = 
                `${evaluaciones.length} evaluaciones`;

        } catch (error) {
            console.error('Error al actualizar estadísticas:', error);
            alert('Error al cargar las estadísticas');
        }
    }
}

// Inicializar el dashboard
const dashboard = new Dashboard();
