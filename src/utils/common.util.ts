import * as path from 'path';

export const cleanPath = (value: any): string => {
  return value?.toString().trim().replace(/\\+/g, path.sep).replace(/\//g, path.sep);
}