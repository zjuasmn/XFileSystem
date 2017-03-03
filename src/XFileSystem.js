import {basename, dirname, normalize as _normalize, resolve} from "path";
import FSWatcher from "./FSWatcher";
const errors = require("errno");
const node_modules = 'node_modules';
let normalize = (_path) => resolve('/', _normalize(_path));

class XFileSystemError extends Error {
  constructor(err, path) {
    super();
    Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    this.code = err.code;
    this.errno = err.errno;
    this.message = err.description;
    this.path = path;
  }
}
// directory is an object with '' prop, {'':true}(normal dir) {'':null}(remote dir)
function isDir(item) {
  return item && typeof item == "object" && ('' in item);
}

// File is Buffer or null(from remote)
function isFile(item) {
  return item instanceof Buffer
}

function exists(item) {
  return item != undefined;
}
function pathToArray(abspath) {
  let path = normalize(abspath).substr(1).split("/");
  if (path.length > 0 && !path[path.length - 1]) path.pop();
  return path;
}

const trueFn = () => true;
const falseFn = () => false;

function isReservePath(abspath) {
  return abspath == '/' || abspath == `/${node_modules}`;
}
function NotImplemented() {
  throw new XFileSystemError(errors.code.ENOSYS);
}

export function inLib(path) {
  return normalize(path).indexOf(node_modules) == 1;
}

export function needToFetchRemote(e, abspath) {
  if (e.code != errors.code.ENOENT.code) {
    return false;
  } else if (!inLib(abspath)) {
    return false;
  } else if (/\/package\.json$/.test(abspath) && pathToArray(abspath).length > 3) {
    return false
  } else {
    return true;
  }
}
const libPrefixLength = node_modules.length + 1;

const DIRMODE = 16877;// Oct 40755
const FILEMODE = 33188;// Oct 100644

export default class XFileSystem {
  data = {'': true};
  _stats = {'/': {birthtime: new Date(), mode: DIRMODE, _time: new Date()}};
  _watcher = {};
  _fetch;
  
  constructor(fetch) {
    this._fetch = fetch;
    this.mkdirSync(node_modules);
    this.data.node_modules[''] = null;
  }
  
  _meta(abspath) {
    const path = pathToArray(abspath);
    let current = this.data;
    for (let token of path) {
      if (!isDir(current))
        return;
      current = current[token];
    }
    return current;
  }
  
  _syncToCb = (fn) => {
    let fs = this;
    return function () {
      let path = arguments[0];
      let args = Array.prototype.slice.call(arguments, 1, arguments.length - 1);
      let callback = arguments[arguments.length - 1];
      if (typeof path != 'string') {
        setImmediate(() => callback(new TypeError('path must be a string')));
        return
      }
      if (typeof callback != 'function') {
        args.push(callback);
        callback = falseFn;
      }
      let result;
      try {
        result = fs[fn + "Sync"](path, ...args);
      } catch (e) {
        setImmediate(() => callback(e));
        return;
      }
      setImmediate(() => callback(null, result));
    }
  };
  
  _remote = (fn, _shouldBeDir) => {
    let fs = this;
    return function () {
      let path = arguments[0];
      let args = Array.prototype.slice.call(arguments, 1, arguments.length - 1);
      let callback = arguments[arguments.length - 1];
      if (!path || !(typeof path == 'string')) {
        throw new TypeError('path must be a string');
      }
      if (typeof callback != 'function') {
        args.push(callback);
        callback = falseFn;
      }
      let abspath = normalize(path);
      let result;
      try {
        result = fs[fn + 'Sync'](abspath, ...args);
      } catch (e) {
        if (!needToFetchRemote(e, abspath)) {
          setImmediate(() => callback(e));
          return;
        }
        let shouldBeDir = _shouldBeDir;
        let fetchPath = abspath.substr(libPrefixLength); // /node_modules/XX/YY => /XX/YY
        let dirpath = abspath;
        
        if (shouldBeDir === false) {
          if (fetchPath.substr(1).indexOf('/') < 0) { // top level module, like `/jquery`
            setImmediate(() => callback(new XFileSystemError(errors.code.EISDIR, abspath)));
            return;
          }
        } else if (shouldBeDir === undefined) {
          shouldBeDir = true;
          if (fetchPath.substr(1).indexOf('/') >= 0) { // top level module, like `/jquery`
            // in module, like `/jquery/dist/sub`,
            fetchPath = dirname(fetchPath); //fetch upperlevel, like `/jquery/dist
            dirpath = dirname(abspath);
          }
        }
        
        fs._fetch(fetchPath, shouldBeDir)
          .then((textOrArray) => {
            if (shouldBeDir) {
              let dir = fs.mkdirpSync(dirpath);
              dir[''] = true;
              for (let sub of textOrArray) {
                if (sub[sub.length - 1] == '/') { // dir
                  sub = sub.substr(0, sub.length - 1);
                  if (dir[sub]) {
                    if (!isDir(dir[sub])) {
                      return callback(new XFileSystemError(errors.code.EEXIST, dirpath + '/' + sub))
                    }
                  } else {
                    this._write(dir, dirpath + '/' + sub, {'': null});
                  }
                } else { // remote file
                  this._write(dir, dirpath + '/' + sub, null);
                }
              }
            } else {
              fs.writeFileSync(abspath, textOrArray);
            }
            try {
              result = fs[fn + 'Sync'](abspath, ...args)
            } catch (e) {
              callback(e);
              return;
            }
            callback(null, result);
          })
          .catch((e2) => callback(e));
        return;
      }
      setImmediate(() => callback(null, result));
    }
  };
  
  _emit(abspath, dirpath, filename, type) {
    this._watcher[dirpath] && this._watcher[dirpath].emit('watch', type, filename);
    this._watcher[abspath] && this._watcher[abspath].emit('watch', type, filename);
  }
  
  _write(current, abspath, content) {
    let dirpath = dirname(abspath);
    let filename = basename(abspath);
    current[filename] = content;
    
    let createNew = false;
    if (!this._stats[abspath]) {
      createNew = true;
      this._stats[abspath] = {birthtime: new Date(), mode: isDir(content) ? DIRMODE : FILEMODE};
    }
    this._stats[abspath]._time = new Date();
    
    this._emit(abspath, dirpath, filename, createNew ? 'rename' : 'change');
    return content;
  }
  
  _remove(_path, testFn) {
    let abspath = normalize(_path);
    
    if (isReservePath(abspath)) {
      throw new XFileSystemError(errors.code.EPERM, abspath);
    }
    let dirpath = dirname(abspath);
    let dir = this._meta(dirpath);
    let filename = basename(abspath);
    if (!isDir(dir) || !(filename in dir) || !testFn(dir[filename])) {
      throw new XFileSystemError(errors.code.ENOENT, abspath);
    }
    delete dir[filename];
    delete this._stats[abspath];
    this._emit(abspath, dirpath, filename, 'rename');
  }
  
  access = this._syncToCb('access');
  accessSync = NotImplemented;
  appendFile = this._syncToCb('appendFile');
  appendFileSync = NotImplemented;
  chmod = this._syncToCb('chmod');
  chmodSync = NotImplemented;
  chown = this._syncToCb('chown');
  chownSync = NotImplemented;
  close = this._syncToCb('close');
  closeSync = NotImplemented;
  
  get constants() {
    NotImplemented();
  }
  
  createReadStream = NotImplemented;
  createWriteStream = NotImplemented;
  exists = NotImplemented;
  existsSync = (p) => exists(this._meta(p));
  fchmod = this._syncToCb('fchmod');
  fchmodSync = NotImplemented;
  fchown = this._syncToCb('fchown');
  fchownSync = NotImplemented;
  fdatasync = this._syncToCb('fdatasync');
  fdatasyncSync = NotImplemented;
  fstat = this._syncToCb('fstat');
  fstatSync = NotImplemented;
  fsync = this._syncToCb('fsync');
  fsyncSync = NotImplemented;
  ftruncate = this._syncToCb('ftruncate');
  ftruncateSync = NotImplemented;
  futimes = this._syncToCb('futimes');
  futimesSync = NotImplemented;
  lchmod = this._syncToCb('lchmod');
  lchmodSync = NotImplemented;
  lchown = this._syncToCb('lchown');
  lchownSync = NotImplemented;
  link = this._syncToCb('link');
  linkSync = NotImplemented;
  lstat = this._remote('lstat');
  
  lstatSync(path) {
    const abspath = normalize(path);
    const stats = this._stats[abspath];
    if (!stats) {
      throw new XFileSystemError(errors.code.ENOENT, abspath);
    }
    let time = stats.time;
    return {
      isBlockDevice: falseFn,
      isCharacterDevice: falseFn,
      isSymbolicLink: falseFn,
      isFIFO: falseFn,
      isSocket: falseFn,
      atime: time,
      mtime: time,
      ctime: time,
      isDirectory: stats.mode == DIRMODE ? trueFn : falseFn,
      isFile: stats.mode == FILEMODE ? trueFn : falseFn,
      ...stats,
    }
  };
  
  mkdir = this._syncToCb('mkdir');
  
  mkdirSync(_path) {
    const abspath = normalize(_path);
    const path = pathToArray(abspath);
    if (path.length === 0) {
      throw new XFileSystemError(errors.code.EEXIST, abspath);
    }
    let current = this.data;
    let i;
    for (i = 0; i < path.length - 1; i++) {
      if (!isDir(current[path[i]]))
        throw new XFileSystemError(errors.code.ENOENT, abspath);
      current = current[path[i]];
    }
    if (isDir(current[path[i]])) {
      throw new XFileSystemError(errors.code.EEXIST, abspath);
    } else if (isFile(current[path[i]])) {
      throw new XFileSystemError(errors.code.ENOTDIR, abspath);
    }
    let local = path[0] != node_modules ? true : null;
    
    this._write(current, abspath, {'': local});
  }
  
  mkdirp = this._syncToCb('mkdirp');
  
  mkdirpSync(_path) {
    const abspath = normalize(_path);
    const path = pathToArray(abspath);
    let current = this.data;
    let currentPath = '/';
    let local = path[0] != node_modules ? true : null;
    for (let token of path) {
      if (currentPath != '/') {
        currentPath += '/';
      }
      currentPath += token;
      if (isFile(current[token])) {
        throw new XFileSystemError(errors.code.ENOTDIR, abspath);
      } else if (isDir(current[token])) {
        current = current[token];
      } else {
        current = this._write(current, currentPath, {'': local});
      }
    }
    return current;
  }
  
  mkdtemp = this._syncToCb('mkdtemp');
  mkdtempSync = NotImplemented;
  open = this._syncToCb('open');
  openSync = NotImplemented;
  read = this._syncToCb('read');
  readdir = this._remote('readdir', true);
  
  readdirSync(path) {
    let abspath = normalize(path);
    let current = this._meta(abspath);
    if (!isDir(current)) {
      throw new XFileSystemError(errors.code[isFile(current) ? 'ENOTDIR' : 'ENOENT'], abspath);
    }
    return Object.keys(current).filter(Boolean);
  };
  
  readFile = this._remote('readFile', false);
  
  readFileSync(_path, options) {
    let encoding = typeof options == 'object' ? options.encoding : options;
    const abspath = normalize(_path);
    let current = this._meta(abspath);
    if (!isFile(current)) {
      throw new XFileSystemError(errors.code[isDir(current) ? 'EISDIR' : 'ENOENT'], abspath);
    }
    return encoding ? current.toString(encoding) : current;
  }
  
  readlink = this._syncToCb('readlink');
  readlinkSync = NotImplemented;
  readSync = NotImplemented;
  realpath = this._syncToCb('realpath');
  realpathSync = normalize;
  rename = this._syncToCb('rename');
  renameSync = NotImplemented;
  rmdir = this._syncToCb('rmdir');
  rmdirSync = (path) => this._remove(path, isDir);
  stat = this._remote('stat');
  statSync = this.lstatSync;
  symlink = this._syncToCb('symlink');
  symlinkSync = NotImplemented;
  truncate = this._syncToCb('truncate');
  truncateSync = NotImplemented;
  unlink = this._syncToCb('unlink');
  unlinkSync = (path) => this._remove(path, isFile);
  unwatchFile = NotImplemented;
  utimes = this._syncToCb('utimes');
  utimesSync = NotImplemented;
  
  watch(filename, options, listener) {
    options = options || {};
    if (typeof options === 'function') {
      listener = options;
      options = {};
    } else if (typeof options === 'string') {
      options = {encoding: options};
    }
    if (typeof options !== 'object')
      throw new TypeError('"options" must be a string or an object');
    
    const watcher = new FSWatcher(this);
    watcher.start(normalize(filename), options.encoding);
    if (listener) {
      watcher.addListener('change', listener);
    }
    return watcher;
  }
  
  watchFile = this.watch;
  write = NotImplemented;
  writeFile = this._syncToCb('writeFile');
  
  writeFileSync(_path, content, options) {
    let abspath = normalize(_path);
    let encoding = typeof options == 'object' ? options.encoding : options;
    let dirpath = dirname(abspath);
    let filename = basename(abspath);
    let current = this.mkdirpSync(dirpath);
    if (!filename || isDir(current[filename])) {
      throw new XFileSystemError(errors.code.EISDIR, abspath);
    }
    this._write(current, abspath, encoding || typeof content === "string" ? new Buffer(content, encoding) : content)
  }
  
  writeSync = NotImplemented;
  
  toString() {
    let obj = {};
    for (let path in this._stats) {
      if (isReservePath(path)) continue;
      let stat = this._stats[path];
      let content = this._meta(path);
      if (stat.mode == FILEMODE) {
        obj[path] = {f: content && content.toString()};
      } else {
        obj[path] = {d: content[''] ? 1 : 0};
      }
    }
    return JSON.stringify(obj);
  }
  
  parse(o) {
    for (let path in o) {
      let x = o[path];
      if ('f' in x) {
        this.writeFileSync(path, x.f);
      } else if ('d' in x) {
        this.mkdirpSync(path)[""] = x.d ? true : null;
      }
    }
  }
}

XFileSystem.FSWatch = FSWatcher;
XFileSystem.ReadStream = NotImplemented;
XFileSystem.WriteStream = NotImplemented;
