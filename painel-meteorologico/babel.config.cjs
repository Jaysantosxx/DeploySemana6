// Usado apenas pelo Jest (o Vite compila o app por conta própria).

// O Jest roda em Node/CJS e não entende `import.meta.env` do Vite.
// Este mini-plugin troca `import.meta.env` por `process.env` nos testes.
function viteMetaEnv({ types: t }) {
  return {
    visitor: {
      MemberExpression(path) {
        const obj = path.node.object;
        if (
          t.isMetaProperty(obj) &&
          obj.meta.name === 'import' &&
          obj.property.name === 'meta' &&
          path.node.property.name === 'env'
        ) {
          path.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')));
        }
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  env: {
    test: { plugins: [viteMetaEnv] },
  },
};
