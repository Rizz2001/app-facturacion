const fs = require('fs');

const files = [
  'app/producto/nuevo.tsx',
  'app/producto/editar/[id].tsx',
  'app/cliente/nuevo.tsx',
  'app/factura/[id].tsx'
];

files.forEach(p => {
  let f = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/' + p;
  let content = fs.readFileSync(f, 'utf8');

  // Find the bad injection
  const badInjections = [
    'function CampoMoneda({\\n  const { colors: Colors } = useTheme();\\n  const styles = React.useMemo(() => getStyles(Colors), \\n[Colors]);',
    'function CampoMoneda({\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);',
    'function Field({\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);',
    'function InfoRow({\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);',
    'function FacturaItemRow({\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);'
  ];

  badInjections.forEach(bad => {
    if (content.includes(bad)) {
      // Revert the bad part
      content = content.replace(bad, bad.split('({')[0] + '({');
      
      // Inject at the end of the line `) {`
      // We will find the next `) {` or `}) {` after the function start
      const regex = new RegExp(bad.split('({')[0].replace('function ', '') + '\\([^)]*\\)\\s*\\{');
      const match = content.match(regex);
      if (match) {
        content = content.replace(match[0], match[0] + '\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);');
      }
    }
  });

  fs.writeFileSync(f, content);
  console.log('Repaired syntax in', p);
});
