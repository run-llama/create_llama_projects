export const MAX_TOKEN = 512;

export const runAsyncFnWithoutBlocking = (
  // eslint-disable-next-line no-unused-vars
  fn: (...args: any) => Promise<any>,
) => {
  fn();
};
