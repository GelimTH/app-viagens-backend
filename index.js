// adv-back/index.js
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
      },
    });
    res.status(201).json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Este email já está em uso." });
    }
    res.status(500).json({ error: "Não foi possível registrar o usuário." });
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

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      include: { profile: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Usuário não encontrado.' });
  }
});


// --- ROTAS DE VIAGEM (CRUD) ---

// CREATE (Criar uma nova viagem)
app.post('/api/viagens', async (req, res) => {
  try {
    const colaboradorId = 5; // TODO: No futuro, pegar o ID do usuário logado (JWT)
    
    const dadosDaViagem = {
      origem: req.body.origem,
      destino: req.body.destino,
      motivo: req.body.motivo,
      dataIda: new Date(req.body.data_ida),
      dataVolta: new Date(req.body.data_volta),
      colaboradorId: colaboradorId,
      status: 'em_analise'
    };

    const novaViagem = await prisma.viagem.create({ data: dadosDaViagem });
    res.status(201).json(novaViagem);
  } catch (error) {
    console.error("Erro ao criar viagem:", error);
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


// --- ROTAS DE DESPESA (CRUD) ---

// CREATE (Adicionar uma nova despesa a uma viagem)
app.post('/api/despesas', async (req, res) => {
  try {
    const { viagem_id, tipo, valor, data, descricao } = req.body;

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
        status: 'pendente'
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

// UPDATE (Aprovar ou reprovar uma despesa)
app.patch('/api/despesas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Só precisamos do status

    if (!status) {
      return res.status(400).json({ error: 'O novo status é obrigatório.' });
    }

    const despesaAtualizada = await prisma.despesa.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(despesaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao atualizar a despesa.' });
  }
});


// --- ROTA DO CHATBOT ---
app.post('/api/chatbot/ask', async (req, res) => {
  const { pergunta } = req.body;
  const texto = pergunta.toLowerCase();

  try {
    const colaboradorId = 5; // ID fixo para o protótipo

    let resposta = "Desculpe, não entendi sua pergunta. Você pode perguntar sobre 'status das viagens', 'nova viagem' ou 'política de despesas'.";

    if (texto.includes('status') || texto.includes('minhas viagens')) {
      const viagens = await prisma.viagem.findMany({
        where: { colaboradorId: colaboradorId },
        orderBy: { dataIda: 'desc' }
      });

      if (viagens.length === 0) {
        resposta = "Você não tem nenhuma viagem registrada no momento.";
      } else {
        const statusList = viagens.map(v => `- Viagem para ${v.destino}: ${v.status}`).join('\n');
        resposta = `Claro! Aqui está o status das suas viagens:\n${statusList}`;
      }
    } 
    else if (texto.includes('nova') && texto.includes('viagem')) {
        resposta = "Para criar uma nova viagem, clique no menu 'Nova Viagem' ao lado ou no botão azul no topo do Dashboard. ✨";
    } 
    else if (texto.includes('política') || texto.includes('regras') || texto.includes('despesa')) {
        resposta = "Nossa política de viagens corporativas permite um adiantamento de até R$ 500,00. As despesas com alimentação têm um teto diário de R$ 120,00. Lembre-se de guardar todos os comprovantes!";
    }
    else if (texto.includes('ajuda') || texto.includes('socorro')) {
        resposta = "Estou aqui para ajudar! Você pode me perguntar sobre o status das suas viagens, como criar uma nova solicitação ou sobre as políticas de despesas da empresa.";
    }
    else if (texto.includes('oi') || texto.includes('olá') || texto.includes('bom dia')) {
        resposta = "Olá! 👋 Como posso te ajudar com suas viagens hoje?";
    }

    res.json({ resposta });

  } catch (error) {
    console.error('Erro no endpoint do chatbot:', error);
    res.status(500).json({ resposta: "Ocorreu um erro interno ao processar sua pergunta." });
  }
});

// --- ROTA DE DEBUG ---
app.get('/api/debug-viagens', async (req, res) => {
  console.log('Buscando todas as viagens para debug...');
  const viagens = await prisma.viagem.findMany();
  res.json(viagens);
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});