export const DIRECTORY = 'directory';
export const FILE = 'file';
export const DIRMODE = 16877;// Oct 40755
export const FILEMODE = 33188;// Oct 100644

export function isDir(item) {
  return item && '' in item && item[''].type == DIRECTORY;
}

export function isFile(item) {
  return item && '' in item && item[''].type == FILE;
}

export function pathToArray(abspath) {
  let path = abspath.substr(1).split("/");
  if (path.length > 0 && !path[path.length - 1]) path.pop();
  return path;
}