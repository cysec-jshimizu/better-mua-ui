interface EmailThread {
  ele: HTMLElement;
  id: string;
}

interface EmailHeader {
  [key: string]: Array<string>;
}

interface GmSetdata {
  // [key: string]: Array<string | Array<string>>
  [key: string]: Array<string>;
}
