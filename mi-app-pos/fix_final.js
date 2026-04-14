const fs = require('fs');

// Helpers
function injectStyles(content, funcName) {
  // Remueve cualquier inyeccion previa fallida para esa funcion
  const regex = new RegExp(`function ${funcName}\\([^)]*\\)\\s*\\{`, 'g');
  return content.replace(regex, (match) => {
    return match + '\\n  const { colors: Colors } = useTheme();\\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);';
  });
}

function cleanDoubleInjections(content, funcName) {
  // If we injected twice, we have two `const { colors: Colors } = useTheme();` back to back.
  let target = '  const { colors: Colors } = useTheme();\\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);';
  let doubleTarget = target + '\\n' + target;
  while(content.includes(doubleTarget)) {
     content = content.replace(doubleTarget, target);
  }
  return content;
}

// 1. app/(auth)/register.tsx
let f1 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(auth)/register.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = injectStyles(c1, 'InputField');
c1 = cleanDoubleInjections(c1, 'InputField');
fs.writeFileSync(f1, c1);

// 2. app/(tabs)/clientes.tsx
let f2 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/clientes.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = injectStyles(c2, 'ClienteCard');
c2 = cleanDoubleInjections(c2, 'ClienteCard');
fs.writeFileSync(f2, c2);

// 3. app/(tabs)/index.tsx
let f3 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/index.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = injectStyles(c3, 'StatCard');
c3 = cleanDoubleInjections(c3, 'StatCard');
fs.writeFileSync(f3, c3);

// 4. app/factura/[id].tsx
let f4 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/factura/[id].tsx';
let c4 = fs.readFileSync(f4, 'utf8');
c4 = cleanDoubleInjections(c4, 'InfoRow');
c4 = cleanDoubleInjections(c4, 'FacturaItemRow');
fs.writeFileSync(f4, c4);

// 5. app/producto/editar/[id].tsx
let f5 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/producto/editar/[id].tsx';
let c5 = fs.readFileSync(f5, 'utf8');
c5 = injectStyles(c5, 'CampoMoneda');
c5 = cleanDoubleInjections(c5, 'CampoMoneda');
fs.writeFileSync(f5, c5);

// 6. app/producto/nuevo.tsx
let f6 = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/producto/nuevo.tsx';
let c6 = fs.readFileSync(f6, 'utf8');
c6 = injectStyles(c6, 'CampoMoneda');
c6 = cleanDoubleInjections(c6, 'CampoMoneda');
fs.writeFileSync(f6, c6);

console.log('Fixed all TS files explicitly');
