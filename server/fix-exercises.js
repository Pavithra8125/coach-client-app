const fs = require('fs');

const path = 'src/routes/exercises.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {",
  "if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err?.code === 'SQLITE_CONSTRAINT' && err?.message?.includes('UNIQUE constraint failed'))) {"
);

content = content.replace(
  "res.status(409).json({ error: `\"${name}\" is already in the library` });",
  "res.status(409).json({ error: 'An exercise with this name already exists' });"
);

content = content.replace(
  "if (!name) return res.status(400).json({ error: 'name is required' });",
  "if (!name) return res.status(400).json({ error: 'Exercise name is required' });"
);

content = content.replace(
  "if (!name) return res.status(400).json({ error: 'name is required' });",
  "if (!name) return res.status(400).json({ error: 'Exercise name is required' });"
);

content = content.replace(
  "if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {",
  "if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err?.code === 'SQLITE_CONSTRAINT' && err?.message?.includes('FOREIGN KEY constraint failed'))) {"
);

fs.writeFileSync(path, content);
console.log('Fixed exercises.js');
