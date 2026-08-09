import admin from 'firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicializar Firebase Admin de forma segura con la variable de entorno
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error("La variable de entorno FIREBASE_SERVICE_ACCOUNT no está definida en Vercel.");
    }
    
    // Parsear correctamente el JSON para evitar errores de credenciales
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Error crítico al inicializar Firebase Admin:", error.message);
    throw error;
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    const { paymentData, cliente } = req.body;

    if (!paymentData || !cliente) {
      return res.status(400).json({ error: 'Faltan datos de pago o información del cliente.' });
    }

    // Configuración de Mercado Pago con el Token de Entorno
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    // Crear la transacción de pago
    const paymentResponse = await payment.create({
      body: {
        transaction_amount: Number(paymentData.transaction_amount),
        token: paymentData.token,
        description: cliente.descripcion || 'Servicio CNIEM',
        installments: Number(paymentData.installments || 1),
        payment_method_id: paymentData.payment_method_id,
        payer: {
          email: paymentData.payer?.email || cliente.email,
          identification: paymentData.payer?.identification
        }
      }
    });

    const status = paymentResponse.status;
    const ticketUrl = paymentResponse.point_of_interaction?.transaction_data?.ticket_url || null;
    const folioGenerado = 'CNIEM-' + Math.floor(100000 + Math.random() * 900000);

    // Registrar en Firestore si el pago fue aprobado o quedó pendiente de pago en tienda/banco
    if (status === 'approved' || status === 'in_process' || status === 'pending') {
      await db.collection('solicitudes').add({
        ...cliente,
        folio: folioGenerado,
        fechaStr: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        timestamp: Date.now(),
        metodoPago: `Mercado Pago (${status})`,
        estado: 'Pendiente — Pagado',
        pagoId: paymentResponse.id || null
      });
    }

    return res.status(200).json({
      status: status,
      ticketUrl: ticketUrl,
      folio: folioGenerado
    });

  } catch (error) {
    console.error("Error al procesar la solicitud de pago:", error);
    return res.status(500).json({ 
      error: error.message || 'Error interno al procesar el pago en el servidor' 
    });
  }
}
