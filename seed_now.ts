import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('petroflow.db');

const seedDemoUsers = () => {
    // Clear existing users to ensure demo credentials match exactly
    db.prepare("DELETE FROM users").run();

    const users = [
        { email: "admin@petroflow.com", pass: "admin123", name: "System Admin", role: "Admin", unit: "HQ" },
        { email: "compliance@ogfza.gov", pass: "demo123", name: "Sarah Compliance", role: "Compliance", unit: "Regulatory" },
        { email: "ops@shell.com", pass: "demo123", name: "John Operations", role: "Operations", unit: "Zone A" },
        { email: "finance@ogfza.gov", pass: "demo123", name: "Dave Finance", role: "Finance", unit: "Treasury" }
    ];

    const insertUser = db.prepare("INSERT INTO users (email, password, full_name, role, operational_unit, must_change_password) VALUES (?, ?, ?, ?, ?, 0)");
    users.forEach(u => {
        insertUser.run(u.email, bcrypt.hashSync(u.pass, 10), u.name, u.role, u.unit);
    });
    console.log("Demo users seeded successfully in petroflow.db");
};

seedDemoUsers();
