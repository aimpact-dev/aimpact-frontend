import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';

export interface AnchorProjectSnapshot {
  programName: string;
  files: FileMap
}

export interface AnchorValidationResult{
  message: string;
  status: 'NOT_FOUND' | 'INVALID' | 'VALID';
}

interface DirentExistenceCheck {
  relativePath: string;
  notFoundMessage: string;
}

const WORK_DIR = '/home/project';
const ANCHOR_ROOT_DIR_NAME = 'src-anchor';

//Paths of the files, relative to the anchor root dir, that must be present for an anchor project to be valid.
const EXPECTED_ROOT_FILES: string[] = [
  'Anchor.toml',
  'Cargo.toml',
]

//Paths of the files, that must be present in the *anchor_root*/programs/*program_folder_name* folder
const EXPECTED_PROGRAM_FILES: string[] = [
  'Cargo.toml',
  'Xargo.toml',
  'src/lib.rs'
]


export function validateAnchorProject(): AnchorValidationResult {
  const files = workbenchStore.files.get();
  const anchorRootAbsolutePath = WORK_DIR + '/' + ANCHOR_ROOT_DIR_NAME;
  if(!(anchorRootAbsolutePath in files)){
    return {
      status: 'NOT_FOUND',
      message: 'Anchor project not found, directory src-anchor is not present in the project root.',
    }
  }

  //Check if there is any empty files in the anchor projects. There should not be.
  let emptyFileFound = false;
  let emptyFileRelativePath = '';
  Object.entries(files).forEach(([path, dirent]) => {
    if(path.startsWith(anchorRootAbsolutePath) && dirent && dirent.type === 'file'){
      if(dirent.content.trim().length == 0){
        emptyFileFound = true;
        emptyFileRelativePath = path.replace(anchorRootAbsolutePath + '/', '');
        return;
      }
    }
  })
  if(emptyFileFound){
    return {
      status: 'INVALID',
      message: `File ${emptyFileRelativePath} is empty. Anchor project must not contain any empty files.`,
    }
  }

  for(const rootFile of EXPECTED_ROOT_FILES){
    const absolutePath = anchorRootAbsolutePath + '/' + rootFile;
    if(!(absolutePath in files)){
      return {
        status: 'INVALID',
        message: `Could not find ${rootFile} in ${ANCHOR_ROOT_DIR_NAME} folder. Anchor project is invalid.`
      }
    }
  }

  const programDirAbsolutePath = WORK_DIR + '/' + ANCHOR_ROOT_DIR_NAME + '/programs';
  const programSubDirsNames = getProgramsSubDirsNames(files);
  if(programSubDirsNames.size == 0){
    return {
      status: 'INVALID',
      message: `No programs found in anchor project. Directory ${ANCHOR_ROOT_DIR_NAME}/programs does not contain any sub directories.`,
    }
  }
  if(programSubDirsNames.size > 1){
    return {
      status: 'INVALID',
      message: `Anchor project is invalid, more than one program found. Multiple programs are not supported yet.
      Make sure ${ANCHOR_ROOT_DIR_NAME}/programs contains only one sub directory.`,
    }
  }
  const programSubDirName = programSubDirsNames.values().next().value!;
  const programSubDirAbsolutePath = programDirAbsolutePath + '/' + programSubDirName;

  for(const programFile of EXPECTED_PROGRAM_FILES){
    const absolutePath = programSubDirAbsolutePath + '/' + programFile;
    if(!(absolutePath in files)){
      return {
        status: 'INVALID',
        message: `Could not find ${programFile} in ${ANCHOR_ROOT_DIR_NAME + '/programs/' + programSubDirName} folder. Anchor program is invalid.`
      }
    }
  }

  //Checking if program's Cargo.toml has the anchor program name in it.
  //TODO: Make more thorough files contents validation in the future
  const cargoTomlAbsolutePath = programSubDirAbsolutePath + '/Cargo.toml';
  const cargoTomlDirent = files[cargoTomlAbsolutePath];
  //Additional check in case if Cargo.toml becomes absent in EXPECTED_PROGRAM_FILES for some reason.
  if(!cargoTomlDirent || cargoTomlDirent.type == 'folder'){
    return {
      status: 'INVALID',
      message: `Could not find Cargo.toml file in ${ANCHOR_ROOT_DIR_NAME + '/programs/' + programSubDirName} folder. Anchor program is invalid.`
    }
  }
  const cargoTomlStr = cargoTomlDirent.content;
  if(!hasPackageName(cargoTomlStr)){
    return {
      status: 'INVALID',
      message: `Cargo.toml file from ${ANCHOR_ROOT_DIR_NAME + '/programs/' + programSubDirName} does not contain package name.`,
    }
  }

  return {
    status: 'VALID',
    message: 'Anchor project is valid.'
  };
}

//Returns an anchor project snapshot if there is a valid anchor project.
//Throws an exception if validation fails.
//Uses validateAnchorProject for validation.
export function getAnchorProjectSnapshot(): AnchorProjectSnapshot {
  const validationResult = validateAnchorProject();
  if(validationResult.status !== 'VALID'){
    throw new Error("Cannot take a snapshot of the anchor project, validation has failed with message: " + validationResult.message);
  }
  const files = workbenchStore.files.get();

  //Getting anchor project files
  const snapshotFiles: FileMap = {};
  const anchorProjectPrefix = WORK_DIR + '/' + ANCHOR_ROOT_DIR_NAME + '/';
  Object.entries(files).forEach(([path, dirent]) => {
    if(path.startsWith(anchorProjectPrefix)){
      const relativePath = path.replace(anchorProjectPrefix, '');
      snapshotFiles[relativePath] = dirent;
    }
  });

  //Getting program name
  const programSubDirName = getProgramsSubDirsNames(files).values().next().value;
  const cargoTomlAbsolutePath = WORK_DIR + '/' + ANCHOR_ROOT_DIR_NAME + '/programs/' + programSubDirName + '/Cargo.toml';
  const cargoTomlDirent = files[cargoTomlAbsolutePath];
  if(!cargoTomlDirent || cargoTomlDirent.type == 'folder'){
    throw new Error("Cannot retrieve anchor program name. Cargo.toml does not exists or is not a file.");
  }
  const programName = getPackageName(cargoTomlDirent.content);
  if(!programName){
    throw new Error("Could not retrieve anchor program name from Cargo.toml.");
  }
  return {
    files: snapshotFiles,
    programName: programName,
  }
}

function hasPackageName(cargoToml: string): boolean {
  const packageSection = cargoToml.match(/\[package\][\s\S]*?(?=\n\[|$)/);
  if (!packageSection) return false;
  return /^name\s*=\s*["'][^"']+["']/m.test(packageSection[0]);
}

function getPackageName(cargoToml: string): string | undefined {
  const packageSection = cargoToml.match(/\[package\][\s\S]*?(?=\n\[|$)/);
  if (!packageSection) return undefined;
  const match = packageSection[0].match(/^name\s*=\s*["']([^"']+)["']/m);
  return match ? match[1] : undefined;
}

function getProgramsSubDirsNames(files: FileMap): Set<string>{
  const programDirAbsolutePath = WORK_DIR + '/' + ANCHOR_ROOT_DIR_NAME + '/programs';
  const programSubDirsNames: Set<string> = new Set();
  Object.entries(files).forEach(([path, dirent]) => {
    if(path.startsWith(programDirAbsolutePath + '/') && dirent && dirent.type == 'folder'){
      const relativePath = path.replace(programDirAbsolutePath + '/', '');
      const segments = relativePath.split('/');
      const subDirName = segments[0];
      if(subDirName){
        programSubDirsNames.add(subDirName);
      }
    }
  });
  return programSubDirsNames;
}
