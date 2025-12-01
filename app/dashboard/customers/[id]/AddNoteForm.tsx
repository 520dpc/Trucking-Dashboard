"use client";                                                                // Marks this as a Client Component so we can use hooks and handle form events.

import { FormEvent, useState } from "react";                                 // Imports React hooks and types for managing form state and submission.
import { useRouter } from "next/navigation";                                 // Imports Next.js router so we can refresh the server component after submit.

type AddNoteFormProps = {                                                    // Defines the props for this component.
  customerId: string;                                                        // ID of the customer this note will be attached to.
};

export function AddNoteForm({ customerId }: AddNoteFormProps) {              // Declares and exports the AddNoteForm component.
  const router = useRouter();                                                // Gets Next.js router instance for triggering a refresh.

  const [isOpen, setIsOpen] = useState(false);                               // Tracks whether the note form is currently visible.
  const [content, setContent] = useState("");                                // Holds the note text entered by the user.
  const [isSubmitting, setIsSubmitting] = useState(false);                   // Tracks whether a submission is in progress to show loading state.
  const [error, setError] = useState<string | null>(null);                   // Stores any error message from the API.

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {               // Handles the form submit event.
    e.preventDefault();                                                      // Prevents full page reload when submitting the form.
    setError(null);                                                          // Clears any previous error.
    setIsSubmitting(true);                                                   // Enables loading state.

    try {                                                                    // Wrap the network request in try/catch for error handling.
      const res = await fetch(`/api/customers/${customerId}/notes`, {        // Calls the API route to create a new note for this customer.
        method: "POST",                                                      // Uses POST since we are creating a new note.
        headers: { "Content-Type": "application/json" },                     // Tells the server the body is JSON.
        body: JSON.stringify({ content }),                                   // Sends the note content as JSON in the request body.
      });

      if (!res.ok) {                                                         // If the response status is not 2xx...
        const data = await res.json().catch(() => null);                     // Try to parse the JSON error payload (if any).
        const message = data?.error ?? "Failed to create note";              // Use server error message or a fallback.
        throw new Error(message);                                            // Throw an error so it’s caught by the catch block.
      }

      setContent("");                                                        // Clear the textarea after a successful submit.
      setIsOpen(false);                                                      // Close the form again.
      router.refresh();                                                      // Ask Next.js to re-run the server component so the notes list updates.
    } catch (err: any) {                                                     // If network or server error occurs...
      console.error("[ADD_NOTE_ERROR]", err);                                // Log it in the browser console for debugging.
      setError(err.message ?? "Something went wrong");                       // Show a friendly error message in the UI.
    } finally {                                                              // Runs whether the request succeeded or failed.
      setIsSubmitting(false);                                                // Turn off loading state.
    }
  }

  return (                                                                   // Returns JSX for the button + optional form.
    <div className="flex flex-col items-end gap-2">                         {/* Wraps button and form, aligned to the right side of the header row. */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}                          // Toggles the form open/closed when the button is clicked.
        className="px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isOpen ? "Cancel" : "+ New Note"}                                  {/* Shows "+ New Note" when closed, "Cancel" when open. */}
      </button>

      {isOpen && (                                                          // Only render the form when isOpen is true.
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-2 mt-2"                         // Limit width on large screens, add spacing.
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}                    // Updates content state whenever the user types.
            rows={3}
            className="w-full border rounded-md px-2 py-1 text-sm"
            placeholder="Call notes, follow-ups, agreements, issues, etc."  // Helps user know what to write.
            required                                                        // Prevents submitting an empty note.
          />
          {error && (                                                       // If an error exists, display it below the textarea.
            <p className="text-xs text-red-600">{error}</p>                 // Error message styled in small red text.
          )}
          <button
            type="submit"
            disabled={isSubmitting}                                         // Disable submit button while the request is in flight.
            className="px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Note"}                      {/* Shows loading label while submitting, otherwise normal label. */}
          </button>
        </form>
      )}
    </div>
  );
}
