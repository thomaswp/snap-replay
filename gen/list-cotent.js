const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../dist/media/csc110');

function getDirectories(srcPath) {
  return fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
}

const directories = getDirectories(directoryPath);
const subdirs = directories.map(d => [d, getDirectories(path.join(directoryPath, d))]);

fs.writeFileSync('../dist/directories.json', JSON.stringify(subdirs, null, 2));