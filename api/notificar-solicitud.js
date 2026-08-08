export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const datos = req.body;
    // Lógica para procesar o enviar la notificación de la solicitud
    return res.status(200).json({ success: true, message: 'Solicitud notificada' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
