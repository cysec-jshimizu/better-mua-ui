import { mailParser, parseSecStat } from "./email";
import { sleep } from "./util";

function inSrc() {}

async function getEmailList() {
  let _threadList: NodeListOf<HTMLElement> = document.querySelectorAll(".s0OAm>div");
  let threadList: Array<HTMLElement> = [];
  // threadから複数のクラスがあるもの(セパレータ)を除去
  _threadList.forEach((ele) => {
    if (ele.classList.length < 2) {
      threadList.push(ele);
    }
  });

  // get cookie
  let x_owa_canary: string = "";
  let cookies = document.cookie.split(";");
  for (let c of cookies) {
    if (c.trim().startsWith("X-OWA-CANARY")) {
      x_owa_canary = c.trim().replace("X-OWA-CANARY=", "");
    }
  }

  // fetch emaillist
  let temp = await fetch("https://outlook.office.com/owa/startupdata.ashx?app=Mail", {
    headers: {
      accept: "*/*",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      action: "StartupData",
      folderparams: '{"TimeZoneStr":"Tokyo Standard Time"}',
      messageparams:
        '{"TimeZoneStr":"Tokyo Standard Time","InboxReadingPanePosition":1,"IsFocusedInboxOn":true,"BootWithConversationView":true,"SortResults":[{"Path":{"__type":"PropertyUri:#Exchange","FieldURI":"conversation:LastDeliveryOrRenewTime"},"Order":"Descending"},{"Path":{"__type":"PropertyUri:#Exchange","FieldURI":"conversation:LastDeliveryTime"},"Order":"Descending"}]}',
      "x-owa-canary": x_owa_canary,
      "x-owa-host-app": "unknown",
      "x-owa-hosted-ux": "false",
      "x-req-source": "Mail"
    },
    referrerPolicy: "no-referrer",
    body: null,
    method: "POST",
    mode: "cors",
    credentials: "include"
  });
  let tempJ = await temp.json();

  let emails = [];
  // fetch email header
  for (let [index, emailDetail] of Object.entries(tempJ["findConversation"]["Body"]["Conversations"])) {
    // @ts-ignore
    let emailId = emailDetail["GlobalItemIds"][0]["Id"];
    let res = await fetch("https://outlook.office.com/owa/service.svc?action=GetItem&app=Mail", {
      method: "POST",
      headers: {
        action: "GetItem",
        "content-type": "application/json; charset=utf-8",
        "x-owa-canary": x_owa_canary,
        "x-owa-urlpostdata": `{"__type":"GetItemJsonRequest:#Exchange","Header":{"__type":"JsonRequestHeaders:#Exchange","RequestServerVersion":"V2016_06_24","TimeZoneContext":{"__type":"TimeZoneContext:#Exchange","TimeZoneDefinition":{"__type":"TimeZoneDefinitionType:#Exchange","Id":"Tokyo Standard Time"}}},"Body":{"__type":"GetItemRequest:#Exchange","ItemShape":{"__type":"ItemResponseShape:#Exchange","BaseShape":"IdOnly"},"ItemIds":[{"__type":"ItemId:#Exchange","Id":"${emailId}"}],"ShapeName":"MessageDetails"}}`,
        "x-req-source": "Mail"
      }
    });
    let j = await res.json();
    let rawEmailHeader: string;
    try {
      rawEmailHeader = j["Body"]["ResponseMessages"]["Items"][0]["Items"][0]["ExtendedProperty"][0]["Value"];
    } catch (e) {
      emails.push({
        ele: threadList[Number(index)],
        id: emailId,
        status: null
      });
      continue;
    }

    let parsed = mailParser(rawEmailHeader);
    let emailStat: SecStatus = parseSecStat(parsed["Authentication-Results"].slice(-1)[0], parsed["Received"]);
    emails.push({
      ele: threadList[Number(index)],
      id: emailId,
      status: emailStat
    });
    await sleep(0.1);
  }
  return emails;
}

function inMail() {}

function writeNewEmail() {
  console.log("new Email");
  console.log(document.querySelector("div[aria-label='宛先']")?.innerHTML);
}

function insertImg(dist: HTMLElement, stat: SecStatus) {
  dist.style.backgroundColor = "white";
  dist.style.borderTop = "gray 1px solid";
  // authの結果
  let authImgEle = document.createElement("img");
  let authImg: string;
  authImgEle.className = "auth-result";

  if (!dist.querySelector(".auth-result")) {
    let authResult: boolean = Object.keys(stat.auth).length ? true : false;
    let authStr: string = "";
    Object.keys(stat.auth).map((key) => {
      if (stat.auth[key].result.match(/^pass$|^bestguesspass$/)) {
        authResult &&= true;
      } else {
        authResult &&= false;
      }
      authStr += `${key}: ${stat.auth[key].result};\n`;
    });

    if (authResult) {
      authImg = "img/verified.png";
      authImgEle.setAttribute("title", `このメールには署名があります\n${authStr}`);
    } else if (Object.keys(stat.auth).length === 0) {
      authImg = "img/notverified.png";
      authImgEle.setAttribute("title", `このメールには署名がついていません`);
    } else {
      authImg = "img/notverified.png";
      authImgEle.setAttribute("title", `このメールの検証は失敗しています\n${authStr}`);
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
        "title",
        `このメールは次のアルゴリズムで暗号化されて届きました\n${stat.encrypt.description}`
      );
    } else {
      lockImg = "img/notlock.png";
      encryptImgEle.setAttribute("title", "このメールは暗号化されずに届きました");
    }
    // encryptImgEle.src = browser.extension.getURL(lockImg);
    encryptImgEle.src = chrome.extension.getURL(lockImg);
    encryptImgEle.height = 20;
    encryptImgEle.width = 20;
    dist.prepend(encryptImgEle);
  }
}

async function inbox() {
  await sleep(2);
  let emails = await getEmailList();
  for (let email of emails) {
    if (email.status === null) {
      continue;
    }
    insertImg(email.ele, email.status);
  }
}

export { inbox, writeNewEmail };
