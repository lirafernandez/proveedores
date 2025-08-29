/**
 * supabase.js - All interactions with the Supabase backend.
 */

// --- Supabase Client Initialization ---
// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized.');

// --- Helper Functions ---

/**
 * Handles Supabase errors consistently.
 * @param {Object} error - The error object from Supabase.
 * @param {string} context - A message describing the context of the error.
 */
function handleSupabaseError(error, context) {
    console.error(`Error in ${context}:`, error.message);
    // You might want to show a user-friendly notification here
    // mostrarNotificacion(`Error: ${error.message}`, 'danger');
}

// --- Provider Functions ---

/**
 * Fetches all providers from the database.
 * @returns {Promise<Array>} - A promise that resolves to an array of providers.
 */
async function getProviders() {
    const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        handleSupabaseError(error, 'fetching providers');
        return [];
    }

    return data;
}

/**
 * Fetches a single provider by its ID.
 * @param {string} id - The ID of the provider to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to the provider object or null if not found.
 */
async function getProvider(id) {
    const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        handleSupabaseError(error, `fetching provider with id ${id}`);
        return null;
    }

    return data;
}

/**
 * Creates or updates a provider.
 * If provider.id exists, it updates. Otherwise, it creates a new one.
 * @param {Object} providerData - The provider data to save.
 * @returns {Promise<Object|null>} - A promise that resolves to the saved provider data.
 */
async function saveProvider(providerData) {
    const { data, error } = await supabase
        .from('providers')
        .upsert(providerData, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        handleSupabaseError(error, 'saving provider');
        return null;
    }

    return data;
}

/**
 * Deletes a provider by its ID.
 * @param {string} id - The ID of the provider to delete.
 * @returns {Promise<boolean>} - A promise that resolves to true if successful, false otherwise.
 */
async function deleteProvider(id) {
    const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', id);

    if (error) {
        handleSupabaseError(error, `deleting provider with id ${id}`);
        return false;
    }

    return true;
}


// --- Contract Functions ---

/**
 * Fetches all contracts for a specific provider.
 * @param {string} providerId - The ID of the provider.
 * @returns {Promise<Array>} - A promise that resolves to an array of contracts.
 */
async function getContracts(providerId) {
    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('provider_id', providerId)
        .order('end_date', { ascending: false });

    if (error) {
        handleSupabaseError(error, `fetching contracts for provider ${providerId}`);
        return [];
    }

    return data;
}

/**
 * Creates or updates a contract.
 * @param {Object} contractData - The contract data to save.
 * @returns {Promise<Object|null>} - A promise that resolves to the saved contract data.
 */
async function saveContract(contractData) {
    const { data, error } = await supabase
        .from('contracts')
        .upsert(contractData, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        handleSupabaseError(error, 'saving contract');
        return null;
    }

    return data;
}

/**
 * Deletes a contract by its ID.
 * @param {string} id - The ID of the contract to delete.
 * @returns {Promise<boolean>} - A promise that resolves to true if successful, false otherwise.
 */
async function deleteContract(id) {
    const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

    if (error) {
        handleSupabaseError(error, `deleting contract with id ${id}`);
        return false;
    }

    return true;
}

// --- File/Storage Functions ---

/**
 * Uploads a file to Supabase Storage.
 * @param {string} bucket - The name of the bucket (e.g., 'constancias', 'contratos').
 * @param {File} file - The file object to upload.
 * @param {string} providerId - The ID of the provider to associate the file with.
 * @returns {Promise<string|null>} - The public URL of the uploaded file.
 */
async function uploadFile(bucket, file, providerId) {
    const fileName = `${providerId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, file);

    if (uploadError) {
        handleSupabaseError(uploadError, `uploading file to ${bucket}`);
        return null;
    }

    const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(fileName);

    return data.publicUrl;
}
