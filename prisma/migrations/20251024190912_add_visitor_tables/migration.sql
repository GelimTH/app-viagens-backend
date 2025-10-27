-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('COLABORADOR', 'GESTOR', 'ASSESSOR_DIRETOR', 'DESENVOLVEDOR', 'VISITANTE') NOT NULL DEFAULT 'COLABORADOR';

-- CreateTable
CREATE TABLE `ConviteVisitante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NOT NULL,
    `foiUsado` BOOLEAN NOT NULL DEFAULT false,
    `viagemId` INTEGER NOT NULL,
    `visitanteUserId` INTEGER NULL,

    UNIQUE INDEX `ConviteVisitante_token_key`(`token`),
    UNIQUE INDEX `ConviteVisitante_email_key`(`email`),
    UNIQUE INDEX `ConviteVisitante_cpf_key`(`cpf`),
    UNIQUE INDEX `ConviteVisitante_visitanteUserId_key`(`visitanteUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileVisitante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento` VARCHAR(191) NULL,
    `dataNascimento` DATE NULL,
    `telefone` VARCHAR(191) NULL,
    `alergias` TEXT NULL,
    `condicoesMedicas` TEXT NULL,
    `contatoEmergencia` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ProfileVisitante_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConviteVisitante` ADD CONSTRAINT `ConviteVisitante_viagemId_fkey` FOREIGN KEY (`viagemId`) REFERENCES `Viagem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConviteVisitante` ADD CONSTRAINT `ConviteVisitante_visitanteUserId_fkey` FOREIGN KEY (`visitanteUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileVisitante` ADD CONSTRAINT `ProfileVisitante_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
