const fs = require('fs');
const path = 'server/src/app.js';
let content = fs.readFileSync(path, 'utf8');

const importsToAdd = "import path from 'path';\nimport { fileURLToPath } from 'url';\n";
content = content.replace("import express from 'express';", importsToAdd + "import express from 'express';");

const staticServingToAdd = `
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDistPath = path.join(__dirname, '../../client/dist');

  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
`;

content = content.replace(
  "  return app;",
  staticServingToAdd + "\n  return app;"
);

fs.writeFileSync(path, content);
console.log('Fixed app.js');
