import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Geçici proje dizini
const TEMP_DIR = path.join(process.cwd(), 'temp-projects');

// Port yönetimi
let currentPort = 3001;
const getNextPort = () => currentPort++;

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

// Temel dosya şablonları
const baseFiles = {
  'package.json': `{
    "name": "nextjs-app",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start"
    },
    "dependencies": {
      "next": "14.0.4",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
    "devDependencies": {
      "@types/node": "^20.10.6",
      "@types/react": "^18.2.46",
      "@types/react-dom": "^18.2.18",
      "autoprefixer": "^10.4.16",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.3.3"
    }
  }`,
  'next.config.js': `/** @type {import('next').NextConfig} */
  const nextConfig = {}
  module.exports = nextConfig`,
  'tailwind.config.ts': `import type { Config } from 'tailwindcss'
  const config: Config = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  export default config`,
  'postcss.config.js': `module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }`,
  'tsconfig.json': `{
    "compilerOptions": {
      "target": "es5",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [
        {
          "name": "next"
        }
      ],
      "paths": {
        "@/*": ["./src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }`,
  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
}`
};

export async function POST(request: Request) {
  try {
    const { input, apiKey, model } = await request.json();

    if (!input || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Input, API key and model are required' },
        { status: 400 }
      );
    }

    // Ana temp dizinini oluştur
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    // API key ve model ile yeni bir AI instance oluştur
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ model });

    const prompt = `Generate a Next.js application with the following functionality:
${input}

Return ONLY a JSON object with two files. Format:
{
  "src/app/page.tsx": "// page code",
  "src/app/layout.tsx": "// layout code"
}

File requirements:

page.tsx:
'use client';
import { useState } from 'react';
// Add more imports as needed
// Include full component code with Tailwind CSS styling

layout.tsx:
import './globals.css';
import type { Metadata } from 'next';
// Include full layout code with metadata

NO explanations, NO comments outside the code, ONLY the JSON object.`;

    console.log('Generating code...');
    const result = await modelInstance.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Raw response:', text);
    
    console.log('Parsing response...');
    let generatedFiles;
    
    try {
      // Markdown kod bloklarını temizle
      let cleanedText = text;
      if (text.includes('```json')) {
        cleanedText = text
          .replace(/```json\n/, '')
          .replace(/\n```$/, '')
          .trim();
      }

      // JSON'ı parse et
      try {
        generatedFiles = JSON.parse(cleanedText);
      } catch (parseError) {
        cleanedText = cleanedText
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\t/g, '    ');

        generatedFiles = JSON.parse(cleanedText);
      }

      // Dosya kontrolü
      if (!generatedFiles['src/app/page.tsx'] || !generatedFiles['src/app/layout.tsx']) {
        throw new Error('Missing required files in the response');
      }

      // String kontrolü
      if (typeof generatedFiles['src/app/page.tsx'] !== 'string' || 
          typeof generatedFiles['src/app/layout.tsx'] !== 'string') {
        throw new Error('File contents must be strings');
      }

    } catch (error: unknown) {
      console.error('Parse error:', error);
      console.error('Raw text:', text);
      
      try {
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        generatedFiles = eval(`(${jsonStr})`);
        
        if (!generatedFiles || typeof generatedFiles !== 'object') {
          throw new Error('Invalid JSON structure');
        }
      } catch (evalError) {
        throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Tüm dosyaları birleştir
    const filesContent = {
      ...baseFiles,
      ...generatedFiles
    };

    // Proje için benzersiz bir dizin oluştur
    const projectId = Date.now().toString();
    const projectDir = path.join(TEMP_DIR, projectId);
    console.log('Creating project directory:', projectDir);

    // Dizin yapısını oluştur
    await mkdir(projectDir, { recursive: true });
    await mkdir(path.join(projectDir, 'src', 'app'), { recursive: true });

    // Dosyaları yaz
    console.log('Writing files...');
    for (const [filePath, content] of Object.entries(filesContent)) {
      const fullPath = path.join(projectDir, filePath);
      const fileDir = path.dirname(fullPath);
      
      if (!existsSync(fileDir)) {
        await mkdir(fileDir, { recursive: true });
      }

      await writeFile(fullPath, content as string);
    }

    // Port numarası al
    const port = getNextPort();

    console.log('Installing dependencies...');
    try {
      await execAsync('npm install', { cwd: projectDir });
    } catch (error) {
      console.error('npm install failed:', error);
      throw new Error('Failed to install dependencies');
    }

    console.log('Starting development server...');
    try {
      startNextServer(projectDir, port);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw new Error('Failed to start development server');
    }

    // Sunucunun başlaması için bekle
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Application ready on port:', port);
    return NextResponse.json({
      projectId,
      port,
      files: filesContent
    });

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Failed to generate application',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 