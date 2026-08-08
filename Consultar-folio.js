import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  // Permitir peticiones GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const folio = req.query.folio || req.body?.folio;

    if (!folio) {
      return res.status(400).json({ error: 'El parámetro folio es requerido' });
    }

    // Busca en la colección 'solicitudes'
    const docRef = db.collection('solicitudes').doc(folio);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: 'Folio no encontrado' });
    }

    return res.status(200).json({
      success: true,
      data: docSnap.data(),
    });

  } catch (error) {
    console.error('Error al consultar folio:', error);
    return res.status(500).json({ error: error.message });
  }
}
