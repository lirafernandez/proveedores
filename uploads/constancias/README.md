# Carpeta de Constancias

Esta carpeta contiene las constancias fiscales de los proveedores.

## Tipos de archivos

- **Constancia de Situación Fiscal (SAT)**
- **Comprobante de Domicilio**
- **Cédula Fiscal**
- **RFC**
- **Otros documentos fiscales**

## Estructura de nomenclatura

Los archivos se nombran automáticamente:
```
constancia-{proveedorId}-{timestamp}-{tipo}
```

Por ejemplo:
- `constancia-prov1-1691234567890-situacion-fiscal.pdf`
- `constancia-prov2-1691234567890-comprobante-domicilio.pdf`

## Características

- ✅ **Obligatorias** para ciertos tipos de proveedores
- ✅ **Validación automática** de formato PDF
- ✅ **Backup automático** en GitHub
- ✅ **Control de versiones** (se mantiene historial)

## Estados

- **✅ Vigente:** Constancia válida y actualizada
- **⚠️ Por vencer:** Próxima a expirar (30 días)
- **❌ Vencida:** Requiere actualización
- **➖ No requerida:** Para este tipo de proveedor

## Integración

Las constancias se sincronizan automáticamente con GitHub cuando:
- Se sube una nueva constancia
- Se actualiza una existente
- Se configura la integración GitHub
