"use client";

import { createContext, startTransition, useContext, useEffect, useState } from "react";

export type SellerLanguage = "en" | "fa";

const translations = {
  en: {
    sellerCentre: "Seller Centre",
    signIn: "Sign in",
    register: "Create seller account",
    createStoreDescription: "Set up your store and start listing products right away.",
    email: "Email address",
    password: "Password",
    forgotPassword: "Forgot password?",
    sendReset: "Send reset link",
    resetSent: "If this email belongs to an account, a password reset link has been sent.",
    confirmPassword: "Confirm password",
    storeName: "Store name",
    noAccount: "New to Sino Persia?",
    noSellerStore: "Don’t have a seller store yet?",
    haveAccount: "Already have an account?",
    currentAccount: "Creating a seller store for",
    createSellerStore: "Create seller store",
    checkEmail: "Account created. Check your email to verify it, then sign in to start listing products.",
    invalidCredentials: "Email or password is incorrect.",
    sellerOnly: "This sign-in is for Seller Centre accounts.",
    backToSite: "Back to Sino Persia",
    products: "Products",
    yourProducts: "Your products",
    addProduct: "Add product",
    editProduct: "Edit product",
    emptyProducts: "No products listed yet.",
    sku: "SKU",
    category: "Category",
    nameEn: "Product name (English)",
    nameFa: "Product name (Persian)",
    descriptionEn: "Description (English)",
    descriptionFa: "Description (Persian)",
    price: "Price",
    currency: "Currency",
    stock: "Stock quantity",
    image: "Product image",
    save: "Save and publish",
    saving: "Saving...",
    cancel: "Cancel",
    delete: "Delete",
    pause: "Pause listing",
    publish: "Publish listing",
    active: "Published",
    paused: "Paused",
    signOut: "Sign out",
    productCount: "Total products",
    activeCount: "Published products",
    storeNameSaved: "Store name saved.",
    storeNameError: "Could not update the store name.",
    saveStoreName: "Save store name",
    passwordMismatch: "Passwords do not match.",
    passwordTooShort: "Use at least 8 characters for your password.",
    validImage: "Choose a valid image under 5 MB.",
    productSaved: "Product saved and published.",
    catalogue: "Catalogue",
    productListing: "Product listing",
    loadingProducts: "Loading products...",
    uploadError: "Image upload failed. Check the shop product image bucket.",
    saveError: "Could not save the product. Please try again.",
    deleteConfirm: "Delete this product? This cannot be undone.",
    language: "Language",
    store: "Store",
    profileNav: "Profile",
    productsNav: "Products",
    ordersNav: "Orders",
    settingsNav: "Settings",
    storeProfileTitle: "Store profile",
    storeProfileSubtitle: "Your store identity on Sino Persia.",
    memberSince: "Member since",
    ordersEmptyTitle: "No orders yet",
    ordersEmptyBody: "Order management for your store is coming soon. Once customers can check out on Sino Persia, their orders will appear here.",
    accountSettings: "Account settings",
    accountSettingsSubtitle: "Manage sign-in and account actions.",
    changePassword: "Change password",
    product: "Product",
    status: "Status",
    actions: "Actions",
    close: "Close",
    addProductSubtitle: "Fill in the details below to list a new product.",
    editProductSubtitle: "Update the details for this product.",
    selectCategory: "Select a category",
  },
  fa: {
    sellerCentre: "مرکز فروشندگان",
    signIn: "ورود",
    register: "ساخت حساب فروشنده",
    createStoreDescription: "فروشگاه خود را بسازید و بلافاصله محصولاتتان را ثبت کنید.",
    email: "ایمیل",
    password: "گذرواژه",
    forgotPassword: "گذرواژه را فراموش کرده‌اید؟",
    sendReset: "ارسال لینک بازیابی",
    resetSent: "اگر برای این ایمیل حسابی وجود داشته باشد، لینک بازیابی گذرواژه ارسال شده است.",
    confirmPassword: "تکرار گذرواژه",
    storeName: "نام فروشگاه",
    noAccount: "تازه به ساینو پرشیا پیوسته‌اید؟",
    noSellerStore: "هنوز فروشگاه فروشنده ندارید؟",
    haveAccount: "از قبل حساب دارید؟",
    currentAccount: "ساخت فروشگاه فروشنده برای حساب",
    createSellerStore: "ساخت فروشگاه فروشنده",
    checkEmail: "حساب ساخته شد. ایمیل خود را برای تأیید بررسی کنید، سپس برای ثبت کالا وارد شوید.",
    invalidCredentials: "ایمیل یا گذرواژه نادرست است.",
    sellerOnly: "این بخش مخصوص حساب‌های مرکز فروشندگان است.",
    backToSite: "بازگشت به ساینو پرشیا",
    products: "محصولات",
    yourProducts: "محصولات شما",
    addProduct: "افزودن محصول",
    editProduct: "ویرایش محصول",
    emptyProducts: "هنوز محصولی ثبت نشده است.",
    sku: "شناسه کالا",
    category: "دسته‌بندی",
    nameEn: "نام محصول (انگلیسی)",
    nameFa: "نام محصول (فارسی)",
    descriptionEn: "توضیحات (انگلیسی)",
    descriptionFa: "توضیحات (فارسی)",
    price: "قیمت",
    currency: "ارز",
    stock: "موجودی",
    image: "تصویر محصول",
    save: "ذخیره و انتشار",
    saving: "در حال ذخیره...",
    cancel: "انصراف",
    delete: "حذف",
    pause: "توقف انتشار",
    publish: "انتشار محصول",
    active: "منتشرشده",
    paused: "متوقف",
    signOut: "خروج",
    productCount: "کل محصولات",
    activeCount: "محصولات منتشرشده",
    storeNameSaved: "نام فروشگاه ذخیره شد.",
    storeNameError: "به‌روزرسانی نام فروشگاه انجام نشد.",
    saveStoreName: "ذخیره نام فروشگاه",
    passwordMismatch: "گذرواژه‌ها با هم مطابقت ندارند.",
    passwordTooShort: "گذرواژه باید دست‌کم ۸ نویسه باشد.",
    validImage: "تصویر باید معتبر و کمتر از ۵ مگابایت باشد.",
    productSaved: "محصول ذخیره و منتشر شد.",
    catalogue: "فهرست محصولات",
    productListing: "ثبت محصول",
    loadingProducts: "در حال بارگذاری محصولات...",
    uploadError: "بارگذاری تصویر انجام نشد. تنظیمات فضای ذخیره‌سازی را بررسی کنید.",
    saveError: "ذخیره محصول انجام نشد. دوباره تلاش کنید.",
    deleteConfirm: "این محصول حذف شود؟ این کار قابل بازگشت نیست.",
    language: "زبان",
    store: "فروشگاه",
    profileNav: "پروفایل",
    productsNav: "محصولات",
    ordersNav: "سفارش‌ها",
    settingsNav: "تنظیمات",
    storeProfileTitle: "پروفایل فروشگاه",
    storeProfileSubtitle: "هویت فروشگاه شما در ساینو پرشیا.",
    memberSince: "عضویت از",
    ordersEmptyTitle: "هنوز سفارشی ثبت نشده",
    ordersEmptyBody: "مدیریت سفارش‌های فروشگاه شما به‌زودی فعال می‌شود. پس از فعال شدن خرید مشتریان در ساینو پرشیا، سفارش‌های آن‌ها اینجا نمایش داده خواهد شد.",
    accountSettings: "تنظیمات حساب",
    accountSettingsSubtitle: "ورود و عملیات حساب کاربری خود را مدیریت کنید.",
    changePassword: "تغییر گذرواژه",
    product: "محصول",
    status: "وضعیت",
    actions: "عملیات",
    close: "بستن",
    addProductSubtitle: "اطلاعات زیر را برای ثبت محصول جدید تکمیل کنید.",
    editProductSubtitle: "اطلاعات این محصول را به‌روزرسانی کنید.",
    selectCategory: "یک دسته‌بندی انتخاب کنید",
  },
} as const;

type TranslationKey = keyof typeof translations.en;
type SellerLocaleContextValue = {
  language: SellerLanguage;
  setLanguage: (language: SellerLanguage) => void;
  t: (key: TranslationKey) => string;
};

const SellerLocaleContext = createContext<SellerLocaleContextValue | null>(null);

export function useSellerLocale() {
  const context = useContext(SellerLocaleContext);
  if (!context) throw new Error("useSellerLocale must be used inside SellerCentreShell");
  return context;
}

export default function SellerCentreShell({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<SellerLanguage>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("seller-centre-language");
    if (savedLanguage === "en" || savedLanguage === "fa") startTransition(() => setLanguage(savedLanguage));
  }, []);

  useEffect(() => {
    localStorage.setItem("seller-centre-language", language);
  }, [language]);

  const value: SellerLocaleContextValue = {
    language,
    setLanguage,
    t: (key) => translations[language][key],
  };

  return (
    <SellerLocaleContext.Provider value={value}>
      <div className="seller-app" lang={language} dir={language === "fa" ? "rtl" : "ltr"}>
        {children}
      </div>
    </SellerLocaleContext.Provider>
  );
}

export function SellerLanguageSwitch() {
  const { language, setLanguage, t } = useSellerLocale();
  return (
    <div className="seller-language-switch" role="group" aria-label={t("language")}>
      <button type="button" className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
      <button type="button" className={language === "fa" ? "active" : ""} aria-pressed={language === "fa"} onClick={() => setLanguage("fa")}>فا</button>
    </div>
  );
}