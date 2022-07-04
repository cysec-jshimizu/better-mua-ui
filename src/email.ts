function mailParser(email: string): EmailHeader {
  let headerStr: string = email.substring(0, email.indexOf("\n\n"));
  let headerList: EmailHeader = {};
  let revHeader: string[] = headerStr.split("\n").reverse();

  revHeader.forEach((line, index) => {
    if (line[0] === " ") {
      revHeader[index + 1] += line.trim();
    } else {
      let colon: number = line.indexOf(":");
      let tag: string = line.substring(0, colon);
      let content: string = line.substring(colon + 2);
      if (headerList[tag]) {
        headerList[tag].push(content);
      } else {
        headerList[tag] = [content];
      }
    }
  });

  return headerList;
}

function parseSecStat(auth: string, received: Array<string>): SecStatus {
  let stat: SecStatus = {
    auth: {},
    encrypt: {
      bool: false,
      description: ""
    }
  };

  // parse authentication results header
  const reAuth: RegExp = new RegExp(/(\w+)=(\w+) ([\w !-/:-@¥[-`{-~]+)/, "m");
  let result: AuthResults = {};
  for (let i of auth.split(";")) {
    let match_results: Array<string> | null = i.match(reAuth);
    if (match_results) {
      result[match_results[1]] = {
        result: "",
        description: ""
      };

      result[match_results[1]].result = match_results[2];
      result[match_results[1]].description = match_results[3];
    }
  }
  stat.auth = result;

  // parse received header
  const reReceived: RegExp = new RegExp(/\((version=\w+ cipher=[\w-]* bits=[\w/]+)\)/, "m");
  for (let i of received) {
    let match_results: Array<string> | null = i.match(reReceived);
    if (match_results) {
      stat.encrypt.bool = true;
      stat.encrypt.description = match_results[1];
      break;
    }
  }

  return stat;
}

export { mailParser, parseSecStat };
