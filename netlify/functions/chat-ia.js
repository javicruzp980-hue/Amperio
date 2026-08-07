// netlify/functions/chat-ia.js

exports.handler = async function(event, context) {
  // 1. Evitar errores si no es una petición POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const { mensaje } = JSON.parse(event.body);
    const API_KEY = process.env.OPENAI_API_KEY; // Tu clave segura en Netlify

    // 2. Definir la "Personalidad" de tu Bot (Prompt Engineering)
    const promptDelSistema = `
      Eres el asistente virtual de AMPERIO, una empresa de servicios eléctricos profesionales en México. 
      Tu tono debe ser amable, profesional, seguro y conciso. 
      Tu objetivo es ayudar a los clientes a cotizar servicios, entender sus problemas eléctricos y convencerlos de agendar una visita.
      Reglas:
      - Los diagnósticos estándar cuestan $450 MXN.
      - Las instalaciones de lámparas rondan los $180 MXN y contactos $120 MXN.
      - Si hay una emergencia (fuego, humo, chispas), diles que bajen el interruptor y usen el botón de WhatsApp.
      - Nunca inventes precios exactos para cosas complejas, da aproximados e invítalos a agendar.
    `;

    // 3. Conectar con la API de IA (Ejemplo con OpenAI)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Modelo rápido y económico
        messages: [
          { role: "system", content: promptDelSistema },
          { role: "user", content: mensaje }
        ],
        temperature: 0.7,
        max_tokens: 250
      })
    });

    const data = await response.json();
    const respuestaIA = data.choices[0].message.content;

    // 4. Enviar la respuesta de vuelta a tu página web
    return {
      statusCode: 200,
      body: JSON.stringify({ respuesta: respuestaIA })
    };

  } catch (error) {
    console.error("Error en el bot:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ respuesta: "Uy, mis circuitos están fallando un poco. ¿Podrías intentar de nuevo o contactarnos por WhatsApp?" })
    };
  }
};
