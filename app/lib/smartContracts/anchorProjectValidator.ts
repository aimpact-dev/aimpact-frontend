import type { AimpactFs } from '~/lib/aimpactfs/filesystem';

export interface AnchorValidationResult{
  message: string;
  isValid: boolean;
}

interface PathCheck {
  path: string;
  notFoundMessage: string;
}

const PROGRAMS_DIR = 'src-anchor/programs'

const PATHS_TO_CHECK: PathCheck[] = [
  {
    path:'src-anchor',
    notFoundMessage: 'Anchor project not found, directory src-anchor is not present in the project root.'
  },
  {
    path:PROGRAMS_DIR,
    notFoundMessage: 'Could not find programs folder in the anchor project. Directory src-anchor/programs is absent.'
  },
  {
    path:'src-anchor/Anchor.toml',
    notFoundMessage: 'Anchor project structure is invalid. Could not find Anchor.toml file in src-anchor folder.'
  },
  {
    path:'src-anchor/Cargo.toml',
    notFoundMessage: 'Anchor project structure is invalid. Could not find Cargo toml file in src-anchor folder.'
  }
]

export class AnchorProjectValidator {
  private readonly aimpactFs: Promise<AimpactFs>;

  constructor(fsPromise: Promise<AimpactFs>) {
    this.aimpactFs = fsPromise;
  }

  async validateAnchorProject(): Promise<AnchorValidationResult>{
    const fs = await this.aimpactFs;
    for(const pathToCheck of PATHS_TO_CHECK){
      const exists = await fs.fileExists(pathToCheck.path);
      if(!exists){
        return {
          message: pathToCheck.notFoundMessage,
          isValid: false,
        };
      }
    }
    const programsContent = await fs.readdir(PROGRAMS_DIR);
    if(programsContent.length == 0){
      return {
        message: "Anchor project structure is invalid, src-anchor/programs directory is empty.",
        isValid: false,
      };
    }
    if(programsContent.length > 1){
      return {
        message: "Unsupported anchor project structure. More than one program found in src-anchor/programs directory. " +
          "Anchor projects with only one program are currently supported.",
        isValid: false
      };
    }
    const programFolderPath = PROGRAMS_DIR + '/' + programsContent[0].name;
    const programPathsToCheck: PathCheck[] = [
      {
        path: programFolderPath + '/src',
        notFoundMessage: `Invalid Anchor project structure. Could not find program src directory. Expected ${programFolderPath + '/src'} to exist.`
      },
      {
        path: programFolderPath + '/src/lib.rs',
        notFoundMessage: `Invalid Anchor project structure. Could not find lib.rs file in program src directory. Expected ${programFolderPath + '/src/lib.rs'} to exist.`
      },
      {
        path: programFolderPath + '/Cargo.toml',
        notFoundMessage: `Invalid Anchor project structure. Could not find Cargo.toml file of Anchor program. Expected ${programFolderPath + '/Cargo.toml'} to exist.`
      },
      {
        path: programFolderPath + '/Xargo.toml',
        notFoundMessage: `Invalid Anchor project structure. Could not find Xargo.toml file of Anchor program. Expected ${programFolderPath + '/Xargo.toml'} to exist.`
      }
    ];
    for(const pathToCheck of programPathsToCheck){
      const exists = await fs.fileExists(pathToCheck.path);
      if(!exists){
        return {
          message: pathToCheck.notFoundMessage,
          isValid: false,
        };
      }
    }
    return {
      message: "Anchor project is valid.",
      isValid: true,
    };
  }
}
