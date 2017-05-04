
import pbkdf2 from 'pbkdf2-password';
import { access, mkdir, writeFile, readFile } from 'mz/fs';
import { join as pathJoin } from 'path';
//use file-encryptor to encrypt user data

const passwordHasher = pbkdf2(),
    protectedAttributes = ['username', 'password', 'passwordsalt'];

let accountsDir = 'useraccounts';

export function setAccountsDir(dirpath) {
    accountsDir = dirpath;
}


export async function createAccountPro(username, password) {
    const passCheck = validPassword(password);
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

export async function loginPro(username, password) {
    try {
        const accountFilePath = pathJoin(accountsDir, username, 'account.json'),
            accountDataFile = await readFile(accountFilePath, 'UTF8'),
            accountData = JSON.parse(accountDataFile),
            passwordHit = await comparePasswordPro(password, accountData.password, accountData.passwordsalt);

        delete accountData.password;
        delete accountData.passwordsalt;

        if( passwordHit ) {
            return accountData;
        }
        else {
            return Promise.reject('invalid');
        }

    }
    catch(e) {
        return Promise.reject(e);
    }
}

//TODO: make this function accept some sort of user-specific token rather than the username
export async function modifyAccountSettingsPro(username, addChangeSettings, removeSettings) {
    try {
        const accountFilePath = pathJoin(accountsDir, username, 'account.json'),
            accountDataFile = await readFile(accountFilePath, 'UTF8');
        let accountData = JSON.parse(accountDataFile);

        if( addChangeSettings ) {
            // do not alter protected attributes
            const safe = protectedAttributes.reduce(removeAttribute, addChangeSettings);

            accountData = {
                ...accountData,
                ...safe,
            };
        }
        if( removeSettings && removeSettings.length ) {
            accountData = removeSettings
            .filter(x => !protectedAttributes.includes(x))
            .reduce(removeAttribute, accountData);
        }

        await writeFile(accountFilePath, JSON.stringify(accountData, true, 2), 'UTF8');
    }
    catch(e) {
        return Promise.reject(e);
    }
}

export async function accountSettingsPro(username) {
    try {
        const accountFilePath = pathJoin(accountsDir, username, 'account.json'),
            accountDataFile = await readFile(accountFilePath, 'UTF8'),
            accountData = JSON.parse(accountDataFile),
            safe = protectedAttributes.reduce(removeAttribute, accountData);

        return safe;
    }
    catch(e) {
        return Promise.reject(e);
    }
}

function removeAttribute(acc, attrib) {
    const {[attrib]:garbage, ...rem} = acc;
    return rem;
}

function validPassword(password) {
    if( !password ) {
        return { error: "no password provided" };
    }
    return {};
}

function comparePasswordPro(givenPass, hashedPass, salt) {
    const opts = {
        password: givenPass,
        salt,
    };
    return new Promise(function pro(resolve, reject) {
        passwordHasher(opts, function finishedHashing(err, pass, newSalt, hash) {
            if( err ) {
                reject(err);
                //resolve(false);
            }
            else {
                if( hash === hashedPass ) {
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            }
        });
    });
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


