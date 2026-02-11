export class InputValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'InputValidationError'
    this.status = status
  }
}

type ReadJsonOptions = {
  allowedKeys?: readonly string[]
}

type ReadFormDataOptions = {
  allowedKeys?: readonly string[]
}

type StringFieldOptions = {
  required?: boolean
  trim?: boolean
  minLength?: number
  maxLength?: number
  toLowerCase?: boolean
  toUpperCase?: boolean
  pattern?: RegExp
  enumValues?: readonly string[]
}

type NumberFieldOptions = {
  required?: boolean
  min?: number
  max?: number
  integer?: boolean
  coerce?: boolean
}

type BooleanFieldOptions = {
  required?: boolean
}

type FileFieldOptions = {
  required?: boolean
  maxBytes?: number
  allowedTypes?: readonly string[]
}

export function isInputValidationError(error: unknown): error is InputValidationError {
  return error instanceof InputValidationError
}

export function toValidationErrorResponse(error: InputValidationError) {
  return {
    body: { error: error.message },
    status: error.status,
  }
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputValidationError('Invalid request payload.')
  }
}

function assertNoUnexpectedKeys(input: Record<string, unknown>, allowedKeys: readonly string[]) {
  const unknownKeys = Object.keys(input).filter(key => !allowedKeys.includes(key))
  if (unknownKeys.length > 0) {
    throw new InputValidationError(`Unexpected field: ${unknownKeys[0]}`)
  }
}

export async function readJsonObject(req: Request, options: ReadJsonOptions = {}) {
  const payload = await req.json().catch(() => {
    throw new InputValidationError('Invalid JSON payload.')
  })
  assertPlainObject(payload)
  if (options.allowedKeys) {
    assertNoUnexpectedKeys(payload, options.allowedKeys)
  }
  return payload
}

export async function readFormDataStrict(req: Request, options: ReadFormDataOptions = {}) {
  const formData = await req.formData().catch(() => {
    throw new InputValidationError('Invalid multipart form payload.')
  })
  if (options.allowedKeys) {
    for (const key of formData.keys()) {
      if (!options.allowedKeys.includes(key)) {
        throw new InputValidationError(`Unexpected field: ${key}`)
      }
    }
  }
  return formData
}

export function readStringField(
  input: Record<string, unknown>,
  field: string,
  options: StringFieldOptions = {},
) {
  const required = options.required ?? false
  const trim = options.trim ?? true
  const raw = input[field]

  if (raw == null) {
    if (required) throw new InputValidationError(`${field} is required.`)
    return undefined
  }

  if (typeof raw !== 'string') {
    throw new InputValidationError(`${field} must be a string.`)
  }

  let value = trim ? raw.trim() : raw

  if (options.toLowerCase) value = value.toLowerCase()
  if (options.toUpperCase) value = value.toUpperCase()

  if (required && value.length === 0) {
    throw new InputValidationError(`${field} is required.`)
  }

  if (options.minLength != null && value.length > 0 && value.length < options.minLength) {
    throw new InputValidationError(`${field} is too short.`)
  }

  if (options.maxLength != null && value.length > options.maxLength) {
    throw new InputValidationError(`${field} is too long.`)
  }

  if (options.pattern && value.length > 0 && !options.pattern.test(value)) {
    throw new InputValidationError(`${field} has an invalid format.`)
  }

  if (options.enumValues && value.length > 0 && !options.enumValues.includes(value)) {
    throw new InputValidationError(`${field} is invalid.`)
  }

  return value
}

export function readNumberField(
  input: Record<string, unknown>,
  field: string,
  options: NumberFieldOptions = {},
) {
  const required = options.required ?? false
  const coerce = options.coerce ?? true
  const raw = input[field]

  if (raw == null || raw === '') {
    if (required) throw new InputValidationError(`${field} is required.`)
    return undefined
  }

  const numeric = typeof raw === 'number' ? raw : coerce ? Number(raw) : NaN

  if (!Number.isFinite(numeric)) {
    throw new InputValidationError(`${field} must be a valid number.`)
  }

  if (options.integer && !Number.isInteger(numeric)) {
    throw new InputValidationError(`${field} must be an integer.`)
  }

  if (options.min != null && numeric < options.min) {
    throw new InputValidationError(`${field} must be at least ${options.min}.`)
  }

  if (options.max != null && numeric > options.max) {
    throw new InputValidationError(`${field} must be at most ${options.max}.`)
  }

  return numeric
}

export function readBooleanField(
  input: Record<string, unknown>,
  field: string,
  options: BooleanFieldOptions = {},
) {
  const required = options.required ?? false
  const raw = input[field]

  if (raw == null || raw === '') {
    if (required) throw new InputValidationError(`${field} is required.`)
    return undefined
  }

  if (typeof raw === 'boolean') return raw

  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  if (typeof raw === 'number') {
    if (raw === 1) return true
    if (raw === 0) return false
  }

  throw new InputValidationError(`${field} must be a boolean.`)
}

export function readFormString(
  formData: FormData,
  field: string,
  options: Omit<StringFieldOptions, 'trim'> & { trim?: boolean } = {},
) {
  const required = options.required ?? false
  const trim = options.trim ?? true
  const value = formData.get(field)

  if (value == null) {
    if (required) throw new InputValidationError(`${field} is required.`)
    return undefined
  }

  if (typeof value !== 'string') {
    throw new InputValidationError(`${field} must be text.`)
  }

  const wrapper: Record<string, unknown> = { [field]: trim ? value.trim() : value }
  return readStringField(wrapper, field, {
    ...options,
    trim: false,
  })
}

export function readFormNumber(formData: FormData, field: string, options: NumberFieldOptions = {}) {
  const value = formData.get(field)
  const wrapper: Record<string, unknown> = { [field]: typeof value === 'string' ? value.trim() : value }
  return readNumberField(wrapper, field, options)
}

export function readFormFile(formData: FormData, field: string, options: FileFieldOptions = {}) {
  const required = options.required ?? false
  const raw = formData.get(field)

  if (raw == null) {
    if (required) throw new InputValidationError(`${field} is required.`)
    return undefined
  }

  if (!(raw instanceof File)) {
    throw new InputValidationError(`${field} must be a file.`)
  }

  if (options.maxBytes != null && raw.size > options.maxBytes) {
    throw new InputValidationError(`${field} exceeds allowed file size.`)
  }

  if (options.allowedTypes && !options.allowedTypes.includes(raw.type)) {
    throw new InputValidationError(`${field} has an unsupported file type.`)
  }

  return raw
}
