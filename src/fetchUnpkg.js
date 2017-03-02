import fetch from "isomorphic-fetch";

export default function fetchUnpkg(abspath, shouldBeDir) {
  if (abspath.substr(1).indexOf('/') < 0) {
    shouldBeDir = true;
  }
  return fetch(`https://unpkg.com${abspath}${shouldBeDir ? '/' : ''}`)
    .then(res => {
      if (400 <= res.status) {
        throw new Error(`${abspath} NOT FOUND`);
      } else {
        // TODO: check MIME.
        return res.text();
      }
    }).then(text => {
      if (shouldBeDir) {
        return text.match(/href="([^"]+)/g).map(s => s.substr(6));
      } else {
        return text;
      }
    })
}