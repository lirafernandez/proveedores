import Dexie from 'https://unpkg.com/dexie@latest/dist/modern/dexie.mjs';

export const db = new Dexie('ZoomlionProveedoresDB');

// Versión 3: agrega campos para comentarios en evaluaciones
db.version(3).stores({
    proveedores: '++id, nombre, rfc, fechaAlta',
    evaluaciones: '++id, proveedorId, fecha, tipoEvaluacion, resultado, comentarios, [proveedorId+tipoEvaluacion]',
    documentos: '++id, proveedorId, tipo, fecha, nombreArchivo, contenido'
});

// Definición de los tipos de evaluación
export const TIPOS_EVALUACION = {
    ALTA: 'ALTA',
    INTERNA: 'INTERNA'
};

// Criterios de evaluación con sus ponderaciones
export const CRITERIOS_EVALUACION = {
    ALTA: {
        cartaOpinionPositiva: { 
            nombre: 'Carta Opinión Positiva del mes en curso',
            ponderacion: 10
        },
        estadoCuenta: {
            nombre: 'Estado de Cuenta (no mayor a 3 meses)',
            ponderacion: 10
        },
        constanciaSituacionFiscal: {
            nombre: 'Constancia de Situación Fiscal',
            ponderacion: 10
        },
        comprobanteDomicilio: {
            nombre: 'Comprobante de Domicilio',
            ponderacion: 6
        }
    },
    INTERNA: {
        formatoAlta: {
            nombre: 'Formato Alta de Proveedores',
            ponderacion: 5
        },
        verificacionDireccion: {
            nombre: 'Verificación de Dirección Física',
            ponderacion: 10
        },
        contactos: {
            nombre: 'Contactos de Ventas/Finanzas (2 o más)',
            ponderacion: 5
        },
        legitimidadPapeleria: {
            nombre: 'Legitimidad de Papelería',
            ponderacion: 10
        },
        referencias: {
            nombre: 'Referencias de Clientes',
            ponderacion: 6
        },
        actaConstitutiva: {
            nombre: 'Acta Constitutiva',
            ponderacion: 6
        },
        registroPatronal: {
            nombre: 'Registro Patronal',
            ponderacion: 5
        },
        estadosFinancieros: {
            nombre: 'Estados Financieros',
            ponderacion: 5
        },
        ineRepresentante: {
            nombre: 'INE del Representante Legal',
            ponderacion: 6
        }
    }
};
