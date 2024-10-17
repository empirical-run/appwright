export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}
