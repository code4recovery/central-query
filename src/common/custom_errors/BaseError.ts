export default abstract class BaseError extends Error {
  name: string
  readonly stack?: string

  constructor(detail?: string) {
    super(detail)
    this.name = this.constructor.name
    this.stack = new Error().stack
  }
}
