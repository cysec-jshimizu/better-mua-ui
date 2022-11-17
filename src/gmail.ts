import { mailParser, parseSecStat } from "./email";
import { sleep } from "./util";

function getGmId(): string {
  // returns gmID which exsits in script tag
  let gmId: string = "";
  const scripts: NodeListOf<HTMLScriptElement> = document.querySelectorAll<HTMLScriptElement>("script[nonce]");
  scripts.forEach((ele: HTMLScriptElement) => {
    if (ele.innerHTML.startsWith("\n_GM_setData")) {
      let script: string = ele.innerHTML;
      let obj: GmSetdata = JSON.parse(script.substring(script.indexOf("(") + 1, script.lastIndexOf(")")));

      Object.keys(obj).forEach((a) => {
        if (Array.isArray(obj[a])) {
          gmId = obj[a][2];
        }
      });
    }
  });

  return gmId;
}

async function getThreadId(): Promise<string> {
  // in mail, get thread id
  let h2: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>("h2[data-thread-perm-id]");
  let threadid: string = "";

  if (h2.length) {
    h2.forEach((ele: HTMLElement) => {
      threadid = ele.getAttribute("data-thread-perm-id")!;
    });
    return threadid;
  } else {
    // wait for DOM
    await sleep(0.5);
    return await getThreadId();
  }
}

function getThreadList(): EmailThread[] {
  // in box, get email list
  let threadList: EmailThread[] = [];
  if (document.querySelectorAll("table") !== null) {
    let tbody: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>("tbody");
    tbody.forEach((tbodyEle: HTMLElement) => {
      let span: NodeListOf<HTMLSpanElement> = tbodyEle.querySelectorAll<HTMLSpanElement>("span[data-thread-id]");

      span.forEach((spanEle: HTMLSpanElement) => {
        let threadId: string = spanEle.getAttribute("data-thread-id")!;
        let thraedEle: HTMLElement = spanEle.parentElement!.parentElement!.parentElement!;
        if (threadList.filter((temp: EmailThread) => temp.id === threadId).length === 0) {
          threadList.push({ id: threadId, ele: thraedEle });
        }
      });
    });
  }
  return threadList;
}

async function getEmail(url: string): Promise<string> {
  let res: Response = await fetch(url);
  if (res.status !== 200) {
    console.warn(res.status);
  }
  let html: Document = new DOMParser().parseFromString(await res.text(), "text/html");
  let rawEmail: string = "";
  try {
    rawEmail = html.getElementById("raw_message_text")!.innerHTML;
  } catch (e) {
    // console.error(e);
  }
  return rawEmail;
}

// add row in email source page
function insertTable(table: Element, tag: string, value: string) {
  let tr: HTMLTableRowElement = document.createElement("tr");
  table.appendChild(tr);

  let th: HTMLTableCellElement = document.createElement("th");
  th.innerHTML = `${tag}:`;
  tr.appendChild(th);

  let td: HTMLTableCellElement = document.createElement("td");
  td.innerHTML = value;
  tr.appendChild(td);
}

function inSrc() {
  let rawEmail: string = document.getElementById("raw_message_text")!.innerHTML;
  let parsed: EmailHeader = mailParser(rawEmail);

  const table = document.querySelector<HTMLElement>(".top-area table tbody");
  if (!table) {
    console.warn("no table");
    return;
  }

  if (parsed["Received"]) {
    let result: SecStatus = parseSecStat("", parsed["Received"]);
    let enc = String(result.encrypt.bool);
    if (result.encrypt.description) {
      enc += ` (${result.encrypt.description})`;
    }
    insertTable(table, "暗号化", enc);
  }
}

function insertImg(dist: Element, stat: SecStatus) {
  // authの結果
  let authImgEle = document.createElement("img");
  let authImg: string;
  authImgEle.className = "auth-result";

  if (!dist.querySelector(".auth-result")) {
    let authResult: boolean = Object.keys(stat.auth).length ? true : false;
    let authStr: string = "";
    Object.keys(stat.auth).map((key) => {
      authResult &&= stat.auth[key].result === "pass";
      if (key === "dkim") {
        // add dkim domain when mouse over on icons
        let dkimDomain: String;
        let startPos: number = stat.auth[key].description.indexOf("header.i=@") + "header.i=@".length;
        let endPos: number = stat.auth[key].description.indexOf(" ", startPos);
        dkimDomain = stat.auth[key].description.slice(startPos, endPos);
        authStr += `${key}: ${stat.auth[key].result}, ${dkimDomain};\n`;
      } else {
        authStr += `${key}: ${stat.auth[key].result};\n`;
      }
    });

    if (authResult) {
      authImg = "img/verified.png";
      authImgEle.setAttribute("data-tooltip", `このメールの送信者ドメインは正しいです\n${authStr}`);
    } else if (Object.keys(stat.auth).length === 0) {
      authImg = "img/notverified.png";
      authImgEle.setAttribute("data-tooltip", `このメールには送信ドメイン認証がありません`);
    } else {
      authImg = "img/notverified.png";
      authImgEle.setAttribute("data-tooltip", `このメールの送信者ドメインは誤っている可能性があります\n${authStr}`);
    }
    authImgEle.src = chrome.extension.getURL(authImg);
    authImgEle.height = 18;
    authImgEle.width = 18;
    dist.prepend(authImgEle);
  }

  // 暗号化の結果
  let encryptImgEle = document.createElement("img");
  let lockImg: string;
  encryptImgEle.className = "encrypt-result";

  if (!dist.querySelector(".encrypt-result")) {
    if (stat.encrypt.bool) {
      lockImg = "img/lock.png";
      encryptImgEle.setAttribute(
        "data-tooltip",
        `このメールは次のアルゴリズムで暗号化されて届きました\n${stat.encrypt.description}`
      );
    } else {
      lockImg = "img/notlock.png";
      encryptImgEle.setAttribute("data-tooltip", "このメールは暗号化されずに届きました");
    }
    encryptImgEle.src = chrome.extension.getURL(lockImg);
    encryptImgEle.height = 20;
    encryptImgEle.width = 20;
    dist.prepend(encryptImgEle);
  }
}

async function inMail() {
  let tId: string = await getThreadId();
  let gmId: string = getGmId();
  let u: string = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${tId.substring(7)}`;

  // element of date and star in mail
  let ele: Element | null = document.querySelector("div.gK");
  if (!ele) {
    return;
  }

  let raw: string = await getEmail(u);
  let parsed: EmailHeader = mailParser(raw);
  if (parsed["Authentication-Results"] && parsed["Received"]) {
    let emailStat: SecStatus = parseSecStat(parsed["Authentication-Results"].slice(-1)[0], parsed["Received"]);
    insertImg(ele, emailStat);
  }
}

async function inbox(recursiveLimit: number) {
  if (recursiveLimit > 50) {
    return
  }

  if (!new URL(document.URL).hash.match(/#inbox(?:\/p[\d]+)?$/)) {
    return;
  }
  await sleep(1);

  let threadList: EmailThread[] = getThreadList();
  let gmId: string = getGmId();
  for (let thread of threadList) {
    // if already inserted, pass
    if (thread.ele.querySelector(".encrypt-result")) {
      continue;
    }

    let mailUrl: string = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${thread.id.substring(
      8
    )}`;
    getEmail(mailUrl)
      .then(async function (raw: string): Promise<EmailHeader> {
        thread.ele.style.backgroundColor = "";
        // if failed, fetch email again
        if (raw === "") {
          await sleep(2);
          let raw2: string = await getEmail(mailUrl);
          if (raw2 === "") {
            thread.ele.style.backgroundColor = "yellow";
            throw new Error(`failed to get source of email(${mailUrl})`);
          } else {
            return mailParser(raw2);
          }
        } else {
          return mailParser(raw);
        }
      })
      .then((parsed: EmailHeader) => {
        if (parsed["Authentication-Results"] && parsed["Received"]) {
          let emailStat: SecStatus = parseSecStat(parsed["Authentication-Results"].slice(-1)[0], parsed["Received"]);
          insertImg(thread.ele, emailStat);
        }
      });
    await sleep(0.05);
  }

  await sleep(5);
  inbox(recursiveLimit + 1);
}

async function inNewMail() {
  let emailBodyArea = document.querySelector("div[g_editable]");
  if (!emailBodyArea) return;

  let defaultLock: HTMLSpanElement | null = document.querySelector("form[enctype]>div[tabindex] span[tabindex]");

  if (defaultLock) {
    defaultLock.style.display = "none";
  }

  emailBodyArea.addEventListener("focus", (e) => {
    let defaultLock2: HTMLSpanElement | null = document.querySelector("form[enctype] span[aria-hidden]");

    if (defaultLock2 && defaultLock) {
      defaultLock.style.display = "none";
      defaultLock2.style.display = "none";
    }

    let destAddr: string | null = document.querySelectorAll("form[enctype] span[email]")[0]?.getAttribute("email");
    if (!destAddr) return;
    let domain: string = destAddr.substring(destAddr.indexOf("@") + 1);

    fetch(`https://cysec.jshimizu.dev/api/v1/smtp?domain=${domain}`)
      .then((res) => {
        return res.json();
      })
      .then((j) => {
        // insertImg
        let dist = document.querySelectorAll("form[enctype]>div[tabindex]")[0].children[1];
        let encImgEle = document.createElement("img");
        encImgEle.className = "will-encrypt";

        let willEncrypt: boolean = false;
        if (j.dane.status) {
          willEncrypt = true;
        } else if (j["mta-sts"].status) {
          willEncrypt = true;
        } else if (j.starttls.status) {
          willEncrypt = true;
        }

        if (willEncrypt) {
          encImgEle.src = chrome.extension.getURL("img/lock.png");
          encImgEle.setAttribute("data-tooltip", `${domain}宛てのメールはSTARTTLSで暗号化されて送信されます`);
        } else {
          encImgEle.src = chrome.extension.getURL("img/notlock.png");
          encImgEle.setAttribute("data-tooltip", `${domain}宛てのメールは暗号化されせずに送信されます`);
        }
        encImgEle.height = 20;
        encImgEle.width = 20;

        if (!dist?.querySelector(".will-encrypt")) {
          dist.prepend(encImgEle);
        } else if (dist?.querySelector(".will-encrypt")) {
          dist.querySelector(".will-encrypt")?.replaceWith(encImgEle);
        }
      })
      .catch((e) => {
        // failed to fetch
      });
  });
}

export { inbox, inMail, inSrc, inNewMail };
