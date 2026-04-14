const fs = require('fs');

const fileList = [
    'app/(auth)/register.tsx',
    'app/(tabs)/clientes.tsx',
    'app/(tabs)/index.tsx',
    'app/factura/[id].tsx',
    'app/producto/editar/[id].tsx',
    'app/producto/nuevo.tsx'
];

fileList.forEach(file => {
   let p = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/' + file;
   if (fs.existsSync(p)) {
       let content = fs.readFileSync(p, 'utf8');
       content = content.replace(/\\n/g, '\n');
       fs.writeFileSync(p, content);
   }
});
console.log('Fixed \\n typos');
