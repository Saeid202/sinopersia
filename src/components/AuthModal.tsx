"use client";

import { useEffect, useRef } from "react";
import AuthCard from "@/components/AuthCard";

type AuthModalProps = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-label="ورود یا ثبت‌نام"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="auth-dialog-panel">
        <button type="button" className="auth-dialog-close" aria-label="بستن" onClick={onClose}>×</button>
        <AuthCard onClose={onClose} />
      </div>
    </dialog>
  );
}
