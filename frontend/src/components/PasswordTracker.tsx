import React from "react";

interface PasswordTrackerProps {
  password: string;
}

const requirements = [
  {
    label: "At least 8 characters",
    test: (pw: string) => pw.length >= 8,
  },
  {
    label: "At least one uppercase letter",
    test: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one lowercase letter",
    test: (pw: string) => /[a-z]/.test(pw),
  },
  {
    label: "At least one number",
    test: (pw: string) => /\d/.test(pw),
  },
  {
    label: "At least one special character",
    test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(pw),
  },
];

export const PasswordTracker: React.FC<PasswordTrackerProps> = ({ password }) => {
  return (
    <div className="mt-2 text-xs text-white/80">
      <div className="mb-1 font-semibold">Password requirements:</div>
      <ul className="space-y-1">
        {requirements.map((req, idx) => (
          <li key={idx} className={req.test(password) ? "text-green-400" : "text-red-300"}>
            {req.test(password) ? "✓" : "✗"} {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
