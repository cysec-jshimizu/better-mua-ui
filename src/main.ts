import { inbox, inMail, inSrc } from "./gmail";

function main() {
  let url: URL = new URL(document.URL);
  let params: URLSearchParams = url.searchParams;
  if (url.origin + url.pathname === "https://mail.google.com/mail/u/0/") {
    // URLが変更されたらevent
    addEventListener("hashchange", function (event: HashChangeEvent) {
      let u = new URL(event.newURL);
      if (u.hash.match(/#inbox(\/p2)?$/)) {
        // まだ色をつけていないなら
        // なにかフラグを立てておく
        inbox();
      } else if (u.hash.match(/#inbox\/?\?compose=/)) {
        // 新規メール
        console.log("writing new email");
      } else if (u.hash.match(/#inbox\/[\w]+/)) {
        // メールを展開
        inMail();
      }
    });

    if (url.hash.match(/#inbox(\/p2)?$/)) {
      // メール一覧
      inbox();
    } else if (url.hash.match(/#inbox\/?\?compose=/)) {
      // 新規メールを書く
      console.log("writing new mail");
    } else if (url.hash.match(/#inbox\/[\w]+/)) {
      // メールを展開
      inMail();
    } else if (params.has("permmsgid") && params.has("ik") && params.has("view")) {
      // メールのソースを表示
      inSrc();
    }
  } else if (url.origin + url.pathname === "https://outlook.office365.com/mail/") {
    console.log("at outlook");
  }
}

main();
