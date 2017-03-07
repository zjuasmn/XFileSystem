export const DIRECTORY = 'directory';
export const FILE = 'file';
export const DIRMODE = 16877;// Oct 40755
export const FILEMODE = 33188;// Oct 100644
export const node_modules = 'node_modules';

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
export function isReservedPath(abspath) {
  return abspath == '/' || abspath == `/${node_modules}`;
}
export function parseArguments(_arguments) {
  let args = Array.prototype.slice.call(_arguments, 0, _arguments.length - 1);
  let _callback = _arguments[_arguments.length - 1];
  let callback;
  if (typeof _callback != 'function') {
    args.push(_callback);
    callback = (err, result) => err ? Promise.reject(err) : Promise.resolve(result);
  } else {
    callback = (err, result) => setImmediate(() => _callback(err, result))
  }
  return {args, callback};
}
export function metaToAbspath(meta) {
  if (!meta) {
    return null;
  }
  let abspath = meta['']._name;
  while (meta['']._dir) {
    meta = meta['']._dir;
    abspath = meta['']._name + '/' + abspath;
  }
  return abspath[0] == '/' ? abspath.substr(1) : abspath;
}

