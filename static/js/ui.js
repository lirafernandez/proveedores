/**
 * ui.js - Componentes y utilidades de interfaz de usuario
 */

/**
 * Muestra una notificación toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación: success, danger, warning, info
 */
function mostrarNotificacion(mensaje, tipo = 'success') {
  const toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    console.error('No se encontró el contenedor de notificaciones');
    return;
  }
  
  const toastElement = document.createElement('div');
  toastElement.className = `toast align-items-center text-white bg-${tipo} border-0`;
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', 'assertive');
  toastElement.setAttribute('aria-atomic', 'true');
  
  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${mensaje}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toastElement);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Remover después de ocultarse
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.remove();
  });
}

/**
 * Formatea una fecha para mostrar
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} - Fecha formateada
 */
function formatearFecha(fecha) {
  if (!fecha) return 'No disponible';
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return new Date(fecha).toLocaleDateString('es-MX', options);
}

/**
 * Formatea un valor monetario
 * @param {number} valor - Valor a formatear
 * @returns {string} - Valor formateado como moneda MXN
 */
function formatearMoneda(valor) {
  if (valor === null || valor === undefined) return 'No disponible';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

/**
 * Calcula días restantes entre hoy y una fecha futura
 * @param {string} fechaFin - Fecha de fin en formato ISO
 * @returns {number} - Días restantes (negativo si ya pasó)
 */
function calcularDiasRestantes(fechaFin) {
  const hoy = new Date();
  const fecha = new Date(fechaFin);
  
  // Reset de horas para comparar solo fechas
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  
  const diferencia = fecha - hoy;
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene un parámetro de la URL
 * @param {string} nombre - Nombre del parámetro
 * @returns {string|null} - Valor del parámetro o null si no existe
 */
function obtenerParametroUrl(nombre) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nombre);
}

/**
 * Inicializa tooltips de Bootstrap
 */
function inicializarTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Convierte una fecha al formato YYYY-MM-DD para inputs
 * @param {Date} fecha - Objeto fecha
 * @returns {string} - Fecha formateada
 */
function formatearFechaInput(fecha) {
  if (!fecha) return '';
  
  const d = new Date(fecha);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}