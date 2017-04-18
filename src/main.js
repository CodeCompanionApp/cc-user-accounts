
import pbkdf2 from 'pbkdf2-password';
import { access, mkdir, writeFile } from 'mz/fs';
import { join as pathJoin } from 'path';
//use file-encryptor to encrypt user data

const passwordHasher = pbkdf2();

let accountsDir = 'useraccounts';

export function setAccountsDir(dirpath) {
    accountsDir = dirpath;
}


export async function createAccountPro(username, password) {
    const passCheck = passwordChecker(password);
    if( passCheck.error ) {
        throw new Error(passCheck.error);
    }
    try {
        await access(accountsDir);
    }
    catch(e) {
        await mkdir(accountsDir);
    }

    await mkdir(pathJoin(accountsDir, username));

    const { hash, salt } = await passwordCreatorPro(password),
        account = {
            username,
            password: hash,
            passwordsalt: salt,
        },
        accountFilePath = pathJoin(accountsDir, username, 'account.json');
    await writeFile(accountFilePath, JSON.stringify(account, true, 2), 'UTF8');
}


function passwordChecker(password) {
    if( !password ) {
        return { error: "no password provided" };
    }
    return {};
}

function passwordCreatorPro(password) {
    const opts = {
            password,
        };
    return new Promise(function pro(resolve, reject) {
        passwordHasher(opts, function finishedHashing(err, pass, salt, hash) {
            if( err ) {
                reject(err);
            }
            else {
                resolve({ salt, hash });
            }
        });
    });
}


