// High-level groups we support for expenses.
// These map directly to `categoryGroup` in the DB.
export const EXPENSE_CATEGORY_GROUPS = {
  FUEL: [
    "Diesel",
    "DEF",
    "Additives",
  ],
  MAINTENANCE: [
    "Tires",
    "Engine",
    "PM service",
    "Transmission",
    "Cooling system",
    "Electrical",
    "Road service",
    "Safety equipment",
    "Repairs",
    "Accident repair",
    "Body work",
    "Tow bills",
  ],
  INSURANCE: [
    "Auto liability",
    "Cargo",
    "Bobtail",
    "Physical damage",
    "General liability",
    "Workers comp",
  ],
  DRIVER: [
    "Payroll",
    "Bonuses",
    "Reimbursements",
    "Lodging",
    "Meals",
    "Hiring costs",
  ],
  EQUIPMENT: [
    "Truck lease",
    "Trailer lease",
    "Loan payment",
    "Down payment",
    "Registration",
    "Tags",
    "Title",
  ],
  COMPLIANCE: [
    "ELD fees",
    "IFTA",
    "IRP",
    "UCR",
    "DOT inspections",
    "Permits",
  ],
  BACK_OFFICE: [
    "Dispatch service",
    "Accounting",
    "Bookkeeping",
    "Software",
    "Cell phone plans",
  ],
  FINANCIAL: [
    "Factoring fees",
    "ACH fees",
    "Wire fees",
    "Reserve adjustments",
  ],
} as const;

export type ExpenseCategoryGroup = keyof typeof EXPENSE_CATEGORY_GROUPS;

export type ExpenseCategoryKey<G extends ExpenseCategoryGroup = ExpenseCategoryGroup> =
  (typeof EXPENSE_CATEGORY_GROUPS)[G][number];

// Helper to convert a label ("Diesel") into a stable key ("DIESEL").
export function toCategoryKey(label: string): string {
  return label.toUpperCase().replace(/\s+/g, "_");
}
