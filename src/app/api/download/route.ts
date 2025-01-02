import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const projectDir = path.join(process.cwd(), 'temp-projects', projectId);

    // Zip dosyası oluştur
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Stream'i buffer'a dönüştür
    const chunks: any[] = [];
    archive.on('data', (chunk) => chunks.push(chunk));

    // Proje dosyalarını zip'e ekle
    archive.directory(projectDir, false);
    await archive.finalize();

    // Buffer'ı birleştir
    const buffer = Buffer.concat(chunks);

    // Response header'larını ayarla
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="code-generator-${projectId}.zip"`);

    return new NextResponse(buffer, {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { message: 'Failed to download project' },
      { status: 500 }
    );
  }
} 