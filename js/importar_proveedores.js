import { db } from './db/database.js';

// Mapeo de columnas comunes que el sistema puede reconocer automáticamente
const MAPEO_COLUMNAS = {
    // Nombres de proveedor
    'nombre': ['supplier name', 'proveedor', 'nombre', 'name', 'empresa', 'razon social'],
    'rfc': ['taxpayer id', 'rfc', 'tax id', 'id fiscal', 'cuit', 'nit'],
    'supplierNumber': ['supplier number', 'numero proveedor', 'codigo', 'id', 'supplier id'],
    'businessUnit': ['business unit', 'unidad negocio', 'bu', 'division'],
    'alternateName': ['alternate name', 'nombre alterno', 'alias'],
    'site': ['site', 'sitio', 'ubicacion'],
    'status': ['status', 'estado', 'estatus'],
    // Direcciones
    'address1': ['address line 1', 'direccion', 'address', 'calle'],
    'address2': ['address line 2', 'direccion 2'],
    'address3': ['additional address element 3', 'direccion 3'],
    'city': ['city', 'ciudad'],
    'state': ['state', 'estado', 'provincia'],
    'county': ['county', 'condado', 'municipio'],
    'postalCode': ['postal code', 'codigo postal', 'cp', 'zip'],
    // Contacto y términos
    'paymentTerms': ['payment terms name', 'terminos pago', 'condiciones pago'],
    'currency': ['currency', 'moneda'],
    'remittanceEmail': ['remittance email', 'email pagos', 'correo pagos'],
    'primaryFlag': ['primary flag', 'principal', 'primario'],
    'purchasingEmail': ['purchasing email', 'email compras', 'correo compras']
};

const excelFileInput = document.getElementById('excelFile');
const btnImportar = document.getElementById('btnImportar');
const importPreview = document.getElementById('importPreview');
const fileInfo = document.getElementById('fileInfo');

let proveedoresExcel = [];
let mapeoColumnas = {};

// Función para mapear automáticamente las columnas del Excel
function mapearColumnas(columnasExcel) {
    const mapeo = {};
    const columnasDetectadas = [];
    
    for (const [campo, variantes] of Object.entries(MAPEO_COLUMNAS)) {
        for (const columna of columnasExcel) {
            const columnaLower = columna.toLowerCase().trim();
            if (variantes.includes(columnaLower)) {
                mapeo[campo] = columna;
                columnasDetectadas.push({ campo, columna, detectada: true });
                break;
            }
        }
    }
    
    return { mapeo, columnasDetectadas };
}

// Event listener para cuando se selecciona un archivo
excelFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileInfo.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-file-excel"></i> 
                <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
        `;
        btnImportar.classList.remove('btn-import-hidden');
    } else {
        fileInfo.innerHTML = '';
        btnImportar.classList.add('btn-import-hidden');
    }
});

btnImportar.addEventListener('click', async () => {
    if (!excelFileInput.files[0]) {
        mostrarMensaje('⚠️ Selecciona un archivo Excel primero.', 'warning');
        return;
    }
    const file = excelFileInput.files[0];
    mostrarMensaje('📄 Procesando archivo...', 'info');
    // Verificar extensión
    const nombreArchivo = file.name.toLowerCase();
    let rows = [];
    let workbook;
    if (nombreArchivo.endsWith('.xls')) {
        // Leer como binary string para .xls
        const reader = new FileReader();
        reader.onload = function(e) {
            const binary = e.target.result;
            try {
                workbook = XLSX.read(binary, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                procesarImport(rows);
            } catch (err) {
                console.error('Error al leer .xls:', err);
                mostrarMensaje('❌ No se pudo leer el archivo .xls. Intenta convertirlo a .xlsx.', 'error');
            }
        };
        reader.readAsBinaryString(file);
        return; // Detener flujo, procesarImport se llamará en el callback
    } else {
        const data = await file.arrayBuffer();
        workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        procesarImport(rows);
        return;
    }

    // Esta función procesa la importación después de leer el archivo
    function procesarImport(rows) {
        if (!rows || rows.length === 0) {
            mostrarMensaje('❌ El archivo está vacío o no contiene datos válidos.', 'error');
            return;
        }

        // Mapear columnas automáticamente
        const columnasExcel = Object.keys(rows[0] || {});
        const resultadoMapeo = mapearColumnas(columnasExcel);
        mapeoColumnas = resultadoMapeo.mapeo;
        
        mostrarMapeoColumnas(resultadoMapeo.columnasDetectadas, columnasExcel);
        
        // Solo mostrar advertencia si no se detectó ninguna columna importante
        const columnasImportantes = ['nombre', 'rfc', 'supplierNumber'];
        const tieneAlgunaImportante = columnasImportantes.some(col => mapeoColumnas[col]);
        
        if (!tieneAlgunaImportante) {
            mostrarMensaje('⚠️ No se detectaron columnas de identificación (Nombre, RFC, Código). Verifica que el archivo tenga los datos correctos.', 'warning');
        }

        // Detectar duplicados potenciales
        detectarDuplicados(rows).then(resultadoDuplicados => {
            proveedoresExcel = rows;
            const validacion = validarFilas(rows);
            mostrarPreview(rows, validacion, resultadoDuplicados);

            // Mostrar botón de importación después de la previsualización
            mostrarBotonImportar(rows, validacion, resultadoDuplicados);
        });
    }

    // El flujo termina en procesarImport, no se debe ejecutar nada más aquí
});

// Función para mostrar mapeo de columnas de forma simple
function mostrarMapeoColumnas(columnasDetectadas, todasLasColumnas) {
    let html = `
        <div class="alert alert-info">
            <h6><i class="fas fa-magic"></i> Detección Automática de Columnas</h6>
            <p class="mb-2">El sistema detectó automáticamente estas columnas de tu archivo:</p>
    `;
    
    if (columnasDetectadas.length > 0) {
        html += '<div class="row">';
        columnasDetectadas.forEach(item => {
            const nombreAmigable = {
                'nombre': 'Nombre del Proveedor',
                'rfc': 'RFC/ID Fiscal',
                'supplierNumber': 'Código de Proveedor',
                'businessUnit': 'Unidad de Negocio',
                'address1': 'Dirección',
                'city': 'Ciudad',
                'state': 'Estado',
                'paymentTerms': 'Términos de Pago',
                'currency': 'Moneda',
                'remittanceEmail': 'Email de Pagos',
                'purchasingEmail': 'Email de Compras'
            };
            
            html += `
                <div class="col-md-6 mb-1">
                    <span class="badge bg-success me-2">${nombreAmigable[item.campo] || item.campo}</span>
                    <small class="text-muted">← ${item.columna}</small>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<span class="text-warning">No se detectaron columnas conocidas. Los datos se importarán tal como están en el archivo.</span>';
    }
    
    html += `
            <small class="text-muted d-block mt-2">
                📊 Total de columnas en el archivo: ${todasLasColumnas.length} | 
                ✅ Detectadas: ${columnasDetectadas.length}
            </small>
        </div>
    `;
    
    importPreview.innerHTML = html;
}

function mostrarPreview(rows, validacion, duplicados) {
    let html = `
        <div class="stats-grid">
            <div class="card border-success card-stats">
                <div class="card-body text-center">
                    <h6 class="card-title text-success">✅ Completas</h6>
                    <h3 class="text-success mb-0">${validacion.completas}</h3>
                </div>
            </div>
            <div class="card border-warning card-stats">
                <div class="card-body text-center">
                    <h6 class="card-title text-warning">⚠️ Incompletas</h6>
                    <h3 class="text-warning mb-0">${validacion.incompletas}</h3>
                </div>
            </div>
            <div class="card border-danger card-stats">
                <div class="card-body text-center">
                    <h6 class="card-title text-danger">🔄 Duplicados BD</h6>
                    <h3 class="text-danger mb-0">${duplicados.conBD.length}</h3>
                </div>
            </div>
            <div class="card border-info card-stats">
                <div class="card-body text-center">
                    <h6 class="card-title text-info">📋 Duplicados Archivo</h6>
                    <h3 class="text-info mb-0">${duplicados.internos.length}</h3>
                </div>
            </div>
        </div>
    `;
    
    // Mostrar resumen de duplicados si existen
    if (duplicados.totalDuplicados > 0) {
        html += `
            <div class="alert alert-warning alert-import">
                <h6><i class="fas fa-exclamation-triangle"></i> Se detectaron ${duplicados.totalDuplicados} duplicados potenciales</h6>
                <small>
                    Los duplicados se identifican por RFC, Supplier Number o Nombre. 
                    Puedes elegir cómo manejarlos en las opciones de importación.
                </small>
            </div>
        `;
    }
    
    html += `<div class="mb-3"><h5>📋 Previsualización de datos (mostrando ${Math.min(rows.length, 100)} de ${rows.length} filas)</h5></div>`;
    html += '<div class="table-preview"><table class="table table-bordered table-sm table-hover mb-0"><thead><tr>';
    html += '<th style="width: 50px;">#</th>';
    
    // Usar las columnas que realmente están en el archivo
    const columnasExcel = Object.keys(rows[0] || {});
    html += columnasExcel.map(c => `<th class="tooltip-cell" title="${c}">${c}</th>`).join('');
    html += '<th style="width: 80px;">Estado</th>';
    html += '</tr></thead><tbody>';
    
    // Crear maps para búsqueda rápida de duplicados
    const duplicadosBDMap = new Map();
    const duplicadosInternosMap = new Map();
    
    duplicados.conBD.forEach(d => duplicadosBDMap.set(d.index, d.razon));
    duplicados.internos.forEach(d => duplicadosInternosMap.set(d.index, d.razon));
    
    // Mostrar máximo 100 filas para mejor rendimiento
    const filasAMostrar = rows.slice(0, 100);
    filasAMostrar.forEach((row, index) => {
        let estadoClase = '';
        let estadoTexto = '';
        let estadoIcono = '';
        
        if (duplicadosBDMap.has(index)) {
            estadoClase = 'table-danger';
            estadoTexto = `Duplicado en BD por: ${duplicadosBDMap.get(index).join(', ')}`;
            estadoIcono = '<span class="badge bg-danger badge-status">🔄 BD</span>';
        } else if (duplicadosInternosMap.has(index)) {
            estadoClase = 'table-info';
            estadoTexto = `Duplicado en archivo por: ${duplicadosInternosMap.get(index).join(', ')}`;
            estadoIcono = '<span class="badge bg-info badge-status">📋 Arch</span>';
        } else {
            estadoClase = '';
            estadoTexto = 'Registro nuevo';
            estadoIcono = '<span class="badge bg-success badge-status">✅ Nuevo</span>';
        }
        
        html += `<tr class="${estadoClase}">`;
        html += `<td class="text-center"><small>${index + 1}</small></td>`;
        html += columnasExcel.map(c => {
            const val = row[c];
            if (val === undefined || val === null || val === '') {
                return `<td class='missing-cell' title="Campo vacío">❌</td>`;
            }
            const displayVal = val.toString().length > 25 ? val.toString().substring(0, 25) + '...' : val;
            return `<td class="tooltip-cell" title="${val}">${displayVal}</td>`;
        }).join('');
        html += `<td class="text-center" title="${estadoTexto}">${estadoIcono}</td>`;
        html += '</tr>';
    });
    
    if (rows.length > 100) {
        html += `<tr><td colspan="${columnasExcel.length + 2}" class="text-center text-muted py-2"><em><i class="fas fa-ellipsis-h"></i> y ${rows.length - 100} filas más</em></td></tr>`;
    }
    
    html += '</tbody></table></div>';
    importPreview.innerHTML = html;
}

function validarFilas(rows) {
    let completas = 0, incompletas = 0;
    
    // Campos importantes para considerar una fila completa
    const camposImportantes = ['nombre', 'rfc', 'supplierNumber'];
    
    for (const row of rows) {
        // Una fila se considera completa si tiene al menos uno de los campos importantes
        let tieneAlgunCampoImportante = false;
        
        for (const campo of camposImportantes) {
            const columnaExcel = mapeoColumnas[campo];
            if (columnaExcel && row[columnaExcel] && row[columnaExcel].toString().trim()) {
                tieneAlgunCampoImportante = true;
                break;
            }
        }
        
        if (tieneAlgunCampoImportante) {
            completas++;
        } else {
            incompletas++;
        }
    }
    
    return { completas, incompletas };
}

// Función para detectar duplicados potenciales
async function detectarDuplicados(rows) {
    try {
        const proveedoresExistentes = await db.proveedores.toArray();
        const duplicados = [];
        const duplicadosInternos = [];
        
        // Crear sets para detección rápida con BD existente
        const existentesRFC = new Set(proveedoresExistentes.map(p => p.rfc?.toLowerCase()).filter(Boolean));
        const existentesSupplierNumber = new Set(proveedoresExistentes.map(p => p.supplierNumber?.toLowerCase()).filter(Boolean));
        const existentesNombre = new Set(proveedoresExistentes.map(p => p.nombre?.toLowerCase()).filter(Boolean));
        
        // Primer pase: crear maps de apariciones en el archivo
        const rfcMap = new Map();
        const supplierNumberMap = new Map();
        const nombreMap = new Map();
        
        rows.forEach((row, index) => {
            // Usar el mapeo para obtener los valores correctos
            const rfc = mapeoColumnas.rfc ? row[mapeoColumnas.rfc]?.toString().toLowerCase().trim() : '';
            const supplierNumber = mapeoColumnas.supplierNumber ? row[mapeoColumnas.supplierNumber]?.toString().toLowerCase().trim() : '';
            const nombre = mapeoColumnas.nombre ? row[mapeoColumnas.nombre]?.toString().toLowerCase().trim() : '';
            
            // Mapear apariciones de RFC
            if (rfc) {
                if (!rfcMap.has(rfc)) {
                    rfcMap.set(rfc, []);
                }
                rfcMap.get(rfc).push(index);
            }
            
            // Mapear apariciones de Supplier Number
            if (supplierNumber) {
                if (!supplierNumberMap.has(supplierNumber)) {
                    supplierNumberMap.set(supplierNumber, []);
                }
                supplierNumberMap.get(supplierNumber).push(index);
            }
            
            // Mapear apariciones de Nombre
            if (nombre) {
                if (!nombreMap.has(nombre)) {
                    nombreMap.set(nombre, []);
                }
                nombreMap.get(nombre).push(index);
            }
        });
        
        // Segundo pase: detectar duplicados
        rows.forEach((row, index) => {
            // Usar el mapeo para obtener los valores correctos
            const rfc = mapeoColumnas.rfc ? row[mapeoColumnas.rfc]?.toString().toLowerCase().trim() : '';
            const supplierNumber = mapeoColumnas.supplierNumber ? row[mapeoColumnas.supplierNumber]?.toString().toLowerCase().trim() : '';
            const nombre = mapeoColumnas.nombre ? row[mapeoColumnas.nombre]?.toString().toLowerCase().trim() : '';
            
            // Verificar duplicados con BD existente
            let esDuplicadoBD = false;
            let razonDuplicadoBD = [];
            
            if (rfc && existentesRFC.has(rfc)) {
                esDuplicadoBD = true;
                razonDuplicadoBD.push('RFC');
            }
            if (supplierNumber && existentesSupplierNumber.has(supplierNumber)) {
                esDuplicadoBD = true;
                razonDuplicadoBD.push('Supplier Number');
            }
            if (nombre && existentesNombre.has(nombre)) {
                esDuplicadoBD = true;
                razonDuplicadoBD.push('Nombre');
            }
            
            if (esDuplicadoBD) {
                duplicados.push({ index, razon: razonDuplicadoBD });
            }
            
            // Verificar duplicados internos (solo si NO es duplicado de BD)
            if (!esDuplicadoBD) {
                let esDuplicadoInterno = false;
                let razonDuplicadoInterno = [];
                
                // RFC duplicado interno (aparece más de una vez y no es la primera aparición)
                if (rfc && rfcMap.has(rfc) && rfcMap.get(rfc).length > 1 && rfcMap.get(rfc)[0] !== index) {
                    esDuplicadoInterno = true;
                    razonDuplicadoInterno.push('RFC');
                }
                
                // Supplier Number duplicado interno
                if (supplierNumber && supplierNumberMap.has(supplierNumber) && supplierNumberMap.get(supplierNumber).length > 1 && supplierNumberMap.get(supplierNumber)[0] !== index) {
                    esDuplicadoInterno = true;
                    razonDuplicadoInterno.push('Supplier Number');
                }
                
                // Nombre duplicado interno
                if (nombre && nombreMap.has(nombre) && nombreMap.get(nombre).length > 1 && nombreMap.get(nombre)[0] !== index) {
                    esDuplicadoInterno = true;
                    razonDuplicadoInterno.push('Nombre');
                }
                
                if (esDuplicadoInterno) {
                    duplicadosInternos.push({ index, razon: razonDuplicadoInterno });
                }
            }
        });
        
        return {
            conBD: duplicados,
            internos: duplicadosInternos,
            totalDuplicados: duplicados.length + duplicadosInternos.length
        };
    } catch (error) {
        console.error('Error detectando duplicados:', error);
        return { conBD: [], internos: [], totalDuplicados: 0 };
    }
}

// Función para mostrar mensajes con estilo
function mostrarMensaje(mensaje, tipo = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `alert ${alertClass[tipo]} alert-dismissible fade show`;
    mensajeDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insertar al principio del preview
    importPreview.insertBefore(mensajeDiv, importPreview.firstChild);
    
    // Auto-ocultar después de 5 segundos para mensajes de info
    if (tipo === 'info') {
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.remove();
            }
        }, 5000);
    }
}

// Función para mostrar validación de columnas
function mostrarValidacionColumnas(presentes, faltantes) {
    let html = `
        <div class="row mb-3">
            <div class="col-md-6">
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0">✅ Columnas Presentes (${presentes.length})</h6>
                    </div>
                    <div class="card-body" style="max-height: 200px; overflow-y: auto;">
    `;
    
    presentes.forEach(col => {
        html += `<span class="badge bg-success me-1 mb-1">${col}</span>`;
    });
    
    html += `
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0">⚠️ Columnas Faltantes (${faltantes.length})</h6>
                    </div>
                    <div class="card-body" style="max-height: 200px; overflow-y: auto;">
    `;
    
    if (faltantes.length === 0) {
        html += '<span class="text-success">¡Todas las columnas están presentes!</span>';
    } else {
        faltantes.forEach(col => {
            html += `<span class="badge bg-warning text-dark me-1 mb-1">${col}</span>`;
        });
    }
    
    html += `
                    </div>
                </div>
            </div>
        </div>
    `;
    
    importPreview.innerHTML = html;
}

// Función para mostrar botón de importación
function mostrarBotonImportar(rows, validacion, duplicados) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'text-center mt-4';
    
    let opcionesDuplicados = '';
    if (duplicados.totalDuplicados > 0) {
        opcionesDuplicados = `
            <div class="card options-panel mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-cog"></i> Opciones para Duplicados (${duplicados.totalDuplicados} encontrados)</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="duplicadosOption" id="saltarDuplicados" value="saltar" checked>
                                <label class="form-check-label" for="saltarDuplicados">
                                    <strong><i class="fas fa-shield-alt text-success"></i> Saltar duplicados</strong>
                                    <br><small class="text-muted">Solo importar registros nuevos (recomendado)</small>
                                </label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="duplicadosOption" id="actualizarDuplicados" value="actualizar">
                                <label class="form-check-label" for="actualizarDuplicados">
                                    <strong><i class="fas fa-sync-alt text-warning"></i> Actualizar duplicados</strong>
                                    <br><small class="text-muted">Sobrescribir registros existentes en BD</small>
                                </label>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="duplicadosOption" id="importarTodos" value="todos">
                                <label class="form-check-label" for="importarTodos">
                                    <strong><i class="fas fa-exclamation-triangle text-danger"></i> Importar todos</strong>
                                    <br><small class="text-muted">Crear registros duplicados (no recomendado)</small>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    btnContainer.innerHTML = `
        ${opcionesDuplicados}
        <div class="card import-summary">
            <div class="card-body">
                <h5 class="card-title"><i class="fas fa-rocket"></i> Resumen de Importación</h5>
                <div class="row text-center mb-3">
                    <div class="col-3">
                        <div class="d-flex flex-column align-items-center">
                            <span class="badge bg-primary fs-5 mb-1">${rows.length}</span>
                            <small class="text-muted">Total registros</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="d-flex flex-column align-items-center">
                            <span class="badge bg-success fs-5 mb-1">${validacion.completas}</span>
                            <small class="text-muted">Completos</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="d-flex flex-column align-items-center">
                            <span class="badge bg-warning fs-5 mb-1">${validacion.incompletas}</span>
                            <small class="text-muted">Incompletos</small>
                        </div>
                    </div>
                    <div class="col-3">
                        <div class="d-flex flex-column align-items-center">
                            <span class="badge bg-danger fs-5 mb-1">${duplicados.totalDuplicados}</span>
                            <small class="text-muted">Duplicados</small>
                        </div>
                    </div>
                </div>
                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                    <button id="btnConfirmarImport" class="btn btn-success btn-lg btn-import me-md-2">
                        <i class="fas fa-upload"></i> Importar Proveedores
                    </button>
                    <button id="btnCancelarImport" class="btn btn-secondary btn-lg btn-import">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    importPreview.appendChild(btnContainer);
    
    // Event listeners para los botones
    document.getElementById('btnConfirmarImport').addEventListener('click', () => ejecutarImportacion(rows, duplicados));
    document.getElementById('btnCancelarImport').addEventListener('click', () => limpiarPreview());
}

// Función para ejecutar la importación
async function ejecutarImportacion(rows, duplicados) {
    const btnImport = document.getElementById('btnConfirmarImport');
    btnImport.disabled = true;
    btnImport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    
    // Obtener opción seleccionada para duplicados
    let opcionDuplicados = 'saltar';
    const radioButtons = document.querySelectorAll('input[name="duplicadosOption"]');
    radioButtons.forEach(radio => {
        if (radio.checked) {
            opcionDuplicados = radio.value;
        }
    });
    
    mostrarMensaje('🔄 Importando proveedores...', 'info');
    
    try {
        let count = 0;
        let saltados = 0;
        let actualizados = 0;
        
        // Crear sets de índices de duplicados
        const duplicadosBDIndices = new Set(duplicados.conBD.map(d => d.index));
        const duplicadosInternosIndices = new Set(duplicados.internos.map(d => d.index));
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const esDuplicadoBD = duplicadosBDIndices.has(i);
            const esDuplicadoInterno = duplicadosInternosIndices.has(i);
            
            // Lógica de manejo de duplicados
            if (esDuplicadoBD) {
                // Duplicado con BD existente
                if (opcionDuplicados === 'saltar') {
                    saltados++;
                    continue;
                } else if (opcionDuplicados === 'actualizar') {
                    // Buscar y actualizar el registro existente
                    const rfc = mapeoColumnas.rfc ? row[mapeoColumnas.rfc]?.toString().trim() : '';
                    const supplierNumber = mapeoColumnas.supplierNumber ? row[mapeoColumnas.supplierNumber]?.toString().trim() : '';
                    const nombre = mapeoColumnas.nombre ? row[mapeoColumnas.nombre]?.toString().trim() : '';
                    
                    let existente = null;
                    if (rfc) {
                        existente = await db.proveedores.where('rfc').equalsIgnoreCase(rfc).first();
                    }
                    if (!existente && supplierNumber) {
                        existente = await db.proveedores.where('supplierNumber').equalsIgnoreCase(supplierNumber).first();
                    }
                    if (!existente && nombre) {
                        existente = await db.proveedores.where('nombre').equalsIgnoreCase(nombre).first();
                    }
                    
                    if (existente) {
                        // Actualizar campos usando el mapeo
                        const actualizacion = { fechaModificacion: new Date() };
                        
                        for (const [campo, columnaExcel] of Object.entries(mapeoColumnas)) {
                            if (row[columnaExcel] && row[columnaExcel].toString().trim()) {
                                actualizacion[campo] = row[columnaExcel].toString().trim();
                            }
                        }
                        
                        await db.proveedores.update(existente.id, actualizacion);
                        actualizados++;
                        continue;
                    }
                }
                // Si opcionDuplicados === 'todos', continúa para crear el registro
            } else if (esDuplicadoInterno) {
                // Duplicado interno en el archivo
                if (opcionDuplicados === 'saltar') {
                    saltados++;
                    continue;
                }
                // Para duplicados internos, si la opción es 'actualizar' o 'todos', 
                // solo procesamos el primero y saltamos los demás
                if (opcionDuplicados === 'actualizar') {
                    saltados++;
                    continue;
                }
                // Si opcionDuplicados === 'todos', continúa para crear el registro
            }
            
            // Crear nuevo registro usando el mapeo de columnas
            const nuevoProveedor = {
                fechaAlta: new Date()
            };
            
            // Mapear todos los campos disponibles
            for (const [campo, columnaExcel] of Object.entries(mapeoColumnas)) {
                if (row[columnaExcel]) {
                    nuevoProveedor[campo] = row[columnaExcel].toString().trim();
                }
            }
            
            // Asegurar que los campos requeridos no estén undefined
            const camposRequeridos = ['businessUnit', 'supplierNumber', 'nombre', 'alternateName', 'rfc', 'site', 'status', 
                                    'address1', 'address2', 'address3', 'city', 'state', 'county', 'postalCode', 
                                    'paymentTerms', 'currency', 'remittanceEmail', 'primaryFlag', 'purchasingEmail'];
            
            camposRequeridos.forEach(campo => {
                if (!nuevoProveedor[campo]) {
                    nuevoProveedor[campo] = '';
                }
            });
            
            await db.proveedores.add(nuevoProveedor);
            count++;
        }
        
        let mensajeExito = `🎉 ¡Importación completada! `;
        if (count > 0) mensajeExito += `${count} nuevos proveedores. `;
        if (actualizados > 0) mensajeExito += `${actualizados} actualizados. `;
        if (saltados > 0) mensajeExito += `${saltados} duplicados saltados.`;
        
        mostrarMensaje(mensajeExito, 'success');
        
        // Limpiar formulario
        excelFileInput.value = '';
        setTimeout(() => limpiarPreview(), 3000);
        
    } catch (error) {
        console.error('Error durante importación:', error);
        mostrarMensaje('❌ Error durante la importación. Revisa la consola para detalles.', 'error');
        btnImport.disabled = false;
        btnImport.innerHTML = '<i class="fas fa-upload"></i> Importar Proveedores';
    }
}

// Función para limpiar preview
function limpiarPreview() {
    importPreview.innerHTML = `
        <div class="text-center text-muted py-5 empty-state">
            <i class="fas fa-table fa-3x mb-3"></i>
            <p>Selecciona un archivo Excel para ver la previsualización</p>
        </div>
    `;
}
