import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const { projectId, filePath, content } = await request.json();

    if (!projectId || !filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Project ID, file path and content are required' },
        { status: 400 }
      );
    }

    const projectDir = path.join(process.cwd(), 'temp-projects', projectId);
    const fullPath = path.join(projectDir, filePath);

    // Proje dizininin varlığını kontrol et
    if (!existsSync(projectDir)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Dosyayı kaydet
    await writeFile(fullPath, content);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save file' },
      { status: 500 }
    );
  }
} 