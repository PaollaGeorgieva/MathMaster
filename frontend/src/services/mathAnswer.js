// Convert only notation, never evaluate or merge two numeric factors.
export function answerText(value) {
  return value.replace(/\s+/g, '').replace(/\^\(([-+]?\d+)\)/g, '^$1').replace(/([0-9a-z)])\*(?=[a-z])/gi, '$1')
}
