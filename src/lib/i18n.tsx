"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Locale = "en" | "fr" | "ar";

const dictionaries = {
  en: {
    nav: {
      dashboard: "Dashboard",
      clients: "Clients",
      packages: "Packages",
      activities: "Activities",
      redeem: "Redeem",
      invoices: "Invoices",
      reports: "Reports",
      print: "Print QR",
      staff: "Staff",
      settings: "Settings",
      signOut: "Sign out",
    },
    dashboard: {
      title: "Dashboard",
      description: "Overview of event cards, balances, and redemptions.",
      totalClients: "Total clients",
      activeCards: "Active cards",
      redemptionsToday: "Redemptions today",
      creditsRemaining: "Credits remaining",
      lowBalanceAlert: "Low balance alert: {names} have 1 or fewer credits remaining.",
      recentRedemptions: "Recent redemptions",
      viewAll: "View all →",
      quickActions: "Quick actions",
      newClientDesc: "Create & issue card",
      redeemDesc: "POS mode for events",
      printDesc: "Export for printer",
      addActivityDesc: "Manage sessions",
      newClientBtn: "+ New client",
      sold: "sold",
      used: "used",
      addCredits: "Add credits →",
      noRedemptions: "No redemptions yet. Use the Redeem page at events.",
      actionNewClient: "New client",
      actionRedeem: "Redeem activity",
      actionPrint: "Print QR cards",
      actionAddActivity: "Add activity",
    },
    redeem: {
      title: "Redeem activity",
      description: "Scan a card QR code or enter the card code to redeem an activity at an event.",
      searchPlaceholder: "Client name, Card code (AQA-123456) or paste QR URL",
      scanQr: "Scan QR",
      scanInstruction: "Point your camera at a card QR code to instantly pull up client details.",
      creditsAvailable: "credits available",
      redeemBtn: "Deduct 1 Credit",
      loading: "Processing…",
      selectClientPrompt: "Please select a client to check balance",
      clientFound: "Client found",
      goodToGo: "Good to go!",
      noCredits: "No credits remaining — top up required!",
      cardDetails: "Card Details",
      balance: "Current Balance",
      notesLabel: "Notes (optional)",
      notesPlaceholder: "Any relevant notes…",
      confirmDeduct: "Deduct credit and record redemption?",
      findClientCard: "Find client card",
      findBtn: "Find",
      searchHint: "Search by typing client's full/partial name, scanning their QR, or typing their card code.",
      noActiveCard: "No active card",
      noCreditsLeft: "No credits left",
      oneCreditRemaining: "1 credit remaining",
      creditsRemaining: "{count} credits remaining",
      cannotRedeem: "Cannot redeem — top up first",
      runningLow: "Running low",
      readyToRedeem: "Ready to redeem",
      selectActivity: "Select activity…",
      noSpecificSession: "No specific session",
      sessionLabel: "Session (optional)",
      activityLabel: "Activity",
      insufficientBalance: "Insufficient balance",
      confirmRedemption: "Confirm redemption",
      multipleMatchesTitle: "Multiple clients found ({count})",
      selectBtn: "Select",
      successRedeem: "Redeemed successfully! New balance: {balance} credit{s}",
      clientNoCreditsAlert: "This client has no remaining credits.",
      noCardScannedTitle: "No card scanned yet",
      noCardScannedDesc: "Enter a card code or scan a QR code to find the client.",
    },
    print: {
      title: "Print QR Cards",
      description: "Pre-generate blank QR batches for the print agency, or reprint assigned client cards.",
      qrSize: "QR Code Size",
      sizeMm: "Size in Millimeters (mm)",
      limitHelp: "27–211 mm size range. Renders a {px} px image for printing.",
      applySize: "Apply Size",
      generateBatchTitle: "Batch Generator",
      generateBatchDesc: "Creates blank QR cards in the database with sequential IDs (AQA-000001, AQA-000002…). When you hand a card to a client, link it by entering its code when creating their account.",
      cardsCountLabel: "Number of cards to generate",
      customLabel: "Custom:",
      generateBtn: "Generate {count} Blank QR Cards",
      exportPdfBtn: "Export PDF",
      csvManifestBtn: "CSV manifest",
      printSheetsBtn: "Print card sheets",
      selectAll: "Select all",
      selectNone: "None",
      blankBatchTab: "Generate Blank Batch",
      clientCardsTab: "Client Cards",
      workflowTitle: "Workflow",
      workflowStep1: "Set QR sticker size in mm (e.g. 38 mm)",
      workflowStep2: "Generate a batch of blank cards",
      workflowStep3: "Select cards and click 'Export PDF' to get a print-ready sticker sheet",
      workflowStep4: "Send PDF to print agency for printing on sticker paper",
      workflowStep5: "Apply stickers to the cards. When issuing to a client, link their profile to the sticker code.",
      tabBlankDesc: "Create QR codes for print agency",
      tabClientDesc: "Reprint assigned client cards",
      labelPrePrinted: "Pre-printed",
      labelEventCard: "Event Card",
      unassigned: "— Unassigned —",
      scanToCheck: "Scan to check balance",
      refreshTitle: "Refresh",
      reloadClientCards: "Reload client cards",
      loading: "Loading…",
      selectionTitle: "Selection",
      selectedCount: "{count} of {total} selected",
      emptyBatchTitle: "No batch generated yet",
      emptyBatchDesc: "Set your batch size and click Generate to create blank QR cards.",
      emptyClientsTitle: "No client cards found",
      emptyClientsDesc: "Create clients and issue cards first.",
      generatingCards: "Generating {count} QR cards…",
      generatingCardsBtn: "Generating {count} cards…",
      selectOneCardFirst: "Select at least one card first.",
      successExportPdf: "PDF sticker sheet exported successfully.",
      failedExportPdf: "Failed to generate PDF.",
      successBatchGen: "Generated {count} blank QR cards ({start} → {end}). Send to print agency.",
      networkError: "Network error generating batch.",
    },
    publicCard: {
      title: "Outdoor Activities Card",
      subtitle: "Remaining balance",
      remaining: "activities remaining",
      oneRemaining: "activity remaining",
      activityHistory: "Activity history",
      creditsPurchased: "Credits purchased",
      usedProgress: "Usage progress",
      scanToCheck: "Scan QR to check balance",
      goodToGo: "Good to go!",
      lowCredits: "Running low — contact your instructor",
      noCredits: "No activities remaining",
      tapToFlip: "Tap card to show QR code for instructors to scan",
      noActivitiesYet: "No activities yet",
      noActivitiesYetDesc: "Your adventure history will appear here after your first session!",
      used: "used",
      purchaseNewPackage: "purchase new package",
      paidCredits: "Paid",
      bonusCredits: "Free",
      totalCredits: "Total",
      freeSuffix: "free",
    },
  },
  fr: {
    nav: {
      dashboard: "Tableau de bord",
      clients: "Clients",
      packages: "Forfaits",
      activities: "Activités",
      redeem: "Valider",
      invoices: "Factures",
      reports: "Rapports",
      print: "Imprimer QR",
      staff: "Personnel",
      settings: "Paramètres",
      signOut: "Se déconnecter",
    },
    dashboard: {
      title: "Tableau de bord",
      description: "Aperçu des cartes d'activité, des soldes et des utilisations.",
      totalClients: "Total clients",
      activeCards: "Cartes actives",
      redemptionsToday: "Utilisations aujourd'hui",
      creditsRemaining: "Crédits restants",
      lowBalanceAlert: "Alerte solde bas : {names} ont 1 crédit ou moins restants.",
      recentRedemptions: "Utilisations récentes",
      viewAll: "Voir tout →",
      quickActions: "Actions rapides",
      newClientDesc: "Créer & attribuer carte",
      redeemDesc: "Mode caisse pour événements",
      printDesc: "Exporter pour l'imprimeur",
      addActivityDesc: "Gérer les sessions",
      newClientBtn: "+ Nouveau client",
      sold: "vendus",
      used: "utilisés",
      addCredits: "Ajouter des crédits →",
      noRedemptions: "Aucune utilisation pour le moment. Utilisez la page Valider lors des événements.",
      actionNewClient: "Nouveau client",
      actionRedeem: "Valider activité",
      actionPrint: "Imprimer cartes QR",
      actionAddActivity: "Ajouter activité",
    },
    redeem: {
      title: "Valider une Activité",
      description: "Scannez le code QR d'une carte ou saisissez le code pour valider une activité lors d'un événement.",
      searchPlaceholder: "Nom du client, code de carte (AQA-123456) ou coller l'URL du QR",
      scanQr: "Scanner le QR",
      scanInstruction: "Pointez votre caméra vers le code QR de la carte pour afficher instantanément les détails.",
      creditsAvailable: "crédits disponibles",
      redeemBtn: "Déduire 1 Crédit",
      loading: "Traitement en cours…",
      selectClientPrompt: "Veuillez sélectionner un client pour vérifier le solde",
      clientFound: "Client trouvé",
      goodToGo: "Prêt à partir !",
      noCredits: "Plus de crédits restants — rechargement requis !",
      cardDetails: "Détails de la Carte",
      balance: "Solde Actuel",
      notesLabel: "Notes (optionnel)",
      notesPlaceholder: "Toutes notes pertinentes…",
      confirmDeduct: "Déduire le crédit et enregistrer l'utilisation ?",
      findClientCard: "Trouver la carte client",
      findBtn: "Rechercher",
      searchHint: "Recherchez en tapant le nom complet/partiel du client, en scannant son QR ou en tapant son code de carte.",
      noActiveCard: "Aucune carte active",
      noCreditsLeft: "Plus de crédits restants",
      oneCreditRemaining: "1 crédit restant",
      creditsRemaining: "{count} crédits restants",
      cannotRedeem: "Impossible de valider — rechargez d'abord",
      runningLow: "Solde bas",
      readyToRedeem: "Prêt à valider",
      selectActivity: "Sélectionner une activité…",
      noSpecificSession: "Aucune session spécifique",
      sessionLabel: "Session (optionnel)",
      activityLabel: "Activité",
      insufficientBalance: "Solde insuffisant",
      confirmRedemption: "Confirmer la validation",
      multipleMatchesTitle: "Plusieurs clients trouvés ({count})",
      selectBtn: "Sélectionner",
      successRedeem: "Validation réussie ! Nouveau solde : {balance} crédit{s}",
      clientNoCreditsAlert: "Ce client n'a plus de crédits restants.",
      noCardScannedTitle: "Aucune carte scannée pour le moment",
      noCardScannedDesc: "Saisissez un code de carte ou scannez un code QR pour trouver le client.",
    },
    print: {
      title: "Imprimer les Cartes QR",
      description: "Pré-générez des lots de QR vierges pour l'imprimeur, ou réimprimez des cartes clients attribuées.",
      qrSize: "Taille du code QR",
      sizeMm: "Taille en millimètres (mm)",
      limitHelp: "Plage de 27 à 211 mm. Génère une image de {px} px pour l'impression.",
      applySize: "Appliquer la taille",
      generateBatchTitle: "Générateur de lot",
      generateBatchDesc: "Crée des cartes QR vierges dans la base de données avec des codes séquentiels (AQA-000001, AQA-000002…). Lorsque vous donnez une carte à un client, liez-la en saisissant son code lors de la création de son compte.",
      cardsCountLabel: "Nombre de cartes à générer",
      customLabel: "Personnalisé :",
      generateBtn: "Générer {count} cartes QR vierges",
      exportPdfBtn: "Exporter en PDF",
      csvManifestBtn: "Manifeste CSV",
      printSheetsBtn: "Imprimer les planches",
      selectAll: "Tout sélectionner",
      selectNone: "Aucun",
      blankBatchTab: "Générer lot vierge",
      clientCardsTab: "Cartes Clients",
      workflowTitle: "Flux de travail",
      workflowStep1: "Définir la taille du sticker QR en mm (ex: 38 mm)",
      workflowStep2: "Générer un lot de cartes vierges",
      workflowStep3: "Sélectionner les cartes et cliquer sur 'Exporter en PDF' pour obtenir une planche d'autocollants prête à imprimer",
      workflowStep4: "Envoyer le PDF à l'imprimeur pour impression sur papier autocollant",
      workflowStep5: "Appliquer les autocollants sur les cartes. Lors de l'attribution à un client, liez son profil au code de l'autocollant.",
      tabBlankDesc: "Créer des codes QR pour l'imprimeur",
      tabClientDesc: "Réimprimer les cartes clients attribuées",
      labelPrePrinted: "Pré-imprimé",
      labelEventCard: "Carte d'événement",
      unassigned: "— Non attribué —",
      scanToCheck: "Scanner pour voir le solde",
      refreshTitle: "Actualiser",
      reloadClientCards: "Recharger les cartes clients",
      loading: "Chargement…",
      selectionTitle: "Sélection",
      selectedCount: "{count} sur {total} sélectionné(s)",
      emptyBatchTitle: "Aucun lot généré pour le moment",
      emptyBatchDesc: "Définissez la taille de votre lot et cliquez sur Générer pour créer des cartes QR vierges.",
      emptyClientsTitle: "Aucune carte client trouvée",
      emptyClientsDesc: "Créez d'abord des clients et attribuez des cartes.",
      generatingCards: "Génération de {count} cartes QR…",
      generatingCardsBtn: "Génération de {count} cartes…",
      selectOneCardFirst: "Sélectionnez au moins une carte d'abord.",
      successExportPdf: "Planche d'autocollants PDF exportée avec succès.",
      failedExportPdf: "Échec de la génération du PDF.",
      successBatchGen: "{count} cartes QR vierges générées ({start} → {end}). Envoyez-les à l'imprimeur.",
      networkError: "Erreur réseau lors de la génération du lot.",
    },
    publicCard: {
      title: "Carte d'activités de plein air",
      subtitle: "Solde restant",
      remaining: "activités restantes",
      oneRemaining: "activité restante",
      activityHistory: "Historique des activités",
      creditsPurchased: "Crédits achetés",
      usedProgress: "Progression d'utilisation",
      scanToCheck: "Scanner le QR pour voir le solde",
      goodToGo: "Actif · Prêt !",
      lowCredits: "Solde bas — contactez votre moniteur",
      noCredits: "Aucune activité restante",
      tapToFlip: "Touchez la carte pour afficher le QR code pour les moniteurs",
      noActivitiesYet: "Aucune activité pour le moment",
      noActivitiesYetDesc: "L'historique de vos aventures s'affichera ici après votre première séance !",
      used: "utilisé",
      purchaseNewPackage: "acheter un nouveau forfait",
      paidCredits: "Payé",
      bonusCredits: "Offert",
      totalCredits: "Total",
      freeSuffix: "offerts",
    },
  },
  ar: {
    nav: {
      dashboard: "لوحة التحكم",
      clients: "الزبائن",
      packages: "الباقات",
      activities: "الأنشطة",
      redeem: "التحقق",
      invoices: "الفواتير",
      reports: "التقارير",
      print: "طباعة QR",
      staff: "الموظفون",
      settings: "الإعدادات",
      signOut: "تسجيل الخروج",
    },
    dashboard: {
      title: "لوحة التحكم",
      description: "نظرة عامة على بطاقات الأنشطة، الأرصدة، وعمليات التحقق.",
      totalClients: "إجمالي الزبائن",
      activeCards: "البطاقات النشطة",
      redemptionsToday: "عمليات التحقق اليوم",
      creditsRemaining: "الرصيد المتبقي",
      lowBalanceAlert: "تنبيه رصيد منخفض: {names} لديهم رصيد 1 أو أقل متبقي.",
      recentRedemptions: "عمليات التحقق الأخيرة",
      viewAll: "عرض الكل ←",
      quickActions: "إجراءات سريعة",
      newClientDesc: "إنشاء وإصدار بطاقة",
      redeemDesc: "بوابة التحقق للفعاليات",
      printDesc: "تصدير للمطبعة",
      addActivityDesc: "إدارة الحصص",
      newClientBtn: "+ زبون جديد",
      sold: "تم بيعها",
      used: "تم استخدامها",
      addCredits: "إضافة رصيد ←",
      noRedemptions: "لا توجد عمليات تحقق بعد. استخدم صفحة التحقق في الفعاليات.",
      actionNewClient: "زبون جديد",
      actionRedeem: "التحقق من النشاط",
      actionPrint: "طباعة بطاقات QR",
      actionAddActivity: "إضافة نشاط",
    },
    redeem: {
      title: "التحقق من النشاط",
      description: "امسح رمز QR للبطاقة أو أدخل رمز البطاقة لخصم نشاط في الفعالية.",
      searchPlaceholder: "اسم الزبون، رمز البطاقة (AQA-123456) أو الصق رابط QR",
      scanQr: "مسح رمز QR",
      scanInstruction: "وجه الكاميرا نحو رمز QR للبطاقة لعرض تفاصيل الزبون فوراً.",
      creditsAvailable: "رصيد متاح",
      redeemBtn: "خصم 1 رصيد",
      loading: "جاري المعالجة…",
      selectClientPrompt: "يرجى تحديد زبون للتحقق من الرصيد",
      clientFound: "تم العثور على الزبون",
      goodToGo: "جاهز للانطلاق!",
      noCredits: "لا يوجد رصيد متبقي — مطلوب إعادة الشحن!",
      cardDetails: "تفاصيل البطاقة",
      balance: "الرصيد الحالي",
      notesLabel: "ملاحظات (اختياري)",
      notesPlaceholder: "أي ملاحظات ذات صلة…",
      confirmDeduct: "خصم الرصيد وتسجيل عملية التحقق؟",
      findClientCard: "البحث عن بطاقة الزبون",
      findBtn: "بحث",
      searchHint: "ابحث عن طريق كتابة الاسم الكامل/الجزئي للزبون، أو مسح رمز QR الخاص به، أو كتابة رمز البطاقة.",
      noActiveCard: "لا توجد بطاقة نشطة",
      noCreditsLeft: "لا يوجد رصيد متبقي",
      oneCreditRemaining: "رصيد 1 متبقي",
      creditsRemaining: "{count} أرصدة متبقية",
      cannotRedeem: "لا يمكن الخصم — اشحن أولاً",
      runningLow: "الرصيد منخفض",
      readyToRedeem: "جاهز للخصم",
      selectActivity: "اختر النشاط…",
      noSpecificSession: "لا توجد حصة معينة",
      sessionLabel: "الحصة (اختياري)",
      activityLabel: "النشاط",
      insufficientBalance: "الرصيد غير كافٍ",
      confirmRedemption: "تأكيد عملية التحقق",
      multipleMatchesTitle: "تم العثور على زبائن متعددين ({count})",
      selectBtn: "اختر",
      successRedeem: "تم الخصم بنجاح! الرصيد الجديد: {balance} رصيد",
      clientNoCreditsAlert: "هذا الزبون ليس لديه رصيد متبقي.",
      noCardScannedTitle: "لم يتم مسح أي بطاقة بعد",
      noCardScannedDesc: "أدخل رمز البطاقة أو امسح رمز QR للعثور على الزبون.",
    },
    print: {
      title: "طباعة بطاقات QR",
      description: "توليد دفعات من بطاقات QR الفارغة للمطبعة، أو إعادة طباعة بطاقات الزبائن المخصصة.",
      qrSize: "حجم رمز QR",
      sizeMm: "الحجم بالمليمتر (مم)",
      limitHelp: "المدى المتاح من 27 إلى 211 مم. يولد صورة بحجم {px} بكسل للطباعة.",
      applySize: "تطبيق الحجم",
      generateBatchTitle: "مولد الدفعات",
      generateBatchDesc: "توليد بطاقات QR فارغة في قاعدة البيانات برموز متسلسلة (AQA-000001، AQA-000002…). عند تسليم بطاقة لزبون، اربطها عن طريق إدخال رمزها عند إنشاء حسابه.",
      cardsCountLabel: "عدد البطاقات المراد توليدها",
      customLabel: "مخصص:",
      generateBtn: "توليد {count} بطاقة QR فارغة",
      exportPdfBtn: "تصدير بصيغة PDF",
      csvManifestBtn: "بيان CSV",
      printSheetsBtn: "طباعة الأوراق",
      selectAll: "تحديد الكل",
      selectNone: "إلغاء التحديد",
      blankBatchTab: "توليد دفعة فارغة",
      clientCardsTab: "بطاقات الزبائن",
      workflowTitle: "طريقة العمل",
      workflowStep1: "حدد حجم ملصق QR بالمليمتر (مثال: 38 مم)",
      workflowStep2: "قم بتوليد دفعة من البطاقات الفارغة",
      workflowStep3: "حدد البطاقات واضغط على 'تصدير PDF' للحصول على ورقة ملصقات جاهزة للطباعة",
      workflowStep4: "أرسل ملف PDF إلى المطبعة لطباعته على ورق ملصقات",
      workflowStep5: "ضع الملصقات على البطاقات. عند تسجيل زبون جديد، اربط حسابه بالرمز المطبوع على الملصق.",
      tabBlankDesc: "توليد رموز QR للمطبعة",
      tabClientDesc: "إعادة طباعة بطاقات الزبائن المخصصة",
      labelPrePrinted: "مطبوعة مسبقاً",
      labelEventCard: "بطاقة الفعالية",
      unassigned: "— غير مخصص —",
      scanToCheck: "امسح للتحقق من الرصيد",
      refreshTitle: "تحديث",
      reloadClientCards: "إعادة تحميل بطاقات الزبائن",
      loading: "جاري التحميل…",
      selectionTitle: "التحديد",
      selectedCount: "تم تحديد {count} من أصل {total}",
      emptyBatchTitle: "لم يتم توليد أي دفعة بعد",
      emptyBatchDesc: "حدد حجم الدفعة واضغط على توليد لإنشاء بطاقات QR فارغة.",
      emptyClientsTitle: "لم يتم العثور على بطاقات زبائن",
      emptyClientsDesc: "قم بإنشاء زبائن وإصدار بطاقات أولاً.",
      generatingCards: "جاري توليد {count} بطاقة QR…",
      generatingCardsBtn: "جاري توليد {count} بطاقات…",
      selectOneCardFirst: "يرجى تحديد بطاقة واحدة على الأقل أولاً.",
      successExportPdf: "تم تصدير ورقة الملصقات بصيغة PDF بنجاح.",
      failedExportPdf: "فشل في توليد ملف PDF.",
      successBatchGen: "تم توليد {count} بطاقة QR فارغة ({start} ← {end}). أرسلها للمطبعة.",
      networkError: "خطأ في الشبكة أثناء توليد الدفعة.",
    },
    publicCard: {
      title: "بطاقة الأنشطة الخارجية",
      subtitle: "الرصيد المتبقي",
      remaining: "حصص متبقية",
      oneRemaining: "حصة متبقية",
      activityHistory: "سجل الأنشطة",
      creditsPurchased: "الرصيد المشحون",
      usedProgress: "نسبة الاستهلاك",
      scanToCheck: "امسح الرمز للتحقق من الرصيد",
      goodToGo: "نشط · جاهز !",
      lowCredits: "الرصيد منخفض — اتصل بالمدرب الخاص بك",
      noCredits: "لا توجد حصص متبقية",
      tapToFlip: "انقر على البطاقة لعرض رمز QR الخاص بالمدربين للمسح",
      noActivitiesYet: "لا توجد أنشطة بعد",
      noActivitiesYetDesc: "سيظهر سجل مغامراتك هنا بعد أول حصة لك!",
      used: "مستعمل",
      purchaseNewPackage: "شراء باقة جديدة",
      paidCredits: "المدفوعة",
      bonusCredits: "المهداة",
      totalCredits: "الإجمالي",
      freeSuffix: "مجانًا",
    },
  },
};

type I18nContextProps = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (keyPath: string, replacements?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("aqa_locale") as Locale;
    if (saved && (saved === "en" || saved === "fr" || saved === "ar")) {
      setLocaleState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("aqa_locale", l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  const t = (keyPath: string, replacements?: Record<string, string | number>): string => {
    const keys = keyPath.split(".");
    let current: unknown = dictionaries[locale];

    for (const key of keys) {
      if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Fallback to English dictionary
        let fallback: unknown = dictionaries.en;
        for (const fKey of keys) {
          if (fallback && typeof fallback === "object" && fKey in (fallback as Record<string, unknown>)) {
            fallback = (fallback as Record<string, unknown>)[fKey];
          } else {
            return keyPath; // Return key path if not found in fallback
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== "string") {
      return keyPath;
    }

    let result = current;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }

    return result;
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useLocale must be used within I18nProvider");
  return context;
}

export function useTranslations(namespace?: string) {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useTranslations must be used within I18nProvider");

  return {
    t: (key: string, replacements?: Record<string, string | number>) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      return context.t(fullPath, replacements);
    },
    locale: context.locale,
    setLocale: context.setLocale,
    dir: context.dir,
  };
}
