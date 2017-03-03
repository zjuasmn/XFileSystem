import XFileSystem from '../XFileSystem'
import {expect} from 'chai'
import fetchUnpkg from '../fetchUnpkg'
import sinon from 'sinon'

describe('XFileSystem', () => {
  let fs;
  beforeEach(() => {
    fs = new XFileSystem(fetchUnpkg);
  });
  it('writeFileSync should works', () => {
    // normal write
    fs.writeFileSync('/a.js', '123');
    expect(fs.data['a.js'].toString()).to.equal('123');
    fs.writeFileSync('/a.js', '456');
    expect(fs.data['a.js'].toString()).to.equal('456');
    fs.writeFileSync('/b.js', '123', {encoding: 'utf8'});
    fs.writeFileSync('/c.js', new Buffer('123'));
    
    // write will build path
    fs.writeFileSync('/sub/a.js', '456');
    expect(fs.data.sub[""]).to.equal(true);
    expect(fs.data.sub['a.js'].toString()).to.equal('456');
    
    // path in node_modules would be {"":null}
    fs.writeFileSync('/node_modules/a/b/a.js', '456');
    expect(fs.data.node_modules.a['']).to.equal(null);
    expect(fs.data.node_modules.a.b['']).to.equal(null);
    
    // cannot write to dir
    expect(() => fs.writeFileSync('/sub', '456')).to.throw('illegal operation on a directory');
    expect(() => fs.writeFileSync('/', '456')).to.throw('illegal operation on a directory');
    expect(() => fs.writeFileSync('/a.js/b.js', '456')).to.throw('file already exists');
  });
  
  it('writeFile should work', (done) => {
    fs.writeFile('/a.js', '123', (err) => {
      expect(err).to.equal(null);
      expect(fs.data['a.js'].toString()).to.equal('123');
    });
    
    fs.writeFile('/a.js', '456');
    expect(fs.data['a.js'].toString()).to.equal('456');
    
    fs.writeFile('/a.js/b', '123', (err) => {
      expect(err.message).to.equal('file already exists');
    });
    // expect(fs.writeFile).to.throw('path must be a string');
    done();
  });
  
  it('mkdirSync should work', () => {
    fs.mkdirSync('/sub');
    expect(fs.data['sub']).to.deep.equal({"": true});
    expect(() => fs.mkdirSync('/')).to.throw('file already exists');
    expect(() => fs.mkdirSync('/sub')).to.throw('file already exists');
    expect(() => fs.mkdirSync('/a/sub')).to.throw('no such file or directory');
    
    // dir in node_modules should marked as remote.
    fs.mkdirSync('/node_modules/sub');
    expect(fs.data.node_modules['sub']).to.deep.equal({"": null});
  });
  
  it('mkdir should work', (done) => {
    fs.mkdir('/sub', (err) => {
      expect(err).to.equal(null);
      expect(fs.data['sub']).to.deep.equal({"": true});
      done();
    })
  });
  
  it('mkdirpSync should work', () => {
    let dir = fs.mkdirpSync('/a/b/c');
    expect(dir).to.deep.equal({"": true});
    expect(fs.data.a.b.c).to.equal(dir);
    expect(fs.mkdirpSync('/a/b/c')).to.equal(dir);
    fs.writeFileSync('/sub', '123');
    expect(() => fs.mkdirpSync('/sub/a')).to.throw('not a directory');
  });
  
  it('readFilsSync should work', () => {
    fs.writeFileSync('/a.js', '123');
    fs.writeFileSync('/sub/a.js', '456');
    expect(fs.readFileSync('a.js').toString()).to.equal('123');
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
    })
  });
  it('readFile should fail on top node_model level', (done) => {
    fs.readFile('/node_modules/package.json', (err, res) => {
      expect(err.message).to.equal('illegal operation on a directory');
      done();
    })
  });
  
  it('readdirSync', () => {
    fs.writeFileSync('/sub/a.js', '123');
    fs.mkdirSync('/a.js', '123');
    expect(fs.readdirSync('/')).to.deep.equal(['node_modules', 'sub', 'a.js'])
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
  });
  
  it('stat should work', (done) => {
    fs.stat('/node_modules/react', (err, stats) => {
      expect(err).to.equal(null);
      expect(stats.isDirectory()).to.equal(true);
      
      fs.stat('/node_modules/react/dist/package.json', (err, stats) => {
        expect(err.message).to.equal('no such file or directory');
        expect('react.min.js' in fs.data.node_modules.react.dist).to.equal(true);
        done();
      });
    })
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

