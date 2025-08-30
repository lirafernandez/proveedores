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
            .upsert(evaluacionData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // === MÉTODOS DE DOCUMENTOS ===

    async obtenerDocumentosPorProveedor(proveedorId) {
        const { data, error } = await this.supabase
            .from('documentos')
            .select('tipo')
            .eq('proveedor_id', proveedorId);
        if (error) throw error;
        return data || [];
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

    // === MÉTODOS DE TIEMPO REAL ===
    subscribeToProveedores(callback) {
        return this.supabase
            .channel('proveedores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, callback)
            .subscribe();
    }
}

export { SupabaseService };