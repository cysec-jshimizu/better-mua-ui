import { mailParser, parseSecStat } from "./email";
import { sleep } from "./util";

function getGmId(): string {
  // returns gmID which exsits in script tag
  let gmId: string = "";
  const scripts: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("script[nonce]");
  scripts.forEach((ele: HTMLInputElement) => {
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
  let h2: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("h2[data-thread-perm-id]");
  let threadid: string = "";

  if (h2.length) {
    h2.forEach((ele: HTMLInputElement) => {
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
    let tbody: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("tbody");
    tbody.forEach((ele: HTMLInputElement) => {
      let span: NodeListOf<HTMLInputElement> = ele.querySelectorAll<HTMLInputElement>("span");
      span.forEach((ele2: HTMLInputElement) => {
        if (ele2.hasAttribute("data-thread-id")) {
          let threadId: string = ele2.getAttribute("data-thread-id")!;
          let thraedEle: HTMLElement = ele2.parentElement!.parentElement!.parentElement!;
          if (threadList.filter((temp: EmailThread) => temp.id === threadId).length === 0) {
            threadList.push({ id: threadId, ele: thraedEle });
          }
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

  const table = document.querySelector<HTMLInputElement>(".top-area table tbody");
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

async function inMail() {
  let tId = await getThreadId();
  let gmId: string = getGmId();
  let u = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${tId.substring(7)}`;

  let raw: string = await getEmail(u);
  let parsed: EmailHeader = mailParser(raw);
  if (parsed["Authentication-Results"] && parsed["Received"]) {
    let temp = parseSecStat(parsed["Authentication-Results"][0], parsed["Received"]);
    console.log(temp);
  }
  // !!encrypt, authの有無をDOMに反映
}

async function inbox() {
  async function isLoaded() {
    let threadList: EmailThread[] = getThreadList();
    let gmId: string = getGmId();
    for (let thread of threadList) {
      let mailUrl: string = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${thread.id.substring(
        8
      )}`;
      getEmail(mailUrl)
        .then(async function (raw: string): Promise<EmailHeader> {
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
          // !!encrypt, authの有無をDOMに反映
          if (parsed["Authentication-Results"] && parsed["Received"]) {
            let mailStat: SecStatus = parseSecStat(parsed["Authentication-Results"][0], parsed["Received"]);
            // console.log(mailStat);
          }
        });
      await sleep(0.05);
    }
  }
  // not good implement
  setTimeout(isLoaded, 2000);
}

export { inbox, inMail, inSrc };
