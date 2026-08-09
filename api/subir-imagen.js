import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { archivoBase64, nombreArchivo, tipoArchivo } = req.body;

    if (!archivoBase64 || !nombreArchivo) {
      return res.status(400).json({ error: 'Falta el archivo o el nombre' });
    }

    // Límite de seguridad: 4 MB (los uploads a través de una función serverless
    // están limitados por el tamaño del body de la petición)
    const buffer = Buffer.from(archivoBase64, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'La imagen es demasiado grande (máximo 4 MB)' });
    }

    const rutaArchivo = `evidencias_cniem/${Date.now()}_${nombreArchivo}`;

    const blob = await put(rutaArchivo, buffer, {
      access: 'private',
      contentType: tipoArchivo || 'application/octet-stream',
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error('Error al subir imagen a Vercel Blob:', error);
    return res.status(500).json({ error: error.message });
  }
}
