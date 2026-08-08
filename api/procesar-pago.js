import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Inicializar Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data = req.body;

    // Configurar Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            title: data.title || 'Servicio CNIEM',
            quantity: 1,
            unit_price: Number(data.price) || 100,
          }
        ],
        back_urls: {
          success: `${req.headers.origin}/exito.html`,
          failure: `${req.headers.origin}/error.html`,
          pending: `${req.headers.origin}/pending.html`,
        },
        auto_return: 'approved',
      }
    });

    // Guardar en Firebase y enviar correo si lo requieres...
    // (O puedes retornar la init_point para redirigir al usuario)

    return res.status(200).json({ 
      success: true, 
      init_point: result.init_point,
      id: result.id 
    });

  } catch (error) {
    console.error('Error detallado:', error);
    return res.status(500).json({ error: error.message });
  }
}
