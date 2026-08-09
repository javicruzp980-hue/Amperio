import { MercadoPagoConfig, Payment } from 'mercadopago';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Inicializar Firebase Admin
// Soporta dos formas: FIREBASE_SERVICE_ACCOUNT (JSON completo, más confiable)
// o las 3 variables separadas (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)
if (!getApps().length) {
  let credenciales;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      credenciales = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      console.log('DEBUG: FIREBASE_SERVICE_ACCOUNT no es JSON válido. Longitud:', raw.length);
      console.log('DEBUG: primeros 40 caracteres:', JSON.stringify(raw.slice(0, 40)));
      console.log('DEBUG: últimos 10 caracteres:', JSON.stringify(raw.slice(-10)));
      throw e;
    }
  } else {
    credenciales = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
  }
  initializeApp({ credential: cert(credenciales) });
}
const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

function generarFolioDinamico() {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const randomHex = Math.floor(Math.random() * 0xfff)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0');
  const randomId = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `CNIEM-${dateStr}-${randomId}${randomHex}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { paymentData, cliente } = req.body;

    // LOG TEMPORAL DE DIAGNÓSTICO — quitar después de resolver el problema
    console.log('DEBUG paymentData recibido:', JSON.stringify(paymentData));
    console.log('DEBUG cliente recibido:', JSON.stringify(cliente));

    if (!paymentData || !paymentData.payment_method_id) {
      console.log('DEBUG: falló validación de payment_method_id');
      return res.status(400).json({ error: 'Datos de pago incompletos' });
    }
    // No forzamos el token aquí: los métodos en efectivo (OXXO, etc.) no lo generan
    // y el Brick no siempre manda payment_type_id. Mercado Pago valida esto por su cuenta.
    if (!cliente || !cliente.nombre || !cliente.telefono) {
      console.log('DEBUG: falló validación de datos del cliente');
      return res.status(400).json({ error: 'Datos del cliente incompletos' });
    }

    // Configurar Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    // Métodos "ticket" (OXXO, etc.) requieren nombre/apellido del pagador
    const [firstName, ...restName] = (cliente.nombre || '').trim().split(' ');
    const lastName = restName.join(' ') || firstName;

    // El Brick entrega los datos del pago listos para la Payment API
    const result = await payment.create({
      body: {
        transaction_amount: Number(paymentData.transaction_amount),
        token: paymentData.token || undefined, // OXXO/ticket no manda token
        description: cliente.tipo || 'Servicio CNIEM',
        installments: Number(paymentData.installments) || 1,
        payment_method_id: paymentData.payment_method_id,
        issuer_id: paymentData.issuer_id || undefined,
        payer: {
          email: paymentData.payer?.email || cliente.email,
          first_name: paymentData.payer?.first_name || firstName,
          last_name: paymentData.payer?.last_name || lastName,
          identification: paymentData.payer?.identification || undefined,
        },
      },
      requestOptions: {
        idempotencyKey: `${cliente.telefono}-${Date.now()}`,
      },
    });

    const estadoPago = result.status; // 'approved' | 'in_process' | 'pending' | 'rejected' | ...
    const esEfectivo = ['ticket', 'atm'].includes(result.payment_type_id);

    // pending es normal y esperado en pagos en efectivo (OXXO, etc.)
    if (!['approved', 'in_process', 'pending'].includes(estadoPago)) {
      return res.status(200).json({ status: estadoPago, detail: result.status_detail });
    }

    // Datos del cupón/voucher cuando el pago es en efectivo (OXXO, etc.)
    const transactionData = result.point_of_interaction?.transaction_data;
    const ticketUrl = transactionData?.ticket_url || null;
    const numeroReferencia = transactionData?.reference_id || null;

    const folio = generarFolioDinamico();
    const orden = {
      ...cliente,
      folio,
      fecha: new Date().toLocaleString('es-MX'),
      metodoPago: esEfectivo ? 'Efectivo (OXXO/Tienda)' : 'Tarjeta / Pago en línea',
      estado:
        estadoPago === 'approved'
          ? 'Pago Aprobado / Técnico Asignado'
          : esEfectivo
          ? 'Pendiente — Esperando pago en OXXO'
          : 'Pago en proceso',
      pagoId: result.id,
      montoPagado: result.transaction_amount,
      ...(ticketUrl && { ticketUrl, numeroReferencia }),
    };

    // Guardar en Firestore (no debe tapar la confirmación si el pago ya se cobró)
    try {
      await db.collection('ordenes').doc(folio).set(orden);
    } catch (dbError) {
      console.error('ALERTA: pago procesado pero falló el guardado en Firestore. Folio:', folio, 'Pago ID:', result.id, dbError);
    }

    // Notificar por correo (no bloquea la respuesta si falla)
    try {
      await resend.emails.send({
        from: 'CNIEM <notificaciones@cniem.com>',
        to: process.env.NOTIFICACIONES_EMAIL,
        subject: `Nueva orden pagada — ${folio}`,
        html: `
          <h2>Nueva orden con pago en línea</h2>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Cliente:</strong> ${orden.nombre}</p>
          <p><strong>Teléfono:</strong> ${orden.telefono}</p>
          <p><strong>Dirección:</strong> ${orden.direccion}</p>
          <p><strong>Servicio:</strong> ${orden.tipo}</p>
          <p><strong>Estado del pago:</strong> ${estadoPago}</p>
          <p><strong>Monto:</strong> $${orden.montoPagado}</p>
          <p><strong>Pago ID (Mercado Pago):</strong> ${result.id}</p>
          ${ticketUrl ? `<p><strong>Cupón OXXO:</strong> <a href="${ticketUrl}">${ticketUrl}</a></p>` : ''}
        `,
      });
    } catch (emailError) {
      console.error('No se pudo enviar el correo de notificación:', emailError);
    }

    return res.status(200).json({
      status: estadoPago,
      folio,
      id: result.id,
      ...(ticketUrl && { ticketUrl, numeroReferencia }),
    });
  } catch (error) {
    console.error('Error detallado:', error);
    return res.status(500).json({ error: error.message });
  }
}
