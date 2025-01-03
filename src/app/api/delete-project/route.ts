import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const killProcessOnPort = async (port: number) => {
  try {
    if (process.platform === 'win32') {
      // Windows için port'u kullanan process'i bul ve sonlandır
      await execAsync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do taskkill /F /PID %a`);
    } else {
      // Linux/Mac için
      await execAsync(`lsof -ti:${port} | xargs kill -9`);
    }
  } catch (error) {
    console.warn(`No process found on port ${port} or failed to kill:`, error);
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      await fs.mkdir(tempDir, { recursive: true });
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Proje dizininin varlığını kontrol et
    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // package.json'dan port numarasını al
    let port: number | null = null;
    try {
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      port = packageJson.config?.port || null;
    } catch (error) {
      console.warn('Failed to read package.json:', error);
    }

    // Port varsa process'i sonlandır
    if (port) {
      await killProcessOnPort(port);
      // Process'in tamamen sonlanması için bekle
      await delay(1000);
    }

    // Projeyi durdur (varsa çalışan process'i)
    try {
      await fetch('http://localhost:3000/api/stop-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      // Process'lerin sonlanması için bekle
      await delay(1000);
    } catch (error) {
      console.warn('Error stopping project:', error);
    }

    // Windows'ta dosya sisteminin process'i serbest bırakması için bekle
    await delay(2000);

    // Proje dizinini ve içeriğini sil
    try {
      // Önce içeriği temizle
      const deleteContent = async (dir: string) => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            await deleteContent(fullPath);
            await fs.rmdir(fullPath);
          } else {
            await fs.unlink(fullPath);
          }
        }
      };

      await deleteContent(projectDir);
      await fs.rmdir(projectDir);
    } catch (error) {
      console.error('Error deleting project directory:', error);
      throw new Error('Failed to delete project directory');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete project' },
      { status: 500 }
    );
  }
} 