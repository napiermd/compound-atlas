-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tempUnit" TEXT DEFAULT 'F',
ADD COLUMN     "weightUnit" TEXT DEFAULT 'lbs';

-- CreateTable
CREATE TABLE "StackUpvote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StackUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StackUpvote_userId_stackId_key" ON "StackUpvote"("userId", "stackId");

-- AddForeignKey
ALTER TABLE "StackUpvote" ADD CONSTRAINT "StackUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StackUpvote" ADD CONSTRAINT "StackUpvote_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
