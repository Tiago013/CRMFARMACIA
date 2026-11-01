import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ADMIN_ROLES } from '@/lib/auth';

// El logo se guarda como data URL dentro de la configuración de la farmacia.
// Vercel no permite escribir archivos en disco, así que no se usa public/uploads.
const MAX_BYTES = 300 * 1024; // 300 KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth({ roles: ADMIN_ROLES });
    if (auth instanceof NextResponse) return auth;

    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Solo se permiten imágenes PNG o JPG' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'El logo supera 300 KB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Verifica la firma real del archivo, no solo el tipo declarado por el navegador
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isPng && !isJpeg) {
      return NextResponse.json({ success: false, error: 'El archivo no es una imagen válida' }, { status: 400 });
    }

    const mime = isPng ? 'image/png' : 'image/jpeg';
    const url = `data:${mime};base64,${buffer.toString('base64')}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Error uploading file' }, { status: 500 });
  }
}
