import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Önce çalışan Next.js süreçlerini bul ve sonlandır
    await execAsync('taskkill /F /FI "WINDOWTITLE eq node" /IM node.exe');
    
    // Temp projeleri temizle
    const tempDir = path.join(process.cwd(), 'temp-projects');
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.mkdir(tempDir);
    } catch (error) {
      console.warn('Error cleaning temp directory:', error);
    }

    // Port kullanımlarını temizle
    try {
      const result = await execAsync('netstat -ano | findstr "LISTENING"');
      const ports = [3000, 3001, 3002, 3003, 3004, 3005]; // Kullanılan portlar
      
      for (const port of ports) {
        try {
          await execAsync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do taskkill /F /PID %a`);
        } catch (error) {
          console.warn(`Error killing process on port ${port}:`, error);
        }
      }
    } catch (error) {
      console.warn('Error cleaning ports:', error);
    }

    return NextResponse.json({ message: 'All projects stopped and cleaned successfully' });
  } catch (error) {
    console.error('Error stopping projects:', error);
    return NextResponse.json(
      { error: 'Failed to stop projects' },
      { status: 500 }
    );
  }
} 