exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Método no permitido" }) 
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { paymentData, cliente } = data;

    // Llamado seguro a la API de Mercado Pago usando tu Access Token privado
    const mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        type: "online",
        total_amount: String(paymentData.transaction_amount),
        external_reference: cliente?.folio || "AMPERIO-SERVICIO",
        processing_mode: "automatic",
        transactions: {
          payments: [
            {
              amount: String(paymentData.transaction_amount),
              payment_method: {
                id: paymentData.payment_method_id,
                token: paymentData.token,
                installments: paymentData.installments
              }
            }
          ]
        },
        payer: {
          email: paymentData.payer.email,
          identification: paymentData.payer.identification
        }
      })
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Error al procesar el pago", details: mpResult })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, resultado: mpResult })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

