export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 1. Make router handlers async
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression'
    }
  }).forEach(path => {
    if (path.node.callee.object && path.node.callee.object.name && path.node.callee.object.name.endsWith('Router')) {
      const methodName = path.node.callee.property.name;
      if (['get', 'post', 'put', 'delete', 'patch'].includes(methodName)) {
        path.node.arguments.forEach(arg => {
          if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
            arg.async = true;
          }
        });
      }
    }
  });

  // 2. Make requireClient async
  root.find(j.FunctionDeclaration, { id: { name: 'requireClient' } }).forEach(path => {
    path.node.async = true;
  });

  root.find(j.CallExpression, { callee: { name: 'requireClient' } }).forEach(path => {
    if (path.parentPath.node.type === 'UnaryExpression' && path.parentPath.node.operator === '!') {
      j(path).replaceWith(j.awaitExpression(path.node));
    }
  });

  // 3. Replace db.prepare().method()
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { name: 'db' },
          property: { name: 'prepare' }
        }
      }
    }
  }).forEach(path => {
    const method = path.node.callee.property.name;
    if (!['get', 'all', 'run'].includes(method)) return;

    const prepareArgs = path.node.callee.object.arguments;
    const execArgs = path.node.arguments;

    const executeOptions = j.objectExpression([
      j.property('init', j.identifier('sql'), prepareArgs[0]),
      j.property('init', j.identifier('args'), j.arrayExpression(execArgs))
    ]);

    const executeCall = j.awaitExpression(
      j.callExpression(
        j.memberExpression(j.identifier('db'), j.identifier('execute')),
        [executeOptions]
      )
    );

    let replacement = executeCall;
    if (method === 'get') {
      replacement = j.memberExpression(
        j.memberExpression(
          executeCall,
          j.identifier('rows')
        ),
        j.literal(0),
        true
      );
    } else if (method === 'all') {
      replacement = j.memberExpression(
        executeCall,
        j.identifier('rows')
      );
    }

    j(path).replaceWith(replacement);
  });

  // 4. Update lastInsertRowid to string and changes to rowsAffected
  root.find(j.MemberExpression, { property: { name: 'lastInsertRowid' } }).forEach(path => {
    if (path.parentPath.node.type !== 'CallExpression' || path.parentPath.node.callee.property?.name !== 'toString') {
      j(path).replaceWith(
        j.callExpression(
          j.memberExpression(path.node, j.identifier('toString')),
          []
        )
      );
    }
  });

  root.find(j.MemberExpression, { property: { name: 'changes' } }).forEach(path => {
    path.node.property.name = 'rowsAffected';
  });

  return root.toSource();
}
