
import tapetest from 'tape-promise/tape';
import { readdir, readFile, access, rmdir } from 'mz/fs';
import { join as pathJoin } from 'path';
import rimraf from 'rimraf';
import { randomBytes } from 'crypto';
import pbkdf2 from 'pbkdf2-password';


const passwordHasher = pbkdf2();

import * as main from '../build/main.js';

const username = 'test001',
    password = 'password-' + randomBytes(8).toString('hex'),
    desiredPath = 'testuseraccounts';

tapetest('setup', async function setup(t) {
    t.plan(0);
    // prepare test area
    await rimrafPro(desiredPath);
});

tapetest('create account', async function testProgram(t) {
    // set accounts directory
    t.equal(typeof main.setAccountsDir, 'function', 'setAccountsDir is a function');
    main.setAccountsDir(desiredPath);

    // create account
    t.equal(typeof main.createAccountPro, 'function', 'createAccountPro is a function');
    const accountFilePath = pathJoin(desiredPath, username, 'account.json');
    await main.createAccountPro(username, password);

    // verify account creation
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
        const {hash} = await getHash({password, salt:account.passwordsalt});
        t.equal(account.password, hash, 'password hash is correct');
    }
    catch(e) {
        console.log('could not parse JSON', e);
        t.fail('could not parse JSON');
    }

    // try to create another account with the same username (should fail)
    try {
        await main.createAccountPro(username, password + '2');
        t.fail('should not be able to create an existing user account');
    }
    catch(e) {
        t.pass('should not be able to create an existing user account');
    }

    // try to create an account with no initial password (should fail)
    try {
        await main.createAccountPro('user-nopass');
        t.fail('should not be able to create a user account with no initial password');
    }
    catch(e) {
        t.pass('should not be able to create a user account with no initial password');
    }

    t.end();
});

tapetest('test login', async function testing(t) {
    // try to log in with the correct username and password
    try {
        const userInfo = await main.loginPro(username, password);
        t.equal(typeof userInfo, 'object', 'should return an object');
        t.false(userInfo.hasOwnProperty('password'), 'should not contain password');
        t.false(userInfo.hasOwnProperty('passwordsalt'), 'should not contain password salt');
    }
    catch(e) {
        console.error('error', e, e.stack);
        t.fail('should work');
    }

    // try to log in with the correct username and incorrect password
    try {
        const userInfo = await main.loginPro(username, password + "blahblahblah");
        t.fail('putting in an incorrect password should not work');
    }
    catch(e) {
        t.equal(e, 'invalid', 'incorrect password should give "invalid" error');
    }

    // try to log in with an invalid username and incorrect password
    try {
        const userInfo = await main.loginPro(username + "blahblahblah", password + "blahblahblah");
        t.fail('putting in an incorrect username should not work');
    }
    catch(e) {
        t.pass('incorrect username should give error');
    }

    t.end();
});

tapetest.onFinish(async function testing() {
    // clean up and end test
    console.log('# TEARDOWN');
    await rimrafPro(desiredPath);
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

function getHash(opts) {
    return new Promise(function pro(resolve, reject) {
        passwordHasher(opts, function checkNow(err, pass, salt, hash) {
            if( err ) {
                console.log('could not hash password', err);
                reject(err);
            }
            else {
                resolve({pass, salt, hash});
            }
        });
    });
}

