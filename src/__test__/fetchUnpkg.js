import fetchUnpkg, {getModuleName, hostname, version} from "../fetchUnpkg";
import {expect} from "chai";

describe('fetchUnpkg', () => {
  it('can return file', (done) => {
    fetchUnpkg('/jquery/src/jquery.js').then(text => {
      expect(text).to.contains('jQuery');
      expect(Number(version['jquery'][0])).to.greaterThan(2);
      done();
    })
  });
  it('can parse dir', (done) => {
    fetchUnpkg('/jquery/src', true).then(dir => {
      expect(dir).to.contains('jquery.js');
      done();
    })
  });
  it('can parse dir when only one level directory', (done) => {
    fetchUnpkg('/jquery').then(dir => {
      expect(dir).to.contains('src/');
      done();
    })
  });
  it('throw error when not found', (done) => {
    fetchUnpkg('/jquery/NOEXISTFILE').catch(err => {
      expect(err.message).to.contains('NOT FOUND');
      done();
    })
  });
  it('can return file multiple times', (done) => {
    let cnt = 0;
    let f = (text) =>{
      if (++cnt == 4){
        done();
      }
      expect(text).to.contains('jQuery');
    };
    fetchUnpkg('/jquery/src/jquery.js').then(f);
    fetchUnpkg('/jquery/src/jquery.js').then(f);
    fetchUnpkg('/jquery/src/jquery.js').then(f);
    fetchUnpkg('/jquery/src/jquery.js').then(f);
  });
});

describe('getModuleName',()=>{
  it('works',()=>{
    expect(getModuleName(`${hostname}/abc`)).to.equal('abc');
    expect(getModuleName(`${hostname}/abc@123`)).to.equal('abc@123');
    expect(getModuleName(`${hostname}/abc@123/dsdsd`)).to.equal('abc@123');
  })
});