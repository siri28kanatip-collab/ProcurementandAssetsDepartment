import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');

app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for ultra-fast, smooth, zero-stutter performance
let projectsCache: any[] = [];

// Helper to read data
function loadProjects(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        projectsCache = data;
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to read projects.json:', err);
  }
  return projectsCache;
}

// Helper to save data
function saveProjects(data: any[]) {
  projectsCache = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write projects.json:', err);
  }
}

// Initial load
loadProjects();

// API Endpoints
app.get('/api/projects', (_req: Request, res: Response) => {
  res.json(projectsCache);
});

app.post('/api/projects', (req: Request, res: Response) => {
  const newProject = req.body;
  if (!newProject || !newProject.name) {
    return res.status(400).json({ error: 'ชื่อโครงการจำเป็นต้องระบุ' });
  }
  projectsCache = [newProject, ...projectsCache];
  saveProjects(projectsCache);
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updatedProject = req.body;
  const index = projectsCache.findIndex((p) => p.id === id);
  if (index === -1) {
    // If not found, append
    projectsCache.push(updatedProject);
  } else {
    projectsCache[index] = { ...projectsCache[index], ...updatedProject, updatedAt: new Date().toISOString() };
  }
  saveProjects(projectsCache);
  res.json(projectsCache[index] || updatedProject);
});

app.delete('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  projectsCache = projectsCache.filter((p) => p.id !== id);
  saveProjects(projectsCache);
  res.json({ success: true, id });
});

// Bulk import endpoint (append or replace)
app.post('/api/projects/bulk', (req: Request, res: Response) => {
  const { projects, mode } = req.body; // mode: 'append' | 'replace'
  if (!Array.isArray(projects)) {
    return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  }

  if (mode === 'replace') {
    projectsCache = projects;
  } else {
    // Append unique
    const existingIds = new Set(projectsCache.map((p) => p.id));
    const toAdd = projects.filter((p) => !existingIds.has(p.id));
    projectsCache = [...toAdd, ...projectsCache];
  }

  saveProjects(projectsCache);
  res.json({ success: true, count: projectsCache.length });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
