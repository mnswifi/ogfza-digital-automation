import Database from "better-sqlite3";
import sql from "mssql";

const sqlite = new Database("petroflow.db");

const config: sql.config = {
    user: "sa",
    password: "Ms1000$xy",
    server: "localhost",
    port: 1433,
    database: "PetroflowDB",
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const tableOrder = [
    "users",
    "companies",
    "permits",
    "compliance",
    "assets",
    "revenue",
    "operations",
    "incidents",
    "employees",
    "attendance",
    "certifications",
    "shifts",
    "contractors",
    "contractor_documents",
    "work_orders",
    "equipment_maintenance",
    "team_members",
];

async function insertRow(pool: sql.ConnectionPool, table: string, row: any) {
    const columns = Object.keys(row);
    const request = pool.request();

    columns.forEach((col, i) => {
        request.input(`p${i}`, row[col]);
    });

    const columnList = columns.map(c => `[${c}]`).join(", ");
    const valuesList = columns.map((_, i) => `@p${i}`).join(", ");

    await request.query(`
    SET IDENTITY_INSERT ${table} ON;
    INSERT INTO ${table} (${columnList})
    VALUES (${valuesList});
    SET IDENTITY_INSERT ${table} OFF;
  `);
}

async function migrate() {
    const pool = await sql.connect(config);

    for (const table of tableOrder) {
        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
        console.log(`Migrating ${table}: ${rows.length} rows`);

        for (const row of rows) {
            await insertRow(pool, table, row);
        }
    }

    await pool.close();
    sqlite.close();
    console.log("Migration complete");
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});