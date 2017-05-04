
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
    desiredPath = 'testuseraccounts',
    accountFilePath = pathJoin(desiredPath, username, 'account.json');

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

tapetest('change account settings', async function testing(t) {
    const fileContents = await readFile(accountFilePath, 'UTF8');
    let account;
    try {
        account = JSON.parse(fileContents);
    }
    catch(e) {
        t.fail('error in parsing JSON');
    }

    // add photo
    try {
        const photo1 = 'photo_of_me.jpg',
            addedAttributes = {
                photo: photo1,
                ...account,
            };

        await main.accountSettingsPro(username, {photo: photo1});
        const newFileContents = await readFile(accountFilePath, 'UTF8'),
            alteredAccount = JSON.parse(newFileContents);
        t.deepEqual(alteredAccount, addedAttributes, 'added attribute');
    }
    catch(e) {
        console.error('error', e, e.stack);
        t.fail('adding attribute should not fail');
    }

    // change photo
    try {
        const photo2 = 'photo_of_me-cropped.jpg',
            modifiedAttributes = {
                photo: photo2,
                ...account,
            };

        await main.accountSettingsPro(username, {photo: photo2});
        const newFileContents = await readFile(accountFilePath, 'UTF8'),
            alteredAccount = JSON.parse(newFileContents);
        t.deepEqual(alteredAccount, modifiedAttributes, 'modified attribute');
    }
    catch(e) {
        console.error('error', e, e.stack);
        t.fail('modifying attribute should not fail');
    }

    // remove photo
    try {
        await main.accountSettingsPro(username, {}, ['photo']);
        const newFileContents = await readFile(accountFilePath, 'UTF8'),
            alteredAccount = JSON.parse(newFileContents);
        t.deepEqual(alteredAccount, account, 'removed attribute');
    }
    catch(e) {
        console.error('error', e, e.stack);
        t.fail('removing attribute should not fail');
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

