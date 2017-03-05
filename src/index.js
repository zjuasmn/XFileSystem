import XFileSystem from "./XFileSystem";
import fetchUnpkg from "./fetchUnpkg";

const fs = new XFileSystem(fetchUnpkg);
module.exports = fs;
export default fs;

exports.XFileSystem = XFileSystem;
exports.fetchUnpkg = fetchUnpkg;
export * as utils from './utils'