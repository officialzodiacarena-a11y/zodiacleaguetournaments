const fs = require('fs');
const content = fs.readFileSync('supabase/migrations/20240101000000_initial_schema.sql', 'utf8');
const match = content.match(/CREATE OR REPLACE FUNCTION.*?\bmatch_status_transition\b[\s\S]*?LANGUAGE plpgsql/i);
if (match) {
  console.log(match[0].substring(0, 1000));
} else {
  console.log('Function not found in 20240101000000');
  // Try searching all migrations
  const { execSync } = require('child_process');
  try {
    const output = execSync('find supabase/migrations -type f -exec grep -l "INVALID_STATUS_TRANSITION" {} +').toString();
    console.log('Found in:', output);
  } catch (e) {
    console.log('Error grep:', e);
  }
}
