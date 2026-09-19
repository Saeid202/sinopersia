"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setName(profile?.full_name || "");
      setPhone(profile?.phone || "");
      setAddress(profile?.address || "");
      setPostal(profile?.postal_code || "");
    })();
  }, [supabase]);

  async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: name, phone, address, postal_code: postal, email: user.email,
    });
    setSaving(false);
    if (error) { alert("خطا در ذخیره‌سازی: " + error.message); return; }
    alert("اطلاعات با موفقیت ذخیره شد");
  }

  return (
    <div>
      <div className="topbar">
        <div className="title"><h1>پروفایل من</h1><p>اطلاعات شخصی و آدرس شما</p></div>
      </div>
      <div className="form-card">
        <h3>اطلاعات شخصی</h3>
        <div className="form-row"><label>نام و نام خانوادگی</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-row"><label>شماره موبایل</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="form-row"><label>ایمیل</label><input type="text" value={email} disabled style={{ background: "#f1f5f9", color: "#64748b" }} /></div>
        <div className="form-row"><label>آدرس کامل</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="form-row"><label>کد پستی</label><input type="text" value={postal} onChange={(e) => setPostal(e.target.value)} /></div>
        <div className="form-actions"><button className="primary" onClick={saveProfile} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
      </div>
    </div>
  );
}
