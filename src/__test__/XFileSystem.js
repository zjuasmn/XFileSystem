import XFileSystem from "../XFileSystem";
import {expect} from "chai";
import fetchUnpkg from "../fetchUnpkg";
import sinon from "sinon";
import {isDir, metaToAbspath} from "../utils";
import FSWatch from "../FSWatcher";

describe('XFileSystem', () => {
  let fs;
  beforeEach(() => {
    fs = new XFileSystem(fetchUnpkg);
  });
  it('writeFileSync should works', () => {
    // normal write
  
    fs.writeFileSync('/a.js', '123');
    expect(fs.existsSync('/a.js')).to.equal(true);
    expect(fs.data['a.js'].buffer.toString()).to.equal('123');
    fs.writeFileSync('/a.js', [52, 53, 54]);
    expect(fs.data['a.js'].buffer.toString()).to.equal('456');
    fs.writeFileSync('/a.js', '');
    expect(fs.data['a.js'].buffer.toString()).to.equal('');
    fs.writeFileSync('/b.js', '123', {encoding: 'utf8'});
    fs.writeFileSync('/c.js', new Buffer('123'));
    
    // write will build path
    fs.writeFileSync('/sub/a.js', '456');
    expect(Boolean(fs.data.sub[""])).to.equal(true);
    expect(fs.data.sub['a.js'].buffer.toString()).to.equal('456');
    
    // path in node_modules would be {"":null}
    fs.writeFileSync('/node_modules/a/b/a.js', '456');
    // expect(fs.data.node_modules.a['']).to.equal(null);
    // expect(fs.data.node_modules.a.b['']).to.equal(null);
    
    // cannot write to dir
    expect(() => fs.writeFileSync('/sub', '456')).to.throw('illegal operation on a directory');
    expect(() => fs.writeFileSync('/', '456')).to.throw('illegal operation on a directory');
    expect(() => fs.writeFileSync('/a.js/b.js', '456')).to.throw('not a directory');
  });
  
  it('writeFile should work', (done) => {
    fs.writeFile('/a.js', '123', (err) => {
      expect(err).to.equal(null);
      expect(fs.data['a.js'].buffer.toString()).to.equal('123');
    });
    
    fs.writeFile('/a.js', '456');
    expect(fs.data['a.js'].buffer.toString()).to.equal('456');
    
    fs.writeFile('/a.js/b', '123', (err) => {
      expect(err.message).to.equal('file already exists');
    });
    // expect(fs.writeFile).to.throw('path must be a string');
    done();
  });
  
  it('mkdirSync should work', () => {
    fs.mkdirSync('/sub');
    fs.writeFileSync('/file');
    expect(isDir(fs.data['sub'])).to.equal(true);
    expect(() => fs.mkdirSync('/')).to.throw('file already exists');
    expect(() => fs.mkdirSync('/sub')).to.throw('file already exists');
    expect(() => fs.mkdirSync('/a/sub')).to.throw('no such file or directory');
    expect(() => fs.mkdirSync('/file')).to.throw('file already exists');
    // dir in node_modules should marked as remote.
    fs.mkdirSync('/node_modules/sub');
    // expect(fs.data.node_modules['sub']).to.deep.equal({"": null});
  });
  
  it('mkdir should work', (done) => {
    fs.mkdir('/sub', (err) => {
      expect(err).to.equal(null);
      expect(Boolean(fs.data['sub'][''])).to.equal(true);
      done();
    })
  });
  
  it('mkdirpSync should work', () => {
    let dir = fs.mkdirpSync('/a/b/c');
    expect(isDir(dir)).to.equal(true);
    expect(fs.data.a.b.c).to.equal(dir);
    expect(fs.mkdirpSync('/a/b/c')).to.equal(dir);
    fs.writeFileSync('/sub', '123');
    expect(() => fs.mkdirpSync('/sub/a')).to.throw('not a directory');
  });
  
  it('readFilsSync should work', () => {
    fs.writeFileSync('/a.js', '123');
    fs.writeFileSync('/sub/a.js', '456');
    expect(fs.readFileSync('a.js')).to.deep.equal(new Buffer('123'));
    expect(fs.readFileSync('a.js', 'utf-8')).to.equal('123');
    expect(fs.readFileSync('/sub/a.js', 'utf-8')).to.equal('456');
    
    expect(() => fs.readFileSync()).to.throw('undefined');
    expect(() => fs.readFileSync('/sub')).to.throw('illegal operation on a directory');
    expect(() => fs.readFileSync('/sub/b.js')).to.throw('no such file or directory');
    
    expect(() => fs.readFileSync('/node_modules/jquery/src', 'utf-8')).to.throw('no such file or directory');
  });
  
  it('readFile should work', (done) => {
    fs.readFile('/node_modules/jquery/src/jquery.js', (err, res) => {
      expect(err).to.equal(null);
      expect(res.toString()).to.contains('jQuery');
      
      // fs.readFile('/node_modules/jquery/src', (err, res) => {
      //   expect(err.message).to.equal('illegal operation on a directory');
      done();
      // })
    });
  });
  it('readFile should only fetch remote when error is notfound', (done) => {
    fs.readFile('/node_modules/jquery/src/jquery.js', (err, res) => {
      expect(err).to.equal(null);
      expect(res.toString()).to.contains('jQuery');
      
      fs._fetch = () => {
        throw new Error('should not be called')
      };
      fs.readFile('/node_modules/jquery/src/jquery.js/package.json', (err, res) => {
        // fs.readFile('/node_modules/jquery/src', (err, res) => {
        //   expect(err.message).to.equal('illegal operation on a directory');
        expect(err.message).to.equal('no such file or directory');
        done();
      })
    });
  });
  it('readFile should only fetch remote when unreasonable package.json appear', (done) => {
    fs._fetch = () => {
      throw new Error('should not be called')
    };
    fs.readFile('/node_modules/jquery/src/jquery.js/package.json', (err, res) => {
      // fs.readFile('/node_modules/jquery/src', (err, res) => {
      //   expect(err.message).to.equal('illegal operation on a directory');
      expect(err.message).to.equal('no such file or directory');
      done();
    });
  });
  it('readFile should fail on top node_model level', (done) => {
    fs.readFile('/node_modules/package.json', (err, res) => {
      expect(err.message).to.equal('illegal operation on a directory');
      done();
    })
  });
  
  it('readdirSync', () => {
    fs.writeFileSync('/sub/a.js', '123');
    fs.writeFileSync('/a.js', '123');
    expect(fs.readdirSync('/')).to.deep.equal(['node_modules', 'sub', 'a.js']);
    expect(() => fs.readdirSync('/a.js')).to.throw('not a directory')
  });
  
  it('readdir', (done) => {
    fs.readdir('/node_modules/jquery', (err, res) => {
      expect(err).to.equal(null);
      expect(res).to.contains('dist');
      done()
    });
  });
  
  it('unlinkSync should work', () => {
    fs.writeFileSync('/a.js', '123');
    fs.unlinkSync('/a.js');
    expect(fs.data['a.js']).to.equal(undefined);
    
    expect(() => fs.unlinkSync('/a.js')).to.throw('no such file or directory');
  });
  
  it('rmdirSync should work', () => {
    fs.mkdirSync('/sub');
    fs.rmdirSync('/sub');
    expect(fs.data['sub']).to.equal(undefined);
    expect(() => fs.unlinkSync('/sub')).to.throw('no such file or directory');
    
    expect(() => fs.unlinkSync('/')).to.throw('operation not permitted');
    expect(() => fs.unlinkSync('/node_modules')).to.throw('operation not permitted');
  });
  
  it('watch should work', () => {
    let dirSpy = sinon.spy();
    let watcher1 = fs.watch('/', dirSpy);
    let fileSpy = sinon.spy();
    let watcher2 = fs.watch('/b.js', fileSpy);
  
    expect(() => new FSWatch()).to.throw();
    expect(watcher1 instanceof FSWatch).to.equal(true);
    expect(() => watcher1.start()).to.throw('start watch more than once');
    
    fs.writeFileSync('/a.js', '123');
    expect(dirSpy.calledWith('rename', 'a.js'));
    fs.writeFileSync('/a.js', '456');
    expect(dirSpy.calledWith('change', 'a.js'));
    fs.writeFileSync('/b.js', '123');
    expect(dirSpy.calledWith('rename', 'b.js'));
    expect(fileSpy.calledWith('rename', 'b.js'));
    
    watcher1.close();
    watcher2.close();
    fs.writeFileSync('/a.js', '789');
    expect(dirSpy.calledThrice).to.equal(true);
    expect(fileSpy.calledOnce).to.equal(true);
    
    expect(() => fs.watch('x')).not.to.throw();
  });
  
  it('will throw when call unimplemented methods', () => {
    expect(() => fs.constants).to.throw('function not implemented')
  });
  
  it('statSync should work', () => {
    expect(fs.statSync('/').isDirectory()).to.equal(true);
    expect(fs.statSync('/').mode).to.equal(16877);
    expect(() => fs.statSync('/a')).to.throw('no such file or directory');
    fs.writeFileSync('/a', '123');
    expect(fs.statSync('/a').isFile()).to.equal(true);
    expect(fs.statSync('/a').isDirectory()).to.equal(false);
  });
  
  it('stat should work', (done) => {
    fs.stat('/node_modules/react', (err, stats) => {
      expect(err).to.equal(null);
      expect(stats.isDirectory()).to.equal(true);
      
      fs.stat('/node_modules/react/dist/lalala.json', (err, stats) => {
        expect(err.message).to.equal('no such file or directory');
        expect('react.min.js' in fs.data.node_modules.react.dist).to.equal(true);
        done();
      });
    })
  });
  
  it('renameSync should work', () => {
    fs.writeFileSync('/a.js', '123');
    fs.writeFileSync('/b.js', '456');
    fs.renameSync('/a.js', '/c.js');
    expect(fs.data['c.js'].buffer).to.deep.equal(new Buffer('123'));
    expect(() => fs.renameSync('/a.js', '/c.js')).to.throw('no such file or directory');
    expect(() => fs.renameSync('/c.js', '/a/c.js')).to.throw('no such file or directory');
    fs.mkdirSync('/a');
    fs.renameSync('/c.js', '/a/c.js');
    expect(fs.data.a['c.js'].buffer).to.deep.equal(new Buffer('123'));
    // rename directory
    fs.renameSync('/a', '/b');
    expect(fs.data.b['c.js'].buffer).to.deep.equal(new Buffer('123'));
    
    expect(() => fs.renameSync('/', '/a.js')).to.throw('operation not permitted');
    expect(() => fs.renameSync('/a.js', '/node_modules')).to.throw('operation not permitted');
  });
  
  it('serializeSync and deserializeSync should work', () => {
    fs.writeFileSync('/a/b/c', '123中文');
    fs.writeFileSync('/a/b/d', null);
    let s = fs.serializeSync();
    expect(s.length).to.equal(52);
    // console.log(s);
    let nfs = new XFileSystem();
    nfs.deserializeSync(s);
    expect(nfs.readFileSync('/a/b/c', 'utf8')).to.equal('123中文');
    expect(() => nfs.readFileSync('/a/b/d')).to.throw('no such file or directory');
  });
  
  it('clearSync should work', () => {
    fs.writeFileSync('/a/b/c', '123中文');
    fs.writeFileSync('/a/b/d', null);
    expect(() => fs.writeFileSync('/a/b/c/d', null)).to.throw('not a directory');
    fs.clearSync();
    expect(fs.serializeSync().length).to.equal(19);
    expect(() => fs.writeFileSync('/a/b/c/d', null)).to.not.throw();
  });
  
  it('promise should be returned when no callback', () => {
    return fs.writeFile('/a/b/c', '123中文')
      .then(() => fs.readFile('/a/b/c', 'utf8'))
      .then((data) => {
        expect(data).to.equal('123中文');
      })
      .then(() => fs.stat('/a/c'))
      .catch(e => expect(e.message).to.equal('no such file or directory'))
  });
  
  it('readdirp should work', () => {
    fs.writeFileSync('/a/b/c', '123');
    expect(fs.readdirpSync('/')).to.deep.equal({
      a: {b: {c: null}},
      node_modules: {}
    });
  });
  
  it('_meta and _abspath should work', () => {
    fs.writeFileSync('/a/b/c', '123');
    let meta = fs._meta('/a/b/c');
    expect(meta.buffer).to.deep.equal(new Buffer('123'));
    let abspath = metaToAbspath(meta);
    expect(abspath).to.equal('/a/b/c');
    fs.renameSync('/a/b/c', '/x');
    let meta2 = fs._meta('/x');
    expect(meta2).to.equal(meta);
    expect(metaToAbspath(meta2)).to.equal('/x');
    
    let x = fs.unlinkSync('/x');
    expect(metaToAbspath(x)).to.equal('x');
  });
  
  it('directory mtime should change if children added or removed', (done) => {
    fs.mkdirSync('/a');
    let mtime = fs.statSync('/a').mtime;
    
    setTimeout(() => {
      fs.writeFileSync('/a/b', '1');
      let mtime2 = fs.statSync('/a').mtime;
      expect(mtime2.getTime()).to.greaterThan(mtime.getTime());
      setTimeout(() => {
        fs.writeFileSync('/a/b', '222');
        let mtime3 = fs.statSync('/a').mtime;
        expect(mtime3.getTime()).to.equal(mtime2.getTime());
        setTimeout(() => {
          fs.renameSync('/a/b', '/b');
          let mtime4 = fs.statSync('/a').mtime;
          expect(mtime4.getTime()).to.greaterThan(mtime3.getTime());
          done();
        }, 10);
      }, 10);
    }, 10);
  });
  
  it('should have all fs methods', () => {
    let fsMethods = [
      "access",
      "accessSync",
      "appendFile",
      "appendFileSync",
      "chmod",
      "chmodSync",
      "chown",
      "chownSync",
      "close",
      "closeSync",
      "createReadStream",
      "createWriteStream",
      "exists",
      "existsSync",
      "fchmod",
      "fchmodSync",
      "fchown",
      "fchownSync",
      "fdatasync",
      "fdatasyncSync",
      "fstat",
      "fstatSync",
      "fsync",
      "fsyncSync",
      "ftruncate",
      "ftruncateSync",
      "futimes",
      "futimesSync",
      "lchmod",
      "lchmodSync",
      "lchown",
      "lchownSync",
      "link",
      "linkSync",
      "lstat",
      "lstatSync",
      "mkdir",
      "mkdirSync",
      "mkdtemp",
      "mkdtempSync",
      "open",
      "openSync",
      "read",
      "readdir",
      "readdirSync",
      "readFile",
      "readFileSync",
      "readlink",
      "readlinkSync",
      "readSync",
      "realpath",
      "realpathSync",
      "rename",
      "renameSync",
      "rmdir",
      "rmdirSync",
      "stat",
      "statSync",
      "symlink",
      "symlinkSync",
      "truncate",
      "truncateSync",
      "unlink",
      "unlinkSync",
      "unwatchFile",
      "utimes",
      "utimesSync",
      "watch",
      "watchFile",
      "write",
      "write",
      "writeFile",
      "writeFileSync",
      "writeSync",
      "writeSync"];
    for (let method of fsMethods) {
      expect(typeof fs[method]).to.equal('function');
    }
  });
});

