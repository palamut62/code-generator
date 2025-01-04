import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Windows'ta çalışan tüm Node.js süreçlerini sonlandır
    await execAsync('taskkill /F /IM node.exe');

    return NextResponse.json({ message: 'All projects stopped successfully' });
  } catch (error) {
    console.error('Error stopping projects:', error);
    return NextResponse.json(
      { error: 'Failed to stop projects' },
      { status: 500 }
    );
  }
} 