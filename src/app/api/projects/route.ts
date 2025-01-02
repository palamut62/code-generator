import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp-projects');

export async function GET() {
  try {
    // Temp dizini yoksa boş liste döndür
    if (!existsSync(TEMP_DIR)) {
      return NextResponse.json({ projects: [] });
    }

    // Proje dizinlerini oku
    const directories = await readdir(TEMP_DIR, { withFileTypes: true });
    const projectDirs = directories.filter(dirent => dirent.isDirectory());

    // Her proje için bilgileri topla
    const projects = await Promise.all(
      projectDirs.map(async (dir) => {
        const projectDir = path.join(TEMP_DIR, dir.name);
        const files: Record<string, string> = {};

        try {
          // package.json'dan port numarasını al
          const packageJsonPath = path.join(projectDir, 'package.json');
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
          const port = parseInt(packageJson.config?.port) || 3001;

          // Proje dosyalarını oku
          const readFilesRecursively = async (currentPath: string, basePath: string = '') => {
            const entries = await readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(currentPath, entry.name);
              const relativePath = path.join(basePath, entry.name);

              if (entry.isDirectory()) {
                if (!['node_modules', '.next'].includes(entry.name)) {
                  await readFilesRecursively(fullPath, relativePath);
                }
              } else {
                // Sadece belirli uzantılı dosyaları ekle
                const ext = path.extname(entry.name);
                if (['.ts', '.tsx', '.js', '.jsx', '.css', '.json'].includes(ext)) {
                  const content = await readFile(fullPath, 'utf-8');
                  files[relativePath] = content;
                }
              }
            }
          };

          await readFilesRecursively(projectDir);

          return {
            id: dir.name,
            port,
            files
          };
        } catch (error) {
          console.error(`Error reading project ${dir.name}:`, error);
          return null;
        }
      })
    );

    // Hatalı projeleri filtrele
    const validProjects = projects.filter((p): p is NonNullable<typeof p> => p !== null);

    return NextResponse.json({ projects: validProjects });

  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { message: 'Failed to list projects' },
      { status: 500 }
    );
  }
} 