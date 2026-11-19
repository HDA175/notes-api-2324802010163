const { createClient } = require('@supabase/supabase-js');

let client;

function bucket() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('Thiếu cấu hình Supabase Storage');
    }

    client = createClient(url, key);
  }

  return client.storage.from('attachments');
}

module.exports = { bucket };
