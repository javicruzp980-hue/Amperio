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

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": context.awsRequestId
      },
      body: JSON.stringify({
        transaction_amount: Number(paymentData.transaction_amount),
        token: paymentData.token,
        description: "Pago de servicio - Amperio",
        installments: Number(paymentData.installments) || 1,
        payment_method_id: paymentData.payment_method_id,
        external_reference: cliente?.folio || "AMPERIO-SERVICIO",
        payer: {
          email: paymentData.payer?.email,
          identification: paymentData.payer?.identification
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

