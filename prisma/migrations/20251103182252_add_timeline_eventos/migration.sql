-- AlterTable
ALTER TABLE "Despesa" ADD COLUMN     "eventoTimelineId" INTEGER;

-- CreateTable
CREATE TABLE "EventoTimeline" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3),
    "local" TEXT,
    "tipo" TEXT NOT NULL,
    "viagemId" INTEGER NOT NULL,

    CONSTRAINT "EventoTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoTimeline_viagemId_idx" ON "EventoTimeline"("viagemId");

-- CreateIndex
CREATE INDEX "Despesa_viagemId_idx" ON "Despesa"("viagemId");

-- CreateIndex
CREATE INDEX "Despesa_eventoTimelineId_idx" ON "Despesa"("eventoTimelineId");

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_eventoTimelineId_fkey" FOREIGN KEY ("eventoTimelineId") REFERENCES "EventoTimeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTimeline" ADD CONSTRAINT "EventoTimeline_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
