export class RetryError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}
