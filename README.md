# x-filesystem [![npm package](https://img.shields.io/npm/v/x-filesystem.svg?style=flat-square)](https://www.npmjs.org/package/x-filesystem) [![Build Status](https://travis-ci.org/zjuasmn/x-filesystem.svg?branch=master)](https://travis-ci.org/zjuasmn/x-filesystem) [![Coverage Status](https://coveralls.io/repos/github/zjuasmn/x-filesystem/badge.svg?branch=master)](https://coveralls.io/github/zjuasmn/x-filesystem?branch=master)

Memory filesystem with `/node_modules` map to `unpkg.com`

Inspired by [webpack/_memory-fs_](https://github.com/webpack/memory-fs), this project implement a simple in memory file system compatible with node.js built-in module `fs` API. It can run in node or browser environment.

```js
var fs= require("x-filesystem').fs;

fs.mkdirpSync("/a/test/dir");
fs.writeFileSync("/a/test/dir/file.txt", "Hello World");
fs.readFileSync("/a/test/dir/file.txt"); // returns Buffer("Hello World")

// Async variants too
fs.unlink("/a/test/dir/file.txt", function(err) {
    // ...
});

fs.readdirSync("/a/test"); // returns ["dir"]
fs.statSync("/a/test/dir").isDirectory(); // returns true
fs.rmdirSync("/a/test/dir");
```

## Feature

* Promise support.

In async method, when callback is omitted, a promise would be return.

```js
fs.readFile('/a/b.txt','utf8').then(content=>{...}).catch(e=>{...}) 
```

* 


 

