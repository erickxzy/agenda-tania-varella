import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupAuth, isAuthenticated } from './server/replitAuth';
import { storage } from './server/storage';
import legacyRoutes from './server/legacyRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

async function startServer() {
  await setupAuth(app);
  
  // Montar rotas legadas de autenticação manual (bcrypt)
  app.use('/api', legacyRoutes);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Fallback: se user não existe no banco, construir a partir dos claims
      if (!user) {
        console.log(`⚠️ User ${userId} not yet in database, using session claims`);
        user = {
          id: req.user.claims.sub,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
          role: null,
          serie: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      console.log(`✅ User ${userId} fetched with role: ${user.role || 'null'}`);
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
      const claims = req.user.claims;
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
      
      // Buscar usuário atual (ou criar se não existir)
      let currentUser = await storage.getUser(userId);
      
      // Se o usuário não existe, criar com dados da sessão
      if (!currentUser) {
        console.log(`📝 Usuário ${userId} não encontrado, criando novo registro`);
        currentUser = {
          id: claims.sub,
          email: claims.email,
          firstName: claims.first_name,
          lastName: claims.last_name,
          profileImageUrl: claims.profile_image_url,
          role: null,
          serie: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Atualizar apenas os campos fornecidos
      const updateData: any = {
        ...currentUser,
      };
      
      if (role) updateData.role = role;
      if (serie) updateData.serie = serie.toUpperCase();
      
      console.log(`💾 Atualizando perfil do usuário ${userId}:`, { role, serie });
      await storage.upsertUser(updateData);
      
      const updatedUser = await storage.getUser(userId);
      console.log(`✅ Perfil atualizado com sucesso:`, updatedUser);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Servir arquivos estáticos do frontend (CSS, JS, imagens)
  // express.static automaticamente serve index.html quando acessar a raiz
  app.use(express.static(path.join(__dirname, 'frontend')));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔐 Replit Auth enabled`);
    console.log(`📊 Database connected`);
  });
}

startServer().catch(console.error);
