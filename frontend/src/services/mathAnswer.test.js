import { expect, test } from 'vitest'
import { answerText } from './mathAnswer'
test('keyboard notation matches existing monomial answers', () => {
  expect(answerText('-4 x^(12) * y^3')).toBe('-4x^12y^3')
  expect(answerText('2*3')).toBe('2*3')
  expect(answerText('(x+1)*(x-1)')).toBe('(x+1)*(x-1)')
})
