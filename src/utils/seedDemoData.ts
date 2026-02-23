import { supabase } from "@/lib/supabase";

/**
 * Seeds demo data into revenue_entries and expense_entries for the given company.
 * Uses the authenticated user's session so RLS policies are respected.
 */
export async function seedDemoData(companyId: string): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  // Helper: random date within a month (year, month 0-based)
  const rndDate = (y: number, m: number) => {
    const maxDay = new Date(y, m + 1, 0).getDate();
    const day = Math.floor(Math.random() * maxDay) + 1;
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Revenue entries: current month + previous 5 months
  const revenueRows: Array<{ company_id: string; amount: number; description: string; entry_date: string }> = [];
  const expenseRows: Array<{ company_id: string; amount: number; description: string; entry_date: string }> = [];

  const revenueDescs = [
    "Web Development Project", "Consulting Services", "Monthly Subscription",
    "Product Sales", "Maintenance Contract", "Logo Design", "SEO Services",
    "Training Workshop", "Support Retainer", "E-commerce Commission",
  ];
  const expenseDescs = [
    "Office Rent", "Cloud Hosting (AWS)", "Software Licenses", "Internet & Phone",
    "Office Supplies", "Marketing Ads", "Insurance", "Accountant Fees",
    "Travel Expenses", "Equipment Purchase",
  ];

  for (let offset = 0; offset < 6; offset++) {
    const mDate = new Date(year, month - offset, 1);
    const my = mDate.getFullYear();
    const mm = mDate.getMonth();

    // 5-8 revenue entries per month
    const revCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < revCount; i++) {
      revenueRows.push({
        company_id: companyId,
        amount: Math.round((500 + Math.random() * 4500) * 100) / 100,
        description: revenueDescs[Math.floor(Math.random() * revenueDescs.length)],
        entry_date: rndDate(my, mm),
      });
    }

    // 4-7 expense entries per month
    const expCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < expCount; i++) {
      expenseRows.push({
        company_id: companyId,
        amount: Math.round((200 + Math.random() * 2000) * 100) / 100,
        description: expenseDescs[Math.floor(Math.random() * expenseDescs.length)],
        entry_date: rndDate(my, mm),
      });
    }
  }

  try {
    const [revResult, expResult] = await Promise.all([
      supabase.from("revenue_entries").insert(revenueRows),
      supabase.from("expense_entries").insert(expenseRows),
    ]);

    const errors: string[] = [];
    if (revResult.error) {
      console.error("[Seed] Revenue insert error:", revResult.error);
      errors.push(`Revenue: ${revResult.error.message}`);
    }
    if (expResult.error) {
      console.error("[Seed] Expense insert error:", expResult.error);
      errors.push(`Expenses: ${expResult.error.message}`);
    }

    if (errors.length > 0) {
      return { success: false, message: errors.join("; ") };
    }

    return {
      success: true,
      message: `Inserted ${revenueRows.length} revenue entries and ${expenseRows.length} expense entries across 6 months.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Seed] Unexpected error:", err);
    return { success: false, message: msg };
  }
}
