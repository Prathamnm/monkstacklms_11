const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, regex, replacement) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(regex, replacement);
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, callback);
        } else {
            callback(fullPath);
        }
    }
}

// 1. Move Directories
const moves = [
    ['src/app/api/admin/users', 'src/app/api/hr/users'],
    ['src/app/api/admin/settings', 'src/app/api/hr/settings'],
    ['src/app/api/admin/fix-balances', 'src/app/api/hr/fix-balances'],
    ['src/app/api/admin/recalculate-leave-balance', 'src/app/api/hr/recalculate-leave-balance'],
    ['src/app/api/admin/leaves/[id]/override', 'src/app/api/hr/leaves/[id]/override'],
    ['src/app/(dashboard)/admin/users', 'src/app/(dashboard)/hr/users'],
    ['src/app/(dashboard)/admin/settings', 'src/app/(dashboard)/hr/settings'],
    // Copy the admin audit over the hr audit
    ['src/app/api/admin/audit', 'src/app/api/hr/audit-admin'],
    ['src/app/(dashboard)/admin/audit', 'src/app/(dashboard)/hr/audit-admin']
];

for (const [src, dest] of moves) {
    if (fs.existsSync(src)) {
        if (!fs.existsSync(dest)) {
            fs.cpSync(src, dest, { recursive: true });
        }
    }
}

// Clean up old admin directories
if (fs.existsSync('src/app/api/admin')) fs.rmSync('src/app/api/admin', { recursive: true, force: true });
if (fs.existsSync('src/app/(dashboard)/admin')) fs.rmSync('src/app/(dashboard)/admin', { recursive: true, force: true });

// We delete old hr/audit and rename audit-admin to audit
if (fs.existsSync('src/app/api/hr/audit')) fs.rmSync('src/app/api/hr/audit', { recursive: true, force: true });
if (fs.existsSync('src/app/api/hr/audit-admin')) fs.renameSync('src/app/api/hr/audit-admin', 'src/app/api/hr/audit');

if (fs.existsSync('src/app/(dashboard)/hr/audit')) fs.rmSync('src/app/(dashboard)/hr/audit', { recursive: true, force: true });
if (fs.existsSync('src/app/(dashboard)/hr/audit-admin')) fs.renameSync('src/app/(dashboard)/hr/audit-admin', 'src/app/(dashboard)/hr/audit');


// 2. Text Replacements
walk('src', (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    // Replace API paths
    replaceInFile(filePath, /\/api\/admin\//g, '/api/hr/');
    // Replace Page paths
    replaceInFile(filePath, /\/admin\//g, '/hr/');
    
    // Replace roles in requireRole
    // requireRole(token, ['MANAGER', 'ADMIN', 'HR']) -> requireRole(token, ['MANAGER', 'HR'])
    replaceInFile(filePath, /\['MANAGER', 'ADMIN', 'HR'\]/g, "['MANAGER', 'HR']");
    replaceInFile(filePath, /\['MANAGER', 'HR', 'ADMIN'\]/g, "['MANAGER', 'HR']");
    replaceInFile(filePath, /\['HR', 'MANAGER', 'ADMIN'\]/g, "['MANAGER', 'HR']");
    
    // ['MANAGER', 'ADMIN'] -> ['MANAGER', 'HR']
    replaceInFile(filePath, /\['MANAGER', 'ADMIN'\]/g, "['MANAGER', 'HR']");
    replaceInFile(filePath, /\['ADMIN', 'MANAGER'\]/g, "['MANAGER', 'HR']");
    
    // ['HR', 'ADMIN'] -> ['HR']
    replaceInFile(filePath, /\['HR', 'ADMIN'\]/g, "['HR']");
    replaceInFile(filePath, /\['ADMIN', 'HR'\]/g, "['HR']");
    
    // ['ADMIN'] -> ['HR']
    replaceInFile(filePath, /\['ADMIN'\]/g, "['HR']");
    
    // other instances of role === 'ADMIN'
    replaceInFile(filePath, /role === 'ADMIN'/g, "role === 'HR'");
    replaceInFile(filePath, /role === "ADMIN"/g, "role === 'HR'");
    replaceInFile(filePath, /user\.role === 'ADMIN'/g, "user.role === 'HR'");
    
    // remove 'ADMIN' from types/enums in TS
    // if it's explicitly 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN'
    replaceInFile(filePath, / \| 'ADMIN'/g, "");
});

console.log("Refactor script complete.");
