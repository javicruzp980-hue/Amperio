export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const orden = req.body;
    if (!orden) {
      return res.status(400).json({ error: 'Falta el objeto orden' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Falta RESEND_API_KEY');
      return res.status(200).json({ success: false, message: 'Falta configurar RESEND_API_KEY' });
    }

    const html = `
      <h2>Nueva solicitud recibida</h2>
      <p><strong>Folio:</strong> ${orden.folio || 'N/A'}</p>
      <p><strong>Cliente:</strong> ${orden.nombre || ''}</p>
      <p><strong>Teléfono:</strong> ${orden.telefono || ''}</p>
      <p><strong>Servicio:</strong> ${orden.tipo || orden.servicio || ''}</p>
      <p><strong>Dirección:</strong> ${orden.direccion || ''}</p>
      <p><strong>Urgencia:</strong> ${orden.urgencia || ''}</p>
      <p><strong>Método de pago:</strong> ${orden.metodoPago || ''}</p>
      <p><strong>Descripción:</strong> ${orden.descripcion || ''}</p>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CNIEM Notificaciones <onboarding@resend.dev>',
        to: ['javicruzp980@gmail.com'],
        subject: `Nueva solicitud: ${orden.folio || 'Sin folio'}`,
        html
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Error de Resend:', emailResult);
      return res.status(200).json({ success: false, message: emailResult });
    }

    return res.status(200).json({ success: true, message: 'Solicitud notificada con éxito' });
  } catch (error) {
    console.error('Error en notificar-solicitud:', error);
    return res.status(500).json({ error: error.message });
  }
}
