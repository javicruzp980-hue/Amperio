const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const { mensaje } = JSON.parse(event.body);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const promptDelSistema = `Eres el asistente virtual de AMPERIO, una empresa de servicios eléctricos profesionales en México. 
    Tu tono debe ser amable, profesional, seguro y conciso. 
    Tu objetivo es ayudar a los clientes a cotizar servicios, entender sus problemas eléctricos y convencerlos de agendar una visita.
    Reglas:
    - Los diagnósticos estándar cuestan $450 MXN.
    - Las instalaciones de lámparas rondan los $180 MXN y contactos $120 MXN.
    - Si hay una emergencia (fuego, humo, chispas), diles que bajen el interruptor y usen el botón de WhatsApp.
    - Nunca inventes precios exactos para cosas complejas, da aproximados e invítalos a agendar.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: promptDelSistema 
    });

    const result = await model.generateContent(mensaje);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ respuesta: text }),
    };

  } catch (error) {
    console.error("Error en el bot:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ respuesta: "Uy, mis circuitos están fallando un poco. ¿Podrías intentar de nuevo o contactarnos por WhatsApp?" }),
    };
  }
};

