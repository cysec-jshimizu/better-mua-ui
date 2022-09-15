import * as gmail from "./gmail";
import * as outlook from "./outlook";
import { sleep } from "./util";

function mailGoogleCom(url: URL) {
  let params: URLSearchParams = url.searchParams;

  if (url.hash.match(/#inbox(\/p2)?$/)) {
    // メール一覧
    gmail.inbox();
  } else if (url.hash.match(/#inbox(?:\/p2)?\?compose=new/)) {
    // 新規メールを書く
    gmail.inNewMail();
  } else if (url.hash.match(/#inbox\/[\w]+/)) {
    // メールを展開
    gmail.inMail();
  } else if (params.has("permmsgid") && params.has("ik") && params.has("view")) {
    // メールのソースを表示
    gmail.inSrc();
  }
}

async function outlookOffice365Com(url: URL) {
  outlook.inbox();
  if (url.pathname.match(/^\/mail\/$/)) {
    console.log("inbox");
  } else if (url.pathname.match(/^\/mail\/inbox\/id\/[\w\%]+/)) {
    console.log("open email");
  }

  await sleep(2);
  let newEmailButton = document.querySelectorAll("#app .ms-Button--commandBar")[0];
  console.log(newEmailButton);

  newEmailButton?.addEventListener("click", () => {
    outlook.writeNewEmail();
  })
}

function main() {
  let url: URL = new URL(document.URL);
  if (url.origin + url.pathname === "https://mail.google.com/mail/u/0/") {
    // hashが変更されたらevent
    addEventListener("hashchange", function (event: HashChangeEvent) {
      let u = new URL(event.newURL);
      mailGoogleCom(u);
    });

    mailGoogleCom(url);
  } else if (url.origin === "https://outlook.office.com") {
    outlookOffice365Com(url);
  }
}

main();
