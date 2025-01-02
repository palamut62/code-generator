import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'temp-projects');
    const projectDir = path.join(tempDir, projectId);
    const pidFile = path.join(projectDir, '.pid');

    // PID dosyasını kontrol et
    try {
      const pidContent = await fs.readFile(pidFile, 'utf-8');
      const pid = parseInt(pidContent.trim(), 10);

      // Process'i sonlandır
      try {
        process.kill(pid);
        console.log(`Stopped process with PID: ${pid}`);
      } catch (error) {
        console.warn(`Process with PID ${pid} not found or already stopped`);
      }

      // PID dosyasını sil
      try {
        await fs.unlink(pidFile);
      } catch (error) {
        console.warn('Failed to delete PID file:', error);
      }
    } catch (error) {
      console.warn('No PID file found or failed to read:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop project' },
      { status: 500 }
    );
  }
} 