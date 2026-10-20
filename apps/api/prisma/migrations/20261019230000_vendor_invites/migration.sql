-- CreateTable
CREATE TABLE "VendorInvite" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "VendorMemberRole" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvite_token_key" ON "VendorInvite"("token");

-- CreateIndex
CREATE INDEX "VendorInvite_vendorId_email_idx" ON "VendorInvite"("vendorId", "email");

-- CreateIndex
CREATE INDEX "VendorInvite_email_idx" ON "VendorInvite"("email");

-- AddForeignKey
ALTER TABLE "VendorInvite" ADD CONSTRAINT "VendorInvite_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvite" ADD CONSTRAINT "VendorInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
