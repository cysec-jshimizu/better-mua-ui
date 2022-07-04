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

export { mailParser };
