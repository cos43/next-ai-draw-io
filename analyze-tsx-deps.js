#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取所有tsx文件
const getAllTsxFiles = (dir, files = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            getAllTsxFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    
    return files;
};

// 从文件内容中提取组件导入关系
const extractImports = (content, filePath) => {
    const imports = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        // 匹配相对导入 @/components/xxx
        const componentMatch = line.match(/from\s+["']@\/components\/([^"']+)["']/);
        if (componentMatch) {
            imports.push({
                type: 'component',
                path: componentMatch[1],
                line: line.trim()
            });
        }
        
        // 匹配相对导入 ./xxx 或 ../xxx
        const relativeMatch = line.match(/from\s+["'](\.[^"']+)["']/);
        if (relativeMatch) {
            imports.push({
                type: 'relative',
                path: relativeMatch[1],
                line: line.trim()
            });
        }
        
        // 匹配默认导入
        const defaultImportMatch = line.match(/^import\s+(\w+)\s+from\s+["']@\/components\/([^"']+)["']/);
        if (defaultImportMatch) {
            imports.push({
                type: 'default',
                importName: defaultImportMatch[1],
                path: defaultImportMatch[2],
                line: line.trim()
            });
        }
    }
    
    return imports;
};

// 分析项目
const projectRoot = process.cwd();
const tsxFiles = getAllTsxFiles(projectRoot);

console.log(`Found ${tsxFiles.length} TSX files:\n`);

const dependencyMap = new Map();
const reverseDepMap = new Map(); // 哪些文件被其他文件引用

for (const file of tsxFiles) {
    const relativePath = path.relative(projectRoot, file);
    const content = fs.readFileSync(file, 'utf-8');
    const imports = extractImports(content, file);
    
    dependencyMap.set(relativePath, imports);
    
    // 构建反向依赖关系
    for (const imp of imports) {
        if (imp.type === 'component' || imp.type === 'default') {
            const targetPath = `components/${imp.path}`;
            if (!reverseDepMap.has(targetPath)) {
                reverseDepMap.set(targetPath, new Set());
            }
            reverseDepMap.get(targetPath).add(relativePath);
        } else if (imp.type === 'relative') {
            // 处理相对路径
            const dir = path.dirname(relativePath);
            const resolvedPath = path.normalize(path.join(dir, imp.path));
            if (!reverseDepMap.has(resolvedPath)) {
                reverseDepMap.set(resolvedPath, new Set());
            }
            reverseDepMap.get(resolvedPath).add(relativePath);
        }
    }
}

// 输出分析结果
console.log("=== Dependency Analysis ===\n");

for (const [file, imports] of dependencyMap) {
    console.log(`📁 ${file}`);
    if (imports.length > 0) {
        for (const imp of imports) {
            console.log(`   └── ${imp.line}`);
        }
    } else {
        console.log(`   └── No component imports found`);
    }
    console.log('');
}

console.log("\n=== Unused Files Analysis ===\n");

// 找出所有在components目录下的tsx文件
const componentFiles = tsxFiles.filter(f => f.includes('/components/') && f.endsWith('.tsx'));
const unusedFiles = [];

for (const file of componentFiles) {
    const relativePath = path.relative(projectRoot, file);
    const isUsed = reverseDepMap.has(relativePath) || 
                   reverseDepMap.has(relativePath.replace('.tsx', '')) ||
                   reverseDepMap.has(relativePath.replace('components/', ''));
    
    if (!isUsed) {
        // 检查是否在entry points中被引用 (app/page.tsx, app/layout.tsx等)
        let isEntryPoint = false;
        for (const [depFile, imports] of dependencyMap) {
            if (depFile.startsWith('app/') && imports.some(imp => 
                imp.path && (imp.path === relativePath.replace('components/', '').replace('.tsx', '') ||
                           imp.path === path.basename(relativePath, '.tsx'))
            )) {
                isEntryPoint = true;
                break;
            }
        }
        
        if (!isEntryPoint) {
            unusedFiles.push(relativePath);
        }
    }
}

if (unusedFiles.length > 0) {
    console.log("🗑️  Potentially unused TSX files:");
    for (const file of unusedFiles) {
        console.log(`   - ${file}`);
    }
} else {
    console.log("✅ All TSX files appear to be in use!");
}

console.log(`\n=== Summary ===`);
console.log(`Total TSX files: ${tsxFiles.length}`);
console.log(`Component files: ${componentFiles.length}`);
console.log(`Potentially unused: ${unusedFiles.length}`);
