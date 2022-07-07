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
    let matchResults: Array<string> | null = i.match(reAuth);
    if (matchResults) {
      result[matchResults[1]] = {
        result: "",
        description: ""
      };

      result[matchResults[1]].result = matchResults[2];
      result[matchResults[1]].description = matchResults[3];
    }
  }
  stat.auth = result;

  // parse received header
  const reReceived: RegExp = new RegExp(
    /^from [\[\]\w\.-]+ \([\w\s\.\[\]\-]+\) ?by [\w\.]+ (?:\(\w+\) )?with ([a-zA-Z]+) [\w\s\.\-\&@;]+(\([\w\s\=\-\/]+\))?/,
    "m"
  );
  for (let i of received) {
    let matchResults: Array<string> | null = i.match(reReceived);
    if (matchResults) {
      if (!matchResults[1].match(/SMTPS/)) {
        continue;
      }
      stat.encrypt.bool = true;
      stat.encrypt.description = matchResults[1];
      if (matchResults[2]) {
        stat.encrypt.description += matchResults[2];
      }
      break;
    }
  }

  return stat;
}

export { mailParser, parseSecStat };
