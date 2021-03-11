import Path from 'path';
import FS from 'fs';

console.log(FS.readFileSync(Path.join(__dirname, './tsconfig.json')));
