import {basename, extname, relative, sep} from 'path';

export function getBaseNameWithoutExtension(fileName: string): string {
  return basename(fileName, extname(fileName));
}

export function isSubPathOf(
  path: string,
  parentPath: string,
  allowExact = false,
): boolean {
  const relativePath = relative(parentPath, path);

  if (relativePath === '') {
    return allowExact;
  }

  return !relativePath.startsWith(`..${sep}`);
}
