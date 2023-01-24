const db = require("./db")

async function main() {
    let a = await db.getDomain("goole.com")
    console.log(a);
}
main()
