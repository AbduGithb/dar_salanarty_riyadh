/*
  Initialize Supabase client and expose as window.supabaseClient
  Usage: call window.supabaseInit() or rely on scripts that call it.
*/
(function () {
  window.supabaseClient = window.supabaseClient || null;
  window.supabaseInitialized = window.supabaseInitialized || false;

  window.supabaseInit = function () {
    if (window.supabaseClient) {
      window.supabaseInitialized = true;
      return window.supabaseClient;
    }
    if (typeof supabase === 'undefined') {
      console.error('Supabase SDK not loaded. Include https://unpkg.com/@supabase/supabase-js@2');
      return null;
    }
    if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
      console.error('Supabase config missing. Set window.SUPABASE_CONFIG in js/supabase-config.js');
      return null;
    }
    try {
      window.supabaseClient = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
      window.supabaseInitialized = true;
      console.log('✅ Supabase initialized');
      return window.supabaseClient;
    } catch (err) {
      console.error('Error initializing Supabase', err);
      return null;
    }
  };
})();
