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
    const colaboradorId = 1; 
    const dadosDaViagem = {
      ...req.body,
      dataIda: new Date(req.body.dataIda),
      dataVolta: new Date(req.body.dataVolta),
      colaborador: {
        connect: { id: colaboradorId }
      },
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

// READ (Encontrar uma viagem por ID) - ESTA É A NOVA ROTA
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

// UPDATE (Atualizar uma viagem por ID) - ESTA É A NOVA ROTA
app.patch('/api/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosParaAtualizar = {
      ...req.body,
      dataIda: new Date(req.body.dataIda),
      dataVolta: new Date(req.body.dataVolta),
    };

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

// DELETE (Apagar uma viagem por ID) - JÁ ADICIONAMOS PARA O FUTURO
app.delete('/api/viagens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.viagem.delete({
      where: { id: Number(id) },
    });
    res.status(204).send(); // 204 No Content - sucesso, sem corpo de resposta
  } catch (error) {
    console.error("Erro ao apagar viagem:", error);
    res.status(500).json({ error: 'Ocorreu um erro ao apagar a viagem.' });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});
