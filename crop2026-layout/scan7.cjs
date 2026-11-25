const parser = require('@babel/parser');
const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/**/*.tsx');
let total=0,no=0;
for (const f of files) {
  const code = fs.readFileSync(f,'utf8');
  let ast;
  try { ast = parser.parse(code, { sourceType:'module', plugins:['jsx','typescript'] }); }
  catch(e){ console.error('parse fail',f,e.message); continue; }
  function walk(node){
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement' && node.openingElement && node.openingElement.name && node.openingElement.name.name === 'button') {
      total++;
      const attrs = node.openingElement.attributes || [];
      const hasClass = attrs.some(a => a.type==='JSXAttribute' && a.name && a.name.name==='className');
      if (!hasClass) { no++; console.log(`${f}:${node.openingElement.loc.start.line}`); }
    }
    for (const k in node) { const v=node[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v==='object') walk(v); }
  }
  walk(ast);
}
console.log('buttons total',total,'no className',no);
