export default async function handler(req, res) {
  // Solo permitir peticiones POST (o GET según necesites)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const datos = req.body;

    // Tu lógica aquí (Firebase, Resend, etc.)
    // usando process.env.TU_VARIABLE

    return res.status(200).json({ 
      success: true, 
      message: 'Proceso completado con éxito' 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
