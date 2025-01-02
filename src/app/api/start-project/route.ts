import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp-projects');

// Next.js sunucusunu başlat
const startNextServer = (projectDir: string, port: number) => {
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

    // Sunucuyu başlat
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
      { message: 'Failed to start project' },
      { status: 500 }
    );
  }
} 