const fs = require('fs');

const file = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/pos.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix getStyles definition
content = content.replace('const ts = StyleSheet.create({', 'const getStyles = (Colors: any) => StyleSheet.create({');

// 2. Fix the injection inside POSScreen
content = content.replace(
  'const styles = React.useMemo(() => getStyles(Colors), [Colors]);',
  'const ts = React.useMemo(() => getStyles(Colors), [Colors]);'
);

// 3. Add useTheme inside TasaBar
content = content.replace('function TasaBar() {', 'function TasaBar() {\n  const { colors: Colors } = useTheme();\n  const ts = React.useMemo(() => getStyles(Colors), [Colors]);');

// 4. Add useTheme inside ProductoCard
content = content.replace('function ProductoCard({ producto, onAdd }: { producto: Producto; onAdd: () => void }) {', 'function ProductoCard({ producto, onAdd }: { producto: Producto; onAdd: () => void }) {\n  const { colors: Colors } = useTheme();\n  const ts = React.useMemo(() => getStyles(Colors), [Colors]);');

// 5. Add useTheme inside CartRow
content = content.replace('}: { item: CartItem; onInc: () => void; onDec: () => void; onRemove: () => void }) {', '}: { item: CartItem; onInc: () => void; onDec: () => void; onRemove: () => void }) {\n  const { colors: Colors } = useTheme();\n  const ts = React.useMemo(() => getStyles(Colors), [Colors]);');

fs.writeFileSync(file, content);
console.log('Fixed pos.tsx');
