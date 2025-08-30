import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const SUPABASE_URL = 'https://lvckwdljcilepwikzopt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2Y2t3ZGxqY2lsZXB3aWt6b3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDEyNTksImV4cCI6MjA3MjA3NzI1OX0.iClrUtlmVWB_qnPQ6iD-4ZotF8aKl9d2w8rNa_NBEcM';

class SupabaseService {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // === MÉTODOS DE PROVEEDORES ===

    async obtenerProveedores({ pagina = 1, porPagina = 25, busqueda = '' } = {}) {
        let query = this.supabase
            .from('proveedores')
            .select('*', { count: 'exact' });

        // Lógica de búsqueda
        if (busqueda) {
            query = query.or(`nombre.ilike.%${busqueda}%,rfc.ilike.%${busqueda}%`);
        }

        // Lógica de paginación
        if (porPagina > 0) {
            const from = (pagina - 1) * porPagina;
            const to = from + porPagina - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data: data || [], count: count };
    }

    async obtenerProveedorPorId(id) {
        const { data, error } = await this.supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async borrarTodasEvaluaciones() {
        const { error } = await this.supabase
            .from('evaluaciones')
            .delete()
            .neq('id', -1); // Borra todas las filas
        if (error) throw error;
    }

    async guardarProveedor(proveedorData) {
        const { data, error } = await this.supabase
            .from('proveedores')
            .upsert(proveedorData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async eliminarProveedor(id) {
        const { error } = await this.supabase
            .from('proveedores')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async borrarTodosProveedores() {
        const { error } = await this.supabase
            .from('proveedores')
            .delete()
            .neq('id', -1); // Borra todas las filas
        if (error) throw error;
    }

    // === MÉTODOS DE EVALUACIONES ===

    async obtenerEvaluaciones() {
        const { data, error } = await this.supabase
            .from('evaluaciones')
            .select('*');
        if (error) throw error;
        return data || [];
    }

    async obtenerEvaluacion(proveedorId, tipoEvaluacion) {
        const { data, error } = await this.supabase
            .from('evaluaciones')
            .select('*')
            .eq('proveedor_id', proveedorId)
            .eq('tipo_evaluacion', tipoEvaluacion)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async guardarEvaluacion(evaluacionData) {
        const { data, error } = await this.supabase
            .from('evaluaciones')
            .upsert(evaluacionData, { onConflict: 'proveedor_id, tipo_evaluacion' })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // === MÉTODOS DE DOCUMENTOS ===

    async obtenerDocumentosPorProveedor(proveedorId) {
        const { data, error } = await this.supabase
            .from('documentos')
            .select('tipo, nombre_archivo')
            .eq('proveedor_id', proveedorId);
        if (error) throw error;
        return data || [];
    }

    async obtenerDocumento(proveedorId, tipo) {
        const { data, error } = await this.supabase
            .from('documentos')
            .select('nombre_archivo, storage_path')
            .eq('proveedor_id', proveedorId)
            .eq('tipo', tipo)
            .single();
        if (error) throw error;
        return data;
    }

    async uploadFile(file, filePath) {
        const { data, error } = await this.supabase
            .storage
            .from('documentos-proveedores')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });
        if (error) throw error;
        return data;
    }

    async createSignedUrl(filePath) {
        const { data, error } = await this.supabase
            .storage
            .from('documentos-proveedores')
            .createSignedUrl(filePath, 60); // URL válida por 60 segundos
        if (error) throw error;
        return data;
    }

    async guardarDocumento(documentoData) {
        const { data, error } = await this.supabase
            .from('documentos')
            .upsert(documentoData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async eliminarDocumento(storagePath) {
        // Primero, borramos el archivo del storage.
        const { error: storageError } = await this.supabase
            .storage
            .from('documentos-proveedores')
            .remove([storagePath]);

        // Si hay un error que no sea 'Not Found', lo lanzamos.
        // Ignoramos el error de 'no encontrado' para que no falle si el archivo ya fue borrado manualmente.
        if (storageError && storageError.message !== 'Not Found') {
            console.warn(`No se pudo borrar el archivo del storage: ${storageError.message}`);
        }

        // Segundo, borramos el registro de la base de datos.
        const { error: dbError } = await this.supabase
            .from('documentos')
            .delete()
            .eq('storage_path', storagePath);

        if (dbError) {
            throw new Error(`Error al borrar el registro del documento: ${dbError.message}`);
        }
    }

    // === MÉTODOS DE CRITERIOS ===
    async obtenerCriterios() {
        const { data, error } = await this.supabase.from('criterios').select('*');
        if (error) throw error;
        return data;
    }

    async agregarCriterio(criterio) {
        const { data, error } = await this.supabase.from('criterios').insert(criterio).select();
        if (error) throw error;
        return data[0];
    }

    async actualizarCriterio(id, criterio) {
        const { data, error } = await this.supabase.from('criterios').update(criterio).eq('id', id).select();
        if (error) throw error;
        return data[0];
    }

    async eliminarCriterio(id) {
        const { error } = await this.supabase.from('criterios').delete().eq('id', id);
        if (error) throw error;
    }

    // === MÉTODOS DE TIEMPO REAL ===
    subscribeToProveedores(callback) {
        return this.supabase
            .channel('proveedores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, callback)
            .subscribe();
    }
}

export { SupabaseService };