"use client";

import { clearSessionDataKey } from "@/lib/crypto";

export function LogoutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="text-xs text-slate-500 hover:text-slate-700"
        onClick={() => clearSessionDataKey()}
      >
        Déconnexion
      </button>
    </form>
  );
}
