/**
 * Script to replace console.log/error/warn/info with logger utility
 * Run with: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('app/**/*.{ts,tsx}', { cwd: __dirname + '/..' });

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Check if logger is already imported
  const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');
  
  // Replace console.log/error/warn/info
  if (content.includes('console.log') || content.includes('console.error') || 
      content.includes('console.warn') || content.includes('console.info')) {
    
    // Add logger import if not present
    if (!hasLoggerImport) {
      // Find the last import statement
      const importMatch = content.match(/(import.*from\s+['"].*['"];?\s*\n)+/);
      if (importMatch) {
        const lastImportIndex = content.lastIndexOf(importMatch[0]);
        const insertIndex = lastImportIndex + importMatch[0].length;
        content = content.slice(0, insertIndex) + 
                  "import { logger } from '@/lib/logger';\n" + 
                  content.slice(insertIndex);
        modified = true;
      }
    }

    // Replace console statements
    content = content
      .replace(/console\.log\(/g, 'logger.log(')
      .replace(/console\.error\(/g, 'logger.error(')
      .replace(/console\.warn\(/g, 'logger.warn(')
      .replace(/console\.info\(/g, 'logger.info(');
    
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});

console.log('Done!');

