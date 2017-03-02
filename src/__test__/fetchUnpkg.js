import fetchUnpkg from '../fetchUnpkg'
import {expect} from 'chai'

describe('fetchUnpkg', () => {
  it('can return file', (done) => {
    fetchUnpkg('/jquery/src/jquery.js').then(text => {
      expect(text).to.contains('jQuery');
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
  })
});