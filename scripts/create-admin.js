const readline = require('readline');
const migrate = require('../db/migrate');

migrate();

const queries = require('../lib/queries');
const { hashPassword } = require('../lib/auth');

function ask(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

(async () => {
    const email = (await ask('Admin email: ')).trim().toLowerCase();
    const password = await ask('Admin password (min 8 characters): ');

    if (!email || !password || password.length < 8) {
        console.error(
            'Email is required and password must be at least 8 characters.',
        );
        process.exit(1);
    }

    if (queries.getAdminByEmail(email)) {
        console.error('An admin with that email already exists.');
        process.exit(1);
    }

    queries.insertAdmin(email, hashPassword(password));
    console.log(`Admin account created for ${email}.`);
    process.exit(0);
})();
