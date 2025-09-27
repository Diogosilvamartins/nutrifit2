import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify cron secret header for automated calls
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      console.error('Invalid or missing cron secret');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid cron secret',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Iniciando backup diário automático...')
    
    // Call the database function to create backup
    const { data: backupData, error: backupError } = await supabase
      .rpc('create_data_backup')
    
    if (backupError) {
      console.error('Erro ao criar backup:', backupError)
      throw backupError
    }
    
    console.log('Backup criado com sucesso')
    
    // Optional: Store backup in Supabase Storage
    const backupFileName = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
    
    // Create backups bucket if it doesn't exist
    const { error: bucketError } = await supabase.storage
      .createBucket('backups', { public: false })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Erro ao criar bucket:', bucketError)
    }
    
    // Upload backup to storage
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(backupFileName, JSON.stringify(backupData), {
        contentType: 'application/json'
      })
    
    if (uploadError) {
      console.error('Erro ao fazer upload do backup:', uploadError)
      // Don't throw here as the backup was created successfully in the database
    } else {
      console.log(`Backup salvo em storage: ${backupFileName}`)
    }
    
    // Clean old backups (keep only last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: oldFiles } = await supabase.storage
      .from('backups')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' }
      })
    
    if (oldFiles) {
      const filesToDelete = oldFiles
        .filter(file => new Date(file.created_at) < thirtyDaysAgo)
        .map(file => file.name)
      
      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('backups')
          .remove(filesToDelete)
        
        if (!deleteError) {
          console.log(`Removidos ${filesToDelete.length} backups antigos`)
        }
      }
    }
    
    const response = {
      success: true,
      message: 'Backup diário executado com sucesso',
      timestamp: new Date().toISOString(),
      backup_file: backupFileName,
      backup_size: JSON.stringify(backupData).length
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (error) {
    console.error('Erro no backup diário:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
