declare const x: string | undefined;
x!;

declare const y: string;
y as string;

import {B, b} from './testb';

let a0: any;
let a: any;
a = b as B;
a = a0 as B;
