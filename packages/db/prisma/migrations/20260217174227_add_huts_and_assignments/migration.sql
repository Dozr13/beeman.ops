-- CreateTable
CREATE TABLE "Hut" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HutAssignment" (
    "id" TEXT NOT NULL,
    "hutId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "HutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hut_code_key" ON "Hut"("code");

-- CreateIndex
CREATE INDEX "HutAssignment_hutId_endsAt_idx" ON "HutAssignment"("hutId", "endsAt");

-- CreateIndex
CREATE INDEX "HutAssignment_siteId_endsAt_idx" ON "HutAssignment"("siteId", "endsAt");

-- AddForeignKey
ALTER TABLE "HutAssignment" ADD CONSTRAINT "HutAssignment_hutId_fkey" FOREIGN KEY ("hutId") REFERENCES "Hut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HutAssignment" ADD CONSTRAINT "HutAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
