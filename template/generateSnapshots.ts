import * as fs from "fs";
import * as path from "path";

const ignorePaths = ["node_modules", ".git", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "dist", "build", ".DS_Store"];

interface File {
  type: 'file';
  content: string;
  isBinary?: boolean;
  isLocked?: boolean;
  lockedByFolder?: string; // Path of the folder that locked this file
}

interface Folder {
  type: 'folder';
  isLocked?: boolean;
  lockedByFolder?: string; // Path of the folder that locked this folder (for nested folders)
}

interface Snapshot {
  files: Record<string, File | Folder>;
  chatIndex?: string;
  summary?: string;
}

// We treat the names of the folders where templates are located as names of those templates.
async function getTemplatesNames(): Promise<string[]>{
  const templatesDir = path.dirname(__dirname); // Go up one level from dist to template
  const entries = await fs.promises.readdir(templatesDir, { withFileTypes: true });
  return entries
    .filter((entry: fs.Dirent) => entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist')
    .map((entry: fs.Dirent) => entry.name);
}

function getTemplateFolderPath(templateName: string): string {
  const templatePath = path.join(path.dirname(__dirname), templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template folder does not exist: ${templatePath}`);
  }
  return templatePath;

}

async function walk(template: string, dirPath: string, result: Record<string, File | Folder>) {
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
    } else if (entry.isFile()) {
      try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        result[`/home/project/${relativePath}`] = {
          type: 'file',
          content,
        };
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }
}

//Remember: template name == its folder name
async function generateSnapshotForTemplate(templateName: string):Promise<Snapshot>{
  const files: Record<string, File | Folder> = {};
  await walk(templateName, path.join(path.dirname(__dirname), templateName), files);

  return {
    files,
  };
}

export async function generateSnapshots(): Promise<Record<string, Snapshot>> {
  const templatesNames = await getTemplatesNames();
  const snapshots: Record<string, Snapshot> = {};
  for (const templateName of templatesNames) {
    snapshots[templateName] = await generateSnapshotForTemplate(templateName);
  }

  return snapshots;
}

async function main() {
  try {
    const snapshot = await generateSnapshots();
    const snapshotOutputPath = path.join(path.dirname(__dirname), 'snapshot.json');
    const snapshotData = JSON.stringify(snapshot, null, 2);

    fs.writeFile(snapshotOutputPath, snapshotData, 'utf-8', (error: NodeJS.ErrnoException | null) => {
      if (error) {
        console.error('Error writing snapshot file', error);
        return;
      }
      console.log('Snapshot file written successfully.');
    });
  } catch (err) {
    console.error('Error generating snapshot:', err);
  }
}

main();
