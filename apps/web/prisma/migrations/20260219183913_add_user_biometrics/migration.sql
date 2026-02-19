-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "heightFt" INTEGER,
ADD COLUMN     "heightIn" INTEGER,
ADD COLUMN     "sex" "BiologicalSex",
ADD COLUMN     "weightLbs" DOUBLE PRECISION;
