const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const mensaje = body.mensaje || 'Hola';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ respuesta: "El servicio se encuentra en mantenimiento. Por favor contáctanos por WhatsApp." })
      };
    }

    const payload = JSON.stringify({
      contents: [{
        parts: [{ text: `Eres el asistente virtual experto de AMPERIO (servicios eléctricos). Responde de forma breve, amable y profesional al siguiente mensaje: ${mensaje}` }]
      }]
    });

    const respuestaIA = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              resolve("En este momento estoy recibiendo muchas consultas. Por favor inténtalo de nuevo en unos segundos o escríbenos por WhatsApp.");
            } else {
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              resolve(text || "No pude procesar la respuesta. Inténtalo de nuevo.");
            }
          } catch (e) {
            resolve("Ocurrió un detalle técnico. Contáctanos por WhatsApp para atenderte.");
          }
        });
      });

      req.on('error', () => resolve("Servicio no disponible momentáneamente. Por favor escríbenos por WhatsApp."));
      req.write(payload);
      req.end();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ respuesta: respuestaIA })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ respuesta: "Ocurrió un error inesperado. Contáctanos por WhatsApp." })
    };
  }
};
