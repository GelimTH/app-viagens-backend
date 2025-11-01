-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COLABORADOR', 'GESTOR', 'ASSESSOR_DIRETOR', 'DESENVOLVEDOR', 'VISITANTE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLABORADOR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "cargo" TEXT,
    "departamento" TEXT,
    "centroCustoPadrao" TEXT,
    "matricula" TEXT,
    "telefone" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viagem" (
    "id" SERIAL NOT NULL,
    "destino" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "dataIda" TIMESTAMP(3) NOT NULL,
    "dataVolta" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "valorEstimado" DOUBLE PRECISION,
    "tipoTransporte" TEXT,
    "necessitaHospedagem" BOOLEAN NOT NULL DEFAULT false,
    "colaboradorId" INTEGER NOT NULL,

    CONSTRAINT "Viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "notaFiscalUrl" TEXT,
    "comprovanteImagemUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "viagemId" INTEGER NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConviteVisitante" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "foiUsado" BOOLEAN NOT NULL DEFAULT false,
    "viagemId" INTEGER NOT NULL,
    "visitanteUserId" INTEGER,

    CONSTRAINT "ConviteVisitante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVisitante" (
    "id" SERIAL NOT NULL,
    "documento" TEXT,
    "dataNascimento" DATE,
    "telefone" TEXT,
    "alergias" TEXT,
    "condicoesMedicas" TEXT,
    "contatoEmergencia" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ProfileVisitante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConviteVisitante_token_key" ON "ConviteVisitante"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ConviteVisitante_visitanteUserId_key" ON "ConviteVisitante"("visitanteUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileVisitante_userId_key" ON "ProfileVisitante"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viagem" ADD CONSTRAINT "Viagem_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteVisitante" ADD CONSTRAINT "ConviteVisitante_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteVisitante" ADD CONSTRAINT "ConviteVisitante_visitanteUserId_fkey" FOREIGN KEY ("visitanteUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVisitante" ADD CONSTRAINT "ProfileVisitante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
