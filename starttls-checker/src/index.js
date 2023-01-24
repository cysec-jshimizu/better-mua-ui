const express = require("express");
const config = require("./config");
const util = require("./util");
const checkStatus = require("./checkStatus");
const db = require("./db");
const app = express();

app.listen(20025);


app.get("/api/v1/smtp", async function (req, res, next) {
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

    console.log(`${(new Date()).toISOString()} CONNECTED`)

    if (!req.query.domain) {
        res.set(config.header);
        res.status(400);
        res.json({
            "message": "require domain"
        });
        return;
    }

    // DB内に存在するなら早期リターン
    let dbdata = await db.getDomain(req.query.domain);
    if (Object.keys(dbdata).length) {
        res.set(config.header);
        res.json(dbdata);
        return;
    }

    console.log(`${(new Date()).toISOString()} check ${req.query.domain}`)
    retJson.domain = req.query.domain;

    let mx = await util.getMx(req.query.domain);
    retJson.mx = mx;
    // if no mx
    if (mx.length < 1) {
        res.set(config.header);
        res.json(retJson);
        return;
    }

    let promises = [
        checkStatus.checkDANE(mx[0].exchange),
        checkStatus.checkMTASTS(req.query.domain),
        checkStatus.checkSTARTTLS(mx[0].exchange)
    ];
    const [DANE_RESULT, MTASTS_RESULT, STARTTLS_RESULT] = await Promise.all(promises);

    retJson.dane = DANE_RESULT;
    retJson["mta-sts"] = MTASTS_RESULT;
    retJson.starttls = STARTTLS_RESULT;

    res.set(config.header);
    res.json(retJson);

    // DBに書き込み
    promises = [
        db.insertMTASTS(req.query.domain, MTASTS_RESULT.status, MTASTS_RESULT.record, MTASTS_RESULT.policy),
        db.insertDANE(req.query.domain, DANE_RESULT.status, DANE_RESULT.record),
        db.insertSTARTTTLS(req.query.domain, STARTTLS_RESULT.status),
        db.insertDomain(req.query.domain, mx)
    ]
    await Promise.all(promises);
});
