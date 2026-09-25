/**
 * calcEngine.ts — Safe inline calculator for the transaction amount keypad.
 *
 * Evaluates simple two-operand math expressions WITHOUT using eval().
 * Supports: + − × ÷  (written as +  -  *  /)
 *
 * Expression format: "<number> <op> <number>"
 * Examples:
 *   "50000 + 15000"  → 65000
 *   "100000 - 30000" → 70000
 *   "5000 * 3"       → 15000
 *   "90000 / 3"      → 30000
 *   "75000"          → 75000  (no operator = return as-is)
 *
 * Edge cases:
 *   - Division by zero → returns the dividend (left operand)
 *   - Non-numeric tokens → returns 0
 *   - Fractional results → Math.round() for IDR (no decimals)
 */
export function evalCalcExpr(expr: string): number {
  const normalized = expr.trim()

  // Match pattern: <number> <op> <number>
  // Allows spaces around operator, handles negative right operand
  const match = normalized.match(/^(\d+)\s*([+\-*/×÷])\s*(\d+)$/)

  if (!match) {
    // No operator — parse as a plain number
    const n = parseInt(normalized, 10)
    return isNaN(n) ? 0 : n
  }

  const [, leftStr, op, rightStr] = match
  const left  = parseInt(leftStr,  10)
  const right = parseInt(rightStr, 10)

  if (isNaN(left) || isNaN(right)) return 0

  switch (op) {
    case '+':             return left + right
    case '-':             return Math.max(0, left - right)  // floor at 0 for IDR
    case '*': case '×':  return left * right
    case '/': case '÷':  return right === 0 ? left : Math.round(left / right)
    default:              return left
  }
}

/**
 * displayExpr — Format the expression string for the amount display.
 *
 * Converts operator symbols to their display equivalents and formats
 * number parts with Indonesian locale (thousands dot separator).
 *
 * Examples:
 *   "50000 + 15000" → "50.000 + 15.000"
 *   "100000"        → "100.000"
 */
export function displayExpr(expr: string): string {
  // Step 1: Normalize all operator spacing to " op " (single space each side)
  const normalized = expr
    .replace(/\s*([+\-*/×÷])\s*/g, ' $1 ')
    .trim()

  // Step 2: Replace internal operator chars with display-friendly symbols
  const display = normalized
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')

  // Step 3: Format numeric parts with Indonesian locale (dots as thousands separator)
  return display.replace(/\d+/g, n =>
    parseInt(n, 10).toLocaleString('id-ID'),
  )
}


/**
 * buildExpr — Keypad press handler.
 *
 * Returns the new expression string based on the current expression
 * and the key pressed.
 *
 * @param current - Current expression string (e.g. "50000", "50000 + ")
 * @param key - Key value: '0'..'9' | '000' | '+' | '-' | '*' | '/' | 'back' | 'calc'
 */
export function buildExpr(current: string, key: string): string {
  // Normalize: trim trailing spaces
  const expr = current.trimEnd()

  // ── Backspace ────────────────────────────────────────────────────────
  if (key === 'back') {
    if (expr.length === 0 || expr === '0') return '0'
    const next = expr.slice(0, -1).trimEnd()
    return next === '' || next === '-' ? '0' : next
  }

  // ── Operator keys ────────────────────────────────────────────────────
  if (['+', '-', '*', '/', '×', '÷'].includes(key)) {
    const opSymbol = key === '×' ? '*' : key === '÷' ? '/' : key

    // If expression already has an operator, evaluate it first
    // then apply new operator to the result
    const hasOp = /\d\s*[+\-*/]\s*\d/.test(expr)
    if (hasOp) {
      const result = evalCalcExpr(expr)
      return `${result} ${opSymbol} `
    }

    // Don't add operator if current amount is 0
    if (expr === '0') return expr

    return `${expr} ${opSymbol} `
  }

  // ── Digit / 000 keys ─────────────────────────────────────────────────
  // Determine the "right-side" we're currently building
  const hasOp    = /\s[+\-*/]\s/.test(expr)  // operator surrounded by spaces
  const rightSide = hasOp ? expr.split(/\s[+\-*/]\s/).pop() ?? '' : expr

  if (key === '000') {
    if (rightSide === '' || rightSide === '0') return expr
    const next = expr + '000'
    return next.length > 20 ? expr : next
  }

  if (key === '.') return expr // IDR — no decimals

  // Replace leading zero only if it's the sole character on the right side
  if (rightSide === '0' && !hasOp) {
    return key
  }

  // Append digit
  const next = (expr === '0') ? key : expr + key
  return next.length > 20 ? expr : next
}
