import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'fallback_secret'

export function signToken(payload: object, expiresIn = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { id: string; email: string; role: string }
}
