import { db } from "@/lib/db";                                              // Prisma client to fetch customer and notes from the database.
import { AddNoteForm } from "./AddNoteForm";                                // Client component for creating new notes inline on this page.

// Props type for this dynamic route page.
interface CustomerPageProps {
  params: Promise<{ id: string }>;                                          // Turbopack dev passes params as a Promise, so we await it.
}

export default async function CustomerSummaryPage({                         // Default export for /dashboard/customers/[id].
  params,
}: CustomerPageProps) {
  const { id: customerId } = await params;                                  // Awaits params and extracts the customer ID from the route.

  const customer = await db.customer.findUnique({                           // Fetches the customer record by ID.
    where: { id: customerId },                                              // Filters by the ID from the URL.
  });

  if (!customer) {                                                          // If no customer exists with this ID...
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-red-600">
          Customer not found                                                {/* Simple error message for missing customer. */}
        </h1>
      </div>
    );
  }

  const notes = await db.callNote.findMany({                                // Fetches all call notes associated with this customer.
    where: { customerId },                                                  // Filters notes by this customer ID.
    orderBy: { createdAt: "desc" },                                         // Orders notes newest-first for timeline-style display.
  });

  return (
    <div className="p-6 space-y-8">                                        {/* Outer container for the whole page with padding and vertical spacing. */}
      {/* ============================= */}
      {/* Customer Header */}
      {/* ============================= */}
      <div>
        <h1 className="text-3xl font-semibold">{customer.name}</h1>        {/* Main customer name heading. */}
        <p className="text-gray-600">{customer.type ?? "Customer"}</p>     {/* Shows customer type or a generic label. */}
      </div>

      {/* ============================= */}
      {/* Contact Info Section */}
      {/* ============================= */}
      <section className="space-y-2">                                      {/* Contact info block with small vertical spacing. */}
        <p>
          <strong>Email:</strong> {customer.email ?? "N/A"}                {/* Displays email or N/A if not present. */}
        </p>
        <p>
          <strong>Phone:</strong> {customer.phone ?? "N/A"}                {/* Displays phone or N/A. */}
        </p>
        <p>
          <strong>MC Number:</strong> {customer.mcNumber ?? "N/A"}         {/* Displays MC number or N/A. */}
        </p>
        <p>
          <strong>Notes:</strong> {customer.notes ?? "No notes yet."}      {/* General customer notes or a placeholder message. */}
        </p>
      </section>

      {/* ============================= */}
      {/* Call Notes Header + New Note */}
      {/* ============================= */}
      <section className="space-y-3">                                      {/* Wraps the header row and the notes list together. */}
        <div className="flex items-center justify-between">               {/* Flex row so heading is on the left and button/form on the right. */}
          <h2 className="text-2xl font-semibold">Call Notes</h2>          {/* Section title for the notes area. */}
          <AddNoteForm customerId={customerId} />                         {/* Renders button + toggleable note form on the right side. */}
        </div>

        {/* ============================= */}
        {/* Notes List */}
        {/* ============================= */}
        {notes.length === 0 ? (                                            // If no notes exist yet...
          <p className="text-gray-500">No call notes added yet.</p>        // Show a simple empty state message.
        ) : (
          <ul className="space-y-3">                                      {/* Unordered list for notes with spacing between each item. */}
            {notes.map((note) => (                                        // Loop over the notes array and render each one.
              <li
                key={note.id}                                             // Unique key for React diffing.
                className="border rounded-lg p-3 bg-white shadow-sm"      // Styles each note like a small card.
              >
                <div className="text-sm text-gray-500">
                  {new Date(note.createdAt).toLocaleString()}             {/* Shows the timestamp when the note was created. */}
                </div>
                <div className="mt-1 text-sm whitespace-pre-wrap">
                  {note.content}                                          {/* Renders the actual text content of the call note. */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
