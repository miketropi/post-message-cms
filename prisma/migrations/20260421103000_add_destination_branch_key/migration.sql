-- AlterTable
ALTER TABLE "Destination" ADD COLUMN "branchKey" TEXT;

-- CreateIndex
CREATE INDEX "Destination_workspaceId_branchKey_idx" ON "Destination"("workspaceId", "branchKey");
