import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "el" | "en";

const translations = {
  // Navigation
  "nav.home": { el: "Αρχική", en: "Dashboard" },
  "nav.invoices": { el: "Τιμολόγια", en: "Invoices" },
  "nav.finance": { el: "Χρήματα", en: "Finance" },
  "nav.ai": { el: "AI Ανάλυση", en: "AI Analysis" },
  "nav.alerts": { el: "Ειδοποιήσεις", en: "Alerts" },
  "nav.settings": { el: "Ρυθμίσεις", en: "Settings" },

  // Dashboard
  "dashboard.subtitle": { el: "Κέντρο ελέγχου επιχείρησης", en: "Business Control Center" },
  "dashboard.available_cash": { el: "Διαθέσιμα μετρητά", en: "Available Cash" },
  "dashboard.pending_payments": { el: "Εκκρεμείς πληρωμές", en: "Pending Payments" },
  "dashboard.profit_mtd": { el: "Κέρδος MTD", en: "Profit MTD" },
  "dashboard.overdue": { el: "Ληξιπρόθεσμα", en: "Overdue" },
  "dashboard.weekly_summary": { el: "Εβδομαδιαία σύνοψη", en: "Weekly Summary" },
  "dashboard.recent_invoices": { el: "Πρόσφατα τιμολόγια", en: "Recent Invoices" },
  "dashboard.quick_actions": { el: "Γρήγορες ενέργειες", en: "Quick Actions" },
  "dashboard.revenue": { el: "Έσοδα", en: "Revenue" },
  "dashboard.expenses": { el: "Έξοδα", en: "Expenses" },
  "dashboard.profit": { el: "Κέρδος", en: "Profit" },
  "dashboard.no_data": { el: "Δεν υπάρχουν δεδομένα", en: "No data available" },
  "dashboard.no_invoices": { el: "Δεν βρέθηκαν τιμολόγια", en: "No invoices found" },
  "dashboard.unknown_supplier": { el: "Άγνωστος προμηθευτής", en: "Unknown supplier" },

  // Quick Actions
  "quick.upload_invoice": { el: "+ Ανέβασε τιμολόγιο", en: "+ Upload Invoice" },
  "quick.add_revenue": { el: "+ Καταχώρηση εσόδων", en: "+ Add Revenue" },
  "quick.add_expense": { el: "+ Καταχώρηση εξόδων", en: "+ Add Expense" },
  "quick.cash_register": { el: "Ταμείο", en: "Cash Register" },

  // Invoices page
  "invoices.subtitle": { el: "Ανέβασμα και διαχείριση τιμολογίων", en: "Upload and manage invoices" },
  "invoices.tab_list": { el: "Τιμολόγια", en: "Invoices" },
  "invoices.tab_analytics": { el: "Αναλύσεις", en: "Analytics" },

  // Invoice statuses
  "status.approved": { el: "Εγκρίθηκε", en: "Approved" },
  "status.extracted": { el: "Εξαγωγή", en: "Extracted" },
  "status.flagged": { el: "Σημαία", en: "Flagged" },
  "status.rejected": { el: "Απορρίφθηκε", en: "Rejected" },
  "status.processing": { el: "Επεξεργασία", en: "Processing" },

  // Finance page
  "finance.subtitle": { el: "Οικονομική επισκόπηση και ταμειακές ροές", en: "Financial overview and cash flows" },
  "finance.add_revenue": { el: "Έσοδο", en: "Revenue" },
  "finance.add_expense": { el: "Έξοδο", en: "Expense" },
  "finance.cash_register": { el: "Ταμείο", en: "Cash Register" },
  "finance.cash_balance": { el: "Ταμειακό Υπόλοιπο", en: "Cash Balance" },
  "finance.vs_prev_month": { el: "vs προηγ. μήνα", en: "vs prev. month" },
  "finance.cash_on_hand": { el: "Μετρητά", en: "Cash on Hand" },
  "finance.bank": { el: "Τράπεζα", en: "Bank" },
  "finance.receivables": { el: "Εισπρακτέα", en: "Receivables" },
  "finance.receivables_desc": { el: "Εγκεκριμένα τιμολόγια προς είσπραξη", en: "Approved invoices for collection" },
  "finance.payables": { el: "Πληρωτέα", en: "Payables" },
  "finance.payables_desc": { el: "Προγραμματισμένες πληρωμές σε αναμονή", en: "Scheduled payments pending" },
  "finance.cash_flow_30d": { el: "Ταμειακή Ροή 30 Ημερών", en: "30-Day Cash Flow" },
  "finance.inflows": { el: "Εισροές", en: "Inflows" },
  "finance.outflows": { el: "Εκροές", en: "Outflows" },
  "finance.no_cash_flow": { el: "Δεν υπάρχουν δεδομένα ταμειακής ροής", en: "No cash flow data available" },
  "finance.scheduled_payments": { el: "Προγραμματισμένες Πληρωμές", en: "Scheduled Payments" },
  "finance.description": { el: "Περιγραφή", en: "Description" },
  "finance.amount": { el: "Ποσό", en: "Amount" },
  "finance.date": { el: "Ημερομηνία", en: "Date" },
  "finance.in_days": { el: "Σε", en: "In" },
  "finance.day": { el: "ημέρα", en: "day" },
  "finance.days": { el: "ημέρες", en: "days" },
  "finance.no_scheduled": { el: "Δεν υπάρχουν προγραμματισμένες πληρωμές", en: "No scheduled payments" },
  "finance.overdue_invoices": { el: "Ληξιπρόθεσμα Τιμολόγια", en: "Overdue Invoices" },
  "finance.supplier": { el: "Προμηθευτής", en: "Supplier" },
  "finance.invoice_number": { el: "Αρ. Τιμολογίου", en: "Invoice Number" },
  "finance.days_overdue": { el: "Ημέρες Καθυστέρησης", en: "Days Overdue" },
  "finance.no_overdue": { el: "Δεν υπάρχουν ληξιπρόθεσμα τιμολόγια", en: "No overdue invoices" },
  "finance.invoice_singular": { el: "τιμολόγιο", en: "invoice" },
  "finance.invoice_plural": { el: "τιμολόγια", en: "invoices" },
  "finance.payment_singular": { el: "πληρωμή", en: "payment" },
  "finance.payment_plural": { el: "πληρωμές", en: "payments" },
  "finance.pl_month": { el: "Κέρδος & Ζημία Μήνα", en: "Monthly P&L" },
  "finance.expense_breakdown": { el: "Ανάλυση Εξόδων ανά Κατηγορία", en: "Expense Breakdown by Category" },
  "finance.monthly_trends": { el: "Τάσεις Εσόδων & Εξόδων (6μηνο)", en: "Revenue & Expense Trends (6mo)" },
  "finance.no_trends": { el: "Δεν υπάρχουν δεδομένα τάσεων", en: "No trend data available" },
  "finance.no_expense_data": { el: "Δεν υπάρχουν δεδομένα εξόδων", en: "No expense data available" },
  "finance.no_pl_data": { el: "Δεν υπάρχουν δεδομένα P&L", en: "No P&L data available" },
  "finance.net_profit": { el: "Καθαρό Κέρδος", en: "Net Profit" },
  "finance.margin": { el: "Περιθώριο", en: "Margin" },

  // AI Insights
  "ai.title": { el: "AI Ανάλυση", en: "AI Analysis" },
  "ai.welcome": { el: "Γεια σας! Είμαι ο AI βοηθός σας. Μπορώ να αναλύσω τα οικονομικά σας δεδομένα, να απαντήσω ερωτήσεις για τιμολόγια, προμηθευτές, έξοδα και έσοδα. Ρωτήστε με ό,τι θέλετε!", en: "Hello! I'm your AI assistant. I can analyze your financial data, answer questions about invoices, suppliers, expenses and revenue. Ask me anything!" },
  "ai.placeholder": { el: "Ρωτήστε κάτι...", en: "Ask something..." },
  "ai.suggestion_1": { el: "Ποια είναι τα top 5 έξοδά μου;", en: "What are my top 5 expenses?" },
  "ai.suggestion_2": { el: "Πώς πάει η επιχείρηση αυτόν τον μήνα;", en: "How is the business doing this month?" },
  "ai.suggestion_3": { el: "Ποιος προμηθευτής μου κοστίζει περισσότερο;", en: "Which supplier costs me the most?" },
  "ai.suggestion_4": { el: "Υπάρχουν ληξιπρόθεσμα τιμολόγια;", en: "Are there any overdue invoices?" },
  "ai.suggestion_5": { el: "Δώσε μου μια ανάλυση εσόδων-εξόδων", en: "Give me a revenue-expense analysis" },
  "ai.suggestion_6": { el: "Τι δείχνουν οι τάσεις του τελευταίου 6μηνου;", en: "What do the last 6 months trends show?" },

  // Alerts
  "alerts.subtitle": { el: "Ενημερώσεις και σημαντικές ειδοποιήσεις", en: "Updates and important notifications" },
  "alerts.critical": { el: "Κρίσιμο", en: "Critical" },
  "alerts.high": { el: "Υψηλό", en: "High" },
  "alerts.medium": { el: "Μεσαίο", en: "Medium" },
  "alerts.low": { el: "Χαμηλό", en: "Low" },
  "alerts.all": { el: "Όλα", en: "All" },
  "alerts.unresolved": { el: "Ανεπίλυτα", en: "Unresolved" },
  "alerts.severity": { el: "Σοβαρότητα", en: "Severity" },
  "alerts.type": { el: "Τύπος", en: "Type" },
  "alerts.all_types": { el: "Όλοι", en: "All Types" },
  "alerts.all_severities": { el: "Όλες", en: "All" },
  "alerts.resolve": { el: "Επίλυση", en: "Resolve" },
  "alerts.resolved": { el: "Επιλύθηκε", en: "Resolved" },
  "alerts.no_alerts": { el: "Δεν βρέθηκαν ειδοποιήσεις", en: "No alerts found" },
  "alerts.price_increase": { el: "Αύξηση τιμής", en: "Price Increase" },
  "alerts.duplicate_invoice": { el: "Διπλότυπο", en: "Duplicate" },
  "alerts.missing_field": { el: "Ελλιπές πεδίο", en: "Missing Field" },
  "alerts.unusual_amount": { el: "Ασυνήθιστο ποσό", en: "Unusual Amount" },
  "alerts.overdue_payment": { el: "Ληξιπρόθεσμη", en: "Overdue" },
  "alerts.budget_exceeded": { el: "Υπέρβαση budget", en: "Budget Exceeded" },

  // Settings
  "settings.subtitle": { el: "Ρυθμίσεις λογαριασμού και επιχείρησης", en: "Account and business settings" },
  "settings.company_info": { el: "Στοιχεία Επιχείρησης", en: "Company Info" },
  "settings.company_name": { el: "Επωνυμία", en: "Company Name" },
  "settings.company_name_placeholder": { el: "Όνομα εταιρείας", en: "Company name" },
  "settings.afm": { el: "ΑΦΜ", en: "Tax ID" },
  "settings.email": { el: "Email", en: "Email" },
  "settings.phone": { el: "Τηλέφωνο", en: "Phone" },
  "settings.address": { el: "Διεύθυνση", en: "Address" },
  "settings.address_placeholder": { el: "Οδός, Πόλη", en: "Street, City" },
  "settings.save": { el: "Αποθήκευση", en: "Save" },
  "settings.saving": { el: "Αποθήκευση...", en: "Saving..." },
  "settings.account": { el: "Λογαριασμός", en: "Account" },
  "settings.change_password": { el: "Αλλαγή κωδικού", en: "Change Password" },
  "settings.sign_out": { el: "Αποσύνδεση", en: "Sign Out" },
  "settings.data_export": { el: "Εξαγωγή Δεδομένων", en: "Data Export" },
  "settings.invoices_csv": { el: "Τιμολόγια CSV", en: "Invoices CSV" },
  "settings.expenses_csv": { el: "Έξοδα CSV", en: "Expenses CSV" },
  "settings.revenue_csv": { el: "Έσοδα CSV", en: "Revenue CSV" },
  "settings.language": { el: "Γλώσσα", en: "Language" },

  // Auth
  "auth.login_title": { el: "Συνδεθείτε στον λογαριασμό σας", en: "Sign in to your account" },
  "auth.email": { el: "Email", en: "Email" },
  "auth.password": { el: "Κωδικός", en: "Password" },
  "auth.login_button": { el: "Σύνδεση", en: "Sign In" },
  "auth.no_account": { el: "Δεν έχετε λογαριασμό;", en: "Don't have an account?" },
  "auth.register_link": { el: "Εγγραφή", en: "Register" },
  "auth.register_title": { el: "Δημιουργήστε τον λογαριασμό σας", en: "Create your account" },
  "auth.company_name": { el: "Επωνυμία Επιχείρησης", en: "Company Name" },
  "auth.company_placeholder": { el: "Η εταιρεία σας", en: "Your company" },
  "auth.register_button": { el: "Εγγραφή", en: "Register" },
  "auth.has_account": { el: "Έχετε ήδη λογαριασμό;", en: "Already have an account?" },
  "auth.login_link": { el: "Σύνδεση", en: "Sign In" },

  // TopBar
  "topbar.my_company": { el: "Η εταιρεία μου", en: "My Company" },
  "topbar.light_theme": { el: "Φωτεινό θέμα", en: "Light Theme" },
  "topbar.dark_theme": { el: "Σκοτεινό θέμα", en: "Dark Theme" },

  // Toast messages
  "toast.error": { el: "Σφάλμα", en: "Error" },
  "toast.success": { el: "Επιτυχία", en: "Success" },
  "toast.settings_saved": { el: "Οι ρυθμίσεις αποθηκεύτηκαν", en: "Settings saved" },
  "toast.password_reset": { el: "Σύνδεσμος αλλαγής κωδικού στάλθηκε στο email σας", en: "Password reset link sent to your email" },
  "toast.export_success": { el: "Εξαγωγή", en: "Export" },
  "toast.empty_data": { el: "Κενά δεδομένα", en: "Empty Data" },
  "toast.no_records": { el: "Δεν βρέθηκαν εγγραφές", en: "No records found" },
  "toast.alert_resolved": { el: "Η ειδοποίηση επιλύθηκε", en: "Alert resolved" },
  "toast.login_error": { el: "Σφάλμα σύνδεσης", en: "Login Error" },
  "toast.register_error": { el: "Σφάλμα εγγραφής", en: "Registration Error" },
  "toast.register_success": { el: "Επιτυχής εγγραφή!", en: "Registration successful!" },
  "toast.check_email": { el: "Ελέγξτε το email σας για επιβεβαίωση.", en: "Check your email for confirmation." },
  "toast.invalid_afm": { el: "Μη έγκυρο ΑΦΜ", en: "Invalid Tax ID" },
  "toast.afm_digits": { el: "Το ΑΦΜ πρέπει να αποτελείται από 9 ψηφία.", en: "Tax ID must be 9 digits." },

  // Footer
  "footer.made_with": { el: "Made with", en: "Made with" },
} as const;

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("invoiceiq-lang");
    return (stored === "el" || stored === "en") ? stored : "el";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("invoiceiq-lang", lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.el;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
