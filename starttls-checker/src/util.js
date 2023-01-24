const dns = require('dns').promises;

module.exports.getMx = async function (domain) {
    let mx = await dns.resolveMx(domain)
        .catch(e => {
            // console.log(e.code);
            return [];
        });
    mx.sort((a, b) => (a.priority > b.priority) ? 1 : -1);
    return mx;
};
