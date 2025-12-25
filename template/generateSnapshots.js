"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSnapshots = generateSnapshots;
const fs = require("fs");
const path = require("path");
const ignorePaths = ["node_modules", ".git", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "dist", "build", ".DS_Store", ".next", ".cache", "cache", "target"];

// We treat the names of the folders where templates are located as names of those templates.
async function getTemplatesNames() {
    const templatesDir = path.join(__dirname);
    const entries = await fs.promises.readdir(templatesDir, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git')
        .map(entry => entry.name);
}
function getTemplateFolderPath(templateName) {
    const templatePath = path.join(__dirname, templateName);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template folder does not exist: ${templatePath}`);
    }
    return templatePath;
}
async function walk(template, dirPath, result) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const folderPath = getTemplateFolderPath(template);
        let relativePath = path.relative(folderPath, fullPath);
        relativePath = relativePath.replace(/\\/g, '/'); // Normalize to POSIX style paths
        if (ignorePaths.some(ignore => fullPath.includes(ignore))) {
            continue;
        }
        if (entry.isDirectory()) {
            result[`/home/project/${relativePath}`] = { type: 'folder' };
            await walk(template, fullPath, result);
        }
        else if (entry.isFile()) {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            result[`/home/project/${relativePath}`] = {
                type: 'file',
                content,
            };
        }
    }
}
//Remember: template name == its folder name
async function generateSnapshotForTemplate(templateName) {
    const files = {};
    await walk(templateName, path.join(__dirname, templateName), files);
    return {
        files,
    };
}
async function generateSnapshots() {
    const templatesNames = await getTemplatesNames();
    const snapshots = {};
    for (const templateName of templatesNames) {
        snapshots[templateName] = await generateSnapshotForTemplate(templateName);
    }
    return snapshots;
}
async function main() {
    try {
        const snapshot = await generateSnapshots();
        const snapshotOutputPath = path.join(__dirname, 'snapshot.json');
        const snapshotData = JSON.stringify(snapshot, null, 2);
        fs.writeFile(snapshotOutputPath, snapshotData, 'utf-8', error => {
            if (error) {
                console.error('Error writing snapshot file', error);
                return;
            }
            console.log('Snapshot file written successfully.');
        });
    }
    catch (err) {
        console.error('Error generating snapshot:', err);
    }
}
main();
