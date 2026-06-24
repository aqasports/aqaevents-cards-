export default function EventCardNotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0c1a2e 0%, #0c2a4a 50%, #0a3a6e 100%)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center text-white/50">
          <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Card not found</h1>
        <p className="mt-3 text-sm text-white/60">
          This QR code is invalid or the card has been replaced. Please contact
          your AQA Sports instructor for a replacement card.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
          <span className="text-xs font-semibold text-white/60">aqasports.com</span>
        </div>
      </div>
    </div>
  );
}
