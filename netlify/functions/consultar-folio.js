// netlify/functions/consultar-folio.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }

  try {
    const { folio, telefono } = await req.json();
    if (!folio) {
      return new Response(JSON.stringify({ encontrado: false, error: "Falta el folio" }), { status: 400 });
    }

    // Buscar el documento en la colección 'solicitudes' usando el folio como ID
    const docRef = db.collection('solicitudes').doc(folio.trim().toUpperCase());
    const doc = await docRef.get();

    if (!doc.exists) {
      return new Response(JSON.stringify({ encontrado: false }), { status: 200 });
    }

    const data = doc.data();

    // Validar opcionalmente que el teléfono coincida por seguridad
    if (telefono && data.telefono !== telefono) {
      return new Response(JSON.stringify({ encontrado: false, error: "Teléfono no coincide" }), { status: 200 });
    }

    return new Response(JSON.stringify({ encontrado: true, orden: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error al consultar folio:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

