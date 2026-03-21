-- CreateTable
CREATE TABLE "scanned_files" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "hash" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duplicateGroupId" INTEGER,

    CONSTRAINT "scanned_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_groups" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_actions" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "targetPath" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "file_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scanned_files_path_key" ON "scanned_files"("path");

-- CreateIndex
CREATE INDEX "scanned_files_hash_idx" ON "scanned_files"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_groups_hash_key" ON "duplicate_groups"("hash");

-- AddForeignKey
ALTER TABLE "scanned_files" ADD CONSTRAINT "scanned_files_duplicateGroupId_fkey" FOREIGN KEY ("duplicateGroupId") REFERENCES "duplicate_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
