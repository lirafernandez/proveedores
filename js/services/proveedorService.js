import { db, TIPOS_EVALUACION, CRITERIOS_EVALUACION } from '../db/database.js';

export class ProveedorService {
    async agregarProveedor(proveedor) {
        try {
            const id = await db.proveedores.add({
                ...proveedor,
                fechaAlta: new Date()
            });
            return id;
        } catch (error) {
            console.error('Error al agregar proveedor:', error);
            throw error;
        }
    }

    async obtenerProveedores() {
        try {
            return await db.proveedores.toArray();
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            throw error;
        }
    }

    async obtenerProveedor(id) {
        try {
            return await db.proveedores.get(id);
        } catch (error) {
            console.error('Error al obtener proveedor:', error);
            throw error;
        }
    }

    async guardarEvaluacion(evaluacion) {
        try {
            const id = await db.evaluaciones.add({
                ...evaluacion,
                fecha: new Date()
            });
            return id;
        } catch (error) {
            console.error('Error al guardar evaluación:', error);
            throw error;
        }
    }

    async obtenerEvaluaciones(proveedorId) {
        try {
            return await db.evaluaciones
                .where('proveedorId')
                .equals(proveedorId)
                .toArray();
        } catch (error) {
            console.error('Error al obtener evaluaciones:', error);
            throw error;
        }
    }

    async guardarDocumento(documento) {
        try {
            const id = await db.documentos.add({
                ...documento,
                fecha: new Date()
            });
            return id;
        } catch (error) {
            console.error('Error al guardar documento:', error);
            throw error;
        }
    }

    async obtenerDocumentos(proveedorId) {
        try {
            return await db.documentos
                .where('proveedorId')
                .equals(proveedorId)
                .toArray();
        } catch (error) {
            console.error('Error al obtener documentos:', error);
            throw error;
        }
    }

    calcularPuntajeEvaluacion(criterios) {
        let puntajeTotal = 0;
        let ponderacionTotal = 0;
        
        for (const [criterio, valor] of Object.entries(criterios)) {
            const tipoCriterio = CRITERIOS_EVALUACION[valor.tipo][criterio];
            if (tipoCriterio) {
                puntajeTotal += valor.cumple ? tipoCriterio.ponderacion : 0;
                ponderacionTotal += tipoCriterio.ponderacion;
            }
        }

        return (puntajeTotal / ponderacionTotal) * 100;
    }
}
