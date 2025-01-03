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
      "start": "next start",
      "lint": "next lint"
    },
    "dependencies": {
      "next": "14.0.4",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "@headlessui/react": "^1.7.17",
      "@heroicons/react": "^2.1.1",
      "@hookform/resolvers": "^3.3.2",
      "@radix-ui/react-dialog": "^1.0.5",
      "@radix-ui/react-dropdown-menu": "^2.0.6",
      "@radix-ui/react-label": "^2.0.2",
      "@radix-ui/react-slot": "^1.0.2",
      "axios": "^1.6.2",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.0.0",
      "framer-motion": "^10.16.16",
      "lucide-react": "^0.298.0",
      "next-themes": "^0.2.1",
      "react-hook-form": "^7.49.2",
      "react-hot-toast": "^2.4.1",
      "react-icons": "^4.12.0",
      "react-toastify": "^9.1.3",
      "tailwind-merge": "^2.1.0",
      "zod": "^3.22.4",
      "@tanstack/react-query": "^5.14.2",
      "zustand": "^4.4.7",
      "uuid": "^9.0.1",
      "nanoid": "^5.0.4",
      "date-fns": "^2.30.0",
      "lodash": "^4.17.21"
    },
    "devDependencies": {
      "@types/node": "^20.10.6",
      "@types/react": "^18.2.46",
      "@types/react-dom": "^18.2.18",
      "@types/uuid": "^9.0.7",
      "@types/lodash": "^4.14.202",
      "autoprefixer": "^10.4.16",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.3.3",
      "@tailwindcss/forms": "^0.5.7",
      "@tailwindcss/typography": "^0.5.10",
      "@types/react-query": "^1.2.9",
      "prettier": "^3.1.1",
      "prettier-plugin-tailwindcss": "^0.5.9"
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
    extend: {
      container: {
        center: true,
        padding: '1rem',
        screens: {
          '2xl': '1400px',
        },
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
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
 
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .container {
    @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
  }
}`,
  'src/lib/utils.ts': `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
  'prettier.config.js': `module.exports = {
  plugins: ['prettier-plugin-tailwindcss'],
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
}`,
  '.prettierrc': `{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
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
        prompt = `Analyze the following request and create a professional Next.js application:
${input}

First, determine the type of application and its requirements:
[Previous analysis sections remain the same...]

Implementation Guidelines:
1. Required Files Generation:
   For EACH component/feature:
   - Main Component File
   - Related Hook Files
   - Required Utility Functions
   - Necessary Types
   - Store/State Management
   - Helper Functions
   - Constants
   - Styles (if needed)
   - Tests (if needed)

2. Dependencies Check:
   For EACH imported module:
   - Verify the import path exists
   - Check if module is installed in package.json
   - Add required @types packages for TypeScript
   - Common utility packages to include:
     * uuid (for unique IDs)
     * nanoid (for shorter unique IDs)
     * date-fns (for date manipulation)
     * lodash (for utility functions)
     * react-toastify (for notifications)
     * react-hot-toast (for toast notifications)
     * axios (for HTTP requests)
     * zod (for validation)

3. Hook Implementation:
   Common Custom Hooks with FULL implementation:

   useDebounce.ts:
   \`\`\`typescript
   import { useState, useEffect } from 'react';
   
   export function useDebounce<T>(value: T, delay: number): T {
     const [debouncedValue, setDebouncedValue] = useState<T>(value);
   
     useEffect(() => {
       const handler = setTimeout(() => {
         setDebouncedValue(value);
       }, delay);
   
       return () => {
         clearTimeout(handler);
       };
     }, [value, delay]);
   
     return debouncedValue;
   }
   \`\`\`

   useMounted.ts:
   \`\`\`typescript
   import { useEffect, useState } from 'react';
   
   export function useMounted() {
     const [mounted, setMounted] = useState(false);
   
     useEffect(() => {
       setMounted(true);
       return () => setMounted(false);
     }, []);
   
     return mounted;
   }
   \`\`\`

   useLocalStorage.ts:
   \`\`\`typescript
   import { useState, useEffect } from 'react';
   
   export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
     const [storedValue, setStoredValue] = useState<T>(() => {
       if (typeof window === 'undefined') return initialValue;
       
       try {
         const item = window.localStorage.getItem(key);
         return item ? JSON.parse(item) : initialValue;
       } catch (error) {
         console.error(error);
         return initialValue;
       }
     });
   
     useEffect(() => {
       try {
         window.localStorage.setItem(key, JSON.stringify(storedValue));
       } catch (error) {
         console.error(error);
       }
     }, [key, storedValue]);
   
     return [storedValue, setStoredValue];
   }
   \`\`\`

   useMediaQuery.ts:
   \`\`\`typescript
   import { useState, useEffect } from 'react';
   
   export function useMediaQuery(query: string): boolean {
     const [matches, setMatches] = useState(false);
   
     useEffect(() => {
       const media = window.matchMedia(query);
       if (media.matches !== matches) {
         setMatches(media.matches);
       }
   
       const listener = () => setMatches(media.matches);
       media.addEventListener('change', listener);
   
       return () => media.removeEventListener('change', listener);
     }, [matches, query]);
   
     return matches;
   }
   \`\`\`

   useOnScreen.ts:
   \`\`\`typescript
   import { useState, useEffect, RefObject } from 'react';
   
   export function useOnScreen<T extends Element>(
     ref: RefObject<T>,
     rootMargin: string = '0px'
   ): boolean {
     const [isIntersecting, setIntersecting] = useState<boolean>(false);
   
     useEffect(() => {
       const observer = new IntersectionObserver(
         ([entry]) => {
           setIntersecting(entry.isIntersecting);
         },
         {
           rootMargin,
         }
       );
   
       if (ref.current) {
         observer.observe(ref.current);
       }
   
       return () => {
         if (ref.current) {
           observer.unobserve(ref.current);
         }
       };
     }, [ref, rootMargin]);
   
     return isIntersecting;
   }
   \`\`\`

   useKeyPress.ts:
   \`\`\`typescript
   import { useState, useEffect } from 'react';
   
   export function useKeyPress(targetKey: string): boolean {
     const [keyPressed, setKeyPressed] = useState(false);
   
     useEffect(() => {
       const downHandler = ({ key }: KeyboardEvent) => {
         if (key === targetKey) {
           setKeyPressed(true);
         }
       };
   
       const upHandler = ({ key }: KeyboardEvent) => {
         if (key === targetKey) {
           setKeyPressed(false);
         }
       };
   
       window.addEventListener('keydown', downHandler);
       window.addEventListener('keyup', upHandler);
   
       return () => {
         window.removeEventListener('keydown', downHandler);
         window.removeEventListener('keyup', upHandler);
       };
     }, [targetKey]);
   
     return keyPressed;
   }
   \`\`\`

   useClickOutside.ts:
   \`\`\`typescript
   import { useEffect, RefObject } from 'react';
   
   export function useClickOutside<T extends HTMLElement>(
     ref: RefObject<T>,
     handler: (event: MouseEvent | TouchEvent) => void
   ): void {
     useEffect(() => {
       const listener = (event: MouseEvent | TouchEvent) => {
         if (!ref.current || ref.current.contains(event.target as Node)) {
           return;
         }
         handler(event);
       };
   
       document.addEventListener('mousedown', listener);
       document.addEventListener('touchstart', listener);
   
       return () => {
         document.removeEventListener('mousedown', listener);
         document.removeEventListener('touchstart', listener);
       };
     }, [ref, handler]);
   }
   \`\`\`

4. Utility Functions:
   Common Utils:
   - formatters (date, number, currency)
   - validators (input, form, data)
   - animations (transitions, effects)
   - storage (local, session)
   - api (axios instances, fetchers)
   - events (custom event handlers)
   - constants (configuration, settings)
   - helpers (common functions)

5. Component Dependencies:
   For EACH component, include:
   - Required hooks
   - Required utils
   - Required types
   - Required constants
   - Required store
   - Required styles

Generate ALL necessary files based on the analyzed requirements. Example structure:
{
  // Core App Files
  "src/app/layout.tsx": "// Root layout with providers",
  "src/app/page.tsx": "// Main page",
  
  // Features
  "src/components/features/client/[Feature].tsx": "'use client';\n// Feature implementation",
  
  // Custom Hooks (Create ALL required hooks)
  "src/lib/hooks/use-interval.ts": "// Interval hook implementation",
  "src/lib/hooks/use-debounce.ts": "// Debounce hook implementation",
  "src/lib/hooks/use-media-query.ts": "// Media query hook implementation",
  "src/lib/hooks/use-local-storage.ts": "// Local storage hook implementation",
  "src/lib/hooks/use-previous.ts": "// Previous value hook implementation",
  "src/lib/hooks/use-window-size.ts": "// Window size hook implementation",
  "src/lib/hooks/use-mounted.ts": "// Mounted hook implementation",
  "src/lib/hooks/use-click-outside.ts": "// Click outside hook implementation",
  "src/lib/hooks/use-key-press.ts": "// Key press hook implementation",
  "src/lib/hooks/use-on-screen.ts": "// On screen hook implementation",
  
  // Utils (Create ALL required utils)
  "src/lib/utils/formatters.ts": "// Formatting utilities",
  "src/lib/utils/validators.ts": "// Validation utilities",
  "src/lib/utils/animations.ts": "// Animation utilities",
  "src/lib/utils/storage.ts": "// Storage utilities",
  "src/lib/utils/api.ts": "// API utilities",
  "src/lib/utils/events.ts": "// Event utilities",
  
  // Constants
  "src/lib/constants/[feature].ts": "// Feature-specific constants",
  "src/lib/constants/config.ts": "// Global configuration",
  
  // Types
  "src/types/[feature].ts": "// Feature-specific types",
  "src/types/common.ts": "// Common types",
  
  // Store
  "src/store/[feature].ts": "'use client';\n// Feature-specific store",
  
  // Styles
  "src/styles/[feature].css": "// Feature-specific styles",
  
  // Components
  "src/components/ui/client/[Component].tsx": "'use client';\n// UI components",
  
  // Services
  "src/lib/services/[service].ts": "// Service implementation"
}

Critical Requirements:
1. Include FULL implementation of ALL custom hooks
2. Export ALL hooks properly
3. Add proper TypeScript types for ALL hooks
4. Add proper error handling in hooks
5. Add proper cleanup in useEffect
6. Add proper type safety
7. Add proper documentation
8. Add proper examples
9. Add proper tests
10. Optimize for performance

NO explanations, NO comments outside the code, ONLY the JSON object with ALL necessary files based on the analyzed requirements.`;
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