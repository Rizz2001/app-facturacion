const fs = require('fs');

const cases = [
  { f: 'app/(auth)/register.tsx', funcs: ['function InputField('] },
  { f: 'app/(tabs)/clientes.tsx', funcs: ['function ClienteCard('] },
  { f: 'app/(tabs)/index.tsx', funcs: ['function StatCard('] },
  { f: 'app/factura/[id].tsx', funcs: ['function InfoRow(', 'function FacturaItemRow('] },
  { f: 'app/producto/nuevo.tsx', funcs: ['function CampoMoneda('] },
  { f: 'app/producto/editar/[id].tsx', funcs: ['function CampoMoneda('] },
];

cases.forEach(c => {
  let file = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/' + c.f;
  let content = fs.readFileSync(file, 'utf8');

  c.funcs.forEach(func => {
    // Escaping regex chars just in case
    const safeFunc = func.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // We want to match `function Name(...) {`
    const regex = new RegExp(safeFunc + '[^)]*\\)\\s*(?::\\s*any\\s*)?\\{');
    const match = content.match(regex);
    if (match && !content.includes(match[0] + '\\n  const { colors: Colors } = useTheme();')) {
      // Find what exactly it matched
      const exactMatch = match[0];
      const injection = `\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);`;
      content = content.replace(exactMatch, exactMatch + injection);
    }
  });

  fs.writeFileSync(file, content);
});

console.log('Fixed subcomponents');
