// Script de migración manual a GitHub
async function migrarTodoAGitHub() {
    console.log('🚀 Iniciando migración completa a GitHub...');
    
    try {
        // 1. Verificar configuración
        if (!window.githubStorage || !window.githubStorage.configurado()) {
            throw new Error('GitHub no está configurado');
        }
        
        // 2. Obtener todos los proveedores locales
        const proveedores = obtenerProveedores();
        console.log(`📋 Encontrados ${proveedores.length} proveedores locales`);
        
        // 3. Subir datos de proveedores
        console.log('📤 Subiendo datos de proveedores...');
        await window.githubStorage.guardarProveedoresGitHub(proveedores);
        console.log('✅ Datos de proveedores subidos');
        
        // 4. Subir archivos PDFs
        let archivosSubidos = 0;
        let errores = 0;
        
        for (const proveedor of proveedores) {
            // Subir constancias
            if (proveedor.constanciaData && proveedor.constanciaData.data) {
                try {
                    console.log(`📄 Subiendo constancia de ${proveedor.nombre}...`);
                    
                    // Convertir base64 a blob
                    const blob = base64ToBlob(proveedor.constanciaData.data, proveedor.constanciaData.tipo);
                    const file = new File([blob], proveedor.constanciaData.nombre, { type: proveedor.constanciaData.tipo });
                    
                    // Subir a GitHub
                    const resultado = await window.githubFiles.subir(file, proveedor.id, 'constancia');
                    if (resultado) {
                        archivosSubidos++;
                        console.log(`✅ Constancia de ${proveedor.nombre} subida`);
                    }
                } catch (error) {
                    console.error(`❌ Error subiendo constancia de ${proveedor.nombre}:`, error);
                    errores++;
                }
            }
            
            // Subir contratos
            if (proveedor.contratos) {
                for (const contrato of proveedor.contratos) {
                    if (contrato.documentoData && contrato.documentoData.data) {
                        try {
                            console.log(`📄 Subiendo contrato ${contrato.numero} de ${proveedor.nombre}...`);
                            
                            // Convertir base64 a blob
                            const blob = base64ToBlob(contrato.documentoData.data, contrato.documentoData.tipo);
                            const file = new File([blob], contrato.documentoData.nombre, { type: contrato.documentoData.tipo });
                            
                            // Subir a GitHub
                            const resultado = await window.githubFiles.subir(file, `${proveedor.id}_${contrato.id}`, 'contrato');
                            if (resultado) {
                                archivosSubidos++;
                                console.log(`✅ Contrato ${contrato.numero} de ${proveedor.nombre} subido`);
                            }
                        } catch (error) {
                            console.error(`❌ Error subiendo contrato de ${proveedor.nombre}:`, error);
                            errores++;
                        }
                    }
                }
            }
        }
        
        // 5. Resultado final
        console.log(`🎉 Migración completada:`);
        console.log(`   ✅ Archivos subidos: ${archivosSubidos}`);
        console.log(`   ❌ Errores: ${errores}`);
        console.log(`   📊 Total proveedores: ${proveedores.length}`);
        
        // 6. Actualizar timestamp de sincronización
        localStorage.setItem('ultima_migracion_github', new Date().toISOString());
        localStorage.setItem('migracion_completa', 'true');
        
        return {
            exito: true,
            archivosSubidos,
            errores,
            totalProveedores: proveedores.length
        };
        
    } catch (error) {
        console.error('💥 Error en migración:', error);
        return {
            exito: false,
            error: error.message
        };
    }
}

// Función auxiliar para convertir base64 a blob
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
}

// Función para verificar el estado de la migración
function verificarEstadoMigracion() {
    const migracionCompleta = localStorage.getItem('migracion_completa');
    const ultimaMigracion = localStorage.getItem('ultima_migracion_github');
    
    console.log('📊 Estado de migración:');
    console.log(`   🔄 Migración completa: ${migracionCompleta ? 'Sí' : 'No'}`);
    console.log(`   📅 Última migración: ${ultimaMigracion ? new Date(ultimaMigracion).toLocaleString() : 'Nunca'}`);
    
    return {
        completa: migracionCompleta === 'true',
        ultimaFecha: ultimaMigracion
    };
}

// Exportar funciones
window.migrarTodoAGitHub = migrarTodoAGitHub;
window.verificarEstadoMigracion = verificarEstadoMigracion;
