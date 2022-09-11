import { inbox, inMail, inSrc, inNewMail } from "./gmail";

function mailGoogleCom(url: URL) {
  let params: URLSearchParams = url.searchParams;

  if (url.hash.match(/#inbox(\/p2)?$/)) {
    // メール一覧
    inbox();
  } else if (url.hash.match(/#inbox(?:\/p2)?\?compose=new/)) {
    // 新規メールを書く
    inNewMail();
  } else if (url.hash.match(/#inbox\/[\w]+/)) {
    // メールを展開
    inMail();
  } else if (params.has("permmsgid") && params.has("ik") && params.has("view")) {
    // メールのソースを表示
    inSrc();
  }
}

function outlookOffice365Com(url: URL) {
  console.log("HELLO outlook.", url);
}

function main() {
  let url: URL = new URL(document.URL);
  let params: URLSearchParams = url.searchParams;
  if (url.origin + url.pathname === "https://mail.google.com/mail/u/0/") {
    // hashが変更されたらevent
    addEventListener("hashchange", function (event: HashChangeEvent) {
      let u = new URL(event.newURL);
      mailGoogleCom(u);
    });

    mailGoogleCom(url);
  } else if (url.origin + url.pathname === "https://outlook.office365.com/mail/") {
    outlookOffice365Com(url);
  }
}

main();
