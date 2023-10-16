import type {Stats} from 'fs';
import {statSync} from 'fs';

export function gentleStat(path: string): Stats | undefined {
  try {
    return statSync(path);
  } catch (error) {
    return undefined;
  }
}
