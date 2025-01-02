import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'temp-projects');
    const projectDir = path.join(tempDir, projectId);

    // Temp dizininin varlığını kontrol et
    try {
      await fs.access(tempDir);
    } catch {
      // Temp dizini yoksa oluştur
      await fs.mkdir(tempDir, { recursive: true });
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Proje dizininin varlığını kontrol et
    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Projeyi durdur (varsa çalışan process'i)
    try {
      const response = await fetch('http://localhost:3000/api/stop-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        console.warn('Failed to stop project:', await response.text());
      }
    } catch (error) {
      console.warn('Error stopping project:', error);
    }

    // Proje dizinini ve içeriğini sil
    await fs.rm(projectDir, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete project' },
      { status: 500 }
    );
  }
} 