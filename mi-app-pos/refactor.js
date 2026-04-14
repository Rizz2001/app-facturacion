const fs = require('fs');
const path = require('path');

const targetDir = 'c:/Users/riizz/Desktop/APP FACTURACION/app-facturacion/mi-app-pos';

const filesToUpdate = [
  'app/(auth)/login.tsx',
  'app/(auth)/register.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/clientes.tsx',
  'app/(tabs)/facturas.tsx',
  'app/(tabs)/pos.tsx',
  'app/(tabs)/productos.tsx',
  'app/cliente/nuevo.tsx',
  'app/factura/[id].tsx',
  'app/factura/nueva.tsx',
  'app/producto/nuevo.tsx',
  'app/producto/editar/[id].tsx'
];

filesToUpdate.forEach(relPath => {
  const filePath = path.join(targetDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', filePath);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has useTheme
  if (content.includes('useTheme(')) {
    console.log('Skipping (already themed):', relPath);
    return;
  }
  
  // 1. IMPORT REPLACEMENTS
  if (content.includes("import { Colors, EstadoBadge } from '@/constants/Colors';")) {
    content = content.replace(
      "import { Colors, EstadoBadge } from '@/constants/Colors';",
      "import { EstadoBadge } from '@/constants/Colors';\nimport { useTheme } from '@/context/ThemeContext';"
    );
  } else if (content.includes("import { Colors } from '@/constants/Colors';")) {
    content = content.replace(
      "import { Colors } from '@/constants/Colors';",
      "import { useTheme } from '@/context/ThemeContext';"
    );
  } else {
      console.log('No Colors import found in', relPath);
      return;
  }

  // Ensure React/useMemo import
  if (!content.includes("import { useMemo }") && !content.includes("import React") && !content.includes(", useMemo")) {
      content = content.replace("import ", "import React, { useMemo } from 'react';\nimport ");
  }

  // 2. INJECT HOOK ALIAS AND USESTYLES IN MAIN DEFAULT EXPORT FUNCTION
  // Match `export default function <Name>() {` or similar
  const fnRegex = /export default function ([A-Za-z0-9_]+)\([^)]*\) \{/;
  const match = content.match(fnRegex);
  
  if (match) {
    const fnStart = match[0];
    const injection = `\n  const { colors, theme, setTheme, isDark } = useTheme();\n  const Colors = colors;\n  const styles = React.useMemo(() => getStyles(Colors), [Colors]);`;
    content = content.replace(fnStart, fnStart + injection);
  } else {
    console.log('No default export function found in', relPath);
  }

  // 3. TRANSFORM STYLESHEET.CREATE
  if (content.includes('const styles = StyleSheet.create({')) {
     content = content.replace('const styles = StyleSheet.create({', 'const getStyles = (Colors: any) => StyleSheet.create({');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored:', relPath);
});
