import * as FS from 'fs';
import * as Path from 'path';

export function isSubPathOf(
  path: string,
  parentPath: string,
  allowExact = false,
): boolean {
  const relativePath = Path.relative(parentPath, path);

  if (relativePath === '') {
    return allowExact;
  }

  return !relativePath.startsWith(`..${Path.sep}`);
}

export function getFirstSegmentOfPath(path: string): string {
  const [segment] = /^[^\\/]+/.exec(path) || [''];
  return segment;
}

export function getBaseNameWithoutExtension(fileName: string): string {
  return Path.basename(fileName, Path.extname(fileName));
}

export function searchUpperDir(from: string, searchName: string): string {
  let nextDirName = from;

  while (true) {
    const currentDirName = nextDirName;

    const searchPath = Path.join(currentDirName, searchName);

    if (FS.existsSync(searchPath)) {
      return currentDirName;
    }

    nextDirName = Path.dirname(currentDirName);

    if (nextDirName === currentDirName) {
      throw new Error(
        `Cannot find base url directory by search name "${searchName}"`,
      );
    }
  }
}
