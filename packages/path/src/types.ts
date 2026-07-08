/**
 * Path object interface
 */
export interface ParsedPath {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
}

export interface FormatInputPathObject {
  root?: string;
  dir?: string;
  base?: string;
  ext?: string;
  name?: string;
}