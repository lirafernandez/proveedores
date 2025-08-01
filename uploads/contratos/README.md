# Carpeta de Contratos

Esta carpeta contiene los contratos de los proveedores en formato PDF y otros documentos.

## Tipos de documentos

- **Contratos principales** (.pdf, .doc, .docx)
- **Anexos de contratos**
- **Modificaciones contractuales**
- **Convenios adicionales**

## Estructura de nomenclatura

Los archivos se nombran automáticamente:
```
contrato-{proveedorId}-{contratoId}-{timestamp}-{nombre-original}
```

Por ejemplo:
- `contrato-prov1-cont123-1691234567890-contrato-suministros.pdf`
- `contrato-prov2-cont456-1691234567890-convenio-servicios.docx`

## Estados de contratos

- **🟢 Vigente:** Contrato activo
- **🟡 Por vencer:** Próximo a expirar (30 días)
- **🔴 Vencido:** Requiere renovación
- **⚪ Borrador:** En proceso de firma

## Características técnicas

- **Tamaño máximo:** 25MB por archivo
- **Formatos:** PDF (recomendado), DOC, DOCX
- **Compresión:** Automática para archivos >1MB
- **Backup:** Automático en GitHub

## Metadatos incluidos

Cada contrato almacena:
- Número de contrato
- Fechas de inicio y fin
- Monto del contrato
- Proveedor asociado
- SHA de archivo (control de integridad)
- URL de acceso directo

## Seguridad

- 🔒 **Repositorio privado** en GitHub
- 🔑 **Acceso controlado** mediante token
- 📝 **Historial completo** de cambios
- 💾 **Backups automáticos** diarios
