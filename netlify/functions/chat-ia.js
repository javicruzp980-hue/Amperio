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
        body: JSON.stringify({ respuesta: "Falta configurar la variable GEMINI_API_KEY en Netlify." })
      };
    }

    const payload = JSON.stringify({
      contents: [{
        parts: [{ text: `Eres el asistente virtual de AMPERIO (servicios eléctricos). Responde de forma breve y amable: ${mensaje}` }]
      }]
    });

    const respuestaIA = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
              resolve(`Error de Google (${parsed.error.code}): ${parsed.error.message}`);
            } else {
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              resolve(text || "Google no devolvió ningún texto.");
            }
          } catch (e) {
            resolve("Error al procesar la respuesta de la IA.");
          }
        });
      });

      req.on('error', (err) => resolve(`Error de conexión: ${err.message}`));
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
      body: JSON.stringify({ respuesta: `Error del servidor: ${err.message}` })
    };
  }
};
