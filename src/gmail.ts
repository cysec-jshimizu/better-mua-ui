import { mailParser } from "./email";

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
      })
    }
  });

  return gmId;
}

function getThradId(): string {
  // in mail, get thread id
  let h2: NodeListOf<HTMLInputElement> = document.querySelectorAll<HTMLInputElement>("h2[data-thread-perm-id]");
  let threadid: string = "";
  h2.forEach((ele: HTMLInputElement) => {
    threadid = ele.getAttribute("data-thread-perm-id")!;
  });
  return threadid;
}

function getThreadList(): EmailThread[] {
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

function getEmail(url: string): Promise<string> {
  return fetch(url)
    .then((res: Response) => {
      if (res.status !== 200) {
        console.warn(res.status);
      }
      return res.text();
    })
    .then((text: string) => {
      return new DOMParser().parseFromString(text, "text/html");
    })
    .then((html: Document) => {
      let rawEmail: string = "";
      try {
        rawEmail = html.getElementById("raw_message_text")!.innerHTML;
      } catch (e) {
        // console.error(e);
      }
      return rawEmail;
    });
}

function inMail() {
  let tid = getThradId();
  let gmId: string = getGmId();
  let u = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${tid.substring(7)}`;

  getEmail(u).then((raw: string) => {
    let parsedHeader: EmailHeader = mailParser(raw);
    return parsedHeader;
  }).then((parsed: EmailHeader) => {
    if (parsed["IBE-Verify"]) {
      console.log(parsed["IBE-Verify"][0]);
    } else {
      console.log("no sign");
    }
  })
};

function inbox() {
  // show ibe result at #inbox
  function isLoaded() {
    let threadList: EmailThread[] = getThreadList();
    let gmId: string = getGmId();
    for (let thread of threadList) {
      let mailUrl: string = `https://mail.google.com/mail/u/0/?ik=${gmId}&view=om&permmsgid=msg-${thread.id.substring(8)}`;
      getEmail(mailUrl)
        .then((raw: string): EmailHeader => {
          let parsedHeader: EmailHeader;
          if (raw === "") {
            // fetch again after 3 seconds
            setTimeout(() => {
              getEmail(mailUrl).then((raw) => {
                if (raw === "") {
                  // console.log(thread.id);
                  thread.ele.style.backgroundColor = "yellow";
                  throw new Error(`failed to get source of email(${mailUrl})`);
                } else {
                  parsedHeader = mailParser(raw);
                }
              });
            }, 3000);
          }
          parsedHeader = mailParser(raw);
          return parsedHeader;
        })
        .then((parsed: EmailHeader) => {
          if (parsed["IBE-Verify"]) {
            if (parsed["IBE-Verify"].length === 1 && parsed["IBE-Verify"][0] === "ok") {
              thread.ele.style.backgroundColor = "green";
            } else {
              console.warn("failed to verify");
              thread.ele.style.backgroundColor = "red";
            }
          }
          if (parsed["Ibemail-Decrypted"]) {
            if (parsed["Ibemail-Decrypted"][0] === "true") {
              // console.log("dec ok");
            } else {
              // console.log("dec failed");
            }
          }
        })
        .catch((e: Error) => console.error(e));
    }
  }
  // not good implement
  setTimeout(isLoaded, 2000);
}

export { inbox, inMail };
