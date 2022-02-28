/*
  This file tests QuickConfig options
*/

// Test allowDefaultAndNamedImport disabled
import FS, {a} from 'fs';

// Test allowDefaultAndNamedImport enabled
import https, {b} from 'https';

// Test defaultImportNamingType as-is
import _crypto from 'crypto';

// Test defaultImportNamingType as-is-with-underscore
import _assert from 'assert';

// Test defaultImportNamingType any
import whatever from 'url';

// Test namedImportNamingType as-is-with-underscore
import {get as _get, fill as full} from 'buffer';

// Test namedImportNamingType any
import {get as _gat, fill as f1ll} from 'process';

// Test multiple module in one config
import {get as _got, fill as fall} from 'os';
