const fs = require('fs');
const filesParams = [
  { p: 'app/producto/nuevo.tsx', targets: ['function CampoMoneda({'] },
  { p: 'app/producto/editar/[id].tsx', targets: ['function CampoMoneda({'] },
  { p: 'app/cliente/nuevo.tsx', targets: ['function Field({'] },
  { p: 'app/factura/[id].tsx', targets: ['function InfoRow({', 'function FacturaItemRow({'] },
];

filesParams.forEach(({p, targets}) => {
  let f = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/' + p;
  let content = fs.readFileSync(f, 'utf8');

  targets.forEach(target => {
    if (content.includes(target) && !content.includes(target + '\\n  const { colors: Colors } = useTheme();')) {
      content = content.replace(target, target + '\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);');
    }
  });

  fs.writeFileSync(f, content);
  console.log('Fixed', p);
});
