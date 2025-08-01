# Carpeta de Backups

Esta carpeta contiene respaldos automáticos del archivo `proveedores.json`.

## Estructura de Backups

Los archivos de backup se nombran con el formato:
```
proveedores-YYYY-MM-DD-HH-MM.json
```

Por ejemplo:
- `proveedores-2025-08-01-14-30.json`
- `proveedores-2025-08-01-15-45.json`

## Configuración

- **Frecuencia:** Automática cada vez que se modifica la base de datos
- **Retención:** Se mantienen los últimos 30 backups
- **Tamaño máximo:** 100MB total en esta carpeta

## Restauración

Para restaurar un backup:
1. Ve a la página de administración
2. Selecciona "Restaurar Backup"
3. Elige el archivo de backup deseado
4. Confirma la restauración

⚠️ **Importante:** La restauración sobrescribirá todos los datos actuales.
