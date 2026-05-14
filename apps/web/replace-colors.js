const fs = require('fs');
const path = require('path');

const files = [
  'c:/Users/hp/medisathi/apps/web/src/app/(dashboard)/settings/page.tsx',
  'c:/Users/hp/medisathi/apps/web/src/app/(dashboard)/scan-rx/page.tsx',
  'c:/Users/hp/medisathi/apps/web/src/app/(dashboard)/insights/page.tsx',
  'c:/Users/hp/medisathi/apps/web/src/app/(dashboard)/messages/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Indigo replacements
    content = content.replace(/bg-indigo-600\/20/g, 'bg-primary/20');
    content = content.replace(/bg-indigo-600\/30/g, 'bg-primary/30');
    content = content.replace(/bg-indigo-600\/50/g, 'bg-primary/50');
    content = content.replace(/bg-indigo-50\/60/g, 'bg-secondary/20');
    content = content.replace(/bg-indigo-600/g, 'bg-primary');
    content = content.replace(/bg-indigo-500/g, 'bg-primary-light');
    content = content.replace(/bg-indigo-400\/50/g, 'bg-primary/50');
    content = content.replace(/bg-indigo-100/g, 'bg-secondary/30');
    content = content.replace(/bg-indigo-50/g, 'bg-secondary/10');
    
    content = content.replace(/text-indigo-600/g, 'text-primary');
    content = content.replace(/text-indigo-500/g, 'text-primary');
    content = content.replace(/text-indigo-400/g, 'text-primary-light');
    content = content.replace(/text-indigo-300/g, 'text-secondary-dark');
    
    content = content.replace(/border-indigo-600/g, 'border-primary');
    content = content.replace(/border-indigo-500\/40/g, 'border-primary/40');
    content = content.replace(/border-indigo-500\/30/g, 'border-primary/30');
    content = content.replace(/border-indigo-500/g, 'border-primary');
    content = content.replace(/border-indigo-300/g, 'border-secondary-dark');
    content = content.replace(/border-indigo-200/g, 'border-secondary');
    content = content.replace(/border-indigo-100/g, 'border-secondary-light');
    
    content = content.replace(/ring-indigo-500/g, 'ring-primary');
    
    content = content.replace(/from-indigo-500/g, 'from-primary');
    content = content.replace(/to-purple-600/g, 'to-secondary');
    content = content.replace(/from-indigo-50/g, 'from-secondary/10');
    content = content.replace(/to-purple-50/g, 'to-primary/10');
    
    // Blue replacements
    content = content.replace(/bg-blue-600/g, 'bg-primary');
    content = content.replace(/bg-blue-500/g, 'bg-primary');
    content = content.replace(/bg-blue-300/g, 'bg-secondary-dark');
    content = content.replace(/bg-blue-200/g, 'bg-secondary');
    content = content.replace(/bg-blue-100/g, 'bg-secondary-light');
    content = content.replace(/bg-blue-50/g, 'bg-secondary/10');
    
    content = content.replace(/text-blue-700/g, 'text-primary-dark');
    content = content.replace(/text-blue-600/g, 'text-primary');
    content = content.replace(/text-blue-500/g, 'text-primary');
    content = content.replace(/text-blue-400/g, 'text-primary-light');
    content = content.replace(/border-blue-200/g, 'border-secondary');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
