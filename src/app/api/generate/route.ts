import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
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

// Proje adı oluşturma fonksiyonu
const createProjectName = (input: string): string => {
  // Girişten ilk 3 kelimeyi al ve küçük harfe çevir
  const words = input.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Özel karakterleri kaldır
    .split(/\s+/)
    .slice(0, 3)
    .join('-');

  // Benzersiz kod oluştur (son 6 karakter)
  const uniqueCode = Date.now().toString(36).slice(-6);

  return `${words}-${uniqueCode}`;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const input = formData.get('input') as string;
    const apiKey = formData.get('apiKey') as string;
    const model = formData.get('model') as string;

    // Giriş kontrolü
    if ((!input && !image) || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Input/Image, API key and model are required' },
        { status: 400 }
      );
    }

    // Görüntü kontrolü
    if (image) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (image.size > maxSize) {
        return NextResponse.json(
          { error: 'Image size should be less than 5MB' },
          { status: 400 }
        );
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(image.type)) {
        return NextResponse.json(
          { error: 'Only JPEG, PNG and WebP images are supported' },
          { status: 400 }
        );
      }
    }

    // Ana temp dizinini oluştur
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    try {
      // API key ve model ile yeni bir AI instance oluştur
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelInstance = genAI.getGenerativeModel({ model });

      let prompt = '';

      if (image) {
        try {
          // Görüntüyü base64'e dönüştür
          const imageBytes = await image.arrayBuffer();
          const imageBase64 = Buffer.from(imageBytes).toString('base64');

          // Görüntü analizi için prompt
          prompt = `I have a screenshot of a web application. Please analyze this image and create a Next.js application that looks exactly like it.
The image is provided in base64 format. Please analyze the layout, components, styling, and functionality visible in the screenshot.
Create a pixel-perfect implementation using Next.js, React and Tailwind CSS.

Image data: ${imageBase64}

Return ONLY a JSON object with two files. Format:
{
  "src/app/page.tsx": "// page code",
  "src/app/layout.tsx": "// layout code"
}

Requirements:
1. Use Tailwind CSS for styling
2. Make it responsive
3. Implement exact colors, spacing, and typography
4. Include all visible functionality
5. Add proper animations and transitions
6. Ensure accessibility

NO explanations, NO comments outside the code, ONLY the JSON object.`;
        } catch (error) {
          console.error('Error processing image:', error);
          return NextResponse.json(
            { error: 'Failed to process image' },
            { status: 500 }
          );
        }
      } else {
        // Normal metin prompt'u
        prompt = `Generate a Next.js application with the following functionality:
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
      }

      console.log('Generating code...');
      const result = await modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      if (!text) {
        throw new Error('AI returned empty response');
      }

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

      } catch (error) {
        console.error('Parse error:', error);
        console.error('Raw text:', text);
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }

      // Tüm dosyaları birleştir
      const filesContent = {
        ...baseFiles,
        ...generatedFiles
      };

      // Proje için anlamlı bir isim oluştur
      const projectId = createProjectName(input || 'image-project');
      const projectDir = path.join(TEMP_DIR, projectId);
      console.log('Creating project directory:', projectDir);

      try {
        // Dizin yapısını oluştur
        await mkdir(projectDir, { recursive: true });
        await mkdir(path.join(projectDir, 'src', 'app'), { recursive: true });

        // package.json'ı güncelle
        const packageJson = JSON.parse(baseFiles['package.json']);
        packageJson.name = projectId;
        filesContent['package.json'] = JSON.stringify(packageJson, null, 2);

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
      } catch (error) {
        console.error('Error creating project files:', error);
        return NextResponse.json(
          { error: 'Failed to create project files' },
          { status: 500 }
        );
      }

      // Port numarası al
      const port = getNextPort();

      // package.json'a port numarasını ekle
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      packageJson.config = { port };
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      console.log('Installing dependencies...');
      try {
        await execAsync('npm install', { cwd: projectDir });
      } catch (error) {
        console.error('npm install failed:', error);
        return NextResponse.json(
          { error: 'Failed to install dependencies' },
          { status: 500 }
        );
      }

      console.log('Starting development server...');
      try {
        startNextServer(projectDir, port);
      } catch (error) {
        console.error('Failed to start server:', error);
        return NextResponse.json(
          { error: 'Failed to start development server' },
          { status: 500 }
        );
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
      console.error('AI Error:', error);
      return NextResponse.json(
        { error: 'Failed to generate code with AI' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate application',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 