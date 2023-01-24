const dns = require("dns").promises;
const net = require("net");
const axios = require("axios");

dns.setServers(["8.8.8.8"]);


module.exports.checkDANE = async function (mxDomain) {
    let DANE_RESULT = {
        "status": false,
        "record": [],
        "err": null
    };

    try {
        // fetch TLSA record by google DoH
        const res = await axios.get(
            `https://dns.google.com/resolve?name=_25._tcp.${mxDomain}&type=TLSA`,
        );
        if (!res.data.Answer) return DANE_RESULT;

        // if exist, store
        res.data.Answer.find(ele => {
            if (ele.type === 52) {
                DANE_RESULT.status = true;
                DANE_RESULT.record.push({
                    "name": ele.name,
                    "data": ele.data
                })
            }
        });
    } catch (e) {
        DANE_RESULT.err = e.code;
        DANE_RESULT.status = false;
    }

    return DANE_RESULT;
};

module.exports.checkMTASTS = async function (domain) {
    let MTASTS_RESULT = {
        "status": false,
        "record": "",
        "policy": "",
        "err": null
    };

    try {
        const record = await dns.resolveTxt(`_mta-sts.${domain}`);
        for (txtrecord of record) {
            // Ccheck syntax. If match, then fetch polisy from well-knwon.
            if (txtrecord[0].match(/^v=STSv1;\s?id=\d{8}T\d{6};?/)) {
                MTASTS_RESULT.record = txtrecord[0];
                MTASTS_RESULT.status = true;

                let mtastsPolicy = await axios.get(
                    `https://mta-sts.${domain}/.well-known/mta-sts.txt`
                );
                MTASTS_RESULT.policy = mtastsPolicy.data;
            }
        }
    } catch (e) {
        MTASTS_RESULT.err = e.code;
    }

    return MTASTS_RESULT;
};

module.exports.checkSTARTTLS = function (mxDomain) {
    let STARTTLS_RESULT = {
        "status": false,
        "err": null
    };
    // const client = net.connect("587", mxDomain);
    const client = net.connect("25", mxDomain);

    return new Promise((resolve, reject) => {
        const timeOutId = setTimeout(() => {
            client.destroy();
            STARTTLS_RESULT.err = "ETIMEOUT";
            resolve(STARTTLS_RESULT);
        }, 5000);

        client.on("data", data => {
            clearTimeout(timeOutId);
            let data_s = String(data);
            if (data_s.startsWith("220")) {
                // greeting
                client.write("EHLO cysec.jshimizu.dev\r\n");
            } else if (data_s.startsWith("250")) {
                // parse paramaters
                for (let param of data_s.split("\r\n")) {
                    param = param.replace(/^250\s/, "250-");
                    if (param.split("-")[1] === "STARTTLS") {
                        client.write("quit\r\n");
                        STARTTLS_RESULT.status = true;
                    }
                }
                resolve(STARTTLS_RESULT);
                client.write("quit\r\n");
            }
        });
    });
};
