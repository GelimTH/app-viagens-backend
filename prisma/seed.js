import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seed...');

  // LIMPAR DADOS ANTIGOS (ORDEM CORRETA)
  console.log('Limpando o banco de dados (na ordem correta)...');
  await prisma.despesa.deleteMany({});          // Depende de Viagem e EventoTimeline
  await prisma.eventoTimeline.deleteMany({});    // Depende de Viagem
  await prisma.conviteVisitante.deleteMany({});  // Depende de Viagem e User
  await prisma.profileVisitante.deleteMany({});  // Depende de User
  await prisma.profile.deleteMany({});           // Depende de User
  await prisma.viagem.deleteMany({});            // Depende de User
  await prisma.user.deleteMany({});              // Raiz

  // CRIAR NOVOS DADOS
  console.log('Criando novos dados...');
  const usuario1 = await prisma.user.create({
    data: {
      email: 'colaborador@empresa.com',
      fullName: 'João Colaborador',
      password: bcrypt.hashSync('senha123', 8), 
      role: 'DESENVOLVEDOR', // <-- DEFINIDO COMO DESENVOLVEDOR
      profile: {
        create: {
          cargo: 'Analista de Projetos',
          departamento: 'TI',
        },
      },
    },
  });

  // Viagem 1 (com eventos)
  const viagem1 = await prisma.viagem.create({
    data: {
      destino: 'Rio de Janeiro',
      origem: 'São Paulo',
      dataIda: new Date('2025-11-10T00:00:00.000Z'),
      dataVolta: new Date('2025-11-15T00:00:00.000Z'),
      motivo: 'Reunião com cliente importante',
      status: 'aprovado',
      valorEstimado: 1250.75, // <-- Valor para P4.A
      colaboradorId: usuario1.id,
      eventos: {
        create: [
          {
            titulo: 'Voo de Ida (CGB-GIG)',
            tipo: 'voo',
            dataHoraInicio: new Date('2025-11-10T09:00:00.000Z'),
            local: 'Aeroporto de Congonhas (CGH)',
          },
          {
            titulo: 'Reunião com Cliente XYZ',
            tipo: 'reuniao',
            dataHoraInicio: new Date('2025-11-10T14:30:00.000Z'),
            descricao: 'Alinhamento estratégico do Projeto Alfa.',
            local: 'Escritório Cliente XYZ - Av. Atlântica',
          },
        ]
      }
    },
  });

  // Viagem 2 (para faixa de preço)
  await prisma.viagem.create({
    data: {
      destino: 'Rio de Janeiro', // Mesmo destino para P4.A
      origem: 'Cuiabá',
      dataIda: new Date('2025-12-01T00:00:00.000Z'),
      dataVolta: new Date('2025-12-05T00:00:00.000Z'),
      motivo: 'Feira de Inovação',
      status: 'aprovado', // Aprovado para contar na faixa
      valorEstimado: 980.00, // Valor para P4.A
      colaboradorId: usuario1.id,
    },
  });

  // Criar um usuário Visitante e um convite para ele (para teste do P1)
  const usuarioVisitante = await prisma.user.create({
    data: {
      email: 'teste@gmail.com',
      fullName: 'TESTE DA SILVA',
      password: bcrypt.hashSync('token123', 8), // O token será a senha
      role: 'VISITANTE',
      profileVisitante: {
        create: {
          documento: "123.456.789-00",
          telefone: "11999999999"
        }
      }
    }
  });

  await prisma.conviteVisitante.create({
    data: {
      token: 'token123',
      email: 'teste@gmail.com',
      cpf: '123.456.789-00',
      foiUsado: true,
      viagemId: viagem1.id, // Associado à viagem 1 (que tem eventos)
      visitanteUserId: usuarioVisitante.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expira em 7 dias
    }
  });

  console.log('Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });