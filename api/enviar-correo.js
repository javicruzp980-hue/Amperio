import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Permitir solo peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { to, subject, html } = req.body;

    // Enviar el correo usando Resend
    const data = await resend.emails.send({
      from: 'CNIEM <onboarding@resend.dev>', // Cambia por tu dominio verificado si ya tienes uno
      to: to || 'tucorreo@ejemplo.com',
      subject: subject || 'Confirmación de Pago - CNIEM',
      html: html || '<p>¡Gracias por tu pago! Tu orden ha sido procesada con éxito.</p>',
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return res.status(500).json({ error: error.message });
  }
}
