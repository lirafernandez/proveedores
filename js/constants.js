export const TIPOS_EVALUACION = {
    ALTA: 'ALTA',
    INTERNA: 'INTERNA'
};

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