// netlify/functions/notificar-solicitud.js
// Envía por correo cada solicitud (pagada o efectivo/transferencia) a CNIEM,
// usando Resend como proveedor de envío (capa gratuita, sin tarjeta).

const CORREO_DESTINO = "asistencia.lg.electric@gmail.com";

function escaparHtml(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }

  try {
    const { orden } = await req.json();
    if (!orden || !orden.folio) {
      return new Response(JSON.stringify({ error: "Falta la información de la orden" }), { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Falta configurar RESEND_API_KEY en Netlify");
      return new Response(JSON.stringify({ ok: false, error: "Falta configurar RESEND_API_KEY" }), { status: 200 });
    }

    const geoLinea =
      orden.geo && orden.geo.lat && orden.geo.lng
        ? `<p><strong>📍 Ubicación GPS:</strong> <a href="https://maps.google.com/?q=${orden.geo.lat},${orden.geo.lng}">Ver en mapa</a></p>`
        : "";

    const html = `
      <h2>Nueva solicitud de servicio — CNIEM</h2>
      <p><strong>Folio:</strong> ${escaparHtml(orden.folio)}</p>
      <p><strong>Método de pago:</strong> ${escaparHtml(orden.metodoPago)}</p>
      <p><strong>Estado:</strong> ${escaparHtml(orden.estado)}</p>
      <hr>
      <p><strong>Nombre:</strong> ${escaparHtml(orden.nombre)}</p>
      <p><strong>Teléfono:</strong> ${escaparHtml(orden.telefono)}</p>
      <p><strong>Correo del cliente:</strong> ${escaparHtml(orden.email) || "No proporcionado"}</p>
      <p><strong>Dirección:</strong> ${escaparHtml(orden.direccion)}</p>
      ${geoLinea}
      <p><strong>Tipo de servicio:</strong> ${escaparHtml(orden.tipo)}</p>
      <p><strong>Urgencia:</strong> ${escaparHtml(orden.urgencia)}</p>
      <p><strong>Síntomas reportados:</strong> ${escaparHtml(orden.sintomas)}</p>
      <p><strong>Descripción:</strong><br>${escaparHtml(orden.descripcion)}</p>
      <p style="color:#888; font-size:12px; margin-top:20px;">Registrado el ${escaparHtml(orden.fecha)}</p>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CNIEM Solicitudes <onboarding@resend.dev>",
        to: [CORREO_DESTINO],
        subject: `Nueva solicitud ${orden.folio} — ${orden.tipo || "Servicio"}`,
        html,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Error de Resend:", resp.status, errBody);
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error en notificar-solicitud:", err);
    return new Response(JSON.stringify({ ok: false, error: "Error interno" }), { status: 500 });
  }
};
