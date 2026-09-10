import fs from 'fs';
import path from 'path';

const routesDir = path.join(process.cwd(), 'src/routes');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/router\.(get|post|put|delete|patch)\(([^,]+),\s*(?:requireAuth,\s*)?\(req,\s*res\)\s*=>\s*\{/g, (match, method, route) => {
    return match.replace('(req, res) => {', 'async (req, res) => {');
  });

  content = content.replace(/function requireClient\(req,\s*res\)\s*\{/g, 'async function requireClient(req, res) {');
  content = content.replace(/if \(!requireClient\(req, res\)\) return;/g, 'if (!(await requireClient(req, res))) return;');
  
  content = content.replace(/db\.prepare\('SELECT id FROM clients WHERE id = \?'\)\.get\(req\.params\.clientId\)/g, "(await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [req.params.clientId] })).rows[0]");

  content = content.replace(/db\s*\n?\s*\.prepare\(([`'][\s\S]*?[`'])\)\s*\n?\s*\.get\(([^)]*)\)/g, "(await db.execute({ sql: $1, args: [$2] })).rows[0]");
  content = content.replace(/db\s*\n?\s*\.prepare\(([`'][\s\S]*?[`'])\)\s*\n?\s*\.all\(([^)]*)\)/g, "(await db.execute({ sql: $1, args: [$2] })).rows");
  content = content.replace(/db\s*\n?\s*\.prepare\(([`'][\s\S]*?[`'])\)\s*\n?\s*\.run\(([^)]*)\)/g, "await db.execute({ sql: $1, args: [$2] })");

  content = content.replace(/result\.lastInsertRowid(?!\.toString\(\))/g, "result.lastInsertRowid.toString()");
  content = content.replace(/result\.changes/g, "result.rowsAffected");

  fs.writeFileSync(filePath, content);
}

const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  processFile(path.join(routesDir, file));
  console.log(`Refactored ${file}`);
}
