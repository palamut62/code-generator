import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
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

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'temp-projects');
    const projectDir = path.join(tempDir, projectId);

    // package.json'dan port numarasını al
    try {
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const port = packageJson.config?.port;

      if (port) {
        await killProcessOnPort(port);
      }
    } catch (error) {
      console.warn('Failed to read package.json or kill process:', error);
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