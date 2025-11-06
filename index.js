// adv-back/index.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Novas importações para upload
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ----- CÓDIGO DE DEBUG (TEMPORÁRIO) -----
if (process.env.DATABASE_URL) {
  console.log("✅ DATABASE_URL foi carregada.");
  console.log("Host (Render):", new URL(process.env.DATABASE_URL).hostname);
} else {
  console.error("❌ ERRO: DATABASE_URL não encontrada no process.env!");
}
// ----- FIM DO CÓDIGO DE DEBUG -----

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://embarquecoracaoazul.online',
  'https://www.embarquecoracaoazul.online',
  'http://localhost:5173', // Para desenvolvimento local
  'https://adv-api-7c96.onrender.com',
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Permite se a origem estiver na lista ou se for uma requisição de servidor (sem 'origin')
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log para debug no servidor
      console.error('CORS BLOCKED:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Importante para o envio do token JWT
};

app.use(cors(corsOptions));
app.use(express.json());

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Pega o token "Bearer <token>"

  if (token == null) {
    return res.sendStatus(401); // 401 Unauthorized
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco com o ID que estava no token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true }, // Inclui o perfil
    });

    if (!user) {
      return res.sendStatus(403); // 403 Forbidden
    }

    req.user = user; // Anexa o objeto do usuário na requisição
    next(); // Passa para a próxima rota
  } catch (err) {
    console.error("Erro de token:", err.message);
    return res.sendStatus(403); // 403 Forbidden (token inválido)
  }
};

const authorizeRole = (rolesPermitidas) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (rolesPermitidas.includes(userRole)) {
      next(); // Usuário tem a permissão, continue
    } else {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para esta ação.' });
    }
  };
};

// Servir arquivos estáticos da pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configuração do Multer (onde salvar os arquivos)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Cria a pasta se não existir
    const uploadPath = 'public/uploads/';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Garante um nome de arquivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// --- NOVA ROTA DE UPLOAD ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo foi enviado.');
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ fileUrl });
});

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    // 1. Verifica se já existe algum usuário no banco
    const userCount = await prisma.user.count();

    // 2. Define o role: se for o primeiro (contagem 0), é DEV, senão é Colaborador
    // (O Prisma aceita a string, desde que ela seja um valor válido do enum)
    const userRole = userCount === 0 ? 'DESENVOLVEDOR' : 'COLABORADOR';

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        role: userRole, // 3. Usa o role dinâmico
      },
    });
    res.status(201).json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Este email já está em uso." });
    }
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ error: "Não foi possível registrar o usuário." });
  }
});

app.post('/api/auth/visitante/register', async (req, res) => {
  const {
    token, email, cpf, fullName, password, // Dados do User
    documento, dataNascimento, telefone, // Dados do ProfileVisitante
    alergias, condicoesMedicas, contatoEmergencia
  } = req.body;

  if (!token || !email || !cpf || !fullName || !password) {
    return res.status(400).json({ error: 'Campos de validação e de conta são obrigatórios.' });
  }

  try {
    // 1. Encontra o convite pelo token (que é único)
    const convite = await prisma.conviteVisitante.findUnique({
      where: { token: token }
    });

    // 2. Faz a verificação de segurança
    if (!convite || convite.foiUsado) {
      return res.status(403).json({ error: 'Convite inválido ou já utilizado.' });
    }

    // NOVO CHECK DE EXPIRAÇÃO
    if (convite.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Convite expirado.' });
    }

    if (convite.email !== email || convite.cpf !== cpf) {
      return res.status(403).json({ error: 'Os dados (Email ou CPF) não correspondem ao convite.' });
    }

    // 3. Verifica se o email já está em uso por outro usuário
    const usuarioExistente = await prisma.user.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({ error: "Este email já está em uso." });
    }

    // 4. Se passou em tudo, cria o usuário e o perfil em uma transação
    const hashedPassword = bcrypt.hashSync(password, 8);

    await prisma.$transaction(async (tx) => {
      // a. Cria o Usuário
      const novoUsuario = await tx.user.create({
        data: {
          email,
          fullName,
          password: hashedPassword,
          role: 'VISITANTE', // Define o role
        }
      });

      // b. Cria o Perfil do Visitante
      await tx.profileVisitante.create({
        data: {
          userId: novoUsuario.id,
          documento: documento || null,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
          telefone: telefone || null,
          alergias: alergias || null,
          condicoesMedicas: condicoesMedicas || null,
          contatoEmergencia: contatoEmergencia || null,
        }
      });

      // c. Atualiza o convite como "usado" e liga ao novo usuário
      await tx.conviteVisitante.update({
        where: { id: convite.id },
        data: {
          foiUsado: true,
          visitanteUserId: novoUsuario.id
        }
      });
    });

    res.status(201).json({ message: "Conta de visitante criada com sucesso!" });

  } catch (error) {
    console.error("Erro no registro de visitante:", error);
    res.status(500).json({ error: "Não foi possível registrar o visitante." });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Senha inválida." });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  const { password: _, ...userWithoutPassword } = user;

  res.json({ user: userWithoutPassword, token });
});

// Agora esta rota é protegida e retorna o usuário logado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  // O middleware 'authenticateToken' já buscou o usuário
  // e o colocou em 'req.user'.
  // Apenas retornamos ele.
  res.json(req.user);
});

app.get(
  '/api/visitante/minha-viagem',
  authenticateToken,
  authorizeRole(['VISITANTE']),
  async (req, res) => {
    try {
      const convite = await prisma.conviteVisitante.findFirst({
        where: { visitanteUserId: req.user.id },
        include: {
          viagem: {
            include: {
              colaborador: {
                include: {
                  profile: true // <-- GARANTA QUE ISSO FOI ADICIONADO
                }
              },
              eventos: {
                orderBy: {
                  dataHoraInicio: 'asc'
                }
              },
              hotelInfo: true, // <-- ADICIONADO
              comunicados: { // <-- ADICIONADO
                orderBy: {
                  createdAt: 'desc'
                }
              }
            },
          },
        },
      });

      // 5. Se não achou um convite, a viagem não existe para ele.
      if (!convite || !convite.viagem) {
        console.log(`(BACKEND) Nenhuma viagem encontrada para o visitante ID: ${req.user.id}`);
        return res.status(404).json({ error: 'Viagem não encontrada para este visitante.' });
      }

      // 6. Busca o perfil do visitante separado
      const perfil = await prisma.profileVisitante.findUnique({
        where: { userId: req.user.id },
      });

      // 7. Retorna os dados que a página precisa
      res.json({
        viagem: convite.viagem, // 'viagem' agora contém o array 'eventos'
        perfil: perfil,
        gestor: convite.viagem.colaborador,
      });

    } catch (error) {
      console.error("Erro ao buscar dados do visitante:", error);
      res.status(500).json({ error: 'Ocorreu um erro ao buscar os dados da viagem.' });
    }
  }
);

app.get('/api/viagens/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const eventos = await prisma.eventoTimeline.findMany({
      where: { viagemId: Number(id) },
      orderBy: { dataHoraInicio: 'asc' },
    });
    res.json(eventos);
  } catch (error) {
    console.error("Erro ao buscar timeline:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar o itinerário.' });
  }
});


// --- ROTAS DE VIAGEM (CRUD) ---

// CREATE (Criar uma nova viagem)
app.post('/api/viagens', authenticateToken, async (req, res) => {
  try {
    const colaboradorId = req.user.id;

    // --- CORREÇÃO #1 ---
    // Agora estamos lendo 'eventos' do req.body
    const {
      origem,
      destino,
      motivo,
      data_ida,
      data_volta,
      valorEstimado,
      eventos = [] // <-- ESTA LINHA ESTAVA FALTANDO
    } = req.body;

    // Log para você ver no RENDER (opcional, mas recomendado)
    console.log(`(BACKEND) Criando viagem para ${destino}. Eventos recebidos: ${eventos.length}`);

    const novaViagem = await prisma.$transaction(async (tx) => {
      // 1. Cria a Viagem principal
      const viagem = await tx.viagem.create({
        data: {
          origem,
          destino,
          motivo,
          dataIda: new Date(data_ida),
          dataVolta: new Date(data_volta),
          valorEstimado: valorEstimado || 0,
          status: 'em_analise',
          colaboradorId: colaboradorId,
        },
      });

      // --- CORREÇÃO #2 ---
      // Este bloco de código inteiro estava faltando
      if (eventos.length > 0) {
        // 2. Mapeia os eventos para o formato do Prisma
        const eventosData = eventos.map((evento) => ({
          titulo: evento.titulo,
          descricao: evento.descricao,
          dataHoraInicio: new Date(evento.dataHoraInicio),
          dataHoraFim: evento.dataHoraFim ? new Date(evento.dataHoraFim) : null,
          local: evento.local,
          tipo: evento.tipo,
          viagemId: viagem.id, // Associa o evento à viagem
        }));

        // 3. Cria todos os eventos de uma vez
        await tx.eventoTimeline.createMany({
          data: eventosData,
        });
      }
      // --- FIM DA CORREÇÃO #2 ---

      return viagem; // Retorna a viagem principal
    });

    res.status(201).json(novaViagem);

  } catch (error) {
    console.error("Erro ao criar viagem com transação:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao criar a viagem.' });
  }
});

// READ (Listar todas as viagens)
app.get('/api/viagens', async (req, res) => {
  try {
    const viagens = await prisma.viagem.findMany({
      orderBy: { dataIda: 'desc' }
    });
    res.json(viagens);
  } catch (error) {
    console.error("Erro ao buscar viagens:", error);
    res.status(500).json([]);
  }
});

// READ (Encontrar uma viagem por ID)
app.get('/api/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const viagem = await prisma.viagem.findUnique({
      where: { id: Number(id) },
    });

    if (!viagem) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }

    res.json(viagem);
  } catch (error) {
    console.error("Erro ao buscar viagem:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar a viagem.' });
  }
});

// UPDATE (Atualizar uma viagem por ID)
app.patch('/api/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosParaAtualizar = { ...req.body };

    if (req.body.dataIda) {
      dadosParaAtualizar.dataIda = new Date(req.body.dataIda);
    }
    if (req.body.dataVolta) {
      dadosParaAtualizar.dataVolta = new Date(req.body.dataVolta);
    }

    const viagemAtualizada = await prisma.viagem.update({
      where: { id: Number(id) },
      data: dadosParaAtualizar,
    });

    res.json(viagemAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar viagem:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao atualizar a viagem.' });
  }
});

// DELETE (Apagar uma viagem por ID)
app.delete('/api/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.viagem.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao apagar viagem:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao apagar a viagem.' });
  }
});

// ADICIONE ESTA NOVA ROTA PARA CONVIDAR VISITANTES
app.post(
  '/api/viagens/:id/convidar',
  authenticateToken, // 1. Protege a rota
  authorizeRole(['GESTOR', 'ASSESSOR_DIRETOR', 'DESENVOLVEDOR']), // 2. Só Gestor/Assessor/Dev podem convidar
  async (req, res) => {
    const { id: viagemId } = req.params;
    const { email, cpf } = req.body;

    if (!email || !cpf) {
      return res.status(400).json({ error: 'Email e CPF são obrigatórios.' });
    }

    try {
      // 1. Verifica se a viagem existe
      const viagem = await prisma.viagem.findUnique({ where: { id: Number(viagemId) } });
      if (!viagem) {
        return res.status(404).json({ error: 'Viagem não encontrada.' });
      }

      // 2. Verifica se já existe um convite para esse email ou CPF
      const conviteExistente = await prisma.conviteVisitante.findFirst({
        where: { OR: [{ email }, { cpf }] }
      });
      if (conviteExistente) {
        return res.status(409).json({ error: 'Já existe um convite para este email ou CPF.' });
      }

      // 3. Gera um token único (ex: 'WkYq9E-4P2a_25-HS1-tP')
      const token = nanoid(21);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      // 4. Cria o convite no banco
      const novoConvite = await prisma.conviteVisitante.create({
        data: {
          token: token,
          email: email,
          cpf: cpf,
          viagemId: Number(viagemId),
          expiresAt: expiresAt,
        }
      });

      res.status(201).json(novoConvite); // Retorna o convite criado

    } catch (error) {
      console.error("Erro ao criar convite:", error);
      res.status(500).json({ error: 'Ocorreu um erro ao criar o convite.' });
    }
  }
);

app.get(
  '/api/viagens/:id/convites',
  authenticateToken, // Protege a rota
  authorizeRole(['GESTOR', 'ASSESSOR_DIRETOR', 'DESENVOLVEDOR']), // Protege por role
  async (req, res) => {
    const { id: viagemId } = req.params;

    try {
      const convites = await prisma.conviteVisitante.findMany({
        where: { viagemId: Number(viagemId) },
        orderBy: { email: 'asc' } // Ordena por email
      });
      res.json(convites);
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
      res.status(500).json({ error: 'Ocorreu um erro ao buscar os convites.' });
    }
  }
);

app.get('/api/viagens/faixa-preco', authenticateToken, async (req, res) => {
  const { destino } = req.query;

  if (!destino) {
    return res.status(400).json({ error: 'O destino é obrigatório.' });
  }

  try {
    const agregacao = await prisma.viagem.aggregate({
      where: {
        destino: destino,
        status: 'aprovado',
        valorEstimado: {
          gt: 0,
        },
      },
      _avg: {
        valorEstimado: true,
      },
      _min: {
        valorEstimado: true,
      },
      _max: {
        valorEstimado: true,
      },
      // ==================================================
      // CORREÇÃO #1 AQUI
      // ==================================================
      _count: {
        _all: true, // Alterado de { id: true } para { _all: true }
      },
    });

    res.json({
      avg: agregacao._avg.valorEstimado,
      min: agregacao._min.valorEstimado,
      max: agregacao._max.valorEstimado,
      // ==================================================
      // CORREÇÃO #2 AQUI
      // ==================================================
      count: agregacao._count._all, // Alterado de .id para ._all
    });

  } catch (error) {
    console.error("Erro ao buscar faixa de preço:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar a faixa de preço.' });
  }
});

// (Cole em ADV-back/index.js, junto com as outras rotas GET)
app.get('/api/viagens/:id/comunicados', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comunicados = await prisma.comunicado.findMany({
      where: { viagemId: Number(id) },
      orderBy: { createdAt: 'desc' },
      take: 3, // Pega só os 3 últimos
    });
    res.json(comunicados);
  } catch (error) {
    console.error("Erro ao buscar comunicados:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar comunicados.' });
  }
});

// --- ROTAS DE DESPESA (CRUD) ---
app.post('/api/despesas', async (req, res) => {
  try {
    const { viagem_id, tipo, valor, data, descricao, notaFiscalUrl, comprovanteImagemUrl } = req.body;

    if (!viagem_id || !tipo || !valor || !data) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    const novaDespesa = await prisma.despesa.create({
      data: {
        tipo,
        valor,
        data: new Date(data),
        descricao,
        viagemId: viagem_id,
        notaFiscalUrl: notaFiscalUrl,
        status: 'pendente',
        comprovanteImagemUrl: comprovanteImagemUrl,
      }
    });
    res.status(201).json(novaDespesa);
  } catch (error) {
    console.error("Erro ao criar despesa:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao criar a despesa.' });
  }
});

// READ (Listar todas as despesas de uma viagem)
app.get('/api/despesas', async (req, res) => {
  try {
    const { viagemId } = req.query;

    if (!viagemId) {
      return res.status(400).json({ error: 'O ID da viagem é obrigatório.' });
    }

    const despesas = await prisma.despesa.findMany({
      where: {
        viagemId: Number(viagemId),
      },
      orderBy: {
        data: 'desc',
      },
    });
    res.json(despesas);
  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar as despesas.' });
  }
});

// READ (Listar todas as despesas PENDENTES)
app.get('/api/despesas/pendentes', async (req, res) => {
  try {
    const despesas = await prisma.despesa.findMany({
      where: {
        status: 'pendente',
      },
      // Incluímos a viagem para sabermos a qual viagem a despesa pertence
      include: {
        viagem: true,
      },
      orderBy: {
        data: 'asc',
      },
    });
    res.json(despesas);
  } catch (error) {
    console.error("Erro ao buscar despesas pendentes:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar as despesas.' });
  }
});

// READ (Encontrar uma despesa por ID) - ROTA FALTANTE
app.get('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const despesa = await prisma.despesa.findUnique({
      where: { id: Number(id) },
    });

    if (!despesa) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    res.json(despesa);
  } catch (error) {
    console.error("Erro ao buscar despesa:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao buscar a despesa.' });
  }
});


// ==================================================================
// ADICIONE ESTE BLOCO PARA O ERRO DE "EXCLUIR" (DELETE)
// ==================================================================
// DELETE (Apagar uma despesa por ID) - ROTA FALTANTE
app.delete('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.despesa.delete({
      where: { id: Number(id) },
    });
    res.status(204).send(); // 204 significa "No Content" (sucesso, sem corpo)
  } catch (error) {
    console.error("Erro ao apagar despesa:", error);
    // Adiciona verificação para "Record not found" (P2025 no Prisma)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada para deletar.' });
    }
    res.status(500).json({ error: 'Ocorreu um erro ao apagar a despesa.' });
  }
});

// UPDATE (Aprovar ou reprovar uma despesa)
app.patch('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosParaAtualizar = req.body;

    // Se a data for enviada, converte para o formato Date
    if (dadosParaAtualizar.data) {
      dadosParaAtualizar.data = new Date(dadosParaAtualizar.data);
    }

    const despesaAtualizada = await prisma.despesa.update({
      where: { id: Number(id) },
      data: dadosParaAtualizar,
    });

    res.json(despesaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error);
    // Adiciona verificação para "Record not found" (P2025 no Prisma)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa não encontrada para atualizar.' });
    }
    res.status(500).json({ error: 'Ocorreu um erro ao atualizar a despesa.' });
  }
});


// --- ROTA DO CHATBOT ---
app.post('/api/chatbot/ask', async (req, res) => {
  const { pergunta } = req.body;
  const texto = pergunta.toLowerCase();
  let resposta = {}; // Objeto de resposta

  try {
    const colaboradorId = 5; // (Mantendo seu ID de teste)

    if (texto.includes('status') || texto.includes('minhas viagens')) {
      const viagens = await prisma.viagem.findMany({
        where: { colaboradorId: colaboradorId },
        orderBy: { dataIda: 'desc' }
      });

      let statusList;
      if (viagens.length === 0) {
        statusList = "Você não tem nenhuma viagem registrada no momento.";
      } else {
        const statusMap = { 'em_analise': 'Em Análise 🟠', 'aprovado': 'Aprovado ✅', 'reprovado': 'Reprovado ❌' };
        statusList = viagens
          .map(v => `- Viagem para ${v.destino}: ${statusMap[v.status] || v.status}`)
          .join('\n');
      }

      resposta = {
        action: 'show_text',
        payload: { message: `Claro! Aqui está o status das suas viagens:\n${statusList}` }
      };

    } else if (texto.includes('nova') && texto.includes('viagem')) {
      resposta = {
        action: 'navigate',
        payload: { to: '/app/novaviagem' }
      };

    } else if (texto.includes('histórico') || texto.includes('historico')) { // <-- Adicionei 'historico' sem acento
      resposta = {
        action: 'navigate',
        payload: { to: '/app/historico' }
      };

    } else if (texto.includes('política') || texto.includes('regras') || texto.includes('despesa')) {
      resposta = {
        action: 'show_text',
        payload: { message: "Nossa política de viagens... (etc)" }
      };

    } else if (texto.includes('oi') || texto.includes('olá') || texto.includes('bom dia')) {
      resposta = {
        action: 'show_text',
        payload: { message: "Olá! 👋 Como posso te ajudar com suas viagens hoje?" }
      };

    } else {
      resposta = {
        action: 'show_text',
        payload: { message: "Perdão, não entendi. Você pode perguntar sobre 'status das viagens', 'nova viagem' ou 'política de despesas'." }
      };
    }

    res.json(resposta);

  } catch (error) {
    console.error('Erro no endpoint do chatbot:', error);
    res.status(500).json({
      action: 'show_text',
      payload: { message: "Desculpe, não consegui me conectar. Tente novamente." }
    });
  }
});

// --- ROTA DE DEBUG ---
app.get('/api/debug-viagens', async (req, res) => {
  console.log('Buscando todas as viagens para debug...');
  const viagens = await prisma.viagem.findMany();
  res.json(viagens);
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});