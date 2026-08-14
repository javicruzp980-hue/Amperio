export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { mensaje, historial } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: 'Falta el mensaje' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Falta configurar GEMINI_API_KEY en Vercel');
      return res.status(200).json({
        respuesta: 'Ahora mismo no tengo conexión con la IA 🤖⚡. Intenta de nuevo o escríbenos por WhatsApp.'
      });
    }

    // Convertir el historial del chat al formato que espera Gemini
    const contents = [];
    if (Array.isArray(historial)) {
      for (const turno of historial) {
        contents.push({
          role: turno.role === 'model' ? 'model' : 'user',
          parts: [{ text: turno.text }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: mensaje }] });

    const systemInstruction = {
      parts: [{
        text: `Eres el asistente virtual de CNIEM, una empresa de servicios eléctricos residenciales e industriales en México.
Responde siempre en español, de forma breve, clara, amable y profesional (máximo 3-4 líneas por respuesta).
Puedes explicar los servicios que ofrece la empresa: instalaciones eléctricas, emergencias 24/7, centros de carga y breakers, paneles solares, cargadores para auto eléctrico, certificación NOM-001, mantenimiento industrial y automatización/domótica.
Puedes orientar de forma general sobre síntomas eléctricos comunes (cortos circuitos, apagones, breakers que se disparan), pero deja claro que un técnico debe revisar en sitio antes de dar un diagnóstico definitivo — nunca des instrucciones para que el cliente manipule instalaciones eléctricas por su cuenta, por seguridad.
Si el cliente pregunta por el estatus de una solicitud ya hecha, pídele su número de folio (formato CNIEM-AAAAMMDD-XXXXXX) para poder ayudarlo a rastrearlo.
No inventes precios exactos ni tiempos de llegada; sugiere usar el cotizador de la página o contactar por WhatsApp para una cotización precisa.
Si te preguntan algo fuera del tema de servicios eléctricos, responde amablemente que solo puedes ayudar con temas relacionados a CNIEM.`
      }]
    };

    const modelo = 'gemini-2.5-flash-lite';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Gemini:', data);
      return res.status(200).json({
        respuesta: 'Ahora mismo no tengo conexión con la IA 🤖⚡. Intenta de nuevo o escríbenos por WhatsApp.'
      });
    }

    const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Disculpa, no logré procesar eso. ¿Puedes reformularlo?';

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({ error: error.message });
  }
}
