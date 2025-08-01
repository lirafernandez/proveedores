/**
 * storage.js - Manejo del almacenamiento local para la aplicación
 */

const APP_PREFIX = 'prov_sys_';
const KEYS = {
  PROVEEDORES: `${APP_PREFIX}proveedores`,
  CONTRATOS: `${APP_PREFIX}contratos`,
  UPLOADS: `${APP_PREFIX}uploads`
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
  
  // Si no tiene ID, crear uno nuevo
  if (!proveedor.id) {
    proveedor.id = generarId();
    proveedor.fechaRegistro = new Date().toISOString();
    proveedores.push(proveedor);
  } else {
    // Actualizar proveedor existente
    const index = proveedores.findIndex(p => p.id === proveedor.id);
    if (index !== -1) {
      proveedor.fechaActualizacion = new Date().toISOString();
      proveedores[index] = proveedor;
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
 * @returns {boolean} - true si se eliminó, false si no se encontró
 */
function eliminarProveedor(id) {
  const proveedores = obtenerProveedores();
  const index = proveedores.findIndex(p => p.id === id);
  
  if (index !== -1) {
    proveedores.splice(index, 1);
    guardarProveedores(proveedores);
    return true;
  }
  
  return false;
}

/**
 * Guarda información de un archivo subido (simulado)
 * @param {string} proveedorId - ID del proveedor
 * @param {string} tipo - Tipo de archivo (constancia, contrato, anexo)
 * @param {Object} fileData - Datos del archivo
 * @returns {string} - URL simulada del archivo
 */
function guardarArchivo(proveedorId, tipo, fileData) {
  // Obtener lista de uploads
  const uploads = JSON.parse(localStorage.getItem(KEYS.UPLOADS) || '[]');
  
  // Crear un ID único para el archivo
  const fileId = generarId();
  
  // Crear ruta simulada
  const path = `uploads/${tipo}/${fileId}_${fileData.name}`;
  
  // Guardar información del archivo
  uploads.push({
    id: fileId,
    proveedorId,
    tipo,
    nombre: fileData.name,
    path,
    tamaño: fileData.size,
    tipo: fileData.type,
    fechaSubida: new Date().toISOString()
  });
  
  localStorage.setItem(KEYS.UPLOADS, JSON.stringify(uploads));
  
  // Devolver URL simulada
  return path;
}

/**
 * Agrega un contrato a un proveedor
 * @param {string} proveedorId - ID del proveedor
 * @param {Object} contrato - Datos del contrato
 * @returns {string} - ID del contrato agregado
 */
function agregarContrato(proveedorId, contrato) {
  const proveedores = obtenerProveedores();
  const index = proveedores.findIndex(p => p.id === proveedorId);
  
  if (index === -1) {
    throw new Error('No se encontró el proveedor');
  }
  
  // Si el proveedor no tiene contratos, crear el array
  if (!proveedores[index].contratos) {
    proveedores[index].contratos = [];
  }
  
  // Generar ID para el contrato si no tiene
  if (!contrato.id) {
    contrato.id = 'c' + generarId();
    contrato.fechaCreacion = new Date().toISOString();
  } else {
    contrato.fechaActualizacion = new Date().toISOString();
  }
  
  // Agregar o actualizar el contrato
  const contratoIndex = proveedores[index].contratos.findIndex(c => c.id === contrato.id);
  
  if (contratoIndex === -1) {
    // Nuevo contrato
    proveedores[index].contratos.push(contrato);
  } else {
    // Actualizar contrato existente
    proveedores[index].contratos[contratoIndex] = contrato;
  }
  
  guardarProveedores(proveedores);
  
  return contrato.id;
}

/**
 * Elimina un contrato
 * @param {string} proveedorId - ID del proveedor
 * @param {string} contratoId - ID del contrato a eliminar
 * @returns {boolean} - true si se eliminó, false si no se encontró
 */
function eliminarContrato(proveedorId, contratoId) {
  const proveedores = obtenerProveedores();
  const provIndex = proveedores.findIndex(p => p.id === proveedorId);
  
  if (provIndex === -1 || !proveedores[provIndex].contratos) {
    return false;
  }
  
  const contratoIndex = proveedores[provIndex].contratos.findIndex(c => c.id === contratoId);
  
  if (contratoIndex === -1) {
    return false;
  }
  
  proveedores[provIndex].contratos.splice(contratoIndex, 1);
  guardarProveedores(proveedores);
  
  return true;
}

/**
 * Genera un ID único
 * @returns {string} - ID generado
 */
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Inicializa datos de prueba si no existen
 */
function inicializarDatos() {
  if (localStorage.getItem(KEYS.PROVEEDORES) === null) {
    cargarDatosDePrueba();
  }
}

/**
 * Carga datos de prueba en el almacenamiento (SISTEMA LIMPIO - SIN DATOS DE EJEMPLO)
 */
function cargarDatosDePrueba() {
  // Sistema inicializado sin datos de ejemplo
  // El usuario agregará sus propios proveedores
  const proveedoresVacios = [];
  guardarProveedores(proveedoresVacios);
  
  console.log('✅ Sistema inicializado limpio - Sin datos de ejemplo');
}

/**
 * Función auxiliar para sincronizar con GitHub si está configurado
 */
async function sincronizarConGitHubSiConfigurado() {
  try {
    const modo = localStorage.getItem('modo_trabajo') || 'local';
    
    if (modo === 'hibrido' || modo === 'github') {
      if (window.githubStorage && window.githubStorage.configurado()) {
        // En modo híbrido, hacer backup automático
        if (modo === 'hibrido') {
          await window.githubStorage.backup();
        }
        // En modo solo GitHub, subir directamente
        else if (modo === 'github') {
          await window.githubStorage.subir();
        }
      }
    }
  } catch (error) {
    console.warn('No se pudo sincronizar con GitHub:', error);
  }
}

/**
 * Inicializar datos con soporte para GitHub
 */
async function inicializarDatosConGitHub() {
  const modo = localStorage.getItem('modo_trabajo') || 'local';
  
  if (modo === 'github' && window.githubStorage && window.githubStorage.configurado()) {
    // En modo solo GitHub, cargar desde GitHub
    try {
      await window.githubStorage.sincronizar();
    } catch (error) {
      console.warn('No se pudo cargar desde GitHub, usando datos locales');
      inicializarDatos();
    }
  } else {
    // Modo local o híbrido: usar datos locales
    inicializarDatos();
    
    // Si es híbrido y GitHub está configurado, sincronizar en background
    if (modo === 'hibrido' && window.githubStorage && window.githubStorage.configurado()) {
      try {
        await window.githubStorage.sincronizar();
      } catch (error) {
        console.warn('Sincronización en background falló:', error);
      }
    }
  }
}