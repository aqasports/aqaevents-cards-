"use client";

type ResultBannerProps = {
  status: "SUCCESS" | "DUPLICATE" | "NOT_REDEEMED" | "INVALID_CARD" | null;
  clientName?: string;
  activityName?: string;
  timestamp?: string;
  errorMessage?: string;
};

export default function ResultBanner({
  status,
  clientName,
  activityName,
  timestamp,
  errorMessage,
}: ResultBannerProps) {
  if (!status) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center select-none">
        <svg className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 4v1m-6-8H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">Ready to scan</p>
        <p className="text-xs text-slate-400">Position the client's QR code in front of the camera.</p>
      </div>
    );
  }

  const configs = {
    SUCCESS: {
      bg: "bg-green-50 border-green-200 shadow-green-100",
      titleColor: "text-green-800",
      textColor: "text-green-600",
      title: "Check-in Successful",
      icon: (
        <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto shadow-md">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
    },
    DUPLICATE: {
      bg: "bg-amber-50 border-amber-200 shadow-amber-100",
      titleColor: "text-amber-800",
      textColor: "text-amber-600",
      title: "Already Checked In",
      icon: (
        <div className="h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
    },
    NOT_REDEEMED: {
      bg: "bg-red-50 border-red-200 shadow-red-100",
      titleColor: "text-red-800",
      textColor: "text-red-600",
      title: "Not Redeemed",
      icon: (
        <div className="h-12 w-12 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto shadow-md">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
    },
    INVALID_CARD: {
      bg: "bg-red-50 border-red-200 shadow-red-100",
      titleColor: "text-red-800",
      textColor: "text-red-600",
      title: "Card Unrecognized",
      icon: (
        <div className="h-12 w-12 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto shadow-md">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      ),
    },
  };

  const config = configs[status];

  return (
    <div className={`rounded-2xl border p-5 text-center shadow-lg animate-fade-in ${config.bg}`}>
      <div className="mb-3">{config.icon}</div>
      <h4 className={`text-lg font-bold mb-1 ${config.titleColor}`}>{config.title}</h4>
      
      {clientName && (
        <p className={`text-sm font-semibold mb-0.5 text-slate-800`}>{clientName}</p>
      )}

      {activityName && status === "SUCCESS" && (
        <p className={`text-xs ${config.textColor}`}>Checked in for {activityName}</p>
      )}

      {timestamp && (
        <p className={`text-xs mt-2 tabular-nums text-slate-500`}>
          {status === "DUPLICATE" ? "First scan at " : "Scanned at "}
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      )}

      {errorMessage && (
        <p className={`text-xs mt-1 ${config.textColor}`}>{errorMessage}</p>
      )}
    </div>
  );
}
