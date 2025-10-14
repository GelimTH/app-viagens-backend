-- CreateTable
CREATE TABLE `Viagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `destino` VARCHAR(191) NOT NULL,
    `origem` VARCHAR(191) NOT NULL,
    `dataIda` DATETIME(3) NOT NULL,
    `dataVolta` DATETIME(3) NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `valorEstimado` DOUBLE NULL,
    `tipoTransporte` VARCHAR(191) NULL,
    `necessitaHospedagem` BOOLEAN NOT NULL DEFAULT false,
    `colaboradorId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Despesa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `notaFiscalUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `viagemId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Viagem` ADD CONSTRAINT `Viagem_colaboradorId_fkey` FOREIGN KEY (`colaboradorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Despesa` ADD CONSTRAINT `Despesa_viagemId_fkey` FOREIGN KEY (`viagemId`) REFERENCES `Viagem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
