// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // 1. IMPORTAMOS A BIBLIOTECA DE CRIPTOGRAFIA

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seed...');

  // LIMPAR DADOS ANTIGOS
  console.log('Limpando o banco de dados...');
  await prisma.despesa.deleteMany({});
  await prisma.viagem.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  // CRIAR NOVOS DADOS
  console.log('Criando novos dados...');
  const usuario1 = await prisma.user.create({
    data: {
      email: 'colaborador@empresa.com',
      fullName: 'João Colaborador',
      // 2. AGORA SALVAMOS A SENHA CRIPTOGRAFADA
      password: bcrypt.hashSync('senha123', 8), 
      role: 'colaborador',
      profile: {
        create: {
          cargo: 'Analista de Projetos',
          departamento: 'TI',
        },
      },
    },
  });

  await prisma.viagem.create({
    data: {
      destino: 'Rio de Janeiro',
      origem: 'São Paulo',
      dataIda: new Date('2025-11-10T00:00:00.000Z'),
      dataVolta: new Date('2025-11-15T00:00:00.000Z'),
      motivo: 'Reunião com cliente importante',
      status: 'aprovado',
      colaboradorId: usuario1.id,
    },
  });

  await prisma.viagem.create({
    data: {
      destino: 'Belo Horizonte',
      origem: 'São Paulo',
      dataIda: new Date('2025-12-08T00:00:00.000Z'),
      dataVolta: new Date('2025-12-11T00:00:00.000Z'),
      motivo: 'Treinamento de equipe',
      status: 'em_analise',
      colaboradorId: usuario1.id,
    },
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