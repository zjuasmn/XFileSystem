import XFileSystem from "./XFileSystem";
import fetchUnpkg from "./fetchUnpkg";

const fs = new XFileSystem(fetchUnpkg);
export default fs;

exports.XFileSystem = XFileSystem;
exports.fetchUnpkg = fetchUnpkg;