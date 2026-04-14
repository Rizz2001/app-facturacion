const fs = require('fs');

const resetDoubleInjections = (file) => {
    let content = fs.readFileSync(file, 'utf8');
    const targ = '  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);';
    const double = targ + '\n' + targ;
    while(content.includes(double)) {
        content = content.replace(double, targ);
    }
    fs.writeFileSync(file, content);
};

const injectThemeToComponent = (file, compStartStr) => {
    let content = fs.readFileSync(file, 'utf8');
    // Si ya lo tiene, no reinyecta
    if (content.includes(compStartStr) && !content.substring(content.indexOf(compStartStr), content.indexOf(compStartStr)+200).includes('useTheme(')) {
       content = content.replace(
           compStartStr,
           compStartStr + '\n  const { colors: Colors } = useTheme();\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);'
       );
    }
    fs.writeFileSync(file, content);
};

// register
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(auth)/register.tsx', '}: any) {');

// clientes
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/clientes.tsx', 'function ClienteCard({ cliente, onPress }: { cliente: Cliente; onPress: () => void }) {');

// index
resetDoubleInjections('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/index.tsx');
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/(tabs)/index.tsx', 'function StatCard({ label, value, sub, icon, color, bg, onPress }: any) {');

// factura/id
resetDoubleInjections('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/factura/[id].tsx');
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/factura/[id].tsx', 'function InfoRow({ label, value }: { label: string; value: string }) {');
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/factura/[id].tsx', '}: { item: FacturaItem }) {');

// producto/editar
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/producto/editar/[id].tsx', '  placeholder?: string; helper?: string;\n}) {');

// producto/nuevo
injectThemeToComponent('c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos/app/producto/nuevo.tsx', '  placeholder?: string; helper?: string;\n}) {');

console.log('Fixed');
