import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago'
import { paymentClient } from '../utils/mercadopago'

const router = Router()
const prisma = new PrismaClient()

const MP_STATUS_MAP: Record<string, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  pending: 'PENDING',
  in_process: 'IN_PROCESS',
  cancelled: 'REJECTED',
  refunded: 'REJECTED',
  charged_back: 'REJECTED',
}

router.post('/mercadopago/webhook', async (req: Request, res: Response) => {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET
    if (secret) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
          dataId: req.query['data.id'] as string | undefined,
          secret,
        })
      } catch (err) {
        if (err instanceof InvalidWebhookSignatureError) {
          res.sendStatus(401)
          return
        }
        throw err
      }
    }

    const type = req.query.type || req.body?.type
    const paymentId = req.query['data.id'] || req.body?.data?.id
    if (type !== 'payment' || !paymentId) {
      res.sendStatus(200)
      return
    }

    const payment = await paymentClient.get({ id: String(paymentId) })
    const orderId = payment.external_reference
    if (!orderId) {
      res.sendStatus(200)
      return
    }

    const paymentStatus = MP_STATUS_MAP[payment.status || ''] || 'PENDING'
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { paymentStatus, mpPaymentId: String(payment.id) },
    })

    res.sendStatus(200)
  } catch (err) {
    console.error('MercadoPago webhook error:', err)
    res.sendStatus(500)
  }
})

export { router as paymentRoutes }
