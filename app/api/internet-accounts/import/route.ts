import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/rbac";

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  const str = typeof val === "string" ? val.trim() : val.toString().trim();
  if (!str || str.toLowerCase() === "invalid date") return null;

  // 1. Try to parse DD/MM/YYYY or D/M/YYYY (e.g. 01/07/2027, 15/06/1990, 1-7-2027)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  // 2. Try to parse YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  // 3. Fallback to standard JS parsing
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const permission = await checkApiPermission(request, "internet_accounts", "create");
    if (!permission.authorized) {
      return permission.errorResponse!;
    }

    const { rows } = await request.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid payload. Expected an array of rows under 'rows'." }, { status: 400 });
    }

    // Cache active branches by name and code for fast lookup
    const branches = await prisma.branches.findMany({
      where: { status: { not: "DELETED" } },
    });

    const findBranch = (identifier: string) => {
      const cleanId = identifier.trim().toLowerCase();
      return branches.find(
        (b) =>
          b.name.toLowerCase() === cleanId ||
          (b.code && b.code.toLowerCase() === cleanId)
      );
    };

    const importResults = await prisma.$transaction(async (tx) => {
      const createdAccounts = [];
      const skippedRows = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const {
          accountType,
          branch: branchName,
          originalBranch,
          accountNumber,
          providerSource,
          shipmentNumber,
          startDate,
          contractEndDate,
          status,
          notes,
          staffName,
          staffEmiratesId,
          staffEmiratesIdExpiry,
          staffDateOfBirth,
          staffContactNumber,
        } = row;

        // Basic validations
        if (!accountNumber || !branchName || !accountType) {
          skippedRows.push({ rowIndex: i, reason: "Missing required fields (accountNumber, branch, or accountType)" });
          continue;
        }

        const cleanAccType = accountType.trim().toUpperCase();
        if (cleanAccType !== "SHOP" && cleanAccType !== "ACCOMMODATION") {
          skippedRows.push({ rowIndex: i, reason: `Invalid accountType: ${accountType}. Must be SHOP or ACCOMMODATION` });
          continue;
        }

        // Match branch
        let matchedBranch = findBranch(branchName);
        if (!matchedBranch) {
          const generatedCode = branchName.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 15);
          matchedBranch = await tx.branches.create({
            data: {
              name: branchName.trim(),
              code: generatedCode,
              status: "ACTIVE",
            },
          });
          branches.push(matchedBranch);
        }

        // Match original branch if provided
        let matchedOriginalBranch = null;
        if (originalBranch && originalBranch.trim()) {
          matchedOriginalBranch = findBranch(originalBranch);
          if (!matchedOriginalBranch) {
            const generatedCode = originalBranch.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 15);
            matchedOriginalBranch = await tx.branches.create({
              data: {
                name: originalBranch.trim(),
                code: generatedCode,
                status: "ACTIVE",
              },
            });
            branches.push(matchedOriginalBranch);
          }
        }

        // Check if account already exists
        const existing = await tx.internet_accounts.findFirst({
          where: { account_number: accountNumber.toString().trim() },
        });

        if (existing) {
          skippedRows.push({ rowIndex: i, reason: `Account number ${accountNumber} already exists` });
          continue;
        }

        // Match or create Staff (Account Holder) if name is provided
        let staffId: string | null = null;
        if (staffName && staffName.trim()) {
          const parts = staffName.trim().split(/\s+/);
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ") || "Staff";

          let staff = await tx.staff.findFirst({
            where: {
              first_name: { equals: firstName },
              last_name: { equals: lastName },
            },
          });

          if (!staff) {
            // Create staff member
            staff = await tx.staff.create({
              data: {
                first_name: firstName,
                last_name: lastName,
                branch_id: matchedBranch.id,
                emirates_id_number: staffEmiratesId ? staffEmiratesId.toString().trim() : null,
                emirates_id_expiry: parseDate(staffEmiratesIdExpiry),
                date_of_birth: parseDate(staffDateOfBirth),
                contact_number: staffContactNumber ? staffContactNumber.toString().trim() : null,
                is_active: true,
                position: "Staff",
              },
            });
          } else {
            // Update staff details if they are provided but empty in db
            const updateData: any = {};
            if (!staff.emirates_id_number && staffEmiratesId) updateData.emirates_id_number = staffEmiratesId.toString().trim();
            if (!staff.emirates_id_expiry && staffEmiratesIdExpiry && parseDate(staffEmiratesIdExpiry)) updateData.emirates_id_expiry = parseDate(staffEmiratesIdExpiry);
            if (!staff.date_of_birth && staffDateOfBirth && parseDate(staffDateOfBirth)) updateData.date_of_birth = parseDate(staffDateOfBirth);
            if (!staff.contact_number && staffContactNumber) updateData.contact_number = staffContactNumber.toString().trim();

            if (Object.keys(updateData).length > 0) {
              staff = await tx.staff.update({
                where: { id: staff.id },
                data: updateData,
              });
            }
          }
          staffId = staff.id;
        }

        // Parse state
        let finalStatus = "NEW";
        if (status) {
          const cleanStatus = status.toString().trim().toUpperCase().replace(/\s+/g, "_");
          if (["NEW", "RENEWED", "FOR_CANCELLATION", "CANCELLED"].includes(cleanStatus)) {
            finalStatus = cleanStatus;
          }
        }

        // Create the Account
        console.log(`[CSV Import Row ${i}] Creating account with:`, {
          branch_id: matchedBranch.id,
          original_branch_id: matchedOriginalBranch ? matchedOriginalBranch.id : matchedBranch.id,
          account_holder_id: staffId,
          account_type: cleanAccType,
          status: finalStatus,
          account_number: accountNumber.toString().trim(),
        });

        const newAcc = await tx.internet_accounts.create({
          data: {
            branch_id: matchedBranch.id,
            original_branch_id: matchedOriginalBranch ? matchedOriginalBranch.id : matchedBranch.id,
            account_holder_id: staffId,
            account_type: cleanAccType as any,
            status: finalStatus as any,
            provider_source: providerSource ? providerSource.toString().trim() : null,
            account_number: accountNumber.toString().trim(),
            shipment_number: shipmentNumber ? shipmentNumber.toString().trim() : null,
            start_date: parseDate(startDate),
            contract_end_date: parseDate(contractEndDate),
            notes: notes ? notes.toString().trim() : null,
          },
        });

        console.log(`[CSV Import Row ${i}] Created account result:`, newAcc);

        if (!newAcc) {
          throw new Error(`Prisma created account returned null for account number: ${accountNumber}`);
        }

        // Log initial status
        await tx.internet_account_status_logs.create({
          data: {
            internet_account_id: newAcc.id,
            status: finalStatus as any,
            notes: "Imported via CSV file",
          },
        });

        createdAccounts.push(newAcc);
      }

      return { createdCount: createdAccounts.length, skipped: skippedRows };
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importResults.createdCount} accounts.`,
      createdCount: importResults.createdCount,
      skipped: importResults.skipped,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to import internet accounts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
