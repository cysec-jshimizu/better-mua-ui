function sleep(sec: number) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

export { sleep };
