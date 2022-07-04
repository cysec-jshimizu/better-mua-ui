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

interface AuthResults {
  [key: string]: {
    result: string;
    description: string;
  };
}

interface SecStatus {
  encrypt: {
    bool: boolean;
    description: string;
  };
  auth: AuthResults;
}
