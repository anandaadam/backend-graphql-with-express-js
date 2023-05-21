import __dirname from "./path.mjs";
import path from "path";
import fs from "node:fs";

export default (filePath) => {
  filePath = path.join(__dirname, "../", filePath);
  fs.unlink(filePath, (error) => {
    console.log(error);
  });
};
