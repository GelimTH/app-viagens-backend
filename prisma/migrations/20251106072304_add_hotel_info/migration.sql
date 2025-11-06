-- CreateTable
CREATE TABLE "HotelInfo" (
    "id" SERIAL NOT NULL,
    "nomeHotel" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "horarioCafe" TEXT,
    "servicosInclusos" TEXT,
    "eventosMissao" TEXT,
    "viagemId" INTEGER NOT NULL,

    CONSTRAINT "HotelInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelInfo_viagemId_key" ON "HotelInfo"("viagemId");

-- AddForeignKey
ALTER TABLE "HotelInfo" ADD CONSTRAINT "HotelInfo_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
