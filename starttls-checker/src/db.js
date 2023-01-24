const mysql = require('mysql2/promise');

async function connectDB() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_SERVER,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        charset: "utf8mb4"
    })
    return conn;
}

module.exports.getDomain = async function (name) {
    let retJson = {
        "domain": "",
        "mx": [],
        "mta-sts": {
            "status": false,
        },
        "dane": {
            "status": false,
        },
        "starttls": {
            "status": false
        }
    };

    const conn = await connectDB();
    const sql = "SELECT * FROM domains WHERE domain = ?";
    const [exist] = await conn.query(sql, [name]);

    if (exist.length !== 0) {
        retJson.domain = name;
        retJson.mx = JSON.parse(exist[0].mx);

        let promises = [
            getSTARTTTLS(conn, name),
            getMTASTS(conn, name),
            getDANE(conn, name)
        ];
        [retJson.starttls, retJson['mta-sts'], retJson.dane] = await Promise.all(promises);

        conn.end();

        return retJson;
    }

    conn.end();
    return {};
};

const getSTARTTTLS = async function (conn, name) {
    const sql = "SELECT * FROM starttls WHERE domain = ?";
    const [results] = await conn.query(sql, [name]);

    return results[0];
};
const getMTASTS = async function (conn, name) {
    const sql = "SELECT * FROM mtasts WHERE domain = ?";
    const [results] = await conn.query(sql, [name]);

    return results[0];
};
const getDANE = async function (conn, name) {
    const sql = "SELECT * FROM dane WHERE domain = ?";
    let [results] = await conn.query(sql, [name]);
    results[0].record = JSON.parse(results[0].record);

    return results[0];
};


module.exports.insertDomain = async function (name, mx) {
    const conn = await connectDB();
    const sql = "INSERT INTO domains (domain, mx) VALUES (?, ?)";
    await conn.query(sql, [name, JSON.stringify(mx)]);

    conn.end()
};
module.exports.insertSTARTTTLS = async function (name, status) {
    const conn = await connectDB();
    const sql = "INSERT INTO starttls (domain, status) VALUES (?, ?)";

    await conn.query(sql, [name, status]);
};
module.exports.insertMTASTS = async function (name, status, record, policy) {
    const conn = await connectDB();
    const sql = "INSERT INTO mtasts (domain, status, record, policy) VALUES (?, ?, ?, ?)";

    await conn.query(sql, [name, status, record, policy]);
};
module.exports.insertDANE = async function (name, status, record) {
    const conn = await connectDB();
    const sql = "INSERT INTO dane (domain, status, record) VALUES (?, ?, ?)";

    await conn.query(sql, [name, status, JSON.stringify(record)]);
};
