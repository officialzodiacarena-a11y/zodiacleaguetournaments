const fs = require('fs');

function replaceImport(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace("import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';", "import { createClient } from '@/lib/supabase/client';");
  content = content.replace("const supabase = createClientComponentClient();", "const supabase = createClient();");
  fs.writeFileSync(path, content, 'utf8');
}

replaceImport('app/admin/broadcast-director/page.tsx');
replaceImport('app/live/page.tsx');
