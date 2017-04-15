
import tape from 'tape';
import _test from 'tape-promise';
import { readdir, readFile, access, rmdir } from 'mz/fs';
import { join as pathJoin } from 'path';
import rimraf from 'rimraf';
import { randomBytes } from 'crypto';
import pbkdf2 from 'pbkdf2-password';

const tapetest = _test(tape);

const passwordHasher = pbkdf2();

import * as main from '../build/main.js';


tapetest('create account', async function testProgram(t) {
    // prepare test area
    const desiredPath = 'testuseraccounts';
    await rimrafPro(desiredPath);

    // set accounts directory
    t.equal(typeof main.setAccountsDir, 'function', 'setAccountsDir is a function');
    main.setAccountsDir(desiredPath);

    // create account
    t.equal(typeof main.createAccountPro, 'function', 'createAccountPro is a function');
    const username = 'test001',
        password = 'password-' + randomBytes(8).toString('hex'),
        accountFilePath = pathJoin(desiredPath, username, 'account.json');
    const created = await main.createAccountPro(username, password);
    await access(desiredPath);
    await access(pathJoin(desiredPath, username));
    await access(accountFilePath);
    t.pass('folders and file exist');
    const fileContents = await readFile(accountFilePath, 'UTF8');
    try {
        const account = JSON.parse(fileContents);
        t.true(account.hasOwnProperty('username'), 'has username');
        t.equal(account.username, username, 'username is correct');
        t.true(account.hasOwnProperty('passwordsalt'), 'has password salt');
        t.true(account.hasOwnProperty('password'), 'has password');
        passwordHasher({password, salt:account.passwordsalt}, function checkNow(err, pass, salt, hash) {
            if( err ) {
                console.log('could not hash password', err);
                t.fail('could not hash password');
            }
            t.equal(account.password, hash, 'password hash is correct');
        });
    }
    catch(e) {
        console.log('could not parse JSON', e);
        t.fail('could not parse JSON');
    }
    await rimrafPro(desiredPath);
    t.end();
});



function rimrafPro(...args) {
    return new Promise(function pro(resolve, reject) {
        rimraf(...args, function done(e, d) {
            if( e ) {
                reject(e);
            }
            else {
                resolve(d);
            }
        });
    });
}

