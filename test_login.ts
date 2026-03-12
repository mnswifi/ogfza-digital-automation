import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('petroflow.db');

const testLogin = (email, password) => {
    console.log(`Testing login for: ${email} / ${password}`);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
        console.log("Result: User not found in DB");
        return;
    }
    const isMatch = bcrypt.compareSync(password, user.password);
    console.log(`Result: Password match: ${isMatch}`);
};

testLogin('admin@petroflow.com', 'admin123');
testLogin('compliance@ogfza.gov', 'demo123');
testLogin('ops@shell.com', 'demo123');
testLogin('finance@ogfza.gov', 'demo123');
