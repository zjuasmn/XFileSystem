export default class XFileSystemError extends Error {
  constructor(err, path) {
    super();
    Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    this.code = err.code;
    this.errno = err.errno;
    this.message = err.description;
    this.path = path;
  }
}