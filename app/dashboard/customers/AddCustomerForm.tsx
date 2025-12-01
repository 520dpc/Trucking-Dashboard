"use client";                                                                // Marks this component as a Client Component so we can use React hooks.

import { FormEvent, useState } from "react";                                 // Imports React's FormEvent type and useState for managing local form state.
import { useRouter } from "next/navigation";                                 // Imports Next.js router hook so we can refresh the page after submitting the form.

export function AddCustomerForm() {                                          // Declares and exports the AddCustomerForm component.
  const router = useRouter();                                                // Gets a router instance used to trigger a re-render of the server component.

  const [name, setName] = useState("");                                      // Tracks the customer name input field.
  const [type, setType] = useState("");                                      // Tracks the type (e.g., BROKER, SHIPPER) input field.
  const [mcNumber, setMcNumber] = useState("");                              // Tracks the MC number input field.
  const [email, setEmail] = useState("");                                    // Tracks the email input field.
  const [phone, setPhone] = useState("");                                    // Tracks the phone input field.
  const [notes, setNotes] = useState("");                                    // Tracks the general notes textarea.

  const [isSubmitting, setIsSubmitting] = useState(false);                   // Tracks whether a form submission is currently in progress.
  const [error, setError] = useState<string | null>(null);                   // Holds any error message to display to the user.

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {               // Handles the form submit event when the user clicks "Add Customer".
    e.preventDefault();                                                      // Prevents the default browser form submission behavior (page reload).
    setError(null);                                                          // Clears any previous error message.
    setIsSubmitting(true);                                                   // Sets loading state to true so we can disable the button and show feedback.

    try {                                                                    // Wrap the network call in a try/catch to handle failures cleanly.
      const res = await fetch("/api/customers", {                            // Sends a POST request to our customers API route.
        method: "POST",                                                      // Uses POST because we are creating a new customer.
        headers: { "Content-Type": "application/json" },                     // Tells the server we are sending JSON in the request body.
        body: JSON.stringify({                                               // Serializes the form state into a JSON payload.
          name,
          type: type || null,                                                // Sends null for optional fields if the input is empty.
          mcNumber: mcNumber || null,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {                                                         // Checks if the response status is not in the 2xx range.
        const data = await res.json().catch(() => null);                     // Tries to parse the JSON error response from the server.
        const message = data?.error ?? "Failed to create customer";          // Uses the server error message if present, otherwise a default.
        throw new Error(message);                                            // Throws an error so it will be caught by the catch block.
      }

      setName("");                                                           // Clears the name field after a successful creation.
      setType("");                                                           // Clears the type field.
      setMcNumber("");                                                       // Clears the MC number field.
      setEmail("");                                                          // Clears the email field.
      setPhone("");                                                          // Clears the phone field.
      setNotes("");                                                          // Clears the notes field.

      router.refresh();                                                      // Asks Next.js to re-render the server component so the new customer appears in the list.
    } catch (err: any) {                                                     // Catches any error thrown during fetch or JSON parsing.
      console.error("[ADD_CUSTOMER_ERROR]", err);                            // Logs the error on the client console for debugging.
      setError(err.message ?? "Something went wrong");                       // Sets a human-readable error message for the UI.
    } finally {                                                              // This block runs regardless of success or failure.
      setIsSubmitting(false);                                                // Ends the loading state so the button is usable again.
    }
  }

  return (                                                                   // Returns the JSX that renders the Add Customer form.
    <form onSubmit={handleSubmit} className="space-y-3 mb-6">               {/* Form wrapper with vertical spacing and margin below it. */}
      <h2 className="text-lg font-semibold">Add Customer</h2>               {/* Form title so the user knows this section creates customers. */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">               {/* Responsive grid: one column on mobile, two on medium+ screens. */}
        <div className="flex flex-col gap-1">                               {/* Column for the Name input. */}
          <label className="text-sm font-medium">Name</label>              {/* Label for the Name field. */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}                       // Updates the name state when the user types.
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="Acme Logistics"
            required                                                        // Name is required because customers must have a name.
          />
        </div>

        <div className="flex flex-col gap-1">                               {/* Column for the Type input. */}
          <label className="text-sm font-medium">Type</label>              {/* Label for the Type field. */}
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}                       // Updates the type state when the user types.
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="BROKER or SHIPPER"
          />
        </div>

        <div className="flex flex-col gap-1">                               {/* Column for the MC Number input. */}
          <label className="text-sm font-medium">MC Number</label>         {/* Label for the MC number field. */}
          <input
            type="text"
            value={mcNumber}
            onChange={(e) => setMcNumber(e.target.value)}                   // Updates the mcNumber state.
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="123456"
          />
        </div>

        <div className="flex flex-col gap-1">                               {/* Column for the Email input. */}
          <label className="text-sm font-medium">Email</label>             {/* Label for the email field. */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}                      // Updates the email state.
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="dispatch@acme.com"
          />
        </div>

        <div className="flex flex-col gap-1">                               {/* Column for the Phone input. */}
          <label className="text-sm font-medium">Phone</label>             {/* Label for the phone field. */}
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}                      // Updates the phone state.
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="555-123-4567"
          />
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">                 {/* Full-width row for the Notes textarea. */}
          <label className="text-sm font-medium">Notes</label>             {/* Label for the notes field. */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}                      // Updates the notes state.
            rows={3}
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="Any special terms, preferences, or notes about this customer."
          />
        </div>
      </div>

      {error && (                                                           // Conditionally renders an error message if one exists.
        <p className="text-sm text-red-600">{error}</p>                     // Displays the error text in red under the form.
      )}

      <button
        type="submit"
        disabled={isSubmitting}                                             // Disables the button while submitting to avoid duplicate requests.
        className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Add Customer"}                       {/* Shows a loading label while submitting, otherwise normal label. */}
      </button>
    </form>
  );
}
