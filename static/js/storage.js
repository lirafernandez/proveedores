/**
 * storage.js - Manejo del almacenamiento local para la aplicación
 */

const APP_PREFIX = 'prov_sys_';
const KEYS = {
  PROVEEDORES: `${APP_PREFIX}proveedores`,
};

/**
 * Obtiene todos los proveedores
 * @returns {Array} - Lista de proveedores
 */
function obtenerProveedores() {
  const data = localStorage.getItem(KEYS.PROVEEDORES);
  return data ? JSON.parse(data) : [];
}

/**
 * Guarda la lista completa de proveedores
 * @param {Array} proveedores - Lista de proveedores a guardar
 */
function guardarProveedores(proveedores) {
  localStorage.setItem(KEYS.PROVEEDORES, JSON.stringify(proveedores));
}

/**
 * Obtiene un proveedor por su ID
 * @param {string} id - ID del proveedor
 * @returns {Object|null} - Datos del proveedor o null si no existe
 */
function obtenerProveedor(id) {
  const proveedores = obtenerProveedores();
  return proveedores.find(p => p.id === id) || null;
}

/**
 * Guarda un proveedor nuevo o actualiza uno existente
 * @param {Object} proveedor - Datos del proveedor
 * @returns {string} - ID del proveedor guardado
 */
function guardarProveedor(proveedor) {
  const proveedores = obtenerProveedores();

  if (!proveedor.id) {
    proveedor.id = 'prov_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
    proveedor.fechaRegistro = new D-ate().toISOString();
    proveedores.push(proveedor);
  } else {
    const index = proveedores.findIndex(p => p.id === proveedor.id);
    if (index !== -1) {
      proveedor.fechaActualizacion = new Date().toISOString();
      proveedores[index] = { ...proveedores[index], ...proveedor };
    } else {
      throw new Error('No se encontró el proveedor para actualizar');
    }
  }

  guardarProveedores(proveedores);
  return proveedor.id;
}

/**
 * Elimina un proveedor por su ID
 * @param {string} id - ID del proveedor a eliminar
 */
function eliminarProveedor(id) {
    let proveedores = obtenerProveedores();
    proveedores = proveedores.filter(p => p.id !== id);
    guardarProveedores(proveedores);
}

/**
 * Agrega un contrato a un proveedor
 * @param {string} proveedorId - ID del proveedor
 * @param {Object} contrato - Datos del contrato
 * @returns {string} - ID del contrato agregado
 */
function agregarContrato(proveedorId, contrato) {
    const proveedores = obtenerProveedores();
    const provIndex = proveedores.findIndex(p => p.id === proveedorId);

    if (provIndex === -1) {
        throw new Error('No se encontró el proveedor');
    }

    if (!proveedores[provIndex].contracts) {
        proveedores[provIndex].contracts = [];
    }

    if (!contrato.id) {
        contrato.id = 'cont_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
        proveedores[provIndex].contracts.push(contrato);
    } else {
        const contIndex = proveedores[provIndex].contracts.findIndex(c => c.id === contrato.id);
        if (contIndex !== -1) {
            proveedores[provIndex].contracts[contIndex] = { ...proveedores[provIndex].contracts[contIndex], ...contrato };
        } else {
            proveedores[provIndex].contracts.push(contrato);
        }
    }

    guardarProveedores(proveedores);
    return contrato.id;
}

/**
 * Elimina un contrato
 * @param {string} proveedorId - ID del proveedor
 * @param {string} contratoId - ID del contrato a eliminar
 */
function eliminarContrato(proveedorId, contratoId) {
    const proveedores = obtenerProveedores();
    const provIndex = proveedores.findIndex(p => p.id === proveedorId);

    if (provIndex !== -1 && proveedores[provIndex].contracts) {
        proveedores[provIndex].contracts = proveedores[provIndex].contracts.filter(c => c.id !== contratoId);
        guardarProveedores(proveedores);
    }
}

/**
 * Inicializa datos de prueba si no existen
 */
function inicializarDatos() {
  if (localStorage.getItem(KEYS.PROVEEDORES) === null) {
    guardarProveedores([]);
    console.log('✅ Sistema inicializado limpio - Sin datos de ejemplo');
  }
}
