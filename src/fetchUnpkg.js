import fetch from "isomorphic-fetch";
export let version = {};
export let onfly = {};
export const hostname = `https://unpkg.com`;

export function getModuleName(url) {
  let pos = url.substr(hostname.length + 1).indexOf('/');
  return (pos < 0) ? url.substr(hostname.length + 1) : url.substr(hostname.length + 1, pos);
}

export default function fetchUnpkg(abspath, shouldBeDir) {
  if (abspath.substr(1).indexOf('/') < 0) {
    shouldBeDir = true;
  }
  
  let url = `${hostname}${abspath}${shouldBeDir ? '/' : ''}`;
  let moduleName = getModuleName(url);
  if (moduleName in version) {
    url = `${hostname}/${moduleName}@${version[moduleName]}${abspath.substr(moduleName.length + 1)}${shouldBeDir ? '/' : ''}`;
  }
  let request;
  if (url in onfly) {
    request = onfly[url];
  } else {
    onfly[url] = request = fetch(url)
      .catch(e => {
        delete onfly[url];
        throw e;
      })
      .then(res => {
        delete onfly[url];
        if (res.url && res.url != url) {
          let versionedModuleName = getModuleName(res.url);
          if (versionedModuleName.substr(0, moduleName.length + 1) != `${moduleName}@`) {
            throw new Error('unexpect response');
          }
          version[moduleName] = versionedModuleName.substr(moduleName.length + 1);
        }
        if (400 <= res.status) {
          throw new Error(`${abspath} NOT FOUND`);
        } else {
          // TODO: check MIME.
          return res.text();
        }
      });
  }
  return request.then(text => {
    if (shouldBeDir) {
      return text
        .match(/href="([^"]+)/g)
        .map(s => s.substr(6))
        .filter(s => s != '../');
    } else {
      return text;
    }
  })
}