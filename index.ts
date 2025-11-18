import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuth, isAuthenticated } from './server/replitAuth';
import { storage } from './server/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

async function startServer() {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Endpoint para atualizar papel e série do usuário
  app.post('/api/auth/update-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, serie } = req.body;
      
      // Validar papel
      const allowedRoles = ['aluno', 'direcao', 'admin'];
      if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Papel inválido' });
      }
      
      // Validar série para alunos
      const allowedSeries = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
      if (role === 'aluno' && serie && !allowedSeries.includes(serie.toUpperCase())) {
        return res.status(400).json({ error: 'Série inválida' });
      }
      
      // Buscar usuário atual
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Atualizar apenas os campos fornecidos
      const updateData: any = {
        ...currentUser,
      };
      
      if (role) updateData.role = role;
      if (serie) updateData.serie = serie.toUpperCase();
      
      await storage.upsertUser(updateData);
      
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Página inicial - sempre mostra seleção de papel (sem autenticação)
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  });

  app.use(express.static(path.join(__dirname, 'frontend')));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔐 Replit Auth enabled`);
    console.log(`📊 Database connected`);
  });
}

startServer().catch(console.error);
