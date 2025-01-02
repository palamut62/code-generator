import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp-projects');

// Next.js sunucusunu başlat
const startNextServer = (projectDir: string, port: number) => {
  console.log('Starting Next.js server on port:', port);
  console.log('Project directory:', projectDir);
  
  const nextProcess = spawn('npx', ['next', 'dev', '-p', port.toString()], {
    cwd: projectDir,
    stdio: 'ignore',
    shell: true,
    detached: true
  });

  nextProcess.unref();
};

export async function POST(request: Request) {
  try {
    const { projectId, port } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectDir = path.join(TEMP_DIR, projectId);

    if (!existsSync(projectDir)) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    // Önce mevcut sunucuyu durdur
    try {
      await fetch('http://localhost:3000/api/stop-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
    } catch (error) {
      console.warn('Error stopping project:', error);
    }

    // Sunucuyu başlat
    console.log('Starting development server...');
    startNextServer(projectDir, port);

    // Sunucunun başlaması için bekle
    await new Promise(resolve => setTimeout(resolve, 5000));

    return NextResponse.json({ 
      success: true,
      port
    });

  } catch (error) {
    console.error('Error starting project:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to start project' },
      { status: 500 }
    );
  }
} 