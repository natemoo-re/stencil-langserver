const fs = require('fs-extra');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

fs.removeSync(DIST_DIR);