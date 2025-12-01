import { AddCustomerForm } from "../AddCustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Add Customer</h1>
      <AddCustomerForm />
    </div>
  );
}
