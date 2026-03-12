# Clone and Run

This contains everything you need to run your app locally.

# Clone the repository

git clone https://github.com/danieldev10/petroflow-digital-automation.git

## Install Dependencies
cd petroflow-digital-automation/
npm install

## Environment Variables

Create a .env file in the project root and add the following
DB_HOST=localhost
DB_PORT=1433
DB_NAME=PetroflowDB
DB_USER=sa
DB_PASSWORD=your_password_here
JWT_SECRET=your_jwt_secret_here
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_smtp_email_here
SMTP_PASS=your_smtp_password_here

## Prerequisites
**Git** — for cloning the repository and pulling updates
**Node.js** (recommended: version 18 or later)
**npm** — usually installed together with Node.js
**Docker Desktop** — required to run SQL Server locally in a container
**sqlcmd** — required to create the database and run SQL scripts
