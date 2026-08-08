export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const { mensaje } = req.body;
    // Lógica del chat con la IA aquí
    return res.status(200).json({ respuesta: 'Respuesta del chat de IA' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
