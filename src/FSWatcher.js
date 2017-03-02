import EventEmitter from "events";

export default class FSWatcher extends EventEmitter {
  _fs;
  _handle;
  filename;
  
  constructor(fs) {
    if (!fs) {
      throw new Error('fs is required to construct a FSWatcher')
    }
    super();
    this._fs = fs;
  }
  
  start = (watchFilename/*, persistent, recursive, encoding*/) => {
    let fs = this._fs;
    if (this._handle) {
      throw new Error(`start watch more than once!`)
    }
    this.filename = watchFilename;
    this._handle = (event, filename) => {
      this.emit('change', event, filename);
    };
    if (!fs._watcher[watchFilename]) {
      fs._watcher[watchFilename] = new EventEmitter();
    }
    fs._watcher[watchFilename].on('watch', this._handle);
  };
  
  close() {
    let watcher = this._fs._watcher[this.filename];
    watcher.removeListener('watch', this._handle);
    if (watcher.listenerCount() == 0) {
      delete this._fs._watcher[this.filename];
    }
  };
}