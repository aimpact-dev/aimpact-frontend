  interface HttpErrorOptions extends ErrorOptions {
  status?: number;
}

export class HttpError extends Error {
  public status: number | undefined;

  constructor(message: string, options?: HttpErrorOptions) {
    super(message, options);
    this.name = "HttpError";
    this.status = options?.status;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}