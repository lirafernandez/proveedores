import { SupabaseService } from './services/supabaseService.js';
import { showNotification } from './ui/notifications.js';

const MAPEO_COLUMNAS = {
    'nombre': ['supplier name', 'proveedor', 'nombre', 'name', 'empresa', 'razon social'],
    'rfc': ['taxpayer id', 'rfc', 'tax id', 'id fiscal', 'cuit', 'nit'],
    'supplier_number': ['supplier number', 'numero proveedor', 'codigo', 'id', 'supplier id'],
    'business_unit': ['business unit', 'unidad negocio', 'bu', 'division'],
    'alternate_name': ['alternate name', 'nombre alterno', 'alias'],
    'city': ['city', 'ciudad'],
    'state': ['state', 'estado', 'provincia'],
    'county': ['county', 'condado', 'municipio'],
    'postal_code': ['postal code', 'codigo postal', 'cp', 'zip'],
    'payment_terms': ['payment terms name', 'terminos pago', 'condiciones pago'],
    'currency': ['currency', 'moneda'],
    'remittance_email': ['remittance email', 'email pagos', 'correo pagos'],
    'primary_flag': ['primary flag', 'principal', 'primario'],
    'purchasing_email': ['purchasing email', 'email compras', 'correo compras']
};

class ImportarManager {
    constructor() {
        this.proveedoresExcel = [];
        this.mapeoDetectado = {};
        this.supabase = new SupabaseService();
        this.cacheDOM();
        this.inicializarEventos();
    }

    cacheDOM() {
        this.excelFileInput = document.getElementById('excelFile');
        this.importPreview = document.getElementById('importPreview');
    }

    inicializarEventos() {
        if (this.excelFileInput) this.excelFileInput.addEventListener('change', (e) => this.procesarArchivo(e));
    }

    async procesarArchivo(e) {
        const file = e.target.files[0];
        if (!file) {
            showNotification('⚠️ No se seleccionó ningún archivo.', 'warning');
            return;
        }
        showNotification('📄 Procesando archivo...', 'info');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rows.length === 0) {
                showNotification('❌ El archivo está vacío.', 'error');
                return;
            }

            this.proveedoresExcel = rows;
            const columnasExcel = Object.keys(rows[0]);
            this.mapeoDetectado = this.mapearColumnas(columnasExcel);

            const { data: proveedoresExistentes } = await this.supabase.obtenerProveedores({ porPagina: 0 });

            this.mostrarPreview(rows, this.mapeoDetectado, proveedoresExistentes);

        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            showNotification('❌ Error inesperado al procesar el archivo.', 'error');
        }
    }

    mapearColumnas(columnasExcel) {
        const mapeo = {};
        for (const [campo, variantes] of Object.entries(MAPEO_COLUMNAS)) {
            for (const columna of columnasExcel) {
                const columnaLower = columna.toLowerCase().trim();
                if (variantes.includes(columnaLower)) {
                    mapeo[campo] = columna;
                    break;
                }
            }
        }
        return mapeo;
    }

    mostrarPreview(rows, mapeo, proveedoresExistentes) {
        const rfcsExistentes = new Set(proveedoresExistentes.map(p => p.rfc));
        let previewHtml = `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-bold mb-4">Vista Previa de Importación (${rows.length} registros encontrados)</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th class="px-6 py-3">Estado</th>
                                <th class="px-6 py-3">Nombre</th>
                                <th class="px-6 py-3">RFC</th>
                                <th class="px-6 py-3">Supplier Number</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        rows.forEach(row => {
            const nombre = row[mapeo['nombre']] || 'N/A';
            const rfc = row[mapeo['rfc']] || 'N/A';
            const supplierNumber = row[mapeo['supplier_number']] || 'N/A';
            const isDuplicate = rfc !== 'N/A' && rfcsExistentes.has(rfc);

            previewHtml += `
                <tr class="bg-white border-b ${isDuplicate ? 'bg-yellow-50' : ''}">
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 font-semibold leading-tight rounded-full ${isDuplicate ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}">
                            ${isDuplicate ? 'Duplicado' : 'Nuevo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-medium text-gray-900">${nombre}</td>
                    <td class="px-6 py-4">${rfc}</td>
                    <td class="px-6 py-4">${supplierNumber}</td>
                </tr>
            `;
        });

        previewHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 flex justify-end">
                    <button id="btnConfirmarImportacion" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                        Confirmar e Importar ${rows.filter(row => !rfcsExistentes.has(row[mapeo['rfc']])).length} Nuevos Proveedores
                    </button>
                </div>
            </div>
        `;

        this.importPreview.innerHTML = previewHtml;
        document.getElementById('btnConfirmarImportacion').addEventListener('click', () => this.guardarProveedores(rows, mapeo, rfcsExistentes));
    }

    async guardarProveedores(rows, mapeo, rfcsExistentes) {
        showNotification('🔄 Importando proveedores... Esto puede tardar un momento.', 'info');
        const nuevosProveedores = rows.filter(row => {
            const rfc = row[mapeo['rfc']];
            return rfc && !rfcsExistentes.has(rfc);
        });

        const promesasDeGuardado = nuevosProveedores.map(row => {
            const proveedorData = {};
            for (const campo in mapeo) {
                if (row.hasOwnProperty(mapeo[campo])) {
                    proveedorData[campo] = row[mapeo[campo]];
                }
            }
            return this.supabase.guardarProveedor(proveedorData);
        });

        try {
            await Promise.all(promesasDeGuardado);
            showNotification(`✅ ¡Éxito! Se importaron ${nuevosProveedores.length} nuevos proveedores.`, 'success');
            this.importPreview.innerHTML = ''; // Limpiar vista previa
            this.excelFileInput.value = ''; // Limpiar input de archivo
            document.getElementById('fileInfo').textContent = 'Ningún archivo seleccionado.';
        } catch (error) {
            console.error('Error al guardar proveedores:', error);
            showNotification('❌ Ocurrió un error al guardar los proveedores en la base de datos.', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImportarManager();
});
