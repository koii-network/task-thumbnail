const fs = require("fs");
const path = require("path");
const uglifyJs = require("uglify-js");

const CONTRACT_SRC_PATH = "dist/contract_src.js";

// Maybe can enable this, but might result in errors
const COMPRESS_PARAMS = {
  mangle: false,
  compress: false
}

let contractSrc = fs.readFileSync(CONTRACT_SRC_PATH, "utf8");
contractSrc = contractSrc.replace(
  "Object.defineProperty(exports, '__esModule', { value: true });",
  ""
);
contractSrc = contractSrc.replace("exports.handle = handle;", "");
const result = uglifyJs.minify(contractSrc, COMPRESS_PARAMS);
if (result.error)
  console.error(result.error);
else
  fs.writeFileSync(CONTRACT_SRC_PATH, result.code);

