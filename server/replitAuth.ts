// Replit Auth integration using OpenID Connect
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
  role?: string,
  serie?: string,
) {
  // Buscar usuário existente para preservar dados
  const existingUser = await storage.getUser(claims["sub"]);
  
  const userData: any = {
    id: claims["sub"],
    email: claims["email"] || existingUser?.email,
    firstName: claims["first_name"] || existingUser?.firstName,
    lastName: claims["last_name"] || existingUser?.lastName,
    profileImageUrl: claims["profile_image_url"] || existingUser?.profileImageUrl,
    // Preservar role e serie existentes se não forem fornecidos novos valores
    role: role || existingUser?.role,
    serie: serie || existingUser?.serie,
  };
  
  await storage.upsertUser(userData);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    // Salvar usuário básico (role será salvo no callback)
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Endpoint para iniciar autenticação com papel selecionado
  app.get("/api/auth/start", (req, res, next) => {
    const role = req.query.role as string;
    const allowedRoles = ['aluno', 'direcao', 'admin'];
    
    if (!role || !allowedRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Papel inválido. Escolha: aluno, direcao ou admin' });
    }
    
    // Armazena o papel selecionado na sessão
    (req.session as any).selectedRole = role.toLowerCase();
    (req.session as any).returnTo = `/?role=${role.toLowerCase()}`;
    
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Endpoint legado de login (sem papel)
  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      failureRedirect: "/",
    })(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // Recupera o papel armazenado na sessão
      const selectedRole = (req.session as any).selectedRole;
      const selectedSerie = (req.session as any).selectedSerie;
      const returnTo = (req.session as any).returnTo;
      
      // Salvar papel no banco de dados após autenticação bem-sucedida
      if (selectedRole && req.user) {
        try {
          const userId = (req.user as any).claims?.sub;
          if (userId) {
            // IMPORTANTE: Aguardar a operação de salvar completar antes de redirecionar
            await upsertUser(
              (req.user as any).claims,
              selectedRole,
              selectedSerie
            );
            console.log(`✅ Role '${selectedRole}' saved for user ${userId}`);
          }
        } catch (error) {
          console.error("❌ Error saving role to database:", error);
        }
      }
      
      // Salvar sessão antes de redirecionar (garantir persistência)
      await new Promise<void>((resolve) => {
        (req.session as any).save((err: any) => {
          if (err) console.error("Session save error:", err);
          resolve();
        });
      });
      
      // Limpa o papel temporário da sessão
      delete (req.session as any).selectedRole;
      delete (req.session as any).selectedSerie;
      delete (req.session as any).returnTo;
      
      // Redireciona baseado no papel
      if (selectedRole) {
        console.log(`🔄 Redirecting to /?role=${selectedRole}`);
        res.redirect(returnTo || `/?role=${selectedRole}`);
      } else {
        res.redirect('/');
      }
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
