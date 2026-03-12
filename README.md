# OGFZA DIGITAL AUTOMATION

This contains everything you need to run your app locally.

## Prerequisites
- **Git** — for cloning the repository and pulling updates
- **Node.js** (recommended: version 18 or later)
- **npm** — usually installed together with Node.js
- **Docker Desktop** — required to run SQL Server locally in a container
- **sqlcmd** — required to create the database and run SQL scripts
  
## Clone the repository

```git clone https://github.com/danieldev10/petroflow-digital-automation.git```

## Install Dependencies
- ```cd petroflow-digital-automation/```
- ```npm install```

## Environment Variables

Create a .env file in the project root and add the following
- DB_HOST=localhost
- DB_PORT=1433
- DB_NAME=PetroflowDB
- DB_USER=sa
- DB_PASSWORD=your_password_here
- JWT_SECRET=your_jwt_secret_here
- SMTP_HOST=smtp.office365.com
- SMTP_PORT=587
- SMTP_USER=your_smtp_email_here
- SMTP_PASS=your_smtp_password_here

## Running SQL server locally with Docker

### Create & Run the MSSQL Server
```
docker run --platform linux/amd64 -e 'ACCEPT_EULA=Y' \
  -e 'MSSQL_SA_PASSWORD=your_password_here' \
  -p 1433:1433 \
  --name ms-sql-server \
  -d \
  mcr.microsoft.com/mssql/server:2022-latest
```

### Create the database
```sqlcmd -S localhost,1433 -U sa -P 'your_password_here' -Q "CREATE DATABASE PetroflowDB;"```

### Apply the schema
```sqlcmd -S localhost,1433 -U sa -P 'your_password_here' -d PetroflowDB -i schema.sql```

### Optional: Migrate legacy SQLite Data
- run ```touch migrate.ts```
- paste this code:
  ```ts
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

- run ```npx tsx migrate.ts```

## Run the App
```npm run dev```
